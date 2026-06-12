const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const storage = new Map();
  const testMath = Object.create(Math);
  const context = vm.createContext({
    console,
    Math: testMath,
    Date,
    JSON,
    Intl,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
    document: {
      getElementById: () => ({ onclick: null }),
      documentElement: { lang: 'pt-BR' },
    },
  });
  context.window = context;

  for (const file of ['i18n.js', 'data.js', 'fighter.js', 'simulation.js', 'livefight.js', 'training.js', 'career.js', 'media-data.js', 'news.js', 'ui.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }

  vm.runInContext(`
    this.exportsForTests = {
      Fighter, FightSimulation, LiveFightEngine, TrainingCamp, GameState, UI,
      generateId, PROMOTERS, NewsGenerator, MEDIA_DATABASE,
      TRAINING_FOCUSES, BELT_CULTURE, NATIONALITIES, WEIGHT_CLASSES,
      NAMES, getBeltDisplayName, PRE_FIGHT_QUESTIONS, MEDIA_NEWS_BANK,
      pickPreFightQuestions, pickInterviewQuestions, FACE_OFF_CHOICES,
      MEDIA_CRISES, MEDIA_CRISIS_RESPONSES, EVENT_ARENAS, EVENT_SCOPE_ORDER, getEventArena,
      FIGHT_METHOD_GROUPS, fightMethodIn,
      isKnockoutResult, isDecisionResult, I18n,
      getStyleMatchup, getFighterMatchupReport, chooseNpcStrategy, getFightMarketability,
      ACADEMY_PHILOSOPHIES
    };
  `, context);
  return { ...context.exportsForTests, storage, context };
}

function createFighter(Fighter, opts = {}) {
  return new Fighter({
    name: 'Teste',
    nationality: 'BR',
    weightClass: 'welter',
    styleId: 'technical',
    personalityId: 'disciplined',
    strength: 60,
    speed: 60,
    stamina: 60,
    chin: 60,
    durability: 60,
    reflexes: 60,
    jab: 60,
    straight: 60,
    cross: 60,
    uppercut: 60,
    defense: 60,
    footwork: 60,
    bodyPunch: 60,
    combinations: 60,
    distance: 60,
    clinch: 60,
    counter: 60,
    precision: 60,
    ringIQ: 60,
    courage: 60,
    discipline: 60,
    composure: 60,
    adaptation: 60,
    pressure: 60,
    resilience: 60,
    ...opts,
  });
}

test('luta comum nao transfere cinturao', () => {
  const { Fighter, FightSimulation } = loadGame();
  const champion = createFighter(Fighter, { id: 10, name: 'Campeao', belts: ['WBC'] });
  const challenger = createFighter(Fighter, { id: 11, name: 'Desafiante' });
  const sim = new FightSimulation(champion, challenger);
  sim.finalResult = {
    method: 'Decisao Unanime',
    round: 12,
    winnerFighter: challenger,
    loserFighter: champion,
    isDraw: false,
  };

  sim.applyResult();

  assert.deepEqual(Array.from(champion.belts), ['WBC']);
  assert.deepEqual(Array.from(challenger.belts), []);
});

test('luta de titulo transfere somente o cinturao disputado', () => {
  const { Fighter, FightSimulation } = loadGame();
  const champion = createFighter(Fighter, { id: 20, belts: ['WBC', 'WBA'] });
  const challenger = createFighter(Fighter, { id: 21 });
  const sim = new FightSimulation(champion, challenger, {
    isTitleFight: true,
    contestedBelts: ['WBC'],
  });
  sim.finalResult = {
    method: 'KO',
    round: 5,
    winnerFighter: challenger,
    loserFighter: champion,
    isDraw: false,
  };

  sim.applyResult();

  assert.deepEqual(Array.from(champion.belts), ['WBA']);
  assert.deepEqual(Array.from(challenger.belts), ['WBC']);
});

test('load avanca ids e restaura referencias das ofertas', () => {
  const { Fighter, GameState, PROMOTERS, generateId } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 100, name: 'Jogador', isPlayer: true });
  const opponent = createFighter(Fighter, { id: 250, name: 'Oponente' });
  gs.allFighters = [opponent];
  gs.availableFights = [{
    id: 400,
    opponent,
    rounds: 8,
    purse: 10000,
    promoter: PROMOTERS[0],
  }];
  gs.nextFight = gs.availableFights[0];
  gs.save(1);

  const loaded = new GameState();
  assert.equal(loaded.load(1), true);
  assert.equal(loaded.availableFights[0].opponent, loaded.allFighters[0]);
  assert.equal(loaded.nextFight.opponent, loaded.allFighters[0]);
  assert.ok(generateId() > 400);
});

test('bonus de personalidade entra no ganho de treino', () => {
  const { Fighter, TrainingCamp } = loadGame();
  const disciplined = createFighter(Fighter, { personalityId: 'disciplined' });
  const volatile = createFighter(Fighter, { personalityId: 'volatile' });

  const disciplinedCamp = new TrainingCamp(disciplined, 4, ['conditioning']);
  const volatileCamp = new TrainingCamp(volatile, 4, ['conditioning']);

  assert.equal(disciplinedCamp.personalityGainMod, 0.15);
  assert.equal(volatileCamp.personalityGainMod, -0.05);
});

test('novas ofertas evitam repetir adversarios quando ha alternativas', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 500,
    name: 'Jogador',
    isPlayer: true,
    ranking: 1,
    wins: 0,
  });
  gs.allFighters = Array.from({ length: 5 }, (_, index) =>
    createFighter(Fighter, {
      id: 600 + index,
      name: `Oponente ${index}`,
      ranking: index + 2,
      wins: index,
      losses: 0,
    })
  );
  gs.rankings.welter = [gs.player, ...gs.allFighters];

  const first = gs.generateAvailableFights().map(f => f.opponent.id);
  const refreshed = gs.refreshAvailableFights().map(f => f.opponent.id);

  assert.equal(refreshed.length, 4);
  assert.equal(first.some(id => refreshed.includes(id)), false);
});

test('historico de titulos preserva cinturao perdido e migra titulos territoriais antigos', () => {
  const { Fighter } = loadGame();
  const migrated = createFighter(Fighter, {
    belts: ['local:BR'],
  });
  assert.deepEqual(Array.from(migrated.belts), []);
  assert.equal(migrated.trophies.length, 1);
  assert.equal(migrated.trophies[0].tier, 'local');

  const veteran = createFighter(Fighter, {
    belts: [],
    titlesWon: ['local:BR', 'regional:BR'],
  });
  assert.deepEqual(Array.from(veteran.titlesWon), []);
  assert.equal(veteran.trophies.length, 2);
});

test('legado separa titulos locais de conquistas maiores', () => {
  const { Fighter, UI } = loadGame();
  const player = createFighter(Fighter, {
    isPlayer: true,
    wins: 6,
    losses: 0,
    belts: ['WBC'],
    titlesWon: ['local:BR', 'regional:BR', 'continental:americas', 'WBC'],
    totalTitleWins: 1,
  });
  const root = { innerHTML: '' };
  const ui = Object.create(UI.prototype);
  ui.gs = {
    player,
    week: 1,
    year: 2024,
  };
  ui.root = root;

  ui._render_legacy();

  assert.match(root.innerHTML, /Conquistas Menores/);
  assert.match(root.innerHTML, /Campeão Local/);
  assert.match(root.innerHTML, /Campeão Regional/);
  assert.match(root.innerHTML, /Conquistas Maiores/);
  assert.match(root.innerHTML, /Cinturão Continental \(Américas\)/);
  assert.match(root.innerHTML, /Cinturão Mundial WBC/);
  assert.match(root.innerHTML, /Fatos Impressionantes/);
});

test('apagar slot 1 remove tambem o save legado para ele nao voltar', () => {
  const { GameState, storage } = loadGame();
  storage.set('ringue_save_1', '{"player":{"name":"Atual"}}');
  storage.set('ringue_save', '{"player":{"name":"Legado"}}');
  const gs = new GameState();

  gs.deleteSave(1);

  assert.equal(storage.has('ringue_save_1'), false);
  assert.equal(storage.has('ringue_save'), false);
  assert.equal(gs.hasSave(1), false);
});

test('assinar contrato paga luvas e força promotora nas ofertas', () => {
  const { Fighter, GameState, PROMOTERS } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 900,
    isPlayer: true,
    wins: 10,
    popularity: 50,
    reputation: 50,
    money: 5000,
  });
  gs.allFighters = Array.from({ length: 8 }, (_, index) =>
    createFighter(Fighter, {
      id: 910 + index,
      name: `Rival ${index}`,
      ranking: index + 1,
    })
  );
  gs.rebuildRankings();
  const promoter = PROMOTERS.find(p => p.id === 'thunder');
  const offer = gs._makeContractOffer(promoter, 0);
  gs.contractOffers = [offer];
  const moneyBefore = gs.player.money;

  assert.equal(gs.acceptContractOffer(offer.id), true);
  assert.equal(gs.player.money, moneyBefore + offer.signingBonus);
  assert.equal(gs.player.contract.promoterId, 'thunder');
  assert.ok(gs.availableFights.length > 0);
  assert.equal(gs.availableFights.every(f => f.promoter.id === 'thunder'), true);
});

test('contrato aplica bonus de vitoria e nocaute no pagamento', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 950, isPlayer: true });
  gs.player.contract = {
    promoterId: 'thunder',
    promoterName: 'Thunder Productions',
    fightsRemaining: 3,
    purseMultiplier: 1.2,
    winBonus: 0.2,
    knockoutBonus: 0.15,
  };
  const fight = { purse: 10000 };
  const result = {
    winnerFighter: gs.player,
    loserFighter: null,
    isDraw: false,
    method: 'KO',
  };

  assert.equal(gs.calculateFightPayout(fight, result), 13500);
});

test('contrato termina depois da ultima luta', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 970, isPlayer: true });
  gs.player.contract = {
    promoterId: 'steel',
    promoterName: 'Steel Fist Events',
    fightsRemaining: 1,
  };

  gs._progressContractAfterFight({});

  assert.equal(gs.player.contract, null);
  assert.match(gs.news[0].headline, /chegou ao fim/);
});

test('agente melhora termos basicos das propostas', () => {
  const { Fighter, GameState, PROMOTERS } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 980,
    isPlayer: true,
    wins: 10,
    popularity: 40,
  });
  const promoter = PROMOTERS.find(p => p.id === 'thunder');
  const withoutAgent = gs._makeContractOffer(promoter, 0);
  const withAgent = gs._makeContractOffer(promoter, 0.25);

  assert.ok(withAgent.purseMultiplier > withoutAgent.purseMultiplier);
  assert.ok(withAgent.signingBonus > withoutAgent.signingBonus);
});

test('base de midia oferece variedade extensa para redes e analistas', () => {
  const { Fighter, GameState, NewsGenerator } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 990, isPlayer: true });
  const stats = new NewsGenerator(gs).getDatabaseStats();

  assert.ok(stats.fanComments >= 200);
  assert.ok(stats.analystComments >= 120);
  assert.ok(stats.users >= 30);
});

test('banco de noticias possui milhares de combinacoes editoriais', () => {
  const { MEDIA_NEWS_BANK } = loadGame();
  const outlets = Object.values(MEDIA_NEWS_BANK.outlets).reduce((sum, list) => sum + list.length, 0);
  const combinations = outlets * MEDIA_NEWS_BANK.leads.length *
    MEDIA_NEWS_BANK.subjects.length * MEDIA_NEWS_BANK.endings.length;
  assert.ok(combinations >= 10000);
});

test('coletiva pre-luta existe apenas para nacional continental e mundial', () => {
  const { pickPreFightQuestions } = loadGame();
  assert.equal(pickPreFightQuestions('local').length, 0);
  assert.equal(pickPreFightQuestions('regional').length, 0);
  assert.equal(pickPreFightQuestions('national').length, 2);
  assert.equal(pickPreFightQuestions('continental').length, 2);
  assert.equal(pickPreFightQuestions('world').length, 2);
});

test('comentarios sociais usam apenas categorias compativeis com o resultado', () => {
  const { Fighter, GameState, NewsGenerator, MEDIA_DATABASE } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 992, name: 'Rival Contextual' });
  gs.player = createFighter(Fighter, {
    id: 991,
    isPlayer: true,
    name: 'Atleta Contextual',
    wins: 8,
    losses: 1,
  });
  gs.rankings.welter = [gs.player, opponent];
  const generator = new NewsGenerator(gs);
  const result = {
    winnerFighter: gs.player,
    loserFighter: opponent,
    isDraw: false,
    isControversial: true,
    method: 'Decisao Dividida',
    round: 10,
  };
  const context = generator._buildMediaContext({
    fight: { opponent, risk: 4, purse: 10000 },
    result,
  });
  const pool = generator._fanTemplatePool(context);

  assert.equal(context.won, true);
  assert.equal(context.controversial, true);
  assert.ok(pool.includes(MEDIA_DATABASE.fans.win[0]));
  assert.ok(pool.includes(MEDIA_DATABASE.fans.decisionWin[0]));
  assert.ok(pool.includes(MEDIA_DATABASE.fans.controversial[0]));
  assert.equal(pool.includes(MEDIA_DATABASE.fans.loss[0]), false);
});

test('comentarios gerados sao unicos e substituem variaveis de contexto', () => {
  const { Fighter, GameState, NewsGenerator } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 994, name: 'Carlos Rival' });
  gs.player = createFighter(Fighter, {
    id: 993,
    isPlayer: true,
    name: 'Joao Campeao',
    wins: 12,
    losses: 0,
    belts: ['WBC'],
  });
  gs.rankings.welter = [opponent, gs.player];
  const generator = new NewsGenerator(gs);
  const result = {
    winnerFighter: gs.player,
    loserFighter: opponent,
    isDraw: false,
    isControversial: false,
    method: 'KO',
    round: 4,
  };
  const comments = generator.getFanComments(15, {
    fight: { opponent, risk: 5, purse: 30000, titleBelt: 'WBC' },
    result,
  });

  assert.equal(comments.length, 15);
  assert.equal(new Set(comments.map(comment => comment.text)).size, comments.length);
  assert.equal(comments.some(comment => /\{\w+\}/.test(comment.text)), false);
});

test('programa de analistas mantem formato da UI e falas contextuais', () => {
  const { Fighter, GameState, NewsGenerator } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 996, name: 'Pedro Desafiante' });
  gs.player = createFighter(Fighter, {
    id: 995,
    isPlayer: true,
    name: 'Marcos Tecnico',
  });
  gs.rankings.welter = [gs.player, opponent];
  const result = {
    winnerFighter: gs.player,
    loserFighter: opponent,
    isDraw: false,
    isControversial: false,
    method: 'TKO',
    round: 7,
  };
  const show = new NewsGenerator(gs).generateShowSegment('post_fight', {
    fight: { opponent, risk: 3, purse: 15000 },
    result,
  });

  assert.equal(show.lines.length, 4);
  assert.equal(show.lines.every(line => line.host?.name && line.host?.role && line.text), true);
  assert.equal(show.lines.some(line => /\{\w+\}/.test(line.text)), false);
  assert.equal(new Set(show.lines.map(line => line.text)).size, 4);
});

test('lutador no top 20 pode receber desafio direto', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1001,
    isPlayer: true,
    name: 'Alvo do Ranking',
    wins: 15,
  });
  gs.allFighters = Array.from({ length: 20 }, (_, index) =>
    createFighter(Fighter, {
      id: 1010 + index,
      name: `Desafiante ${index}`,
      wins: 14 - Math.floor(index / 4),
      losses: index % 3,
      popularity: 45 - index,
    })
  );
  gs.rebuildRankings();
  gs.player.ranking = Math.min(gs.player.ranking || 20, 20);

  const challenge = gs.generateIncomingChallenge(true);

  assert.ok(challenge);
  assert.equal(challenge.incomingChallenge, true);
  assert.equal(challenge.status, 'pending');
  assert.equal(gs.incomingChallenges.length, 1);
});

test('campeao recebe desafio com o proprio cinturao em jogo', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1101,
    isPlayer: true,
    name: 'Campeao Teste',
    wins: 25,
    belts: ['WBC'],
  });
  gs.allFighters = Array.from({ length: 15 }, (_, index) =>
    createFighter(Fighter, {
      id: 1110 + index,
      name: `Contender ${index}`,
      wins: 20 - index,
      losses: index % 4,
      belts: [],
    })
  );
  gs.rebuildRankings();

  const challenge = gs.generateIncomingChallenge(true);

  assert.ok(challenge);
  assert.equal(challenge.titleBelt, 'WBC');
  assert.equal(challenge.isTitle, true);
  assert.equal(challenge.rounds, 12);
});

test('campeao continental recebe desafio com o cinturao em jogo', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1151, isPlayer: true, nationality: 'BR', wins: 20,
    belts: ['continental:americas'],
  });
  gs.allFighters = Array.from({ length: 15 }, (_, index) =>
    createFighter(Fighter, {
      id: 1160 + index,
      nationality: index % 2 ? 'US' : 'BR',
      wins: 18 - index,
      losses: index % 3,
    })
  );
  gs.rebuildRankings();

  const challenge = gs.generateIncomingChallenge(true);

  assert.ok(challenge);
  assert.equal(challenge.titleBelt, 'continental:americas');
  assert.equal(challenge.isTitle, true);
  assert.equal(challenge.rounds, 12);
});

test('historico de reinado encerra ao perder cinturao continental', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 1182, name: 'Novo Campeao' });
  gs.player = createFighter(Fighter, {
    id: 1181, isPlayer: true,
    belts: ['continental:americas'],
    beltDefenses: { 'continental:americas': 2 },
    titleReigns: [{
      belt: 'continental:americas', weightClass: 'welter',
      startYear: 2024, startWeek: 10, endYear: null, endWeek: null, defenses: 2,
    }],
  });
  gs.year = 2026;
  gs.week = 12;
  gs.nextFight = {
    id: 9001, opponent, titleBelt: 'continental:americas',
    purse: 1000, rounds: 12,
  };
  const sim = {
    finalResult: {
      winnerFighter: opponent, loserFighter: gs.player,
      isDraw: false, isNoContest: false, method: 'Decisao Unanime', round: 12,
    },
    getSummary: () => ({}),
    applyResult: () => {},
  };

  gs.processFightResult(sim);

  const reign = gs.player.titleReigns[0];
  assert.equal(reign.endYear, 2026);
  assert.equal(reign.endWeek, 12);
  assert.equal(reign.endReason, 'lost');
  assert.equal(reign.endedBy, 'Novo Campeao');
  assert.equal(reign.defenses, 2);
});

test('aceitar e recusar desafios aplica as consequencias esperadas', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 1202, name: 'Rival Direto' });
  gs.player = createFighter(Fighter, {
    id: 1201,
    isPlayer: true,
    reputation: 60,
  });
  const first = { ...gs._makeOffer(opponent), incomingChallenge: true, status: 'pending', expiresIn: 4 };
  gs.incomingChallenges = [first];

  const declined = gs.declineIncomingChallenge(first.id);
  assert.equal(declined.success, true);
  assert.equal(gs.player.reputation, 59);

  const second = { ...gs._makeOffer(opponent), incomingChallenge: true, status: 'pending', expiresIn: 4 };
  gs.incomingChallenges = [second];
  const accepted = gs.acceptIncomingChallenge(second.id);
  assert.equal(accepted.success, true);
  assert.equal(gs.nextFight.id, second.id);
  assert.equal(gs.incomingChallenges.length, 0);
});

test('desafios e desgaste persistem no save', () => {
  const { Fighter, GameState, storage } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 1302, name: 'Rival Persistente' });
  gs.player = createFighter(Fighter, {
    id: 1301,
    isPlayer: true,
    weeksSinceTraining: 16,
    careerWear: 9,
  });
  gs.allFighters = [opponent];
  gs.incomingChallenges = [{
    ...gs._makeOffer(opponent),
    incomingChallenge: true,
    status: 'pending',
    expiresIn: 3,
  }];
  gs.save(2);

  const restored = new GameState();
  assert.equal(restored.load(2), true);
  assert.equal(restored.player.weeksSinceTraining, 16);
  assert.equal(restored.player.careerWear, 9);
  assert.equal(restored.incomingChallenges.length, 1);
  assert.equal(restored.incomingChallenges[0].opponent.id, opponent.id);
  storage.delete('ringue_save_2');
});

test('inatividade acumula desgaste e treino restaura a forma', () => {
  const { Fighter } = loadGame();
  const fighter = createFighter(Fighter, {
    age: 38,
    peakAge: 28,
    weeksSinceTraining: 20,
    careerWear: 10,
  });
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const losses = fighter.applyCareerWear(4);
    assert.ok(losses.length > 0);
    assert.equal(fighter.weeksSinceTraining, 24);
    assert.equal(fighter.conditioningStatus, 'Fora de forma');
    assert.ok(fighter.retirementRisk > 50);
  } finally {
    Math.random = originalRandom;
  }

  fighter.markTraining();
  assert.equal(fighter.weeksSinceTraining, 0);
  assert.equal(fighter.conditioningStatus, 'Em forma');
});

test('inatividade reduz atributos mais cedo e mais forte depois do auge', () => {
  const { Fighter } = loadGame();
  const young = createFighter(Fighter, {
    age: 24, peakAge: 29, speed: 80, stamina: 80, reflexes: 80,
  });
  const veteran = createFighter(Fighter, {
    age: 38, peakAge: 29, speed: 80, stamina: 80, reflexes: 80,
    footwork: 80, precision: 80, defense: 80, composure: 80, ringIQ: 80,
  });

  const youngLosses = young.applyCareerWear(6);
  const veteranLosses = veteran.applyCareerWear(6);

  assert.equal(youngLosses.length, 0);
  assert.ok(veteranLosses.length >= 2);
  assert.ok(veteranLosses.reduce((sum, loss) => sum + loss.amount, 0) >= 2);
  assert.ok(veteran.careerWear > young.careerWear);
});

test('treino recupera parcialmente perdas recentes de inatividade', () => {
  const { Fighter } = loadGame();
  const fighter = createFighter(Fighter, {
    age: 25, peakAge: 29, speed: 80, stamina: 80,
    weeksSinceTraining: 7,
  });
  fighter.applyCareerWear(1);
  const lostTotal = Object.values(fighter.inactivityLosses).reduce((sum, value) => sum + value, 0);
  const valuesBefore = { speed: fighter.speed, stamina: fighter.stamina, reflexes: fighter.reflexes,
    strength: fighter.strength, durability: fighter.durability };

  const recovered = fighter.markTraining();

  assert.ok(lostTotal >= 1);
  assert.ok(recovered.length >= 1);
  assert.equal(fighter.weeksSinceTraining, 0);
  assert.ok(recovered.some(attr => fighter[attr] === valuesBefore[attr] + 1));
});

test('todos os atributos solicitados possuem foco de treinamento', () => {
  const { TRAINING_FOCUSES } = loadGame();
  const trained = new Set(TRAINING_FOCUSES.flatMap(focus => focus.attrs));

  for (const attr of ['straight', 'courage', 'composure', 'resilience']) {
    assert.equal(trained.has(attr), true, `${attr} precisa ter foco de treino`);
  }
});

test('potencial afeta crescimento sem criar teto abaixo de 99', () => {
  const { Fighter, TrainingCamp, TRAINING_FOCUSES } = loadGame();
  const fighter = createFighter(Fighter, {
    straight: 92,
    cross: 92,
    potential: 93,
    discipline: 99,
  });
  const focus = TRAINING_FOCUSES.find(item => item.id === 'straight');
  const originalRisk = focus.risk;
  const originalRandom = Math.random;
  focus.risk = 0;
  Math.random = () => 0.99;
  try {
    new TrainingCamp(fighter, 12, ['straight']).simulate();
  } finally {
    focus.risk = originalRisk;
    Math.random = originalRandom;
  }
  assert.ok(fighter.straight > 93);
  assert.ok(fighter.cross > 93);
  assert.ok(fighter.straight <= 99);
  assert.ok(fighter.cross <= 99);
});

test('banco cultural cobre cada pais na escala 4 nacionais 20 regionais 70 locais', () => {
  const { BELT_CULTURE, NATIONALITIES } = loadGame();

  for (const nationality of NATIONALITIES) {
    const culture = BELT_CULTURE[nationality];
    assert.ok(culture, `cultura ausente para ${nationality}`);
    assert.equal(culture.national.length, 4, `nacionais de ${nationality}`);
    assert.equal(culture.regional.length, 20, `regionais de ${nationality}`);
    assert.equal(culture.local.length, 70, `locais de ${nationality}`);
    assert.equal(new Set(culture.regional).size, 20);
    assert.equal(new Set(culture.local).size, 70);
  }
});

test('campeonatos territoriais sao deterministas e acompanham o ano da edicao', () => {
  const { getBeltDisplayName } = loadGame();
  const first = getBeltDisplayName('local:BR', { year: 2028, weightClass: 'welter' });
  const second = getBeltDisplayName('local:BR', { year: 2028, weightClass: 'welter' });

  assert.equal(first, second);
  assert.match(first, /2028/);
  assert.match(getBeltDisplayName('regional:BR', { year: 2029, weightClass: 'welter' }), /2029/);
  assert.match(getBeltDisplayName('national:BR', { year: 2030, weightClass: 'welter' }), /2030/);
  assert.notEqual(
    getBeltDisplayName('local:BR', { year: 2028, weightClass: 'welter' }),
    getBeltDisplayName('local:BR', { year: 2029, weightClass: 'welter' })
  );
  assert.notEqual(
    getBeltDisplayName('regional:BR', { year: 2028, weightClass: 'welter' }).replace(/ 2028$/, ''),
    getBeltDisplayName('regional:BR', { year: 2029, weightClass: 'welter' }).replace(/ 2029$/, '')
  );
  assert.notEqual(getBeltDisplayName('national:IE', { weightClass: 'welter' }), 'IENB');
  assert.notEqual(getBeltDisplayName('national:NZ', { weightClass: 'welter' }), 'NZNB');
});

test('cinturao continental de outro continente nao entra em oferta', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1401,
    isPlayer: true,
    nationality: 'BR',
  });
  const european = createFighter(Fighter, {
    id: 1402,
    nationality: 'GB',
    belts: ['continental:europa'],
  });

  const offer = gs._makeOffer(european);
  assert.equal(offer.titleBelt, null);
  assert.equal(offer.isTitle, false);
});

test('trofeus territoriais podem ser conquistados repetidas vezes', () => {
  const { Fighter, GameState, PROMOTERS } = loadGame();
  const gs = new GameState();
  const opponent = createFighter(Fighter, { id: 1502, name: 'Rival de Copa' });
  gs.player = createFighter(Fighter, {
    id: 1501,
    isPlayer: true,
    name: 'Colecionador',
    wins: 3,
  });
  gs.allFighters = [opponent];

  for (let index = 0; index < 2; index++) {
    gs.nextFight = {
      opponent,
      titleBelt: 'local:BR',
      purse: 1000,
      promoter: PROMOTERS[0],
    };
    const result = {
      winnerFighter: gs.player,
      loserFighter: opponent,
      isDraw: false,
      isControversial: false,
      method: 'Decisão Unânime',
      round: 6,
    };
    gs.processFightResult({
      finalResult: result,
      getSummary: () => ({ result, rounds: [] }),
      applyResult: () => {},
    });
  }

  assert.equal(gs.player.trophies.filter(t => t.tier === 'local').length, 2);
  assert.equal(gs.player.belts.includes('local:BR'), false);
});

test('circuitos territoriais continuam oferecendo titulos depois da progressao', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.year = 2032;
  gs.week = 18;
  gs.player = createFighter(Fighter, {
    id: 1551,
    isPlayer: true,
    nationality: 'BR',
    wins: 24,
    belts: ['continental:americas', 'WBC'],
    trophies: [
      { tier: 'local', scope: 'BR', name: 'Local 2028', year: 2028 },
      { tier: 'regional', scope: 'BR', name: 'Regional 2029', year: 2029 },
      { tier: 'national', scope: 'BR', name: 'Nacional 2030', year: 2030 },
    ],
  });
  gs.allFighters = [
    createFighter(Fighter, { id: 1552, nationality: 'BR', weightClass: gs.player.weightClass }),
    createFighter(Fighter, { id: 1553, nationality: 'BR', weightClass: gs.player.weightClass }),
  ];
  gs.rebuildRankings();

  const offers = gs.generateAvailableFights();
  const territorial = offers.find(o => /^(local|regional|national):BR$/.test(o.titleBelt || ''));

  assert.ok(territorial);
  assert.equal(territorial.isTitle, true);
});

test('contagem de knockdown pausa a luta e resolve recuperacao ou KO', () => {
  const { Fighter, LiveFightEngine } = loadGame();
  const player = createFighter(Fighter, { id: 1601, isPlayer: true });
  const opponent = createFighter(Fighter, { id: 1602 });
  const engine = new LiveFightEngine(player, opponent);

  engine._knockdown(true, player, opponent, engine.s2);
  assert.ok(engine._pendingKD);
  const clock = engine.clock;
  engine.tick(5);
  assert.equal(engine.clock, clock);
  engine.resolveKnockdown(true);
  assert.equal(engine._pendingKD, null);
  assert.equal(engine.phase, 'round');

  engine._knockdown(true, player, opponent, engine.s2);
  engine.resolveKnockdown(false);
  assert.equal(engine.phase, 'over');
  assert.equal(engine.finalResult.method, 'KO');
});

test('novos metodos de luta possuem classificacao consistente', () => {
  const { fightMethodIn, isKnockoutResult, isDecisionResult } = loadGame();
  assert.equal(isKnockoutResult('Interrupção Médica'), true);
  assert.equal(isKnockoutResult('Abandono (RTD)'), true);
  assert.equal(isKnockoutResult('Desqualificação (DQ)'), false);
  assert.equal(isDecisionResult('Decisão Técnica'), true);
  assert.equal(fightMethodIn('draw', 'Empate Técnico'), true);
  assert.equal(fightMethodIn('noContest', 'No Contest'), true);
});

test('no contest nao altera vitorias derrotas ou cinturao', () => {
  const { Fighter, FightSimulation } = loadGame();
  const champion = createFighter(Fighter, { id: 1701, belts: ['WBC'] });
  const challenger = createFighter(Fighter, { id: 1702 });
  const sim = new FightSimulation(champion, challenger, {
    isTitleFight: true,
    contestedBelts: ['WBC'],
  });
  sim.finalResult = sim._noContest(2, []);
  sim.applyResult();

  assert.equal(champion.wins, 0);
  assert.equal(champion.losses, 0);
  assert.equal(champion.noContests, 1);
  assert.equal(challenger.noContests, 1);
  assert.deepEqual(Array.from(champion.belts), ['WBC']);
});

test('decisao e empate tecnico usam os cartoes acumulados', () => {
  const { Fighter, FightSimulation } = loadGame();
  const first = createFighter(Fighter, { id: 1711 });
  const second = createFighter(Fighter, { id: 1712 });
  const sim = new FightSimulation(first, second);
  sim.roundResults = [
    { score1: 10, score2: 9 },
    { score1: 10, score2: 9 },
    { score1: 9, score2: 10 },
  ];
  const decision = sim._technicalDecision(4, []);
  assert.equal(decision.method, 'Decisão Técnica');
  assert.equal(decision.winnerFighter.id, first.id);

  sim.roundResults = [
    { score1: 10, score2: 9 },
    { score1: 9, score2: 10 },
    { score1: 10, score2: 10 },
  ];
  const draw = sim._technicalDecision(4, []);
  assert.equal(draw.method, 'Empate Técnico');
  assert.equal(draw.isDraw, true);
});

test('interrupcoes medicas abandono e dq entram corretamente no cartel', () => {
  const { Fighter, LiveFightEngine } = loadGame();
  const winner = createFighter(Fighter, { id: 1721 });
  const loser = createFighter(Fighter, { id: 1722 });

  for (const method of ['Interrupção Médica', 'Abandono (RTD)', 'Desqualificação (DQ)']) {
    const engine = new LiveFightEngine(winner, loser);
    engine._finish(method, winner, loser);
    engine.applyResult();
  }

  assert.equal(winner.wins, 3);
  assert.equal(winner.tkos, 2);
  assert.equal(winner.kos, 0);
  assert.equal(loser.losses, 3);
});

test('bonus de nocaute inclui paralisações mas exclui desqualificacao', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1731,
    isPlayer: true,
    contract: { fightsRemaining: 2, winBonus: 0.10, knockoutBonus: 0.20 },
  });
  const fight = { purse: 10000 };
  const base = {
    winnerFighter: gs.player,
    isDraw: false,
    isNoContest: false,
  };
  assert.equal(gs.calculateFightPayout(fight, { ...base, method: 'Interrupção Médica' }), 13000);
  assert.equal(gs.calculateFightPayout(fight, { ...base, method: 'Abandono (RTD)' }), 13000);
  assert.equal(gs.calculateFightPayout(fight, { ...base, method: 'Desqualificação (DQ)' }), 11000);
});

test('mundo gera aproximadamente 80 lutadores por categoria e continente', () => {
  const { GameState, WEIGHT_CLASSES, NAMES } = loadGame();
  const gs = new GameState();
  gs.generateWorld();

  for (const weightClass of WEIGHT_CLASSES) {
    const counts = {};
    for (const fighter of gs.allFighters.filter(f => f.weightClass === weightClass.id)) {
      const continent = NAMES[fighter.nationality].continent;
      counts[continent] = (counts[continent] || 0) + 1;
    }
    for (const count of Object.values(counts)) {
      assert.ok(count >= 79 && count <= 81);
    }
    assert.equal(Object.keys(counts).length, 5);
  }
});

test('npcs acumulam inatividade e desgaste quando nao treinam', () => {
  const { Fighter, GameState, context } = loadGame();
  const gs = new GameState();
  const veteran = createFighter(Fighter, {
    id: 7001, age: 39, peakAge: 29, discipline: 20,
    speed: 80, stamina: 80, reflexes: 80,
  });
  gs.allFighters = [veteran];
  context.Math.random = () => 0.99;

  gs._tickNpcConditioning(8);

  assert.equal(veteran.weeksSinceTraining, 8);
  assert.ok(veteran.careerWear > 0);
  assert.ok(Object.keys(veteran.inactivityLosses).length > 0);
});

test('forma e desgaste dos npcs persistem para os outros modos', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 7101, isPlayer: true });
  gs.allFighters = [createFighter(Fighter, {
    id: 7102,
    weeksSinceTraining: 14,
    careerWear: 27,
    inactivityLosses: { speed: 2, footwork: 1 },
  })];
  gs.npcRivalries = [{
    key: '7102:7103', fighterAId: 7102, fighterBId: 7103,
    fighterAName: 'A', fighterBName: 'B', weightClass: 'welter',
    intensity: 4, fights: 2, winsA: 1, winsB: 1, draws: 0,
    lastWeek: 4, lastYear: 2025,
  }];
  gs.save(1);

  const loaded = new GameState();
  assert.equal(loaded.load(1), true);
  assert.equal(loaded.allFighters[0].weeksSinceTraining, 14);
  assert.equal(loaded.allFighters[0].careerWear, 27);
  assert.equal(loaded.allFighters[0].inactivityLosses.speed, 2);
  assert.equal(loaded.npcRivalries[0].intensity, 4);
});

test('luta dramatica entre npcs cria rivalidade e pode gerar revanche', () => {
  const { Fighter, GameState, context } = loadGame();
  const gs = new GameState();
  const first = createFighter(Fighter, { id: 7201, name: 'Primeiro', weightClass: 'welter' });
  const second = createFighter(Fighter, { id: 7202, name: 'Segundo', weightClass: 'welter' });
  gs.allFighters = [first, second];
  const result = {
    method: 'Decisão Dividida',
    winnerFighter: first,
    loserFighter: second,
    isDraw: false,
    isNoContest: false,
    isControversial: true,
  };

  gs._updateNpcRivalry(first, second, result, ['WBC']);
  gs._updateNpcRivalry(first, second, result, ['WBC']);
  context.Math.random = () => 0;
  const rematch = gs._pickNpcRivalryMatch('welter', [first, second]);

  assert.equal(gs.npcRivalries.length, 1);
  assert.ok(gs.npcRivalries[0].intensity >= 3);
  assert.equal(gs.npcRivalries[0].fights, 2);
  assert.equal(rematch.fa.id, first.id);
  assert.equal(rematch.fb.id, second.id);
  assert.ok(gs.news.some(item => item.type === 'npc_rivalry'));
});

test('relatorio de matchup expoe estilo personalidade trait e sinergia', () => {
  const { Fighter, getFighterMatchupReport } = loadGame();
  const calculating = createFighter(Fighter, {
    id: 7301,
    nationality: 'CU',
    styleId: 'outboxer',
    personalityId: 'calculating',
  });
  const arrogant = createFighter(Fighter, {
    id: 7302,
    nationality: 'MX',
    styleId: 'pressure',
    personalityId: 'arrogant',
  });

  const report = getFighterMatchupReport(calculating, arrogant);

  assert.equal(report.style, calculating.style.name);
  assert.equal(report.personality, calculating.personality.name);
  assert.equal(report.nationalTrait, calculating.nationalityData.trait.name);
  assert.equal(report.synergy, 'Mestre da Distância');
  assert.ok(report.advantages.some(item => item.includes('temperamento')));
});

test('npcs escolhem estrategia coerente com estilo e personalidade', () => {
  const { Fighter, chooseNpcStrategy, context } = loadGame();
  const opponent = createFighter(Fighter, { overall: 70 });
  const outboxer = createFighter(Fighter, {
    styleId: 'outboxer', personalityId: 'disciplined',
  });
  const volatile = createFighter(Fighter, {
    styleId: 'slugger', personalityId: 'volatile',
  });
  context.Math.random = () => 0;

  assert.equal(chooseNpcStrategy(outboxer, opponent), 'points');
  assert.equal(chooseNpcStrategy(volatile, opponent), 'go_for_ko');
});

test('counterpuncher possui vantagem real contra pressure nas duas direcoes', () => {
  const { getStyleMatchup } = loadGame();
  const counter = getStyleMatchup('counterpuncher', 'pressure');
  const pressure = getStyleMatchup('pressure', 'counterpuncher');

  assert.ok(counter > 1);
  assert.ok(pressure < 1);
  assert.ok(Math.abs(counter * pressure - 1) < 0.001);
});

test('contraste heroi vilao vende mais que dois perfis reservados', () => {
  const { Fighter, getFightMarketability } = loadGame();
  const calculating = createFighter(Fighter, {
    popularity: 45, styleId: 'outboxer', personalityId: 'calculating',
  });
  const arrogant = createFighter(Fighter, {
    popularity: 45, styleId: 'slugger', personalityId: 'arrogant',
  });
  const disciplined = createFighter(Fighter, {
    popularity: 45, styleId: 'technical', personalityId: 'disciplined',
  });
  const humble = createFighter(Fighter, {
    popularity: 45, styleId: 'technical', personalityId: 'humble',
  });

  const dramatic = getFightMarketability(calculating, arrogant);
  const quiet = getFightMarketability(disciplined, humble);

  assert.equal(dramatic.heroVillainContrast, true);
  assert.ok(dramatic.score >= quiet.score + 15);
  assert.ok(dramatic.hooks.includes('herói contra vilão'));
  assert.ok(quiet.hooks.includes('promoção difícil'));
});

test('valor comercial entra na demanda publico e bilheteria do evento', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 7351, isPlayer: true, wins: 12, popularity: 50,
    styleId: 'outboxer', personalityId: 'calculating',
  });
  const opponent = createFighter(Fighter, {
    id: 7352, popularity: 50, styleId: 'slugger', personalityId: 'arrogant',
  });
  gs.allFighters = [opponent];
  gs.rebuildRankings();

  const fight = gs._makeOffer(opponent);

  assert.ok(fight.event.marketability.score > 0);
  assert.equal(fight.event.marketability.heroVillainContrast, true);
  assert.ok(fight.event.gate > 0);
});

test('entrevista registra memoria, repercussao, rivalidade e obrigacao de midia', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1801,
    name: 'Jogador',
    isPlayer: true,
    contract: { fightsRemaining: 2, mediaObligations: 3, mediaCompleted: 0 },
  });
  const opponent = createFighter(Fighter, { id: 1802, name: 'Adversario' });
  gs.allFighters = [opponent];

  const result = gs.applyInterviewAnswer('pre_pressure', 'c', opponent.id);

  assert.equal(result.tone, 'aggressive');
  assert.ok(result.opponentResponse.includes(opponent.name));
  assert.equal(gs.mediaHistory[0].questionId, 'pre_pressure');
  assert.equal(gs.player.contract.mediaCompleted, 1);
  assert.equal(gs.getRival(opponent.id).intensity, 1);
  assert.ok(gs.news.some(item => item.type === 'opponent_response'));
  assert.ok(gs.news.some(item => item.type === 'social_reaction'));
});

test('selecao de perguntas evita repeticao recente quando ha alternativas', () => {
  const { pickPreFightQuestions } = loadGame();
  const questions = pickPreFightQuestions('national', ['pre_pressure']);
  assert.equal(questions.length, 2);
  assert.equal(questions.some(question => question.id === 'pre_pressure'), false);
});

test('encarada promocional afeta carreira e cumpre obrigacao de midia', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1811,
    name: 'Jogador',
    isPlayer: true,
    contract: { fightsRemaining: 1, mediaObligations: 2, mediaCompleted: 0 },
  });
  const opponent = createFighter(Fighter, { id: 1812, name: 'Adversario' });
  gs.allFighters = [opponent];

  const choice = gs.applyFaceOffChoice('provocative', opponent.id);

  assert.equal(choice.id, 'provocative');
  assert.equal(gs.player.contract.mediaCompleted, 1);
  assert.equal(gs.getRival(opponent.id).intensity, 2);
  assert.equal(gs.mediaHistory[0].type, 'faceoff');
  assert.ok(gs.news.some(item => item.type === 'faceoff'));
});

test('crise de imagem pode ser respondida e permanece no historico', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 1821, name: 'Jogador', isPlayer: true, reputation: 40 });
  gs.mediaCrisis = { id: 99, headline: 'Crise', scope: 'national', week: 1, year: 2024 };

  const result = gs.resolveMediaCrisis('apologize');

  assert.equal(result.response.id, 'apologize');
  assert.equal(gs.mediaCrisis, null);
  assert.equal(gs.mediaHistory[0].type, 'crisis_response');
  assert.ok(gs.news.some(item => item.type === 'media_crisis'));
});

test('contrato encerrado pune obrigacoes de midia nao cumpridas', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1831,
    isPlayer: true,
    reputation: 60,
    contract: {
      promoterName: 'Promotora Teste',
      fightsRemaining: 1,
      mediaObligations: 3,
      mediaCompleted: 1,
    },
  });

  gs._progressContractAfterFight({});

  assert.equal(gs.player.reputation, 52);
  assert.equal(gs.player.contract, null);
  assert.ok(gs.news.some(item => item.type === 'contract' && item.headline.includes('2')));
});

test('subir de divisao desocupa cinturao, altera atributos e reinicia ranking', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1901,
    name: 'Campeao',
    isPlayer: true,
    weightClass: 'welter',
    belts: ['WBC'],
    beltDefenses: { WBC: 4 },
    strength: 60,
    speed: 60,
    stamina: 60,
    chin: 60,
  });
  const heir = createFighter(Fighter, { id: 1902, weightClass: 'welter', belts: [] });
  gs.allFighters = [heir];
  gs.rebuildRankings();
  const strengthBefore = gs.player.strength;
  const speedBefore = gs.player.speed;
  const staminaBefore = gs.player.stamina;

  const result = gs.changeWeightClass('middle');

  assert.equal(result.ok, true);
  assert.equal(result.direction, 'up');
  assert.equal(gs.player.weightClass, 'middle');
  assert.deepEqual(Array.from(gs.player.belts), []);
  assert.ok(heir.belts.includes('WBC'));
  assert.equal(gs.player.strength, strengthBefore + 3);
  assert.equal(gs.player.speed, speedBefore - 1);
  assert.equal(gs.player.stamina, staminaBefore - 3);
  assert.equal(gs.player.weightTransition.weeksRemaining, 6);
  assert.equal(gs.player.divisionDefenses.welter.WBC, 4);
  assert.equal(gs.player.divisionRankingPenalty, 28);
});

test('adaptacao de peso restaura penalidades temporarias e respeita cooldown', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1911,
    isPlayer: true,
    weightClass: 'welter',
    stamina: 60,
    reflexes: 60,
    footwork: 60,
  });
  gs.allFighters = [createFighter(Fighter, { id: 1912, weightClass: 'middle' })];
  gs.rebuildRankings();

  gs.changeWeightClass('middle');
  assert.equal(gs.player.stamina, 57);
  gs.advanceWeeks(6, { trained: true });

  assert.equal(gs.player.weightTransition, null);
  assert.equal(gs.player.stamina, 60);
  assert.equal(gs.canChangeWeightClass('welter').ok, false);
  gs.advanceWeeks(20, { trained: true });
  assert.equal(gs.canChangeWeightClass('welter').ok, true);
});

test('titulo mundial em nova categoria reconhece campeao multidivisional', () => {
  const { Fighter, FightSimulation, GameState, PROMOTERS } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 1921,
    name: 'Multicampeao',
    isPlayer: true,
    weightClass: 'welter',
    belts: ['WBA'],
    worldTitleHistory: [{ belt: 'WBA', weightClass: 'welter', year: 2024 }],
  });
  const oldHeir = createFighter(Fighter, { id: 1922, weightClass: 'welter' });
  const champion = createFighter(Fighter, { id: 1923, weightClass: 'middle', belts: ['WBC'] });
  gs.allFighters = [oldHeir, champion];
  gs.rebuildRankings();
  gs.changeWeightClass('middle');

  const fight = {
    opponent: champion,
    titleBelt: 'WBC',
    isTitle: true,
    purse: 10000,
    promoter: PROMOTERS[0],
  };
  gs.nextFight = fight;
  const sim = new FightSimulation(gs.player, champion, {
    isTitleFight: true,
    contestedBelts: ['WBC'],
  });
  sim.finalResult = {
    method: 'Decisão Unanime',
    round: 12,
    winnerFighter: gs.player,
    loserFighter: champion,
    isDraw: false,
    isNoContest: false,
  };

  gs.processFightResult(sim);

  assert.ok(gs.player.belts.includes('WBC'));
  assert.equal(new Set(gs.player.worldTitleHistory.map(entry => entry.weightClass)).size, 2);
  assert.ok(gs.news.some(item => item.headline.includes('2 divisões')));
});

test('mudanca de divisao e adaptacao persistem no save', () => {
  const { Fighter, GameState, storage } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 1931, isPlayer: true, weightClass: 'welter' });
  gs.allFighters = [createFighter(Fighter, { id: 1932, weightClass: 'middle' })];
  gs.rebuildRankings();
  gs.changeWeightClass('middle');
  gs.save(2);

  const loaded = new GameState();
  assert.equal(storage.has('ringue_save_2'), true);
  assert.equal(loaded.load(2), true);
  assert.equal(loaded.player.weightClass, 'middle');
  assert.equal(loaded.player.weightTransition.weeksRemaining, 6);
  assert.equal(loaded.player.weightClassHistory.length, 2);
  assert.equal(loaded.player.lastWeightChangeAt, 1);
});

test('arenas formam vinte patamares com capacidade crescente', () => {
  const { EVENT_SCOPE_ORDER, EVENT_ARENAS, getEventArena } = loadGame();
  const arenas = EVENT_SCOPE_ORDER.flatMap(scope => EVENT_ARENAS[scope]);
  assert.equal(arenas.length, 20);
  for (let level = 1; level <= 20; level++) {
    const scope = EVENT_SCOPE_ORDER[Math.floor((level - 1) / 4)];
    const withinScope = ((level - 1) % 4) + 1;
    const arena = getEventArena(scope, withinScope);
    assert.equal(arena.globalLevel, level);
    if (level > 1) assert.ok(arena.capacity > arenas[level - 2].capacity);
  }
});

test('oferta gera arena publico bilheteria mando e card completo', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 2001,
    name: 'Jogador',
    isPlayer: true,
    wins: 0,
    popularity: 15,
    nationality: 'BR',
  });
  const opponent = createFighter(Fighter, { id: 2002, nationality: 'MX', popularity: 12 });
  gs.allFighters = [
    opponent,
    ...Array.from({ length: 20 }, (_, index) => createFighter(Fighter, {
      id: 2010 + index,
      weightClass: index % 2 ? 'welter' : 'middle',
    })),
  ];
  gs.rebuildRankings();

  const offer = gs._makeOffer(opponent);

  assert.equal(offer.event.scope, 'local');
  assert.ok(offer.event.arena.globalLevel >= 1 && offer.event.arena.globalLevel <= 4);
  assert.ok(offer.event.attendance <= offer.event.arena.capacity);
  assert.equal(offer.event.gate, offer.event.attendance * offer.event.ticketPrice);
  assert.ok(['player', 'opponent', 'neutral'].includes(offer.event.homeSide));
  assert.ok(offer.event.card.some(bout => bout.playerBout));
  assert.ok(offer.event.card.some(bout => bout.billing === 'main_event'));
});

test('card de evento usa varias categorias sem favorecer a primeira da lista', () => {
  const { Fighter, GameState, WEIGHT_CLASSES, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 2051, isPlayer: true, wins: 35, popularity: 90, weightClass: 'middle',
  });
  const opponent = createFighter(Fighter, {
    id: 2052, weightClass: 'middle', popularity: 85,
  });
  gs.allFighters = WEIGHT_CLASSES.flatMap((wc, wcIndex) =>
    Array.from({ length: 6 }, (_, index) => createFighter(Fighter, {
      id: 2100 + wcIndex * 10 + index,
      name: `${wc.id} ${index}`,
      weightClass: wc.id,
    }))
  );
  let roll = 0;
  context.Math.random = () => ((roll++ % 97) + 1) / 100;

  const fight = gs._makeOffer(opponent);
  const divisions = new Set(fight.event.card.filter(bout => !bout.playerBout).map(bout => bout.weightClass));

  assert.equal(fight.event.scope, 'world');
  assert.ok(divisions.size >= 4);
  assert.ok([...divisions].some(name => name !== WEIGHT_CLASSES[0].name));
});

test('cards regionais nacionais continentais e mundiais priorizam categorias distintas', () => {
  const { Fighter, GameState, WEIGHT_CLASSES, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 2081, isPlayer: true, weightClass: 'middle' });
  const opponent = createFighter(Fighter, { id: 2082, weightClass: 'middle' });
  gs.allFighters = WEIGHT_CLASSES.flatMap((wc, wcIndex) =>
    Array.from({ length: 4 }, (_, index) => createFighter(Fighter, {
      id: 5000 + wcIndex * 10 + index,
      name: `${wc.id} card ${index}`,
      weightClass: wc.id,
    }))
  );
  let roll = 0;
  context.Math.random = () => ((roll++ % 89) + 1) / 100;

  const expected = { regional: 2, national: 4, continental: 5, world: 7 };
  for (const [scope, auxiliaryBouts] of Object.entries(expected)) {
    const card = gs._generateEventCard({ opponent }, 'main_event', scope);
    const undercardDivisions = new Set(card.filter(bout => !bout.playerBout).map(bout => bout.weightClass));
    assert.equal(undercardDivisions.size, auxiliaryBouts, `${scope} deve variar todas as lutas auxiliares`);
  }
});

test('card local usa categoria auxiliar valida diferente quando ha alternativa', () => {
  const { Fighter, GameState, WEIGHT_CLASSES, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 2091, isPlayer: true, weightClass: 'middle' });
  const opponent = createFighter(Fighter, { id: 2092, weightClass: 'middle' });
  gs.allFighters = WEIGHT_CLASSES.flatMap((wc, wcIndex) =>
    Array.from({ length: 3 }, (_, index) => createFighter(Fighter, {
      id: 6000 + wcIndex * 10 + index,
      weightClass: wc.id,
    }))
  );
  context.Math.random = () => 0.6;

  const card = gs._generateEventCard({ opponent }, 'main_event', 'local');
  const auxiliary = card.filter(bout => !bout.playerBout);

  assert.ok(auxiliary.length >= 1);
  assert.ok(auxiliary.every(bout => bout.weightClass !== gs.player.weightClassData.name));
});

test('titulo mundial usa patamar mundial e paga participacao de bilheteria', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 2101,
    isPlayer: true,
    wins: 24,
    popularity: 85,
    fanReach: { local: 90, national: 88, international: 82 },
  });
  const opponent = createFighter(Fighter, { id: 2102, popularity: 82, belts: ['WBC'] });
  gs.allFighters = [opponent];
  gs.rebuildRankings();
  const fight = gs._makeOffer(opponent, 'WBC');
  const result = { winnerFighter: gs.player, isDraw: false, isNoContest: false, method: 'KO' };

  assert.equal(fight.event.scope, 'world');
  assert.ok(fight.event.arena.globalLevel >= 17);
  assert.equal(fight.event.billing, 'main_event');
  assert.ok(fight.event.gateShare > 0);
  assert.equal(
    gs.calculateFightPayout(fight, result),
    Math.round(fight.purse * 1.25) + fight.event.gateShare
  );
});

test('resultado registra evento recordes torcida e repercussao', () => {
  const { Fighter, FightSimulation, GameState, PROMOTERS } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 2201, name: 'Jogador', isPlayer: true, popularity: 50 });
  const opponent = createFighter(Fighter, { id: 2202, name: 'Rival', popularity: 48 });
  gs.allFighters = [opponent];
  gs.rebuildRankings();
  const fight = gs._makeOffer(opponent);
  fight.promoter = PROMOTERS[0];
  fight.event.excitement = 85;
  gs.nextFight = fight;
  const sim = new FightSimulation(gs.player, opponent);
  sim.finalResult = {
    method: 'KO',
    round: 2,
    winnerFighter: gs.player,
    loserFighter: opponent,
    isDraw: false,
    isNoContest: false,
  };
  const localReachBefore = gs.player.fanReach.local;

  gs.processFightResult(sim);

  assert.equal(gs.player.eventHistory.length, 1);
  assert.equal(gs.player.eventRecords.maxAttendance, fight.event.attendance);
  assert.equal(gs.player.eventRecords.maxGate, fight.event.gate);
  assert.ok(gs.player.fanReach.local > localReachBefore);
  assert.ok(gs.news.some(item => item.type === 'event'));
  assert.ok(gs.news.some(item => item.type === 'event_reaction'));
});

test('negociacao por clausula consome rodadas e impede repetir a mesma clausula', () => {
  const { Fighter, GameState, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { isPlayer: true, reputation: 100 });
  gs.contractOffers = [{
    id: 'contract_test',
    purseMultiplier: 1,
    signingBonus: 1000,
    winBonus: 0.1,
    knockoutBonus: 0.05,
    terminationFee: 2000,
    mediaObligations: 2,
    exclusivity: true,
    fightsTotal: 4,
    fightsRemaining: 4,
    negotiationRoundsLeft: 2,
    negotiatedClauses: [],
    hardClauses: [],
  }];
  context.Math.random = () => 0;

  const result = gs.negotiateClause('contract_test', 'terminationFee');
  const repeated = gs.negotiateClause('contract_test', 'terminationFee');

  assert.equal(result.success, true);
  assert.ok(gs.contractOffers[0].terminationFee < 2000);
  assert.equal(gs.contractOffers[0].negotiationRoundsLeft, 1);
  assert.equal(repeated.success, false);
  assert.equal(gs.contractOffers[0].negotiationRoundsLeft, 1);
});

test('torneio avanca ate a final e concede premio e trofeu', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 3001, isPlayer: true, wins: 4, money: 0 });
  gs.allFighters = Array.from({ length: 8 }, (_, index) => createFighter(Fighter, {
    id: 3010 + index,
    name: `Adversario ${index}`,
    wins: 3,
  }));
  gs.rebuildRankings();
  const offer = {
    id: 'tourn_test',
    name: 'Copa Teste',
    tier: 'local',
    weightClass: 'welter',
    size: 4,
    rounds: ['Semifinal', 'Final'],
    pursePerFight: 800,
    winnerPrize: 3200,
    expiresWeek: gs.week + 3,
  };
  gs.tournamentOffers = [offer];
  const moneyBefore = gs.player.money;

  assert.equal(gs.acceptTournament(offer.id), true);
  assert.equal(gs.nextFight.isTournament, true);
  const first = gs._processTournamentResult({
    winnerFighter: gs.player, isDraw: false, isNoContest: false,
  });
  assert.equal(first.type, 'tournament-advance');
  assert.equal(gs.activeTournament.currentRound, 1);

  const final = gs._processTournamentResult({
    winnerFighter: gs.player, isDraw: false, isNoContest: false,
  });
  assert.equal(final.type, 'tournament-win');
  assert.equal(gs.activeTournament, null);
  assert.equal(gs.player.money, moneyBefore + 3200);
  assert.ok(gs.player.trophies.some(trophy => trophy.name === 'Copa Teste' && trophy.isTournament));
});

test('torneio ativo e convites persistem no save', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { id: 3101, isPlayer: true });
  gs.tournamentOffers = [{ id: 'pending', name: 'Copa Pendente', expiresWeek: 5 }];
  gs.activeTournament = {
    id: 'active', name: 'Grand Prix', rounds: ['Final'], currentRound: 0,
    bracket: [[{ a: { id: 3101 }, b: { id: 3102 }, winnerId: null }]],
    playerMatchupIdx: 0,
  };
  gs.save(2);

  const loaded = new GameState();
  assert.equal(loaded.load(2), true);
  assert.equal(loaded.tournamentOffers[0].id, 'pending');
  assert.equal(loaded.activeTournament.name, 'Grand Prix');
});

test('aposentadoria limpa luta contrato e cinturoes e fica salva', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.currentSlot = 3;
  gs.player = createFighter(Fighter, {
    id: 3201, name: 'Veterano', isPlayer: true, belts: ['WBC'],
    contract: { promoterId: 'local', fightsRemaining: 2 },
  });
  gs.nextFight = { id: 'scheduled' };
  gs.availableFights = [{ id: 'offer' }];

  const result = gs.retirePlayer('voluntary');
  const loaded = new GameState();

  assert.equal(result.ok, true);
  assert.equal(gs.player.retirementReason, 'voluntary');
  assert.deepEqual(Array.from(gs.player.belts), []);
  assert.equal(gs.player.contract, null);
  assert.equal(gs.nextFight, null);
  assert.equal(gs.availableFights.length, 0);
  assert.equal(loaded.load(3), true);
  assert.equal(loaded.player.retirementReason, 'voluntary');
  assert.equal(loaded.player.retiredAt, `${gs.year}`);
});

test('aposentadoria forcada reconhece idade desgaste e nocautes consecutivos', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { isPlayer: true, age: 43 });
  assert.equal(gs.checkForcedRetirement(), 'age');

  gs.player.age = 36;
  gs.player.careerWear = 90;
  assert.equal(gs.checkForcedRetirement(), 'wear');

  gs.player.careerWear = 0;
  gs.player.fightHistory = Array.from({ length: 3 }, () => ({ result: 'L', method: 'KO' }));
  assert.equal(gs.checkForcedRetirement(), 'medical');
});

test('idioma alterna entre portugues e ingles e persiste a escolha', () => {
  const { I18n, storage, context } = loadGame();

  I18n.setLang('en');
  assert.equal(I18n.getLang(), 'en');
  assert.equal(context.document.documentElement.lang, 'en');
  assert.equal(storage.get('ringue_lang'), 'en');

  I18n.setLang('pt');
  assert.equal(I18n.getLang(), 'pt');
  assert.equal(context.document.documentElement.lang, 'pt-BR');
});

test('todas as crises ampliadas possuem manchetes e respostas validas', () => {
  const { MEDIA_CRISES } = loadGame();
  const ids = new Set();

  assert.ok(MEDIA_CRISES.length >= 15);
  for (const crisis of MEDIA_CRISES) {
    assert.ok(crisis.id && !ids.has(crisis.id));
    ids.add(crisis.id);
    assert.ok(crisis.headlines.length >= 3);
    assert.ok(crisis.responses.length >= 3);
    for (const response of crisis.responses) {
      assert.equal(typeof response.popularity, 'number');
      assert.equal(typeof response.reputation, 'number');
      assert.ok(response.text.includes('{player}'));
    }
  }
});

test('resposta de crise especifica aplica bonus de personalidade e encerra a crise', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    name: 'Porta-Voz', isPlayer: true, personalityId: 'disciplined',
    popularity: 50, reputation: 50,
  });
  gs.mediaCrisis = {
    id: 'crisis_test', crisisType: 'trash_talk', scope: 'national',
    headline: 'Teste', week: gs.week, year: gs.year,
  };
  const popularityBefore = gs.player.popularity;
  const reputationBefore = gs.player.reputation;

  const result = gs.resolveMediaCrisis('apologize');

  assert.equal(result.popDelta, -3);
  assert.equal(result.repDelta, 12);
  assert.equal(gs.player.popularity, popularityBefore - 3);
  assert.equal(gs.player.reputation, reputationBefore + 12);
  assert.equal(gs.mediaCrisis, null);
  assert.equal(gs.mediaHistory[0].crisisType, 'trash_talk');
});

test('noticias editoriais podem cobrir categorias diferentes em todo o mundo', () => {
  const { Fighter, GameState, WEIGHT_CLASSES, MEDIA_NEWS_BANK, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, { isPlayer: true, weightClass: 'minimum' });
  gs.allFighters = WEIGHT_CLASSES.map((wc, index) => createFighter(Fighter, {
    id: 4000 + index,
    name: `Lutador ${wc.id}`,
    weightClass: wc.id,
  }));
  const headlines = new Set();
  MEDIA_NEWS_BANK.subjects = ['a movimentacao dos rankings dos {weightClass}'];

  for (let index = 0; index < WEIGHT_CLASSES.length; index++) {
    context.Math.random = () => (index + 0.25) / WEIGHT_CLASSES.length;
    headlines.add(gs._randomMediaNews('world').headline);
  }

  const coveredDivisions = WEIGHT_CLASSES.filter(wc =>
    [...headlines].some(headline => headline.includes(wc.name))
  );
  assert.ok(coveredDivisions.length >= 4);
  assert.ok(coveredDivisions.some(wc => wc.id !== WEIGHT_CLASSES[0].id));
});

test('modo academia cria mundo, caixa e lista variada de prospectos', () => {
  const { GameState, ACADEMY_PHILOSOPHIES } = loadGame();
  const gs = new GameState();

  gs.createAcademy({
    name: 'Academia Teste',
    country: 'BR',
    city: 'Recife',
    philosophy: ACADEMY_PHILOSOPHIES[0].id,
  });

  assert.equal(gs.gameMode, 'academy');
  assert.equal(gs.player, null);
  assert.equal(gs.academy.name, 'Academia Teste');
  assert.equal(gs.academy.money, 120000);
  assert.ok(gs.allFighters.length > 1000);
  assert.ok(gs.getAcademyCandidates().length >= 6);
  assert.ok(new Set(gs.getAcademyCandidates().map(f => f.weightClass)).size >= 2);
});

test('academia contrata prospecto, define treino e processa semana financeira', () => {
  const { GameState } = loadGame();
  const gs = new GameState();
  gs.createAcademy({ name: 'Forja', country: 'BR', city: 'Salvador', philosophy: 'development' });
  const candidate = gs.getAcademyCandidates()[0];
  const moneyBefore = gs.academy.money;

  const signing = gs.signAcademyFighter(candidate.id);
  assert.equal(signing.success, true);
  assert.ok(gs.academy.money < moneyBefore);
  assert.equal(gs.getAcademyRoster()[0].academyId, gs.academy.id);
  assert.equal(gs.setAcademyTrainingFocus(candidate.id, 'defense'), true);

  const weekBefore = gs.week;
  const reports = gs.advanceAcademyWeek();
  assert.equal(gs.week, weekBefore + 1);
  assert.equal(reports.length, 1);
  assert.equal(gs.academy.trainingPlan[candidate.id], 'defense');
  assert.ok(gs.academy.transactions.length >= 3);
});

test('save da academia restaura modo, elenco e candidatos sem atleta controlado', () => {
  const { GameState, storage } = loadGame();
  const gs = new GameState();
  gs.createAcademy({ name: 'Dinastia', country: 'MX', city: 'Tijuana', philosophy: 'pressure' });
  const candidate = gs.getAcademyCandidates()[0];
  gs.signAcademyFighter(candidate.id);
  gs.save(2);

  const restored = new GameState();
  assert.equal(restored.load(2), true);
  assert.equal(restored.gameMode, 'academy');
  assert.equal(restored.player, null);
  assert.equal(restored.academy.name, 'Dinastia');
  assert.equal(restored.getAcademyRoster().length, 1);
  assert.ok(restored.getAcademyCandidates().length > 0);
  assert.ok(storage.get('ringue_save_2').includes('"saveVersion":4'));
});

test('atleta aposentado funda academia mantendo o mundo e recebendo bonus da carreira', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    id: 8801, name: 'Fundador Campeao', isPlayer: true,
    wins: 35, losses: 3, popularity: 88, reputation: 92, money: 400000,
    worldTitleHistory: [{ belt: 'WBC', weightClass: 'welter', year: 2025 }],
    titlesWon: ['WBC', 'continental:americas'],
    beltDefenses: { WBC: 7 },
    retiredAt: '2032',
  });
  gs.allFighters = Array.from({ length: 30 }, (_, index) =>
    createFighter(Fighter, { id: 8900 + index, age: 18 + index % 7 })
  );
  gs.rebuildRankings();
  const worldIds = gs.allFighters.map(f => f.id);
  const projection = gs.getAcademyFounderProjection(gs.player);

  gs.createAcademy({
    name: 'Legado Boxing',
    country: 'BR',
    city: 'Rio de Janeiro',
    philosophy: 'technical',
    founder: gs.player,
  });

  assert.equal(gs.player, null);
  assert.equal(gs.academy.origin, 'retired_fighter');
  assert.equal(gs.academy.founder.name, 'Fundador Campeao');
  assert.ok(gs.academy.money > 120000);
  assert.ok(gs.academy.reputation > 12);
  assert.ok(gs.academy.level >= 2);
  assert.deepEqual(gs.allFighters.map(f => f.id), worldIds);
  assert.equal(gs.academy.money, projection.money);
});

test('carreira ruim gera inicio de academia mais dificil que manager independente', () => {
  const { Fighter, GameState } = loadGame();
  const gs = new GameState();
  const retired = createFighter(Fighter, {
    isPlayer: true, wins: 1, losses: 12, popularity: 5, reputation: 6, money: 0, retiredAt: '2026',
  });
  const projection = gs.getAcademyFounderProjection(retired);

  assert.ok(projection.money < 120000);
  assert.ok(projection.reputation < 12);
  assert.equal(projection.label, 'Recomeço difícil');
});

test('hub de atleta aposentado sempre redireciona para tela de aposentadoria', () => {
  const { Fighter, GameState, UI, context } = loadGame();
  const gs = new GameState();
  gs.player = createFighter(Fighter, {
    isPlayer: true,
    retiredAt: '2030',
    retirementReason: 'medical',
  });
  const rendered = [];
  const ui = new UI(gs);
  ui.root = { innerHTML: '' };
  ui._render_retirement = data => rendered.push(data);
  context.window.scrollTo = () => {};

  ui.show('careerHub');

  assert.equal(ui.currentScreen, 'retirement');
  assert.equal(rendered[0].reason, 'medical');
  assert.equal(rendered[0].forced, true);
});
