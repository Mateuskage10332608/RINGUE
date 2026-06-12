# RINGUE 🥊

Simulador de boxe gerencial estilo Football Manager, construído em HTML/CSS/JS com Electron.

## Modos de jogo

- **Modo Atleta** — Crie seu lutador, suba nos rankings, conquiste cinturões mundiais e construa um legado
- **Modo Academia** — Gerencie uma academia, recrute atletas, agende lutas e construa um império do boxe
- **Modo Federação** _(em desenvolvimento)_

## Features

- 4 organizações mundiais com rankings próprios: WBC, WBA, IBF, WBO
- 53 promotoras em 3 tiers (global, continental, nacional) com afiliações por org
- Sistema GOAT com checklist de 10 critérios baseados em debates reais
- Hall da Fama com lendas históricas e indução automática
- Transição Atleta → Academia com bônus de legado escalados pelo GOAT score
- LiveFight animado com engine round-a-round
- ~4.800 lutadores NPC gerados ao iniciar — 12 categorias de peso × 5 continentes × 23 nacionalidades

## Como rodar

### Requisitos
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Rodar em modo desenvolvimento

```bash
npm install
npm start
```

### Gerar executável Windows

```bash
npm run build
# Executável gerado em dist/RINGUE-win32-x64/RINGUE.exe
```

## Estrutura do projeto

```
boxing-manager/
  css/style.css         — estilos
  js/
    data.js             — dados estáticos (promotoras, lendas, etc.)
    fighter.js          — modelo Fighter
    career.js           — GameState, rankings, matchmaking
    ui.js               — todas as telas
    livefight.js        — engine de luta ao vivo
    simulation.js       — simulação NPC
    training.js         — sistema de treino
    animation.js        — canvas do ringue
    news.js             — gerador de notícias
    main.js             — entry point, save/load
  electron/             — main process e preload
  index.html            — shell HTML
  package.json
```


Feito 98.5% Sem IA (O Claude tá ali porque eu usei ele algumas vezes para debugar uma dor de cabeça ou outra que eu tive no codigo)
