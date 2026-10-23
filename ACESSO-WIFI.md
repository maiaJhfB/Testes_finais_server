# Acesso da Cooperativa por Wi-Fi

Esta cópia deriva da correção de identidade/rotas de23/10 e prepara o cache e a resolução de dependências do Metro real. A entrega anterior e a origem `operacao-b04/envio-testes` permanecem intactas. A identidade usa o mesmo pacote `br.com.cooperativa.plataforma` e as mesmas chaves locais `cooperativa_wallet_pk`/`cooperativa_did`. Não limpe dados, desinstale o app ou crie outra identidade para tentar resolver conexão.

`expo start --dev-client --lan` fornece o JavaScript pelo Metro. O servidor da API é outro processo: precisa responder em `/nonce` na porta8787. A configuração original continua `http://192.168.15.11:8787`; ela só funcionará se esse for o IP atual do PC e o servidor estiver acessível. A causa da conexão relatada ainda não foi comprovada.

Os comandos abaixo são para Vitor executar quando quiser usar esta cópia. Nenhum servidor LAN foi iniciado pela correção. O APK Cooperativa de desenvolvimento anterior deve ser aberto por Vitor; não é necessário gerar outro APK para estas correções de JavaScript/configuração pública. Isso não comprova que o APK/rede atual aceita HTTP ou está conectado corretamente.

## Dependências já disponíveis neste PC

Existe uma junction em `aplicacao/node_modules` para `operacao-reparos-acesso/tcc-2026/node_modules`, **somente leitura**. Não execute `npm install`, `npm ci` ou atualizações por ela. Os helpers usam Node20, caches/temporários/estado próprios em `.output`, e estado do Metro em `apps/mobile/.expo`. Não use os antigos `dev.sh`, `setup.sh` ou atalhos de outras cópias. Se as dependências compartilhadas deixarem de existir, será necessária preparação de dependências próprias antes do uso.

Abra PowerShell na pasta desta cópia e defina o Node já instalado:

```powershell
Set-Location 'C:\programming\Dev TCC\operacao-diagnostico-abertura\2026-10-23\aplicacao'
$cooperativaNode = 'C:\Users\vitor\AppData\Local\nvm\v20.20.2\node.exe'
& $cooperativaNode scripts/dev.mjs worker --check
& $cooperativaNode scripts/dev.mjs metro --check
```

`--check` só confere configuração e dependências; não abre servidor nem celular. O resultado mostra a URL da API efetiva.

## Dois terminais

Se o Metro anterior estiver aberto no terminal em que você o iniciou, encerre **apenas esse Metro** com Ctrl+C antes de servir esta cópia. Assim o DevClient pode selecionar claramente o novo link. Não encerre processos ou terminais de outras pessoas.

No primeiro terminal, mantenha o Worker legado aberto:

```powershell
& $cooperativaNode scripts/dev.mjs worker
```

Esse comando disponibiliza o backend local na porta8787 e nas interfaces do PC. Não muda firewall, não publica na internet e não usa o backend LAB. Feche este processo com Ctrl+C no próprio terminal quando terminar.

No segundo terminal, entre na mesma pasta e use o **IP do PC no mesmo Wi-Fi**, igual ao host LAN que o Metro mostra. O exemplo `192.0.2.44` abaixo é ilustrativo e deve ser substituído pelo IP real do PC:

```powershell
Set-Location 'C:\programming\Dev TCC\operacao-diagnostico-abertura\2026-10-23\aplicacao'
$cooperativaNode = 'C:\Users\vitor\AppData\Local\nvm\v20.20.2\node.exe'
$env:EXPO_PUBLIC_SIGNALING_SERVER_URL = 'http://192.0.2.44:8787'
& $cooperativaNode scripts/dev.mjs metro --check
& $cooperativaNode scripts/dev.mjs metro
```

O helper executa o equivalente a `expo start --dev-client --lan` nesta cópia, preparando os diretórios de cache antes do Metro. O desenvolvimento segue o modo normal do CLI, incluindo consultas ao Expo. Para trabalhar offline, defina explicitamente `$env:EXPO_OFFLINE = '1'` antes do helper; ele preserva essa escolha. Com a ExpoHome própria ainda vazia, esse modo pode avisar que não conseguiu resolver os assets do manifest porque a consulta ao schema foi abortada. Nos testes locais, manifest e bundle ainda responderam; isso não comprova abertura do APK. `EXPO_OFFLINE` não desliga a rede do app. Os testes automatizados continuam offline.

O valor público deve ser uma origem HTTP(S), sem `/nonce`, caminho, senha ou parâmetros. Auth e P2P recebem o mesmo `extra.SIGNALING_SERVER_URL`. O domínio SIWE, chain137 e o protocolo legado são preservados.

Confira se o IP do link LAN do Metro coincide com o escolhido para a API. Se diferir, encerre apenas o Metro que você acabou de iniciar com Ctrl+C, ajuste a variável e inicie novamente. Não é necessário encerrar outros processos. Porta Metro ocupada não significa que o Worker esteja pronto; use a porta que o Metro indicar.

Uma conferência no PC, em outro PowerShell, é:

```powershell
Invoke-RestMethod 'http://IP_REAL_DO_PC:8787/nonce'
```

O resultado esperado é `nonce` com32 caracteres hexadecimais. Esse teste no PC não prova o acesso pelo telefone. Se falhar, não prossiga criando outra identidade: confira terminal do Worker, URL e rede. Se funcionar no PC e falhar no app, ainda podem existir limites de alcance Wi-Fi, isolamento da rede, firewall ou política HTTP do binário. Essas causas precisam de evidência própria; não são corrigidas por nonce falso ou sessão offline.

Depois de selecionar esta cópia no DevClient, uma carteira já salva é carregada automaticamente. Em erro de rede, use **Tentar entrar novamente**: a mesma chave é reutilizada. `Sair` mantém a semântica antiga de exclusão da carteira; não use essa ação como teste de conexão.

## Validação feita

Esta entrega corrige a preparação do cache Metro; não foi identificada a causa do fechamento do APK. O smoke local inicia o CLI Expo real em loopback temporário, solicita manifest e a URL real do bundle e verifica a gravação do cache em partida fria e quente. O comportamento online do CLI e a abertura no Android não foram validados. Não houve telefone, ADB, USB, inspeção, backend humano, servidor LAN persistente, novo APK, deploy ou publicação. A identidade e os dados do aparelho permanecem intactos.
