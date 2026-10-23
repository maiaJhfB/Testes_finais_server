/**
 * @module IdentityService.test
 * @description Testes unitários do IdentityService: gerenciamento de chaves
 * (SecureStore), autenticação EIP-4361 (SIWE) e registro on-chain no
 * contrato IdentityRegistry.
 *
 * Módulos nativos do Expo (SecureStore, Crypto, Constants) e o ethers são
 * mockados via jest.doMock + jest.resetModules() antes de cada importação do
 * serviço, garantindo que nenhum recurso nativo ou chamada de rede ocorra.
 */

import { ethers } from "ethers";
import { SiweMessage } from "siwe";

import type { IdentityService, IdentityProfile } from "./IdentityService";

// ─── Constantes de teste ─────────────────────────────────────────────────────

const PK_STORE_KEY = "cooperativa_wallet_pk";
const DID_STORE_KEY = "cooperativa_did";
const CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111";
const TX_HASH =
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";

// 32 bytes sequenciais => chave privada determinística 0x0102...0x20
const TEST_BYTES = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 1));
const TEST_PK =
  "0x" +
  Array.from(TEST_BYTES)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const TEST_ADDRESS = new ethers.Wallet(TEST_PK).address;

// ─── Tipos do contexto de teste ──────────────────────────────────────────────

interface SecureStoreMock {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
}

interface CryptoMock {
  getRandomBytesAsync: jest.Mock;
}

interface ServiceContext {
  service: IdentityService;
  mockSecureStore: SecureStoreMock;
  mockCrypto: CryptoMock;
  mockContract: jest.Mock;
}

/**
 * Recarrega o IdentityService com os módulos mockados. Cada chamada cria um
 * registro de módulos isolado (jest.resetModules), garantindo estado zerado.
 */
function setupService(options: { contractAddress?: string } = {}): ServiceContext {
  jest.resetModules();

  const mockSecureStore: SecureStoreMock = {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  };
  const mockCrypto: CryptoMock = {
    getRandomBytesAsync: jest.fn(),
  };
  const mockContract = jest.fn();
  const mockConstants = {
    __esModule: true,
    default: {
      expoConfig: {
        extra: { IDENTITY_CONTRACT_ADDRESS: options.contractAddress ?? "" },
      },
    },
  };

  jest.doMock("expo-secure-store", () => mockSecureStore);
  jest.doMock("expo-crypto", () => mockCrypto);
  jest.doMock("expo-constants", () => mockConstants);
  jest.doMock("ethers", () => {
    const actual = jest.requireActual<typeof import("ethers")>("ethers");
    return {
      ...actual,
      ethers: { ...actual.ethers, Contract: mockContract },
    };
  });

  const mod = require("./IdentityService") as typeof import("./IdentityService");
  return {
    service: new mod.IdentityService(),
    mockSecureStore,
    mockCrypto,
    mockContract,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSiwe(expiresInMs: number): { message: string; sign: () => Promise<string> } {
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + expiresInMs);
  const siweMessage = new SiweMessage({
    domain: "cooperativa-plataforma",
    address: TEST_ADDRESS,
    statement:
      "Assine para autenticar na Cooperativa de Plataforma. Sua identidade e autossoberana.",
    uri: "https://cooperativa-plataforma",
    version: "1",
    chainId: 137,
    nonce: "noncelong123456",
    issuedAt: issuedAt.toISOString(),
    expirationTime: expirationTime.toISOString(),
  });
  const message = siweMessage.prepareMessage();
  const wallet = new ethers.Wallet(TEST_PK);
  return { message, sign: () => wallet.signMessage(message) };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

let ctx: ServiceContext;

beforeEach(() => {
  ctx = setupService();
  ctx.mockCrypto.getRandomBytesAsync.mockResolvedValue(TEST_BYTES);
  ctx.mockSecureStore.getItemAsync.mockResolvedValue(null);
});

describe("IdentityService — gerenciamento de chaves", () => {
  it("gera um novo par de chaves, persiste no SecureStore e expõe o endereço", async () => {
    const address = await ctx.service.generateNewWallet();

    expect(address).toBe(TEST_ADDRESS);
    expect(ctx.mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      PK_STORE_KEY,
      TEST_PK
    );
    expect(ctx.service.currentAddress).toBe(TEST_ADDRESS);
  });

  it("importa uma chave privada válida e persiste no SecureStore", async () => {
    const address = await ctx.service.importWallet(TEST_PK);

    expect(address).toBe(TEST_ADDRESS);
    expect(ctx.mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      PK_STORE_KEY,
      TEST_PK
    );
    expect(ctx.service.currentAddress).toBe(TEST_ADDRESS);
  });

  it("rejeita chave privada inválida sem persistir nada", async () => {
    await expect(ctx.service.importWallet("0x1234")).rejects.toThrow(
      "Chave privada inválida"
    );

    expect(ctx.mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(ctx.service.currentAddress).toBeNull();
  });

  it("loadWallet retorna null quando não há chave salva", async () => {
    ctx.mockSecureStore.getItemAsync.mockResolvedValue(null);

    expect(await ctx.service.loadWallet()).toBeNull();
    expect(ctx.service.currentAddress).toBeNull();
  });

  it("loadWallet restaura a wallet a partir do SecureStore", async () => {
    ctx.mockSecureStore.getItemAsync.mockResolvedValue(TEST_PK);

    const address = await ctx.service.loadWallet();

    expect(address).toBe(TEST_ADDRESS);
    expect(ctx.service.currentAddress).toBe(TEST_ADDRESS);
  });

  it("deleteWallet remove chave privada e DID do SecureStore", async () => {
    await ctx.service.generateNewWallet();
    await ctx.service.deleteWallet();

    expect(ctx.mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(PK_STORE_KEY);
    expect(ctx.mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(DID_STORE_KEY);
    expect(ctx.service.currentAddress).toBeNull();
  });
});

describe("IdentityService — autenticação EIP-4361", () => {
  it("createSignedSession lança erro se a wallet não estiver carregada", async () => {
    await expect(ctx.service.createSignedSession("noncelong123456")).rejects.toThrow(
      /Wallet não carregada/
    );
  });

  it("createSignedSession cria uma sessão assinada com perfil padrão de cliente", async () => {
    await ctx.service.generateNewWallet();
    const now = Date.now();

    const session = await ctx.service.createSignedSession("noncelong123456");

    expect(session.profile.did).toBe(TEST_ADDRESS);
    expect(session.profile.role).toBe("client");
    expect(session.profile.onChainRegistered).toBe(false);
    expect(session.profile.displayName).toBe(`Usuário ${TEST_ADDRESS.slice(0, 6)}`);
    expect(session.sessionToken).toMatch(/^0x[0-9a-f]{64}$/);
    expect(session.expiresAt).toBeGreaterThan(now);
    expect(session.expiresAt).toBeLessThanOrEqual(now + 25 * 60 * 60 * 1000);
  });

  it("createSignedSession carrega o perfil salvo e atualiza o lastLogin", async () => {
    const savedProfile: IdentityProfile = {
      did: TEST_ADDRESS,
      role: "driver",
      displayName: "Marina Mirante",
      onChainRegistered: true,
      lastLogin: Date.now() - 100_000,
    };
    ctx.mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === PK_STORE_KEY) return Promise.resolve(TEST_PK);
      if (key === DID_STORE_KEY) return Promise.resolve(JSON.stringify(savedProfile));
      return Promise.resolve(null);
    });

    await ctx.service.loadWallet();
    const session = await ctx.service.createSignedSession("noncelong123456");

    expect(session.profile.role).toBe("driver");
    expect(session.profile.displayName).toBe("Marina Mirante");
    expect(session.profile.onChainRegistered).toBe(true);
    expect(session.profile.lastLogin).toBeGreaterThanOrEqual(savedProfile.lastLogin);
    expect(ctx.mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      DID_STORE_KEY,
      expect.stringContaining('"role":"driver"')
    );
  });

  it("verifySession aceita assinatura válida não expirada", async () => {
    const siwe = buildSiwe(60 * 60 * 1000);

    const result = await ctx.service.verifySession(
      siwe.message,
      await siwe.sign()
    );

    expect(result.valid).toBe(true);
    expect(result.address).toBe(TEST_ADDRESS);
  });

  it("verifySession rejeita sessão expirada", async () => {
    const siwe = buildSiwe(-60 * 60 * 1000);

    const result = await ctx.service.verifySession(
      siwe.message,
      await siwe.sign()
    );

    expect(result.valid).toBe(false);
    expect(result.address).toBeNull();
  });

  it("verifySession rejeita assinatura feita por outra chave", async () => {
    const siwe = buildSiwe(60 * 60 * 1000);
    const wrongWallet = ethers.Wallet.createRandom();
    const signature = await wrongWallet.signMessage(siwe.message);

    const result = await ctx.service.verifySession(siwe.message, signature);

    expect(result.valid).toBe(false);
    expect(result.address).toBeNull();
  });

  it("verifySession trata mensagem malformada sem lançar exceção", async () => {
    const result = await ctx.service.verifySession(
      "isto não é uma mensagem SIWE",
      "0x00"
    );

    expect(result.valid).toBe(false);
    expect(result.address).toBeNull();
  });
});

describe("IdentityService — registro on-chain", () => {
  it("registerOnChain lança erro se a wallet não estiver carregada", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });

    await expect(ctx.service.registerOnChain("client", "Sem Wallet")).rejects.toThrow(
      /Wallet não carregada/
    );
    expect(ctx.mockContract).not.toHaveBeenCalled();
  });

  it("registerOnChain lança erro se o contrato não estiver configurado", async () => {
    await ctx.service.importWallet(TEST_PK);

    await expect(
      ctx.service.registerOnChain("driver", "Sem Contrato")
    ).rejects.toThrow(/não configurado/);
    expect(ctx.mockContract).not.toHaveBeenCalled();
  });

  it("registerOnChain registra o DID, persiste o perfil e retorna o hash", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });
    await ctx.service.importWallet(TEST_PK);

    const registerMock = jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({ hash: TX_HASH }),
    });
    ctx.mockContract.mockImplementation(() => ({ register: registerMock }));

    const hash = await ctx.service.registerOnChain("driver", "Marina Mirante");

    expect(hash).toBe(TX_HASH);
    expect(ctx.mockContract).toHaveBeenCalledWith(
      CONTRACT_ADDRESS,
      expect.any(Array),
      expect.anything()
    );
    expect(registerMock).toHaveBeenCalledWith(
      TEST_ADDRESS,
      expect.stringContaining('"role":"driver"')
    );
    expect(registerMock).toHaveBeenCalledWith(
      TEST_ADDRESS,
      expect.stringContaining('"displayName":"Marina Mirante"')
    );

    const persisted = ctx.mockSecureStore.setItemAsync.mock.calls.find(
      ([key]) => key === DID_STORE_KEY
    );
    expect(persisted).toBeDefined();
    expect(persisted![1]).toEqual(expect.stringContaining('"onChainRegistered":true'));
  });

  it("registerOnChain propaga erro se a transação falhar e não persiste perfil", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });
    await ctx.service.importWallet(TEST_PK);

    ctx.mockContract.mockImplementation(() => ({
      register: jest.fn().mockRejectedValue(new Error("revert na chain")),
    }));

    await expect(
      ctx.service.registerOnChain("client", "Falha")
    ).rejects.toThrow("revert na chain");
    expect(ctx.mockSecureStore.setItemAsync).not.toHaveBeenCalledWith(
      DID_STORE_KEY,
      expect.anything()
    );
  });

  it("isRegisteredOnChain retorna false sem contrato configurado", async () => {
    const result = await ctx.service.isRegisteredOnChain(TEST_ADDRESS);

    expect(result).toBe(false);
    expect(ctx.mockContract).not.toHaveBeenCalled();
  });

  it("isRegisteredOnChain reflete o estado informado pelo contrato", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });
    ctx.mockContract.mockImplementation(() => ({
      isRegistered: jest.fn().mockResolvedValue(true),
    }));

    const result = await ctx.service.isRegisteredOnChain(TEST_ADDRESS);

    expect(result).toBe(true);
    expect(ctx.mockContract).toHaveBeenCalledWith(
      CONTRACT_ADDRESS,
      expect.any(Array),
      expect.anything()
    );
  });

  it("getProfileFromChain retorna null sem contrato configurado", async () => {
    expect(await ctx.service.getProfileFromChain(TEST_ADDRESS)).toBeNull();
  });

  it("getProfileFromChain retorna null para endereço não registrado", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });
    ctx.mockContract.mockImplementation(() => ({
      isRegistered: jest.fn().mockResolvedValue(false),
    }));

    expect(await ctx.service.getProfileFromChain(TEST_ADDRESS)).toBeNull();
  });

  it("getProfileFromChain retorna o perfil derivado da metadata on-chain", async () => {
    ctx = setupService({ contractAddress: CONTRACT_ADDRESS });
    ctx.mockContract.mockImplementation(() => ({
      isRegistered: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn().mockResolvedValue(
        JSON.stringify({ role: "driver", displayName: "Marina Mirante", version: "1.0" })
      ),
    }));

    const profile = await ctx.service.getProfileFromChain(TEST_ADDRESS);

    expect(profile).toEqual({
      did: TEST_ADDRESS,
      role: "driver",
      displayName: "Marina Mirante",
      onChainRegistered: true,
    });
  });
});