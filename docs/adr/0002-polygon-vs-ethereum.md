# ADR 0002 — Polygon versus Ethereum

- **Status:** registro retrospectivo de configuração observada; ratificação humana não comprovada.
- **Elaboração:** 09/10/2026. Não estabelece data de adoção ou motivos históricos.
- **Escopo:** A-04, backlog de Vitor, p.6; responsável humano no backlog: André.
- **Baseline:** `testes`, SHA `cb03a7b680744930dadca67d4d198f0cb19ecb3f`.

## Contexto

Hardhat configura Amoy com `chainId: 80002` e Polygon com `chainId: 137`. No aplicativo, `POLYGON_RPC_URL` aponta para Amoy e `IDENTITY_CONTRACT_ADDRESS` está vazio. Essas configurações identificam redes pretendidas e não comprovam implantação de contrato. [Amoy](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/contracts/hardhat.config.ts#L20), [Polygon](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/contracts/hardhat.config.ts#L26), [configuração móvel](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/app.json#L51).

## Decisão observada

Registrar Polygon e Amoy como os destinos configurados para o registro de identidade. O projeto continua usando Solidity e ethers; ferramentas e formato de contas não equivalem à escolha da rede Ethereum Mainnet. A documentação oficial identifica Amoy como testnet e distingue os identificadores 80002 e 137. [Contrato Solidity](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/packages/contracts/contracts/IdentityRegistry.sol#L2), [provider ethers](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/IdentityService.ts#L69), [documentação Polygon](https://docs.polygon.technology/tools/dApp-development/common-tools/remix/).

## Alternativa

Ethereum Mainnet, ou uma testnet Ethereum para desenvolvimento, constitui uma alternativa de rede. A documentação Ethereum distingue redes independentes e informa que saldo e histórico não são transferidos entre elas. O uso da mesma conta não transforma redes diferentes em um único ambiente. [Redes Ethereum](https://ethereum.org/en/developers/docs/networks/).

## Consequências e limites

- **Inferência técnica:** RPC, identificador de rede, endereço do contrato e contexto da assinatura precisam corresponder ao ambiente efetivamente usado. O valor SIWE fixado em 137 e o RPC móvel Amoy precisam ser considerados em validações de integração; este documento não os altera. [Mensagem SIWE](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/src/services/IdentityService.ts#L154).
- A presença de configurações, contrato compilável ou testes na rede Hardhat local não comprova deploy Polygon/Amoy/Ethereum. Nenhum endereço de implantação ou recibo de transação é validado aqui.
- Não se atribui a escolha histórica a custo ou desempenho. Não há comparação de taxas, benchmark ou recomendação financeira neste ADR. Qualquer mudança de rede depende de uma decisão posterior, fora de A-04.

