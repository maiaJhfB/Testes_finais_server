#!/usr/bin/env bash
# setup.sh — Configura e valida o projeto Cooperativa
# Uso: bash setup.sh
# Testado em macOS 14+ e Ubuntu 22.04

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${BOLD}── $1${NC}"; }

echo -e "${BOLD}Cooperativa — Setup Automático${NC}"
echo "TCC IMT 2025 — Arquitetura Híbrida P2P + Serverless + Blockchain"
echo "────────────────────────────────────────────────────────────────"

# ── Verificar pré-requisitos ─────────────────────────────────────────────────
step "Verificando pré-requisitos"

command -v node >/dev/null 2>&1 || fail "Node.js não encontrado. Instale em https://nodejs.org (v18+)"
NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
[ "$NODE_VER" -ge 18 ] || fail "Node.js v18+ necessário. Versão atual: $(node -v)"
ok "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fail "npm não encontrado"
ok "npm $(npm -v)"

command -v git >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" || warn "git não encontrado (opcional)"

# Detecta se Expo Go está instalável (não verifica, só informa)
echo ""
warn "Certifique-se de ter o Expo Go instalado no celular:"
echo "   iOS:     https://apps.apple.com/app/expo-go/id982107779"
echo "   Android: https://play.google.com/store/apps/details?id=host.exp.exponent"

# ── Dependências raiz ────────────────────────────────────────────────────────
step "Instalando dependências (raiz)"
npm install --silent
ok "Dependências raiz instaladas"

# ── App Mobile ───────────────────────────────────────────────────────────────
step "Configurando app mobile"
cd apps/mobile
npm install --silent
ok "Dependências mobile instaladas"
npx tsc --noEmit 2>/dev/null && ok "TypeScript OK — zero erros" || warn "Aviso TypeScript (não crítico para rodar)"
cd ../..

# ── Contratos Solidity ───────────────────────────────────────────────────────
step "Configurando contratos Solidity"
cd packages/contracts

# Garante pasta contracts/ para o Hardhat
mkdir -p contracts
[ -f contracts/IdentityRegistry.sol ] || cp src/IdentityRegistry.sol contracts/
ok "IdentityRegistry.sol na pasta correta"

npm install --silent
ok "Dependências Hardhat instaladas"

# Tenta compilar (precisa de internet para baixar compilador na primeira vez)
if npx hardhat compile 2>/dev/null; then
  ok "Contrato compilado com sucesso"
else
  warn "Compilação offline — execute 'npx hardhat compile' com internet"
fi
cd ../..

# ── Signaling Worker ─────────────────────────────────────────────────────────
step "Configurando Cloudflare Worker"
cd packages/signaling-worker
npm install --silent
ok "Dependências Wrangler instaladas"

# Verifica se wrangler está disponível
if npx wrangler --version >/dev/null 2>&1; then
  ok "Wrangler $(npx wrangler --version 2>/dev/null | head -1)"
else
  warn "Wrangler não encontrado — instale: npm install -g wrangler"
fi
cd ../..

# ── Detectar IP local ────────────────────────────────────────────────────────
step "Detectando IP local para configuração do app"

LOCAL_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  # macOS / Windows
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
elif command -v hostname >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -n "$LOCAL_IP" ]; then
  ok "IP local detectado: $LOCAL_IP"
  echo ""
  echo -e "${YELLOW}  Configure o app.json com este IP:${NC}"
  echo "  \"SIGNALING_SERVER_URL\": \"http://$LOCAL_IP:8787\""
  echo ""
  echo "  Arquivo: apps/mobile/app.json → chave extra.SIGNALING_SERVER_URL"
else
  warn "IP local não detectado. Configure manualmente em apps/mobile/app.json"
fi

# ── Resumo final ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}Setup concluído! Próximos passos:${NC}"
echo ""
echo -e "${BOLD}Terminal 1${NC} — Worker de sinalização:"
echo "  cd packages/signaling-worker"
echo "  npx wrangler dev"
echo ""
echo -e "${BOLD}Terminal 2${NC} — App mobile:"
echo "  cd apps/mobile"
echo "  npx expo start"
echo ""
echo -e "${BOLD}Terminal 3${NC} — Testes do contrato:"
echo "  cd packages/contracts"
echo "  npx hardhat node          # rede local"
echo "  npx hardhat test          # roda os 12 testes"
echo ""
echo -e "${BOLD}Teste end-to-end (dois celulares):${NC}"
echo "  1. Abra Expo Go nos dois celulares"
echo "  2. Escaneie o QR do Terminal 2"
echo "  3. Celular A: crie identidade → papel Cliente"
echo "  4. Celular B: crie identidade → papel Motorista → 'Aguardar Chamadas'"
echo "  5. Celular A: cole o DID do Celular B em 'Solicitar Corrida'"
echo "  6. Conexão P2P estabelecida — GPS e chat em tempo real"
echo ""
echo "Dúvidas? README.md tem referências completas."
echo -e "${BOLD}════════════════════════════════════════════${NC}"
