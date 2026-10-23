# Cooperativa â€” Plataforma Mobile Descentralizada

> TCC â€” Centro UniversitÃ¡rio do Instituto MauÃ¡ de Tecnologia (IMT)
> Sistemas de InformaÃ§Ã£o / CiÃªncia da ComputaÃ§Ã£o â€” 2025

## Arquitetura HÃ­brida (Serverless + P2P + Blockchain)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     DISPOSITIVO DO USUÃRIO                   â”‚
â”‚                                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚               App Mobile (React Native / Expo)        â”‚   â”‚
â”‚  â”‚                                                       â”‚   â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚   â”‚
â”‚  â”‚  â”‚  IdentityService â”‚    â”‚       P2PService          â”‚ â”‚   â”‚
â”‚  â”‚  â”‚  (SSI / EIP-4361)â”‚    â”‚    (WebRTC DataChannel)  â”‚ â”‚   â”‚
â”‚  â”‚  â”‚                  â”‚    â”‚                           â”‚ â”‚   â”‚
â”‚  â”‚  â”‚  Chave privada   â”‚    â”‚  LocalizaÃ§Ã£o em tempo realâ”‚ â”‚   â”‚
â”‚  â”‚  â”‚  no SecureStore  â”‚    â”‚  Chat motorista-cliente   â”‚ â”‚   â”‚
â”‚  â”‚  â”‚  (nunca sai do   â”‚    â”‚  Status da corrida        â”‚ â”‚   â”‚
â”‚  â”‚  â”‚   dispositivo)   â”‚    â”‚  (tudo sem servidor)      â”‚ â”‚   â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚                          â”‚
               â”‚ SÃ³ na primeira vez       â”‚ SÃ³ durante negociaÃ§Ã£o
               â”‚ (registro on-chain)      â”‚ WebRTC (~5-10 mensagens)
               â–¼                          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Polygon Blockchain  â”‚    â”‚    Cloudflare Worker (Serverless)â”‚
â”‚                       â”‚    â”‚                                  â”‚
â”‚  IdentityRegistry.sol â”‚    â”‚  Servidor de SinalizaÃ§Ã£o WebRTC  â”‚
â”‚  (contrato imutÃ¡vel)  â”‚    â”‚  - Troca de SDP offer/answer     â”‚
â”‚                       â”‚    â”‚  - Troca de ICE candidates       â”‚
â”‚  Custo: ~R$0,003/user â”‚    â”‚  - Gera nonces SIWE              â”‚
â”‚  Sem manutenÃ§Ã£o       â”‚    â”‚  Free tier: 100k req/dia         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## MÃ³dulos

### `apps/mobile` â€” Aplicativo React Native (Expo)

| Arquivo | DescriÃ§Ã£o |
|---|---|
| `src/services/IdentityService.ts` | AutenticaÃ§Ã£o SSI via EIP-4361 |
| `src/services/P2PService.ts` | ComunicaÃ§Ã£o P2P via WebRTC |
| `src/store/useAuthStore.ts` | Estado de autenticaÃ§Ã£o (Zustand) |
| `src/store/useP2PStore.ts` | Estado de sessÃ£o P2P (Zustand) |
| `app/(auth)/onboarding.tsx` | Onboarding e criaÃ§Ã£o de identidade |
| `app/(app)/home.tsx` | Dashboard principal |
| `app/(app)/active-ride.tsx` | Tela de corrida ativa (mapa P2P) |

### `packages/contracts` â€” Smart Contracts (Solidity / Hardhat)

| Arquivo | DescriÃ§Ã£o |
|---|---|
| `src/IdentityRegistry.sol` | Contrato de registro de identidade |
| `scripts/deploy.ts` | Script de deploy (Polygon Amoy / Mainnet) |
| `test/IdentityRegistry.test.ts` | Testes completos do contrato |

### `packages/signaling-worker` â€” Cloudflare Worker (Serverless)

| Arquivo | DescriÃ§Ã£o |
|---|---|
| `src/index.ts` | Worker de sinalizaÃ§Ã£o WebRTC |
| `wrangler.toml` | ConfiguraÃ§Ã£o do Cloudflare |

## Setup e ExecuÃ§Ã£o

### PrÃ©-requisitos

- Node.js 20 LTS (recomendado; evite Node 24 para Hardhat no Windows)
- Yarn >= 4
- Expo CLI (`npm install -g expo-cli`)
- Wrangler CLI (`npm install -g wrangler`)
- Hardhat (instalado via workspace)

### 1. Instalar dependÃªncias

```bash
yarn install
```

### 2. Contratos â€” Rede local de testes

```bash
# Terminal 1: Inicia rede local Hardhat
cd packages/contracts
npx hardhat node

# Terminal 2: Deploy local
npx hardhat run scripts/deploy.ts --network hardhat
# Copie o endereÃ§o gerado para apps/mobile/app.json > IDENTITY_CONTRACT_ADDRESS
```

### 3. Contratos â€” Polygon Amoy Testnet (gratuito)

```bash
# Obtenha MATIC de teste em: https://faucet.polygon.technology/
export DEPLOYER_PRIVATE_KEY=0xSUA_CHAVE_AQUI
npx hardhat run scripts/deploy.ts --network amoy
```

### 4. Worker de SinalizaÃ§Ã£o â€” Cloudflare

```bash
# Autenticar no Cloudflare
wrangler login

# Criar KV namespace
wrangler kv:namespace create SIGNALING_KV
# Copie o ID gerado para wrangler.toml

# Deploy
cd packages/signaling-worker
yarn deploy
# Copie a URL gerada para apps/mobile/app.json > SIGNALING_SERVER_URL
```

### 5. App Mobile

```bash
# Atualizar app.json com endereÃ§os do contrato e worker
# Depois:
cd apps/mobile
npx expo start
```

## AnÃ¡lise de Custos (Objetivo do TCC)

| Componente | SoluÃ§Ã£o Convencional | SoluÃ§Ã£o Proposta | Economia |
|---|---|---|---|
| AutenticaÃ§Ã£o | Auth0: ~$23/mÃªs (1k MAU) | EIP-4361: $0/mÃªs | 100% |
| Servidor de aplicaÃ§Ã£o | EC2 t3.small: ~$15/mÃªs | Cloudflare Workers Free: $0/mÃªs | 100% |
| Banco de dados de sessÃµes | Redis Cache: ~$12/mÃªs | Cloudflare KV Free: $0/mÃªs | 100% |
| ComunicaÃ§Ã£o em tempo real | Pusher: ~$49/mÃªs | WebRTC P2P: $0/mÃªs | 100% |
| Identidade de usuÃ¡rio | R$0,003/registro on-chain | â€” | â€” |
| **Total (1k usuÃ¡rios)** | **~$99/mÃªs** | **~$0,10/mÃªs** | **>99%** |

## ReferÃªncias TÃ©cnicas

- **EIP-4361** â€” Sign-In with Ethereum (https://eips.ethereum.org/EIPS/eip-4361)
- **W3C DID Core** â€” Decentralized Identifiers (https://www.w3.org/TR/did-core/)
- **RFC 8825** â€” WebRTC Overview
- **Nakamoto (2008)** â€” Bitcoin: A Peer-to-Peer Electronic Cash System
- **Jonas et al. (2019)** â€” Cloud Programming Simplified: A Berkeley View on Serverless Computing
- **Scholz (2016)** â€” Cooperativismo de Plataforma

