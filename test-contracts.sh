#!/usr/bin/env bash
# test-contracts.sh — Roda todos os testes do contrato IdentityRegistry
# Uso: bash test-contracts.sh

set -e
cd "$(dirname "$0")/packages/contracts"

echo "🧪 Rodando testes do contrato IdentityRegistry"
echo "   Rede: Hardhat local (sem custo, sem internet)"
echo ""

# Garante que o contrato está na pasta correta
mkdir -p contracts
[ -f contracts/IdentityRegistry.sol ] || cp src/IdentityRegistry.sol contracts/

# Roda os testes
npx hardhat test --network hardhat 2>&1

echo ""
echo "✅ Testes concluídos."
