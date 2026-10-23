/**
 * @module useP2PStore
 * @description Estado global da sessão P2P (corrida/entrega ativa)
 *
 * Gerencia o ciclo completo de uma corrida/entrega:
 * - Solicitação → Aceite → Em andamento → Concluída
 *
 * Toda comunicação de localização e mensagens ocorre via P2P (sem servidor).
 */

import { create } from "zustand";
import { P2PService, LocationUpdate, ChatMessage, StatusUpdate } from "@/services/P2PService";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type RideStatus =
  | "idle"
  | "searching"
  | "connecting"
  | "active"
  | "completed"
  | "error";

interface P2PState {
  status: RideStatus;
  peerDid: string | null;
  peerLocation: LocationUpdate | null;
  myLocation: LocationUpdate | null;
  messages: ChatMessage[];
  rideStatus: StatusUpdate["status"] | null;
  error: string | null;
  /** Tentativas de reconexão automática após queda (lado chamador) */
  reconnectAttempts: number;

  // Serviço P2P (não serializado no store)
  _service: P2PService | null;

  // Ações
  initService: (myDid: string) => void;
  callPeer: (peerDid: string, opts?: { keepAttempts?: boolean }) => Promise<void>;
  answerCall: (
    sessionId: string,
    offerSdp: RTCSessionDescriptionInit,
    callerDid: string
  ) => Promise<void>;
  sendMessage: (text: string) => void;
  updateMyLocation: (lat: number, lng: number, heading?: number, speed?: number) => void;
  updateRideStatus: (status: StatusUpdate["status"]) => void;
  disconnect: () => Promise<void>;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useP2PStore = create<P2PState>((set, get) => ({
  status: "idle",
  peerDid: null,
  peerLocation: null,
  myLocation: null,
  messages: [],
  rideStatus: null,
  error: null,
  reconnectAttempts: 0,
  _service: null,

  /** Inicializa o serviço P2P com o DID do usuário atual */
  initService: (myDid: string) => {
    set({ _service: new P2PService(myDid) });
  },

  /** Inicia uma chamada P2P (lado do cliente solicitando motorista) */
  callPeer: async (peerDid, opts) => {
    const service = get()._service;
    if (!service) throw new Error("P2PService não inicializado");

    set({
      status: "connecting",
      peerDid,
      error: null,
      reconnectAttempts: opts?.keepAttempts ? get().reconnectAttempts : 0,
    });

    await service.call(peerDid, {
      onConnected: () => set({ status: "active", reconnectAttempts: 0, error: null }),
      onDisconnected: () => handleUnexpectedDisconnect(set, get),
      onError: (err) => set({ status: "error", error: err.message }),
      onData: (payload) => handleIncomingData(payload, set),
    });
  },

  /** Aceita uma chamada P2P recebida (lado do motorista) */
  answerCall: async (sessionId, offerSdp, callerDid) => {
    const service = get()._service;
    if (!service) throw new Error("P2PService não inicializado");

    set({ status: "connecting", peerDid: callerDid, error: null, reconnectAttempts: 0 });

    await service.answer(sessionId, offerSdp, callerDid, {
      onConnected: () => set({ status: "active", reconnectAttempts: 0, error: null }),
      // [B-05] Sem nova oferta SDP não há como re-atender: sinaliza erro em vez de travar calado.
      onDisconnected: () =>
        set({
          status: "error",
          peerDid: null,
          error: "Conexão com o par foi perdida. Aguarde uma nova chamada.",
        }),
      onError: (err) => set({ status: "error", error: err.message }),
      onData: (payload) => handleIncomingData(payload, set),
    });
  },

  /** Envia mensagem de chat via P2P */
  sendMessage: (text: string) => {
    const service = get()._service;
    if (!service?.isConnected) return;
    service.sendMessage(text);
    // Adiciona a própria mensagem localmente (não recebe eco do P2P)
    set((state) => ({
      messages: [
        ...state.messages,
        { type: "message", text, senderId: "me", timestamp: Date.now() },
      ],
    }));
  },

  /** Atualiza e envia localização atual via P2P */
  updateMyLocation: (lat, lng, heading, speed) => {
    const service = get()._service;
    const location: LocationUpdate = {
      type: "location",
      latitude: lat,
      longitude: lng,
      heading,
      speed,
      timestamp: Date.now(),
    };
    set({ myLocation: location });
    if (service?.isConnected) {
      service.sendLocation(lat, lng, heading, speed);
    }
  },

  /** Atualiza status da corrida e notifica o par via P2P */
  updateRideStatus: (status) => {
    const service = get()._service;
    set({ rideStatus: status });
    if (service?.isConnected) {
      service.sendStatus(status);
    }
  },

  /** Encerra conexão P2P */
  disconnect: async () => {
    const service = get()._service;
    // Trava retries ANTES do close: se onDisconnected disparar durante
    // o fechamento, cai no ramo de erro (sem reconectar) e é limpo abaixo.
    set({ reconnectAttempts: MAX_RECONNECT_ATTEMPTS });
    await service?.disconnect();
    set({
      status: "idle",
      peerDid: null,
      peerLocation: null,
      messages: [],
      rideStatus: null,
      reconnectAttempts: 0,
      error: null,
    });
  },
}));

// ─── Handler de dados recebidos ──────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * [B-05] Queda inesperada no lado chamador: tenta re-ligar para o mesmo peer
 * até MAX_RECONNECT_ATTEMPTS; esgotou → erro com feedback (sem travar calado).
 * Saída manual não passa por aqui (disconnect() trava os retries antes).
 */
function handleUnexpectedDisconnect(
  set: (p: Partial<P2PState>) => void,
  get: () => P2PState
) {
  const { peerDid, reconnectAttempts } = get();
  if (peerDid && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const next = reconnectAttempts + 1;
    set({
      status: "connecting",
      reconnectAttempts: next,
      error: `Conexão perdida. Tentando reconectar… (${next}/${MAX_RECONNECT_ATTEMPTS})`,
    });
    get()
      .callPeer(peerDid, { keepAttempts: true })
      .catch((err) =>
        set({ status: "error", error: err?.message ?? "Falha ao reconectar." })
      );
  } else {
    set({
      status: "error",
      peerDid: null,
      error: "Conexão perdida. Tente conectar novamente.",
    });
  }
}

function handleIncomingData(payload: any, set: any) {
  switch (payload.type) {
    case "location":
      set({ peerLocation: payload as LocationUpdate });
      break;
    case "message":
      set((state: P2PState) => ({
        messages: [...state.messages, payload as ChatMessage],
      }));
      break;
    case "status":
      set({ rideStatus: (payload as StatusUpdate).status });
      break;
  }
}
