import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";

/**
 * Testes do contrato IdentityRegistry
 *
 * Cobre o ciclo completo de uma identidade autossoberana:
 * registro → verificação → atualização → remoção
 */
describe("IdentityRegistry", () => {
  let contract: IdentityRegistry;
  let owner: any, user1: any, user2: any;

  const metadata1 = JSON.stringify({ role: "driver", displayName: "João Silva", version: "1.0" });
  const metadata2 = JSON.stringify({ role: "client", displayName: "Maria Souza", version: "1.0" });

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("IdentityRegistry");
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  // ── Registro ─────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("deve registrar uma nova identidade", async () => {
      await contract.connect(user1).register(user1.address, metadata1);
      expect(await contract.isRegistered(user1.address)).to.equal(true);
    });

    it("deve emitir evento Registered com dados corretos", async () => {
      const tx = contract.connect(user1).register(user1.address, metadata1);
      await expect(tx)
        .to.emit(contract, "Registered")
        .withArgs(user1.address, metadata1, anyValue);
    });

    it("deve incrementar totalRegistered", async () => {
      await contract.connect(user1).register(user1.address, metadata1);
      await contract.connect(user2).register(user2.address, metadata2);
      expect(await contract.totalRegistered()).to.equal(2n);
    });

    it("deve rejeitar registro duplicado", async () => {
      await contract.connect(user1).register(user1.address, metadata1);
      await expect(
        contract.connect(user1).register(user1.address, metadata1)
      ).to.be.revertedWithCustomError(contract, "AlreadyRegistered");
    });

    it("deve rejeitar metadata vazio", async () => {
      await expect(
        contract.connect(user1).register(user1.address, "")
      ).to.be.revertedWithCustomError(contract, "InvalidMetadata");
    });

    it("deve rejeitar metadata maior que 512 bytes", async () => {
      const longMeta = "x".repeat(513);
      await expect(
        contract.connect(user1).register(user1.address, longMeta)
      ).to.be.revertedWithCustomError(contract, "MetadataTooLong");
    });

    it("não deve permitir impersonação — sempre registra msg.sender", async () => {
      // user1 tenta registrar endereço de user2, mas na verdade registra o seu próprio
      await contract.connect(user1).register(user2.address, metadata1);
      expect(await contract.isRegistered(user1.address)).to.equal(true);
      expect(await contract.isRegistered(user2.address)).to.equal(false);
    });
  });

  // ── Leitura ───────────────────────────────────────────────────────────────

  describe("getMetadata() / getIdentity()", () => {
    beforeEach(async () => {
      await contract.connect(user1).register(user1.address, metadata1);
    });

    it("deve retornar metadata correto", async () => {
      expect(await contract.getMetadata(user1.address)).to.equal(metadata1);
    });

    it("deve retornar identidade completa", async () => {
      const identity = await contract.getIdentity(user1.address);
      expect(identity.registered).to.equal(true);
      expect(identity.metadata).to.equal(metadata1);
      expect(identity.registeredAt).to.be.gt(0n);
    });

    it("deve rejeitar consulta de endereço não registrado", async () => {
      await expect(
        contract.getMetadata(user2.address)
      ).to.be.revertedWithCustomError(contract, "NotRegistered");
    });
  });

  // ── Atualização ───────────────────────────────────────────────────────────

  describe("updateMetadata()", () => {
    beforeEach(async () => {
      await contract.connect(user1).register(user1.address, metadata1);
    });

    it("deve atualizar metadata", async () => {
      const newMeta = JSON.stringify({ role: "admin", displayName: "João Admin", version: "1.1" });
      await contract.connect(user1).updateMetadata(newMeta);
      expect(await contract.getMetadata(user1.address)).to.equal(newMeta);
    });

    it("deve rejeitar atualização de não registrado", async () => {
      await expect(
        contract.connect(user2).updateMetadata(metadata2)
      ).to.be.revertedWithCustomError(contract, "NotRegistered");
    });
  });

  // ── Remoção ───────────────────────────────────────────────────────────────

  describe("deregister()", () => {
    beforeEach(async () => {
      await contract.connect(user1).register(user1.address, metadata1);
    });

    it("deve remover identidade", async () => {
      await contract.connect(user1).deregister();
      expect(await contract.isRegistered(user1.address)).to.equal(false);
    });

    it("deve decrementar totalRegistered", async () => {
      await contract.connect(user1).deregister();
      expect(await contract.totalRegistered()).to.equal(0n);
    });

    it("deve emitir evento Deregistered", async () => {
      await expect(contract.connect(user1).deregister())
        .to.emit(contract, "Deregistered")
        .withArgs(user1.address, anyValue);
    });

    it("deve permitir re-registro após remoção", async () => {
      await contract.connect(user1).deregister();
      await contract.connect(user1).register(user1.address, metadata2);
      expect(await contract.isRegistered(user1.address)).to.equal(true);
    });
  });
});
