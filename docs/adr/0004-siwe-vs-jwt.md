# ADR 0004 — SIWE versus JWT

- **Status:** registro retrospectivo de fluxo observado; ratificação humana não comprovada.
- **Elaboração:** 09/10/2026. Não estabelece data de adoção ou motivos históricos.
- **Escopo:** A-04, backlog de Vitor, p.6; responsável humano no backlog: André.
- **Baseline:** `testes`, SHA `cb03a7b680744930dadca67d4d198f0cb19ecb3f`.

## Contexto

`IdentityService.createSignedSession()` constrói uma `SiweMessage` com nonce e expiração, solicita assinatura da wallet e define `sessionToken` como keccak256 do texto da assinatura. `verifySession()` chama a biblioteca SIWE e verifica expiração. O token retornado é um identificador local por hash, não uma estrutura JWT. [Criação/assinatura/hash](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/IdentityService.ts#L147), [verificação](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/IdentityService.ts#L182).

## Decisão observada

Registrar SIWE como o mecanismo implementado para assinatura e verificação da mensagem de autenticação, acompanhado de sessão local no aplicativo. Existe interação com servidor: o store obtém nonce por HTTP antes de criar a sessão, e o Worker oferece essa rota. Não se descreve todo o fluxo como livre de servidor. [Login](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/store/useAuthStore.ts#L91), [geração de nonce](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/signaling-worker/src/index.ts#L166).

## Alternativa

SIWE padroniza uma mensagem assinada e sua validação para autenticação de contas; JWT especifica um formato de claims que pode ser assinado ou protegido. São papéis diferentes, portanto não são substitutos diretos. Uma arquitetura poderia validar SIWE e depois emitir JWT para uma sessão de servidor; essa combinação não está implementada ou aprovada por este ADR. [ERC-4361](https://eips.ethereum.org/EIPS/eip-4361), [RFC 7519](https://www.rfc-editor.org/info/rfc7519/).

## Consequências e limites

- **Inferência técnica:** o fluxo observado vincula a mensagem à assinatura da wallet; isso não define, por si só, permissões em APIs ou uma sessão autenticada no backend.
- Obter nonce e validar assinatura localmente não comprova consumo único do nonce, rejeição de replay pelo servidor ou verificação completa do contexto em cada operação protegida. A chamada observada à biblioteca não equivale a auditoria integral de conformidade SIWE.
- `sessionToken` por hash não deve ser apresentado como JWT emitido por um servidor ou prova automática de autorização backend. Custódia de chave, expiração e política de sessão são aspectos distintos da comparação de formatos.
- Nenhuma garantia de segurança, mecanismo de token, endpoint ou política de autenticação é acrescentado por A-04.

