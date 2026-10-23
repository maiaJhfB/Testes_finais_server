# ADR 0003 — Durable Objects versus Redis

- **Status:** proposta pendente; nenhuma alternativa selecionada ou implantação comprovada.
- **Elaboração:** 09/10/2026; não é data de decisão operacional.
- **Escopo:** A-04, backlog de Vitor, p.6; responsável humano no backlog: André.
- **Baseline:** `testes`, SHA `cb03a7b680744930dadca67d4d198f0cb19ecb3f`.

## Contexto

A situação atual é um Cloudflare Worker com Workers KV: `Env.SIGNALING_KV` tem tipo `KVNamespace` e `wrangler.toml` declara `kv_namespaces`. O handler armazena oferta/resposta e acumula ICE com leitura seguida de escrita, usando expiração de 300 segundos. A configuração e o módulo examinados não contêm binding/classe de Durable Object ou cliente Redis. [Env](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/signaling-worker/src/index.ts#L19), [binding KV](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/signaling-worker/wrangler.toml#L9), [TTL](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/signaling-worker/src/index.ts#L36), [gravação](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/signaling-worker/src/index.ts#L113).

## Proposta pendente

Documentar a comparação solicitada no backlog, sem declarar Durable Objects adotado nem Redis implantado. A escolha entre as duas alternativas permanece pendente; este ADR mantém KV como baseline factual e não autoriza migração.

## Alternativas

| Alternativa | Capacidade documentada | Avaliação ainda necessária para o projeto |
| --- | --- | --- |
| Durable Objects | Objeto com identidade global, computação e armazenamento fortemente consistente, adequado à coordenação de clientes. [Documentação Cloudflare](https://developers.cloudflare.com/durable-objects/). | Definir identidade por sessão, ciclo de vida, expiração e integração ao protocolo HTTP atual. |
| Redis | Transações iniciadas por MULTI enfileiram comandos para execução atômica por EXEC. [Documentação Redis](https://redis.io/docs/latest/commands/multi/). | Definir modelo de chaves, concorrência, conectividade, persistência e operação do serviço escolhido. |

## Consequências e limites

Workers KV tem consistência eventual e não oferece a mesma garantia de uma operação de leitura/escrita em transação; a documentação alerta sobre essa diferença. [Consistência de KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

**Inferência técnica:** o padrão atual de ler, acrescentar ICE e gravar merece avaliação de concorrência e visibilidade entre localidades antes de escolher uma alternativa. Isso é um risco deduzido do código e da documentação; não é perda de candidato ou latência medida neste projeto.

Uma avaliação futura deve preservar oferta/resposta/ICE, expiração e comportamento dos clientes. Não há experimento, benchmark, resultado de migração ou aprovação humana para DO/Redis neste registro. Nenhum novo binding, serviço ou alteração de runtime é criado por A-04.

