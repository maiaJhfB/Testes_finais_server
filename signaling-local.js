/**
 * signaling-local.js
 * Servidor de sinalização WebRTC local — substitui o Cloudflare Worker em dev.
 * Requer apenas Node.js (sem dependências externas).
 *
 * Uso: node signaling-local.js
 * Porta padrão: 8787
 */

const http = require("http");
const crypto = require("crypto");

const PORT = 8787;

// KV em memória (equivalente ao Cloudflare KV)
const store = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

function kvSet(key, value) {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

function kvGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry.value;
}

function kvDelete(key) { store.delete(key); }

function kvList() {
  const now = Date.now();
  return [...store.keys()].filter(k => {
    const e = store.get(k);
    if (!e || now > e.expiresAt) { store.delete(k); return false; }
    return true;
  });
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function send(res, data, status = 200) {
  res.writeHead(status, CORS);
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  // GET /health
  if (url.pathname === "/health" && req.method === "GET") {
    return send(res, { status: "ok", timestamp: Date.now() });
  }

  // GET /nonce
  if (url.pathname === "/nonce" && req.method === "GET") {
    const nonce = crypto.randomBytes(16).toString("hex");
    return send(res, { nonce });
  }

  // POST /signal
  if (url.pathname === "/signal" && req.method === "POST") {
    const body = await readBody(req);
    const { type, sessionId, from, to, sdp, candidate } = body;

    if (!sessionId || !type || !from)
      return send(res, { error: "Missing required fields" }, 400);

    const key = `${sessionId}:${type}:${to ?? from}`;

    if (type === "ice") {
      const existing = kvGet(key) ?? [];
      existing.push(candidate);
      kvSet(key, existing);
    } else {
      kvSet(key, { sdp, from });
    }

    console.log(`[POST /signal] ${key}`);
    return send(res, { success: true, key });
  }

  // GET /signal
  if (url.pathname === "/signal" && req.method === "GET") {
    const sessionId = url.searchParams.get("sessionId");
    const type = url.searchParams.get("type");
    const to = url.searchParams.get("to");

    if (!sessionId || !type || !to)
      return send(res, { error: "Missing query params" }, 400);

    const key = `${sessionId}:${type}:${to}`;
    const raw = kvGet(key);

    if (!raw) return send(res, { payload: null });

    if (type === "ice") {
      kvDelete(key);
      return send(res, { payload: { candidates: raw } });
    }

    console.log(`[GET /signal] ${key}`);
    return send(res, { payload: raw });
  }

  // GET /incoming
  if (url.pathname === "/incoming" && req.method === "GET") {
    const to = url.searchParams.get("to");
    if (!to) return send(res, { error: "Missing ?to param" }, 400);

    const suffix = `:offer:${to}`;
    const matchingKey = kvList().find((k) => k.endsWith(suffix));

    if (!matchingKey) return send(res, { offer: null });

    const raw = kvGet(matchingKey);
    if (!raw) return send(res, { offer: null });

    const sessionId = matchingKey.replace(suffix, "");
    console.log(`[GET /incoming] oferta encontrada para ${to} → session ${sessionId}`);
    return send(res, { offer: raw, sessionId });
  }

  return send(res, { error: "Not found" }, 404);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ Servidor de sinalização local rodando em http://localhost:${PORT}`);
  console.log(`   /health    → verificar se está vivo`);
  console.log(`   /nonce     → gerar nonce SIWE`);
  console.log(`   /signal    → troca de SDP/ICE`);
  console.log(`   /incoming  → motorista busca oferta pendente`);
  console.log(`\n   Pressione Ctrl+C para encerrar.\n`);
});