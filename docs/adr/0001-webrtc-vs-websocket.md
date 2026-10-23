# ADR 0001 — WebRTC versus WebSocket

- **Status:** registro retrospectivo de escolha observada; ratificação humana não comprovada.
- **Elaboração:** 09/10/2026. A data de adoção e seus motivos históricos não estão documentados nesta evidência.
- **Escopo:** A-04, backlog de Vitor, p.6; responsável humano no backlog: André.
- **Baseline:** `testes`, SHA `cb03a7b680744930dadca67d4d198f0cb19ecb3f`.

## Contexto

O aplicativo possui comunicação de localização, mensagens e status por WebRTC. `P2PService.call()` cria o DataChannel `cooperativa-main`, enquanto `_signalingPost()` e `_startSignalingPoll()` trocam oferta, resposta e ICE por HTTP com o serviço de sinalização. São funções distintas de transporte de dados e negociação. [Criação do canal](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L102), [sinalização HTTP](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L304).

## Decisão observada

Registrar WebRTC DataChannel como transporte implementado para os dados entre pares. `send()` serializa o payload no canal; o polling de sinalização ocorre a cada 1500 ms e é interrompido quando o peer reporta conexão estabelecida. Este ADR registra o código existente e não introduz uma nova decisão. [Envio](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L176), [estado conectado](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L250), [intervalo](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L347).

## Alternativa

WebSocket fornece comunicação bidirecional entre cliente e servidor sobre TCP. Uma alternativa para este projeto seria encaminhar os dados por um servidor WebSocket; isso exigiria outra implementação de transporte. WebSocket também poderia servir apenas à sinalização, sem substituir o DataChannel. Estas possibilidades são comparações técnicas, não propostas aprovadas. [RFC 6455](https://www.rfc-editor.org/info/rfc6455/).

## Consequências e limites

- **Inferência técnica:** separar `send()` da sinalização permite que o serviço HTTP trate a negociação sem encaminhar cada mensagem da aplicação; o custo efetivo não foi medido.
- WebRTC envolve negociação e travessia de NAT com ICE/STUN/TURN; a especificação não garante conexão direta em toda rede. O código examinado lista servidores STUN. [W3C WebRTC](https://www.w3.org/TR/webrtc/), [ICE_SERVERS](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/P2PService.ts#L31).
- Não há, neste registro, evidência de teste em dois aparelhos, ausência universal de relay, latência superior a WebSocket ou economia medida. F-01/F-02 e C-01/C-02 limitam essas afirmações; não são implementados por este ADR.

