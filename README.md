# RINGUE

Simulador de carreira e gestão de boxe construído em HTML, CSS e JavaScript, distribuído como aplicativo desktop com Electron.

Versão atual: **1.4.0**

## Modos de jogo

- **Modo Atleta:** crie um lutador, desenvolva atributos, negocie contratos, dispute títulos e construa um legado.
- **Modo Academia:** comece como manager ou continue o mundo após aposentar um atleta, administrando estrutura, finanças e elenco.
- **Modo Promotor:** planejado. Os sistemas compartilhados de atletas, mídia, rivalidades e história já formam sua base.

Cada slot mantém sua própria linha do tempo, população de NPCs, recordes, eras, Hall da Fama e acontecimentos mundiais.

## Principais sistemas

### Carreira do atleta

- Categorias de peso, rankings e cards variados em todos os níveis.
- Campeonatos locais, regionais, nacionais e continentais.
- Cinturões mundiais WBC, WBA, IBF e WBO, incluindo unificações.
- Super-cinturões independentes por organização e categoria de peso.
- Desafios para campeões continentais e mundiais e para atletas bem ranqueados.
- Mudança de divisão com adaptação, riscos, recompensas e consequências.
- Torneios com premiação financeira, prestígio e troféus especiais.
- Contratos, promotores, agentes, negociações e obrigações de mídia.

### Mundo vivo

- Cerca de 4.800 lutadores NPC distribuídos por 12 categorias, países e continentes.
- NPCs lutam entre si, treinam, envelhecem, perdem atributos, mudam de posição e se aposentam.
- Novos prospectos entram anualmente para preservar a população mundial.
- Estilos, personalidades, nacionalidades e traits afetam confrontos e valor comercial.
- Rivalidades, revanches, provocações e memória entre lutadores.
- Aposentados são removidos dos rankings e preservados no histórico.

### Legado e história dinâmica

- Pontuação GOAT baseada em vitórias, nocautes, títulos, defesas, unificações, super-cinturões, divisões e grandes eventos.
- Hall da Fama com exigência mínima de 800 pontos GOAT e carreira mundial relevante.
- Top 3 do debate GOAT entre lendas históricas e lutadores gerados pelo mundo.
- Recordes mundiais que podem ser quebrados durante cada linha do tempo.
- Rankings históricos anuais com os 25 principais nomes.
- Dinastias, gerações de cinco anos e eras reconhecidas dinamicamente.
- Comparador direto entre campeões atuais, aposentados e lendas.
- Prêmios anuais com cerimônia própria, animações e arquivo histórico.
- Histórico de reinados, defesas continentais e mundiais e anos como campeão.

### Mídia e eventos

- Notícias locais, regionais, nacionais, continentais e mundiais.
- Banco amplo de comentários sociais, analistas e cobertura editorial.
- Entrevistas e coletivas adaptadas à importância da luta.
- Arenas e públicos escalados em 20 patamares.
- Cards completos com lutas de diferentes categorias.
- Métodos de resultado como KO, TKO, decisões, interrupção médica, RTD, DQ, decisão técnica, empate técnico e No Contest.

### Modo Academia

- Início independente como manager.
- Transição Atleta → Academia após aposentadoria.
- Recursos, reputação e vantagens iniciais influenciados pela carreira do fundador.
- Recrutamento de prospectos, elenco, treinamento e gestão financeira.
- Base compartilhada com os NPCs, estilos, personalidades e história do mundo.

## Como executar

### Requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- npm

```bash
npm install
npm start
```

## Testes

```bash
npm test
```

A suíte cobre progressão, títulos, NPCs, mídia, torneios, aposentadoria, academia, saves e história dinâmica.

## Gerar executável para Windows

```bash
npm run build
```

O executável será gerado em `dist/RINGUE-win32-x64/RINGUE.exe`.

## Estrutura

```text
boxing-manager/
  css/style.css
  electron/
  js/
    animation.js
    career.js
    data.js
    fighter.js
    i18n.js
    livefight.js
    main.js
    media-data.js
    news.js
    simulation.js
    training.js
    ui.js
  tests/core.test.js
  index.html
  package.json
```


Feito 98.5% Sem IA (O Claude tá ali porque eu usei ele algumas vezes para debugar uma dor de cabeça ou outra que eu tive no codigo)
