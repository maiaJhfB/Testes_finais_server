import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Script de deploy do contrato IdentityRegistry.
 *
 * Uso:
 *   npx hardhat run scripts/deploy.ts --network amoy     # testnet gratuita
 *   npx hardhat run scripts/deploy.ts --network polygon  # mainnet
 *   npx hardhat run scripts/deploy.ts --network hardhat  # local
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`\n🚀 Deploying IdentityRegistry`);
  console.log(`   Network: ${network.name}`);
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} MATIC\n`);

  const factory = await ethers.getContractFactory("IdentityRegistry");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ IdentityRegistry deployed at: ${address}`);

  // Salva endereço para uso no app mobile
  const output = {
    network: network.name,
    chainId: network.config.chainId,
    address,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const outputPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`📄 Deployment info saved to: ${outputPath}`);
  console.log(
    `\n⚠️  Atualize IDENTITY_CONTRACT_ADDRESS no app.json do mobile com: ${address}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
