/**
 * @module useAuthStore
 * @description Estado global de autenticação — gerenciado com Zustand
 *
 * Orquestra o ciclo completo de autenticação SSI:
 * 1. Verificar se existe wallet no dispositivo
 * 2. Gerar ou importar wallet (se primeira vez)
 * 3. Buscar nonce do servidor de sinalização
 * 4. Assinar mensagem SIWE (sem servidor)
 * 5. (Opcional) Registrar on-chain na Polygon
 */

import { create } from "zustand";
import { identityService, AuthSession } from "@/services/IdentityService";
import { fetchNonce } from "@/services/NonceClient";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type AuthStatus =
  | "idle"
  | "checking"
  | "no_wallet"
  | "signing"
  | "authenticated"
  | "error";

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  address: string | null;

  // Ações
  initialize: () => Promise<void>;
  createNewWallet: () => Promise<string>;
  importWallet: (privateKey: string) => Promise<string>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  registerOnChain: (role: "driver" | "client", displayName: string) => Promise<string>;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

let pendingLogin: Promise<void> | null = null;
let pendingInitialize: Promise<void> | null = null;
let pendingIdentity: Promise<string> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  session: null,
  error: null,
  address: null,

  /**
   * Verifica se há wallet salva no dispositivo.
   * Chamado no boot da aplicação (app/_layout.tsx).
   */
  initialize: () => {
    if (pendingInitialize) return pendingInitialize;
    pendingInitialize = (async () => {
      set({ status: "checking", session: null, error: null });
      try {
        const address = await identityService.loadWallet();
        set({ address });
        if (!address) {
          set({ status: "no_wallet" });
          return;
        }
        await get().login();
      } catch {
        // login já registra a mensagem útil. Boot nunca deixa uma rejeição escapar.
        if (get().status !== "error") {
          set({ status: "error", session: null,
            error: "Não foi possível carregar sua identidade. Tente novamente; os dados locais foram preservados." });
        }
      }
    })().finally(() => { pendingInitialize = null; });
    return pendingInitialize;
  },

  /** Gera nova wallet e persiste no SecureStore */
  createNewWallet: () => {
    if (pendingIdentity) return pendingIdentity;
    const existing = get().address ?? identityService.currentAddress;
    if (existing) return Promise.reject(new Error("Já existe uma identidade salva neste dispositivo. Entre com ela; nenhuma chave foi substituída."));
    if (get().status !== "no_wallet") return Promise.reject(new Error("Verifique a identidade salva antes de criar outra."));
    pendingIdentity = identityService.generateNewWallet().then(address => {
      set({ status: "no_wallet", address, session: null, error: null });
      return address;
    }).finally(() => { pendingIdentity = null; });
    return pendingIdentity;
  },

  /** Importa wallet via chave privada */
  importWallet: (privateKey: string) => {
    if (pendingIdentity) return pendingIdentity;
    const existing = get().address ?? identityService.currentAddress;
    if (existing) return Promise.reject(new Error("Já existe uma identidade salva neste dispositivo. Entre com ela; nenhuma chave foi substituída."));
    if (get().status !== "no_wallet") return Promise.reject(new Error("Verifique a identidade salva antes de importar outra."));
    pendingIdentity = identityService.importWallet(privateKey).then(address => {
      set({ status: "no_wallet", address, session: null, error: null });
      return address;
    }).finally(() => { pendingIdentity = null; });
    return pendingIdentity;
  },

  /**
   * Fluxo de login EIP-4361:
   * 1. Busca nonce do servidor de sinalização (previne replay)
   * 2. Assina mensagem SIWE localmente
   * 3. Armazena sessão no estado
   */
  login: () => {
    if (pendingLogin) return pendingLogin;
    pendingLogin = (async () => {
      set({ status: "signing", error: null, session: null });
      try {
        const nonce = await fetchNonce();
        const session = await identityService.createSignedSession(nonce);
        set({ status: "authenticated", session, address: session.profile.did });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente com sua identidade salva.";
        set({ status: "error", session: null, error: message });
        throw new Error(message);
      }
    })().finally(() => { pendingLogin = null; });
    return pendingLogin;
  },

  /** Limpa sessão e remove wallet do dispositivo */
  logout: async () => {
    await identityService.deleteWallet();
    set({ status: "no_wallet", session: null, address: null, error: null });
  },

  /**
   * Registra identidade on-chain na Polygon.
   * Retorna o hash da transação.
   */
  registerOnChain: async (role, displayName) => {
    const txHash = await identityService.registerOnChain(role, displayName);
    // Atualiza perfil no estado
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            profile: { ...state.session.profile, role, displayName, onChainRegistered: true },
          }
        : null,
    }));
    return txHash;
  },
}));
