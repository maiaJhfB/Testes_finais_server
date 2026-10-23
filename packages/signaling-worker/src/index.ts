/**
 * @module SignalingWorker
 * @description Servidor de Sinalização WebRTC — Cloudflare Worker (Serverless)
 *
 * Responsável APENAS pela troca de metadados de negociação WebRTC (SDP + ICE).
 * Após a conexão P2P estabelecida, este servidor não processa mais nenhuma
 * mensagem entre os pares. O tráfego real é 100% P2P.
 *
 * Custo estimado Cloudflare Workers Free Tier:
 * - 100.000 requisições/dia gratuitas
 * - Latência de edge (~10ms) sem cold start
 *
 * Armazenamento: Cloudflare KV (chave-valor distribuído)
 * TTL das sessões: 5 minutos (suficiente para negociação WebRTC)
 *
 * Referência: Jonas et al. (2019) — Serverless como paradigma de baixo custo
 */

export interface Env {
  SIGNALING_KV: KVNamespace;
  ALLOWED_ORIGINS: string;
}

interface RTCSessionDescriptionInit {
  sdp?: string;
  type: "answer" | "offer" | "pranswer" | "rollback";
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

const SESSION_TTL_SECONDS = 300; // 5 minutos

// ─── Handler Principal ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGINS ?? "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === "/signal") {
        if (request.method === "POST") {
          return handlePost(request, env, corsHeaders);
        }
        if (request.method === "GET") {
          return handleGet(request, env, corsHeaders);
        }
      }

      if (url.pathname === "/nonce" && request.method === "GET") {
        return handleNonce(corsHeaders);
      }

      if (url.pathname === "/health") {
        return json({ status: "ok", timestamp: Date.now() }, corsHeaders);
      }

      if (url.pathname === "/incoming" && request.method === "GET") {
        return handleIncoming(request, env, corsHeaders);
      }

      return json({ error: "Not found" }, corsHeaders, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal server error" }, corsHeaders, 500);
    }
  },
};

// ─── POST /signal — Publicar oferta, resposta ou ICE candidate ────────────────

async function handlePost(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await request.json<{
    type: "offer" | "answer" | "ice";
    sessionId: string;
    from: string;
    to?: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }>();

  if (!body.sessionId || !body.type || !body.from) {
    return json({ error: "Missing required fields" }, corsHeaders, 400);
  }

  // Valida tamanho do payload (evita abuso)
  const payloadStr = JSON.stringify(body);
  if (payloadStr.length > 8192) {
    return json({ error: "Payload too large" }, corsHeaders, 413);
  }

  const kvKey = `${body.sessionId}:${body.type}:${body.to ?? body.from}`;

  // Para ICE candidates, acumula em array (podem chegar múltiplos)
  if (body.type === "ice") {
    const existing = await env.SIGNALING_KV.get(kvKey, "json") as any[] | null;
    const candidates = existing ?? [];
    candidates.push(body.candidate);
    await env.SIGNALING_KV.put(kvKey, JSON.stringify(candidates), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
  } else {
    await env.SIGNALING_KV.put(
      kvKey,
      JSON.stringify({ sdp: body.sdp, from: body.from }),
      { expirationTtl: SESSION_TTL_SECONDS }
    );
  }

  return json({ success: true, key: kvKey }, corsHeaders);
}

// ─── GET /signal — Buscar oferta, resposta ou ICE candidates ─────────────────

async function handleGet(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const type = url.searchParams.get("type");
  const to = url.searchParams.get("to");

  if (!sessionId || !type || !to) {
    return json({ error: "Missing query params" }, corsHeaders, 400);
  }

  const kvKey = `${sessionId}:${type}:${to}`;
  const raw = await env.SIGNALING_KV.get(kvKey, "json");

  if (!raw) {
    return json({ payload: null }, corsHeaders);
  }

  // ICE candidates: retorna e limpa (evita reprocessar)
  if (type === "ice") {
    await env.SIGNALING_KV.delete(kvKey);
    return json({ payload: { candidates: raw } }, corsHeaders);
  }

  return json({ payload: raw }, corsHeaders);
}

// ─── GET /nonce — Gera nonce para autenticação SIWE ──────────────────────────

async function handleNonce(
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Nonce criptograficamente seguro de 16 bytes
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return json({ nonce }, corsHeaders);
}

// ─── GET /incoming — Motorista busca se há oferta pendente para seu DID ──────

async function handleIncoming(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const to = url.searchParams.get("to");

  if (!to) {
    return json({ error: "Missing ?to param" }, corsHeaders, 400);
  }

  // Lista todas as chaves de ofertas destinadas a este DID
  // Formato da chave: {sessionId}:offer:{toDid}
  const prefix = "";
  const suffix = `:offer:${to}`;

  // KV não suporta suffix search — usamos list e filtramos
  const list = await env.SIGNALING_KV.list({ prefix });
  const matchingKey = list.keys.find((k) => k.name.endsWith(suffix));

  if (!matchingKey) {
    return json({ offer: null }, corsHeaders);
  }

  const raw = await env.SIGNALING_KV.get(matchingKey.name, "json") as any;
  if (!raw) return json({ offer: null }, corsHeaders);

  // Extrai sessionId da chave (formato: {sessionId}:offer:{to})
  const sessionId = matchingKey.name.replace(`:offer:${to}`, "");

  return json({ offer: raw, sessionId }, corsHeaders);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(
  data: object,
  corsHeaders: Record<string, string>,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
