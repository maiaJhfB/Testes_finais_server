import { SIGNALING_URL } from "./SignalingConfig";

export const NONCE_TIMEOUT_MS = 10000;

export async function fetchNonce(): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, NONCE_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${SIGNALING_URL}/nonce`, { signal: controller.signal });
    } catch {
      throw new Error(timedOut
        ? "O servidor demorou para responder. Tente entrar novamente."
        : "Não foi possível conectar ao servidor. Verifique o Wi-Fi e se o servidor da Cooperativa está disponível; tente entrar novamente.");
    }
    if (!response.ok) {
      throw new Error(`O servidor não conseguiu iniciar o acesso (HTTP ${response.status}). Tente novamente mais tarde.`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (timedOut) throw new Error("O servidor demorou para responder. Tente entrar novamente.");
      throw new Error("O servidor enviou uma resposta inválida. Verifique a configuração do servidor.");
    }
    const nonce = (body as { nonce?: unknown } | null)?.nonce;
    if (typeof nonce !== "string" || !/^[a-fA-F0-9]{32}$/.test(nonce)) {
      throw new Error("O servidor enviou um código de acesso inválido. Verifique a configuração do servidor.");
    }
    return nonce;
  } finally {
    clearTimeout(timeout);
  }
}
