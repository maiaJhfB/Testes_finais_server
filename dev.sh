#!/usr/bin/env bash
# dev.sh — Inicia Worker + App em paralelo (requer iTerm2, tmux ou apenas dois terminais)
# Uso: bash dev.sh
#
# Se não tiver tmux, o script abre dois processos em background e mostra os logs.
# Para parar tudo: Ctrl+C

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BOLD}Cooperativa — Iniciando ambiente de desenvolvimento${NC}"
echo ""

# ── Tenta usar tmux se disponível ────────────────────────────────────────────
if command -v tmux >/dev/null 2>&1; then
  SESSION="cooperativa"
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  tmux new-session -d -s "$SESSION" -x 220 -y 50

  # Painel esquerdo: Worker
  tmux send-keys -t "$SESSION":0.0 \
    "cd '$ROOT/packages/signaling-worker' && echo '🔧 Worker de Sinalização' && npx wrangler dev" Enter

  # Divide verticalmente
  tmux split-window -h -t "$SESSION":0

  # Painel direito: Expo
  tmux send-keys -t "$SESSION":0.1 \
    "cd '$ROOT/apps/mobile' && echo '📱 App Mobile' && npx expo start" Enter

  echo -e "${GREEN}✓${NC} tmux iniciado. Conecte com:"
  echo "  tmux attach -t $SESSION"
  echo ""
  echo "  Painel esquerdo: Cloudflare Worker (porta 8787)"
  echo "  Painel direito:  Expo Metro Bundler"
  tmux attach -t "$SESSION"

else
  # Sem tmux: inicia em background com logs em arquivos
  echo -e "${YELLOW}tmux não encontrado — iniciando em background${NC}"
  echo ""

  # Worker
  cd "$ROOT/packages/signaling-worker"
  npx wrangler dev > /tmp/cooperativa-worker.log 2>&1 &
  WORKER_PID=$!
  echo -e "${GREEN}✓${NC} Worker iniciado (PID $WORKER_PID) → logs: /tmp/cooperativa-worker.log"

  sleep 2  # Aguarda worker subir

  # Expo
  cd "$ROOT/apps/mobile"
  npx expo start 2>&1 | tee /tmp/cooperativa-expo.log &
  EXPO_PID=$!
  echo -e "${GREEN}✓${NC} Expo iniciado (PID $EXPO_PID) → logs: /tmp/cooperativa-expo.log"

  echo ""
  echo "Para ver os logs do Worker:"
  echo "  tail -f /tmp/cooperativa-worker.log"
  echo ""
  echo "Para parar tudo:"
  echo "  kill $WORKER_PID $EXPO_PID"
  echo ""

  # Aguarda Ctrl+C
  trap "kill $WORKER_PID $EXPO_PID 2>/dev/null; echo 'Serviços encerrados.'" EXIT
  wait
fi
