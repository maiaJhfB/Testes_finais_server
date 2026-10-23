import type { P2PCallbacks } from "./P2PService";

const SIGNALING_URL = "https://signaling.test";
const CALLER_DID = "0xcaller";
const PEER_DID = "0xpeer";
const ANSWER = { sdp: "v=0\r\ns=answer\r\n", type: "answer" };

interface Description {
  sdp: string;
  type: string | null;
}

function response(data: unknown = {}) {
  return { ok: true, json: jest.fn().mockResolvedValue(data) };
}

function setupService() {
  jest.resetModules();

  const invalidDescriptionError = new Error("Invalid remote session description");
  const dataChannel = {
    readyState: "connecting",
    addEventListener: jest.fn(),
    close: jest.fn(),
  };
  const offer = { sdp: "v=0\r\ns=offer\r\n", type: "offer" };
  const peerConnection = {
    iceGatheringState: "complete",
    localDescription: offer,
    addEventListener: jest.fn(),
    createDataChannel: jest.fn().mockReturnValue(dataChannel),
    createOffer: jest.fn().mockResolvedValue(offer),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn(async (description: Description) => {
      // The native peer must not accept empty SDP or a missing answer type.
      if (!description.sdp || description.type !== "answer") {
        throw invalidDescriptionError;
      }
    }),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  };
  const sessionDescription = jest.fn((description: Description) => ({
    ...description,
  }));
  const fetchMock = jest.fn().mockResolvedValue(response());
  const callbacks: P2PCallbacks = {
    onConnected: jest.fn(),
    onDisconnected: jest.fn(),
    onData: jest.fn(),
    onError: jest.fn(),
  };

  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: {
      expoConfig: { extra: { SIGNALING_SERVER_URL: SIGNALING_URL } },
    },
  }));
  jest.doMock("react-native-webrtc", () => ({
    RTCPeerConnection: jest.fn().mockImplementation(() => peerConnection),
    RTCSessionDescription: sessionDescription,
    RTCIceCandidate: jest.fn().mockImplementation((candidate) => candidate),
  }));
  jest.spyOn(global, "fetch").mockImplementation(fetchMock);

  const { P2PService: Service } = require("./P2PService") as typeof import("./P2PService");
  return {
    service: new Service(CALLER_DID),
    callbacks,
    peerConnection,
    dataChannel,
    sessionDescription,
    fetchMock,
    invalidDescriptionError,
  };
}

function pollRequests(fetchMock: jest.Mock): string[] {
  return fetchMock.mock.calls
    .filter(([, options]) => options?.method !== "POST")
    .map(([url]) => url);
}

let ctx: ReturnType<typeof setupService>;
let warn: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  ctx = setupService();
});

afterEach(async () => {
  await ctx.service.disconnect();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("P2PService — polling de answer", () => {
  it.each([undefined, null])("ignora payload %s e continua aguardando answer", async (payload) => {
    const sessionId = await ctx.service.call(PEER_DID, ctx.callbacks);
    ctx.fetchMock.mockResolvedValue(response({ payload }));

    await jest.advanceTimersByTimeAsync(3000);

    expect(ctx.sessionDescription).not.toHaveBeenCalled();
    expect(ctx.peerConnection.setRemoteDescription).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(pollRequests(ctx.fetchMock)).toEqual([
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=answer&to=${CALLER_DID}`,
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=answer&to=${CALLER_DID}`,
    ]);
  });

  it.each([
    ["description ausente", {}, { sdp: "", type: null }],
    ["description nula", { sdp: null }, { sdp: "", type: null }],
    ["sdp interno ausente", { sdp: { type: "answer" } }, { sdp: "", type: "answer" }],
    ["sdp interno undefined", { sdp: { sdp: undefined, type: "answer" } }, { sdp: "", type: "answer" }],
    ["sdp interno nulo", { sdp: { sdp: null, type: "answer" } }, { sdp: "", type: "answer" }],
    ["sdp interno vazio", { sdp: { sdp: "", type: "answer" } }, { sdp: "", type: "answer" }],
    ["type ausente", { sdp: { sdp: ANSWER.sdp } }, { sdp: ANSWER.sdp, type: null }],
    ["type nulo", { sdp: { sdp: ANSWER.sdp, type: null } }, { sdp: ANSWER.sdp, type: null }],
  ])("normaliza %s, registra rejeição nativa e mantém polling de answer", async (_, payload, expected) => {
    const sessionId = await ctx.service.call(PEER_DID, ctx.callbacks);
    ctx.fetchMock.mockResolvedValue(response({ payload }));

    await jest.advanceTimersByTimeAsync(1500);

    expect(ctx.sessionDescription).toHaveBeenLastCalledWith(expected);
    expect(ctx.peerConnection.setRemoteDescription).toHaveBeenLastCalledWith(expected);
    expect(warn).toHaveBeenCalledWith(
      "[P2P] Signaling poll error:",
      ctx.invalidDescriptionError
    );

    await jest.advanceTimersByTimeAsync(1500);

    expect(ctx.sessionDescription).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(pollRequests(ctx.fetchMock)).toEqual([
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=answer&to=${CALLER_DID}`,
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=answer&to=${CALLER_DID}`,
    ]);
    expect(jest.getTimerCount()).toBe(1);
  });

  it("preserva a answer válida e inicia polling de ICE somente após aplicá-la", async () => {
    const sessionId = await ctx.service.call(PEER_DID, ctx.callbacks);
    let resolveRemoteDescription!: () => void;
    ctx.peerConnection.setRemoteDescription.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveRemoteDescription = resolve; })
    );
    ctx.fetchMock.mockResolvedValueOnce(response({ payload: { sdp: ANSWER } }));

    await jest.advanceTimersByTimeAsync(1500);

    expect(ctx.sessionDescription).toHaveBeenCalledWith(ANSWER);
    expect(ctx.peerConnection.setRemoteDescription).toHaveBeenCalledWith(ANSWER);
    expect(pollRequests(ctx.fetchMock)).toEqual([
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=answer&to=${CALLER_DID}`,
    ]);

    // A tick while native application is pending still requests answer.
    await jest.advanceTimersByTimeAsync(1500);
    expect(pollRequests(ctx.fetchMock)[1]).toContain("&type=answer&");

    resolveRemoteDescription();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(1500);

    expect(pollRequests(ctx.fetchMock)[2]).toBe(
      `${SIGNALING_URL}/signal?sessionId=${sessionId}&type=ice&to=${CALLER_DID}`
    );
    expect(ctx.peerConnection.setRemoteDescription).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
  });

  it("disconnect encerra o polling sem novos pedidos ao signaling", async () => {
    await ctx.service.call(PEER_DID, ctx.callbacks);
    expect(jest.getTimerCount()).toBe(1);

    await ctx.service.disconnect();
    const requestCount = ctx.fetchMock.mock.calls.length;
    await jest.advanceTimersByTimeAsync(4500);

    expect(jest.getTimerCount()).toBe(0);
    expect(ctx.fetchMock).toHaveBeenCalledTimes(requestCount);
    expect(ctx.peerConnection.close).toHaveBeenCalledTimes(1);
    expect(ctx.dataChannel.close).toHaveBeenCalledTimes(1);
  });
});
