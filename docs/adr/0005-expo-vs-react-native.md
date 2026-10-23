# ADR 0005 — Expo versus React Native puro

- **Status:** registro retrospectivo de stack observada; ratificação humana não comprovada.
- **Elaboração:** 09/10/2026. Não estabelece data de adoção ou motivos históricos.
- **Escopo:** A-04, backlog de Vitor, p.6; responsável humano no backlog: André.
- **Baseline:** `testes`, SHA `cb03a7b680744930dadca67d4d198f0cb19ecb3f`.

## Contexto

O manifesto móvel usa `expo-router/entry`, declara Expo `^55.0.25`, React Native `0.83.6` e `react-native-webrtc`. `app.json` contém configuração e plugins Expo. Essas são evidências de dependências e organização do projeto, não de aplicativo nativo já construído. [Entrada e dependências](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/package.json#L4), [Expo](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/package.json#L18), [React Native](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/package.json#L25), [plugins](https://gitlab.com/vitor_maia/tcc-2026/-/blob/cb03a7b680744930dadca67d4d198f0cb19ecb3f/apps/mobile/app.json#L15).

## Decisão observada

Registrar o uso de Expo sobre React Native, com roteamento Expo Router e módulos Expo declarados. Expo não substitui o runtime React Native neste projeto. O documento descreve a stack atual e não aprova migração, downgrade ou uma estratégia de build.

## Alternativa

React Native sem framework, iniciado com a Community CLI e ambiente nativo próprio, constitui a alternativa pedida como “React Native puro”. A documentação oficial descreve essa opção e distingue sua criação de um projeto que já utiliza Expo. [React Native sem framework](https://reactnative.dev/docs/getting-started-without-a-framework).

## Consequências e limites

- **Inferência técnica:** a estrutura atual concentra roteamento, configuração e módulos na stack Expo; retirar o framework exigiria avaliar essas dependências e sua integração. Nenhuma simplificação de manutenção ou produtividade histórica foi medida ou atribuída aos autores.
- Dependências com código nativo precisam integrar o binário correspondente. A documentação Expo descreve development builds e reconstrução ao mudar código nativo; isso explica uma exigência de integração, não comprova que ela foi cumprida aqui. [Development builds](https://docs.expo.dev/develop/development-builds/introduction/).
- O manifesto, scripts `expo start` e configuração não comprovam APK/dev-client pronto, compatibilidade em aparelho ou execução WebRTC entre dois dispositivos. Este ADR não resolve F-01/F-02 nem registra build ou publicação móvel.
- Versões citadas são declarações da baseline, não uma recomendação de versões atuais. Não há mudança em SDK, bibliotecas, ferramentas de build, configuração ou código em A-04.

