const WEIGHT_CLASSES = [
  { id: 'minimum',    name: 'Peso Mínimo',          limit: 105, limit_kg: 47.6 },
  { id: 'flyweight',  name: 'Peso Mosca',            limit: 112, limit_kg: 50.8 },
  { id: 'bantam',     name: 'Peso Galo',             limit: 118, limit_kg: 53.5 },
  { id: 'feather',    name: 'Peso Pena',             limit: 126, limit_kg: 57.2 },
  { id: 'light',      name: 'Peso Leve',             limit: 135, limit_kg: 61.2 },
  { id: 'superlight', name: 'Super-Leve',            limit: 140, limit_kg: 63.5 },
  { id: 'welter',     name: 'Peso Meio-Médio',       limit: 147, limit_kg: 66.7 },
  { id: 'middle',     name: 'Peso Médio',            limit: 160, limit_kg: 72.6 },
  { id: 'smiddle',    name: 'Super Peso Médio',      limit: 168, limit_kg: 76.2 },
  { id: 'lheavy',     name: 'Meio-Pesado',           limit: 175, limit_kg: 79.4 },
  { id: 'cruiser',    name: 'Peso Cruzeiro',         limit: 200, limit_kg: 90.7 },
  { id: 'heavy',      name: 'Peso Pesado',           limit: 999, limit_kg: 999  },
];

const FIGHTING_STYLES = [
  {
    id: 'pressure',
    name: 'Pressure Fighter',
    desc: 'Pressão constante, encurrala o adversário',
    bonus: { strength: 5, stamina: 5, jab: 3 },
    penalty: { defense: -3, footwork: -3 },
    color: '#e63946',
  },
  {
    id: 'outboxer',
    name: 'Out-Boxer',
    desc: 'Mantém distância, pontua com jab',
    bonus: { speed: 5, jab: 5, footwork: 5 },
    penalty: { strength: -4, chin: -2 },
    color: '#4ecdc4',
  },
  {
    id: 'counterpuncher',
    name: 'Counterpuncher',
    desc: 'Espera o erro do adversário e pune',
    bonus: { reflexes: 6, counter: 6, ringIQ: 4 },
    penalty: { aggression: -3, jab: -2 },
    color: '#f4a261',
  },
  {
    id: 'slugger',
    name: 'Slugger',
    desc: 'Trocação pura, KO poder',
    bonus: { strength: 8, chin: 4 },
    penalty: { defense: -5, footwork: -4, speed: -2 },
    color: '#ff6b35',
  },
  {
    id: 'swarmer',
    name: 'Swarmer',
    desc: 'Volume de golpes, desgaste',
    bonus: { combinations: 7, stamina: 5, bodyPunch: 4 },
    penalty: { ringIQ: -2, defense: -4 },
    color: '#a8dadc',
  },
  {
    id: 'technical',
    name: 'Boxeador Técnico',
    desc: 'Técnica apurada, controle da luta',
    bonus: { ringIQ: 7, precision: 6, defense: 4 },
    penalty: { strength: -3, chin: -2 },
    color: '#9381ff',
  },
  {
    id: 'boxer_puncher',
    name: 'Boxer-Puncher',
    desc: 'Equilíbrio entre técnica e potência',
    bonus: { strength: 3, speed: 3, precision: 3 },
    penalty: {},
    color: '#ffd700',
  },
];

const PERSONALITIES = [
  { id: 'disciplined',  name: 'Disciplinado',   trainingBonus: 0.15, mediaBonus: 0.05,
    ringDesc: 'Ritmo constante e economia de energia: gasta menos gás e mantém a guarda firme.' },
  { id: 'charismatic',  name: 'Carismático',    trainingBonus: 0.00, mediaBonus: 0.25,
    ringDesc: 'Se alimenta da torcida: começa a luta com mais confiança.' },
  { id: 'arrogant',     name: 'Arrogante',      trainingBonus: 0.05, mediaBonus: 0.10,
    ringDesc: 'Imponente no início, ataca com tudo nos primeiros rounds — mas desanima se estiver perdendo.' },
  { id: 'humble',       name: 'Humilde',        trainingBonus: 0.10, mediaBonus: 0.05,
    ringDesc: 'Pés no chão: defesa sólida e recupera bem a confiança no corner.' },
  { id: 'volatile',     name: 'Explosivo',      trainingBonus: -0.05, mediaBonus: 0.15,
    ringDesc: 'Pura dinamite: mais poder de nocaute, mas queima energia rápido demais.' },
  { id: 'calculating',  name: 'Calculista',     trainingBonus: 0.10, mediaBonus: -0.05,
    ringDesc: 'Lê a luta como xadrez: defesa apurada e cresce nos rounds finais.' },
  { id: 'hungry',       name: 'Faminto',        trainingBonus: 0.20, mediaBonus: 0.00,
    ringDesc: 'Não aceita perder: ataca com fúria redobrada quando está atrás no placar.' },
  { id: 'veteran',      name: 'Veterano',       trainingBonus: 0.05, mediaBonus: 0.10,
    ringDesc: 'Manha de quem já viu de tudo: domina os rounds finais e não se abala com quedas.' },
];

// Sinergias Estilo + Personalidade. Quando o estilo de luta combina com a
// personalidade certa, o lutador ganha um bônus de combate e um "selo" que
// pode virar apelido. Chave: `${styleId}_${personalityId}`.
const STYLE_SYNERGIES = {
  slugger_volatile:          { label: 'Demolidor Imprevisível', ko: 1.12, atk: 1.05, desc: 'Poder bruto sem freio.' },
  slugger_hungry:            { label: 'Sede de Nocaute',        ko: 1.10, atk: 1.04, desc: 'Caça a finalização o tempo todo.' },
  pressure_hungry:           { label: 'Pressão Implacável',     atk: 1.08, stam: 0.95, desc: 'Não dá um segundo de respiro.' },
  pressure_volatile:         { label: 'Furacão',                atk: 1.10, stam: 1.05, desc: 'Avalanche de violência.' },
  pressure_disciplined:      { label: 'Rolo Compressor',        atk: 1.05, stam: 0.90, desc: 'Pressão metódica e incansável.' },
  outboxer_calculating:      { label: 'Mestre da Distância',    def: 1.10, ko: 1.03, desc: 'Controla o ringue de longe.' },
  outboxer_disciplined:      { label: 'Relojoeiro',             def: 1.06, stam: 0.90, desc: 'Pontua com precisão suíça.' },
  counterpuncher_calculating:{ label: 'Armadilha Perfeita',     def: 1.08, ko: 1.06, desc: 'Espera o erro e pune.' },
  counterpuncher_veteran:    { label: 'Velha Raposa',           def: 1.08, atk: 1.03, desc: 'Manha pura no contragolpe.' },
  technical_disciplined:     { label: 'Cirurgião do Ringue',    def: 1.06, atk: 1.04, desc: 'Cada golpe no lugar exato.' },
  technical_veteran:         { label: 'O Maestro',              def: 1.05, atk: 1.05, desc: 'Rege a luta como uma orquestra.' },
  swarmer_hungry:            { label: 'Enxame Voraz',           atk: 1.08, stam: 0.95, desc: 'Volume sufocante de golpes.' },
  swarmer_disciplined:       { label: 'Máquina de Volume',      atk: 1.05, stam: 0.88, desc: 'Bombeia golpes sem cansar.' },
  boxer_puncher_calculating: { label: 'Estrategista Completo',  atk: 1.05, def: 1.04, desc: 'Equilíbrio e inteligência.' },
  boxer_puncher_charismatic: { label: 'A Estrela',              atk: 1.05, ko: 1.04, desc: 'Talento que enche arenas.' },
};

function getSynergy(styleId, personalityId) {
  return STYLE_SYNERGIES[`${styleId}_${personalityId}`] || null;
}

function getStyleMatchup(attackerStyle, defenderStyle) {
  const matchups = {
    pressure_outboxer: 0.88,
    pressure_slugger: 1.05,
    slugger_technical: 0.85,
    technical_swarmer: 1.10,
    counterpuncher_pressure: 1.15,
    outboxer_swarmer: 1.10,
    swarmer_technical: 1.05,
  };
  const direct = matchups[`${attackerStyle}_${defenderStyle}`];
  if (direct) return direct;
  const inverse = matchups[`${defenderStyle}_${attackerStyle}`];
  return inverse ? 1 / inverse : 1;
}

function getFighterMatchupReport(fighter, opponent) {
  const styleMultiplier = getStyleMatchup(fighter.styleId, opponent.styleId);
  const synergy = getSynergy(fighter.styleId, fighter.personalityId);
  const trait = NAMES[fighter.nationality]?.trait;
  const advantages = [];
  const risks = [];
  if (styleMultiplier > 1.02) advantages.push('vantagem de estilo');
  if (styleMultiplier < 0.98) risks.push('desvantagem de estilo');
  if (synergy) advantages.push(synergy.label);
  if (fighter.personalityId === 'calculating' && opponent.personalityId === 'arrogant') {
    advantages.push('temperamento favorece ajustes contra excesso de confiança');
  }
  if (fighter.personalityId === 'arrogant' && opponent.personalityId === 'calculating') {
    risks.push('pode perder confiança contra um adversário calculista');
  }
  if (fighter.personalityId === 'volatile') risks.push('alto consumo de energia');
  if (fighter.personalityId === 'disciplined') advantages.push('consistência tática');
  return {
    fighterId: fighter.id,
    opponentId: opponent.id,
    styleMultiplier,
    style: fighter.style?.name || fighter.styleId,
    personality: fighter.personality?.name || fighter.personalityId,
    nationalTrait: trait?.name || null,
    synergy: synergy?.label || null,
    advantages,
    risks,
  };
}

function chooseNpcStrategy(fighter, opponent) {
  const preferred = {
    pressure: 'pressure',
    outboxer: 'jab_control',
    counterpuncher: 'counter',
    slugger: 'go_for_ko',
    swarmer: 'body_attack',
    technical: 'adapt',
    boxer_puncher: 'adapt',
  };
  if (fighter.personalityId === 'calculating') return 'adapt';
  if (fighter.personalityId === 'arrogant' && fighter.overall >= opponent.overall) return 'go_for_ko';
  if (fighter.personalityId === 'volatile') return Math.random() < 0.65 ? 'go_for_ko' : 'pressure';
  if (fighter.personalityId === 'disciplined' && fighter.styleId === 'outboxer') return 'points';
  if (getStyleMatchup(fighter.styleId, opponent.styleId) < 0.95 && fighter.ringIQ >= 65) return 'adapt';
  return preferred[fighter.styleId] || 'adapt';
}

function getFightMarketability(fighter, opponent, context = {}) {
  const loudPersonalities = new Set(['charismatic', 'arrogant', 'volatile']);
  const reservedPersonalities = new Set(['disciplined', 'humble', 'calculating', 'veteran']);
  const personalityContrast = fighter.personalityId !== opponent.personalityId;
  const heroVillainContrast =
    (['humble', 'disciplined', 'calculating'].includes(fighter.personalityId) &&
      ['arrogant', 'volatile'].includes(opponent.personalityId)) ||
    (['humble', 'disciplined', 'calculating'].includes(opponent.personalityId) &&
      ['arrogant', 'volatile'].includes(fighter.personalityId));
  const bothReserved = reservedPersonalities.has(fighter.personalityId) &&
    reservedPersonalities.has(opponent.personalityId);
  const styleContrast = fighter.styleId !== opponent.styleId;
  const actionStyle = ['pressure', 'slugger', 'swarmer'].includes(fighter.styleId) ||
    ['pressure', 'slugger', 'swarmer'].includes(opponent.styleId);
  const combinedPopularity = ((fighter.popularity || 0) + (opponent.popularity || 0)) / 2;
  const rivalry = clamp(context.rivalryIntensity || 0, 0, 5);
  const titleTier = clamp(context.titleTier || 0, 0, 5);

  let score = 20 + combinedPopularity * 0.45 + rivalry * 8 + titleTier * 6;
  if (personalityContrast) score += 5;
  if (heroVillainContrast) score += 13;
  if (loudPersonalities.has(fighter.personalityId) || loudPersonalities.has(opponent.personalityId)) score += 7;
  if (bothReserved && !context.rivalryIntensity) score -= 8;
  if (styleContrast) score += 4;
  if (actionStyle) score += 5;
  if (getSynergy(fighter.styleId, fighter.personalityId)) score += 2;
  if (getSynergy(opponent.styleId, opponent.personalityId)) score += 2;

  const hooks = [];
  if (heroVillainContrast) hooks.push('herói contra vilão');
  if (rivalry >= 3) hooks.push('rivalidade intensa');
  if (titleTier >= 4) hooks.push('grande cinturão em jogo');
  if (styleContrast) hooks.push('choque de estilos');
  if (actionStyle) hooks.push('promessa de ação');
  if (bothReserved && !rivalry) hooks.push('promoção difícil');

  return {
    score: clamp(Math.round(score), 0, 100),
    personalityContrast,
    heroVillainContrast,
    styleContrast,
    hooks,
  };
}

// Continentes
const CONTINENTS = {
  americas: { name: 'Américas', icon: '🌎' },
  europa:   { name: 'Europa',   icon: '🌍' },
  asia:     { name: 'Ásia',     icon: '🌏' },
  africa:   { name: 'África',   icon: '🌍' },
  oceania:  { name: 'Oceania',  icon: '🌏' },
};

// Labels globais de atributos
const ATTR_LABELS = {
  strength: 'Força', speed: 'Velocidade', stamina: 'Resistência', chin: 'Queixo',
  durability: 'Durabilidade', reflexes: 'Reflexos', jab: 'Jab', straight: 'Direto',
  cross: 'Cruzado', uppercut: 'Uppercut', defense: 'Defesa', footwork: 'Jogo de Pés',
  bodyPunch: 'Golpes no Corpo', combinations: 'Combinações', distance: 'Distância',
  clinch: 'Clinch', counter: 'Contra-ataque', precision: 'Precisão', ringIQ: 'Ring IQ',
  courage: 'Coragem', discipline: 'Disciplina', composure: 'Equilíbrio',
  adaptation: 'Adaptação', pressure: 'Pressão', resilience: 'Resiliência',
  popularity: 'Popularidade', reputation: 'Reputação',
};

// Nomes, continente e trait por nacionalidade.
// Traits estilo Fallout: sempre um lado bom E um lado ruim.
const NAMES = {
  // AMÉRICAS
  US: {
    first: ['DeAndre', 'Marcus', 'James', 'Tyson', 'Darnell', 'Kevin', 'Willie', 'Jerome', 'Leon', 'Anthony',
            'Floyd', 'Michael', 'Robert', 'Clarence', 'Nathaniel', 'Derrick', 'Lamont', 'Reggie', 'Calvin', 'Terrell'],
    last:  ['Johnson', 'Williams', 'Brown', 'Davis', 'Jackson', 'Thompson', 'White', 'Harris', 'Martin', 'Clark',
            'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill'],
    flag: '🇺🇸', nation: 'EUA', continent: 'americas',
    trait: {
      name: 'Showman Americano',
      desc: 'A terra do show business: holofotes e bolsas gordas, mas muitas distrações.',
      plus:  { speed: 3, popularity: 15 },
      minus: { discipline: -5 },
      special: { purseMult: 1.15 },
    },
  },
  MX: {
    first: ['Julio', 'Canelo', 'Ruben', 'Omar', 'Miguel', 'Juan Manuel', 'Erik', 'Marco', 'Israel', 'Gilberto',
            'Saul', 'Fernando', 'Ricardo', 'Antonio', 'Victor', 'Jose', 'Emanuel', 'David', 'Armando', 'Rodrigo'],
    last:  ['Martinez', 'Garcia', 'Lopez', 'Sanchez', 'Gonzalez', 'Rodriguez', 'Morales', 'Chavez', 'Alvarez', 'Perez',
            'Barrera', 'Marquez', 'Camacho', 'Castillo', 'Herrera', 'Ruiz', 'Torres', 'Ramirez', 'Flores', 'Cruz'],
    flag: '🇲🇽', nation: 'México', continent: 'americas',
    trait: {
      name: 'Sangue Azteca',
      desc: 'O estilo guerreiro mexicano: ataque ao corpo devastador e coração de aço — mas defesa é coisa de covarde.',
      plus:  { bodyPunch: 6, chin: 5, courage: 5 },
      minus: { defense: -5, footwork: -3 },
    },
  },
  BR: {
    first: ['Anderson', 'Robson', 'Carlos', 'Marcos', 'Rafael', 'Thiago', 'Felipe', 'Gabriel', 'Leandro', 'Diego',
            'Bruno', 'Vitor', 'João', 'Pedro', 'Mateus', 'Alexandre', 'Rodrigo', 'Eduardo', 'Luiz', 'Paulo',
            'Evandro', 'Wellington', 'Claudinho', 'Adriano', 'Renato'],
    last:  ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento',
            'Barbosa', 'Carvalho', 'Gomes', 'Martins', 'Ribeiro', 'Araújo', 'Cardoso', 'Pereira', 'Mendes', 'Dias'],
    flag: '🇧🇷', nation: 'Brasil', continent: 'americas',
    trait: {
      name: 'Garra Brasileira',
      desc: 'Talento natural e carisma de sobra, mas a base técnica do boxe nacional ainda engatinha.',
      plus:  { courage: 5, pressure: 4, popularity: 8 },
      minus: { jab: -4, defense: -3 },
    },
  },
  AR: {
    first: ['Marcos', 'Carlos', 'Omar', 'Sergio', 'Pablo', 'Diego', 'Julio', 'Fernando', 'Lucas', 'Gustavo',
            'Nicolas', 'Alejandro', 'Martin', 'Rodrigo', 'Mauricio', 'Sebastian', 'Federico', 'Maximiliano'],
    last:  ['Maidana', 'Monzon', 'Galindez', 'Morales', 'Gonzalez', 'Herrera', 'Lopez', 'Sanchez', 'Rodriguez', 'Perez',
            'Castro', 'Romero', 'Ferreyra', 'Torres', 'Gutierrez', 'Gimenez', 'Vargas', 'Medina'],
    flag: '🇦🇷', nation: 'Argentina', continent: 'americas',
    trait: {
      name: 'Coração Guerreiro',
      desc: 'Como Monzón e Maidana: queixo de granito e nunca recua — mas a disciplina às vezes fica no vestiário.',
      plus:  { chin: 6, resilience: 5 },
      minus: { discipline: -5, precision: -3 },
    },
  },
  CU: {
    first: ['Yordenis', 'Guillermo', 'Erislandy', 'Yuriorkis', 'Rances', 'Luis', 'Joel', 'Robeisy', 'Lazaro', 'Osmel'],
    last:  ['Ugas', 'Rigondeaux', 'Lara', 'Gamboa', 'Barthelemy', 'Ortiz', 'Casamayor', 'Ramirez', 'Alvarez', 'Morrell'],
    flag: '🇨🇺', nation: 'Cuba', continent: 'americas',
    trait: {
      name: 'Escola Cubana',
      desc: 'A lendária escola amadora: técnica olímpica impecável, mas pouco brilho comercial e estilo "seguro demais".',
      plus:  { jab: 6, footwork: 6, ringIQ: 5 },
      minus: { strength: -5, popularity: -10 },
    },
  },
  PR: {
    first: ['Miguel', 'Felix', 'Wilfredo', 'Hector', 'Edwin', 'Juan', 'Ivan', 'Jose', 'Edgar', 'Carlos'],
    last:  ['Cotto', 'Trinidad', 'Gomez', 'Camacho', 'Rosario', 'Ortiz', 'Calderon', 'Vazquez', 'Serrano', 'Verdejo'],
    flag: '🇵🇷', nation: 'Porto Rico', continent: 'americas',
    trait: {
      name: 'Ídolo Boricua',
      desc: 'A ilha respira boxe: ídolos instantâneos com mãos rápidas, mas o gás nem sempre acompanha.',
      plus:  { speed: 5, counter: 4, popularity: 10 },
      minus: { stamina: -5 },
    },
  },

  // EUROPA
  GB: {
    first: ['Ricky', 'Amir', 'Tony', 'Joe', 'Carl', 'Kell', 'Callum', 'Liam', 'Tommy', 'Josh',
            'Dillian', 'Anthony', 'George', 'Chris', 'Nathan', 'Ryan', 'Scott', 'Gary', 'Lee', 'Craig'],
    last:  ['Hatton', 'Khan', 'Bellew', 'Calzaghe', 'Froch', 'Brook', 'Smith', 'Harrison', 'Fury', 'Joshua',
            'Whyte', 'Burns', 'McGuigan', 'Eubank', 'Collins', 'Cooper', 'Bunce', 'Hall', 'Evans', 'Taylor'],
    flag: '🇬🇧', nation: 'Reino Unido', continent: 'europa',
    trait: {
      name: 'Orgulho Britânico',
      desc: 'Arenas lotadas e bolsas enormes — mas a pressão de 90 mil torcedores pesa nos ombros.',
      plus:  { stamina: 5, straight: 4 },
      minus: { composure: -4 },
      special: { purseMult: 1.10 },
    },
  },
  UA: {
    first: ['Vasyl', 'Oleksandr', 'Viktor', 'Sergiy', 'Taras', 'Mykhailo', 'Denys', 'Andriy', 'Bohdan', 'Ihor'],
    last:  ['Lomachenko', 'Usyk', 'Postol', 'Derevyanchenko', 'Kucheriavyi', 'Khyzhniak', 'Berinchyk', 'Gvozdyk', 'Sirenko', 'Bohachuk'],
    flag: '🇺🇦', nation: 'Ucrânia', continent: 'europa',
    trait: {
      name: 'Aço do Leste',
      desc: 'Pedigree amador de elite: QI de ringue e precisão cirúrgica, mas mercado pequeno e pouco hype.',
      plus:  { ringIQ: 6, precision: 5, footwork: 4 },
      minus: { popularity: -12 },
    },
  },
  RU: {
    first: ['Sergey', 'Dmitry', 'Artur', 'Denis', 'Alexander', 'Maxim', 'Ivan', 'Nikolai', 'Vladimir', 'Andrei'],
    last:  ['Kovalev', 'Bivol', 'Beterbiev', 'Lebedev', 'Povetkin', 'Dadashev', 'Troyanovsky', 'Chudinov', 'Kuznetsov', 'Volkov'],
    flag: '🇷🇺', nation: 'Rússia', continent: 'europa',
    trait: {
      name: 'Escola Russa',
      desc: 'Disciplina militar e direto demolidor — mas frieza demais não vende ingresso nem improvisa no ringue.',
      plus:  { discipline: 6, chin: 5, straight: 4 },
      minus: { popularity: -10, adaptation: -3 },
    },
  },
  DE: {
    first: ['Max', 'Felix', 'Arthur', 'Vincent', 'Jurgen', 'Sven', 'Marco', 'Tom', 'Leon', 'Robert'],
    last:  ['Schmeling', 'Sturm', 'Abraham', 'Feigenbutz', 'Brahmer', 'Huck', 'Zeuge', 'Bosel', 'Maske', 'Rocchigiani'],
    flag: '🇩🇪', nation: 'Alemanha', continent: 'europa',
    trait: {
      name: 'Precisão Germânica',
      desc: 'Cada golpe calculado ao milímetro — mas falta a explosão e o brilho dos rivais.',
      plus:  { precision: 6, discipline: 5 },
      minus: { speed: -4, popularity: -6 },
    },
  },
  IT: {
    first: ['Giovanni', 'Nino', 'Vito', 'Salvatore', 'Marco', 'Luca', 'Matteo', 'Daniele', 'Emanuele', 'Fabio'],
    last:  ['Benvenuti', 'Mancini', 'Antuofermo', 'Oliva', 'Parisi', 'Russo', 'De Carolis', 'Blandamura', 'Cammarelle', 'Fragomeni'],
    flag: '🇮🇹', nation: 'Itália', continent: 'europa',
    trait: {
      name: 'Maestria Italiana',
      desc: 'Defesa elegante e contra-ataque artístico — mas sem a pegada para definir lutas.',
      plus:  { defense: 5, counter: 5 },
      minus: { strength: -4 },
    },
  },
  ES: {
    first: ['Javier', 'Sergio', 'Kiko', 'Jon', 'Andoni', 'Carlos', 'Ruben', 'Marc', 'Pablo', 'Alejandro'],
    last:  ['Castillejo', 'Martinez', 'Garcia', 'Fernandez', 'Gago', 'Sotelo', 'Ramos', 'Vidal', 'Navarro', 'Torres'],
    flag: '🇪🇸', nation: 'Espanha', continent: 'europa',
    trait: {
      name: 'Fúria Espanhola',
      desc: 'Pressão incansável de touro de arena — mas previsível para quem sabe contra-atacar.',
      plus:  { pressure: 5, stamina: 4 },
      minus: { counter: -4 },
    },
  },
  IE: {
    first: ['Barry', 'Steve', 'Michael', 'Andy', 'Patrick', 'Sean', 'John', 'Eamonn', 'Dennis', 'Conor'],
    last:  ['McGuigan', 'Collins', 'Conlan', 'Lee', 'Frampton', 'Duddy', 'Dunne', 'Doyle', 'McCullough', 'Donovan'],
    flag: '🇮🇪', nation: 'Irlanda', continent: 'europa',
    trait: {
      name: 'Coração Irlandês',
      desc: 'Coragem lendária e torcida apaixonada — mas o sangue quente trai nos momentos decisivos.',
      plus:  { courage: 6, popularity: 10 },
      minus: { composure: -5 },
    },
  },

  // ÁSIA
  PH: {
    first: ['Manny', 'Nonito', 'Mark', 'Brian', 'Joey', 'Rexmart', 'Jhack', 'John', 'Rey', 'Gideon'],
    last:  ['Pacquiao', 'Donaire', 'Magsayo', 'Castaño', 'Nietes', 'Gaballo', 'Ancajas', 'Casimero', 'Villa', 'Suganob'],
    flag: '🇵🇭', nation: 'Filipinas', continent: 'asia',
    trait: {
      name: 'Tufão Filipino',
      desc: 'Velocidade alucinante e combinações em rajada à la Pacquiao — mas defesa fica em segundo plano.',
      plus:  { speed: 6, combinations: 5, courage: 4 },
      minus: { defense: -4, strength: -3 },
    },
  },
  JP: {
    first: ['Naoya', 'Kazuto', 'Ryota', 'Kosei', 'Takuma', 'Kenshiro', 'Hiroto', 'Daigo', 'Shinsuke', 'Yuki'],
    last:  ['Inoue', 'Ioka', 'Murata', 'Tanaka', 'Yamanaka', 'Hatanaka', 'Kameda', 'Teraji', 'Nakatani', 'Ogawa'],
    flag: '🇯🇵', nation: 'Japão', continent: 'asia',
    trait: {
      name: 'Disciplina Samurai',
      desc: 'Dedicação monástica ao ofício e calma absoluta — mas o físico raramente é o mais forte.',
      plus:  { discipline: 7, composure: 5, precision: 4 },
      minus: { strength: -4, uppercut: -3 },
    },
  },
  KZ: {
    first: ['Gennady', 'Daniyar', 'Abror', 'Bektemir', 'Merey', 'Kanat', 'Sadriddin', 'Aidos', 'Zhanibek', 'Nurlan'],
    last:  ['Golovkin', 'Yeleussinov', 'Mirzakhmedov', 'Melikuziev', 'Kambiev', 'Islam', 'Alimkhanuly', 'Yerbossynuly', 'Akhmedov', 'Tuleukhanov'],
    flag: '🇰🇿', nation: 'Cazaquistão', continent: 'asia',
    trait: {
      name: 'Punhos de Aço',
      desc: 'Pegada assustadora estilo GGG: todo mundo respeita, ninguém quer enfrentar — e isso custa fama.',
      plus:  { strength: 6, chin: 5, precision: 4 },
      minus: { popularity: -10, speed: -3 },
    },
  },
  UZ: {
    first: ['Murodjon', 'Shakhram', 'Israil', 'Bakhodir', 'Hasanboy', 'Elnur', 'Sardor', 'Aziz', 'Botir', 'Doston'],
    last:  ['Akhmadaliev', 'Giyasov', 'Madrimov', 'Jalolov', 'Dusmatov', 'Tulaganov', 'Mirzakhalilov', 'Abdullaev', 'Rashidov', 'Karimov'],
    flag: '🇺🇿', nation: 'Uzbequistão', continent: 'asia',
    trait: {
      name: 'Mestre Amador',
      desc: 'Fábrica de medalhistas olímpicos: leitura de luta excepcional, mas o circuito profissional ainda é novidade.',
      plus:  { ringIQ: 6, counter: 5, footwork: 4 },
      minus: { popularity: -12 },
    },
  },
  TH: {
    first: ['Srisaket', 'Wanheng', 'Panya', 'Somchai', 'Anucha', 'Thanat', 'Kris', 'Decha', 'Somsak', 'Veera'],
    last:  ['Sor Rungvisai', 'Menayothin', 'Niyomtrong', 'Kokietgym', 'Sithsaithong', 'Chuwatana', 'Singwancha', 'Kiatniwat', 'Sakkreerin', 'Wongprates'],
    flag: '🇹🇭', nation: 'Tailândia', continent: 'asia',
    trait: {
      name: 'Guerreiro de Ferro',
      desc: 'Forjado no muay thai: corpo castigado vira rotina e o gás nunca acaba — mas o boxe de mãos é cru.',
      plus:  { stamina: 6, bodyPunch: 5, chin: 4 },
      minus: { straight: -4, cross: -3 },
    },
  },

  // ÁFRICA
  NG: {
    first: ['Samuel', 'Efe', 'Ike', 'Dick', 'Bashiru', 'David', 'Peter', 'Richard', 'Friday', 'Emeka'],
    last:  ['Peter', 'Ajagba', 'Ibeabuchi', 'Tiger', 'Okorodudu', 'Olajide', 'Ahmed', 'Nwankpa', 'Oboh', 'Ekundayo'],
    flag: '🇳🇬', nation: 'Nigéria', continent: 'africa',
    trait: {
      name: 'Potência Africana',
      desc: 'Força física fora da curva — mas a lapidação técnica chegou tarde.',
      plus:  { strength: 7, durability: 5 },
      minus: { jab: -4, ringIQ: -3 },
    },
  },
  GH: {
    first: ['Azumah', 'Ike', 'Joshua', 'Isaac', 'Richard', 'Emmanuel', 'Joseph', 'Samuel', 'Daniel', 'Kofi'],
    last:  ['Nelson', 'Quartey', 'Clottey', 'Dogboe', 'Commey', 'Tagoe', 'Allotey', 'Mensah', 'Quaye', 'Annan'],
    flag: '🇬🇭', nation: 'Gana', continent: 'africa',
    trait: {
      name: 'Lenda de Bukom',
      desc: 'O bairro que produz campeões: queixo indestrutível e coragem infinita — mas treinar... nem sempre.',
      plus:  { chin: 7, courage: 5 },
      minus: { discipline: -5 },
    },
  },
  ZA: {
    first: ['Vuyani', 'Moruti', 'Hekkie', 'Zolani', 'Thabiso', 'Sipho', 'Thulani', 'Mzonke', 'Lovemore', 'Bongani'],
    last:  ['Bungu', 'Mthalane', 'Budler', 'Tete', 'Fana', 'Ndlovu', 'Malinga', 'Mchunu', 'Lerena', 'Nontshinga'],
    flag: '🇿🇦', nation: 'África do Sul', continent: 'africa',
    trait: {
      name: 'Velocista do Cabo',
      desc: 'Movimentação e ritmo de sobra nas categorias leves — mas falta peso na mão.',
      plus:  { speed: 5, footwork: 4, stamina: 4 },
      minus: { strength: -4 },
    },
  },

  // OCEANIA
  AU: {
    first: ['Jeff', 'Danny', 'Michael', 'Tim', 'George', 'Jai', 'Liam', 'Sam', 'Luke', 'Daniel'],
    last:  ['Fenech', 'Green', 'Tszyu', 'Horn', 'Zerafa', 'Kambosos', 'Moloney', 'Goodman', 'Wilson', 'Gallen'],
    flag: '🇦🇺', nation: 'Austrália', continent: 'oceania',
    trait: {
      name: 'Brigador do Outback',
      desc: 'Nunca recusa uma trocação e o público adora — mas sair ileso é outra história.',
      plus:  { courage: 5, stamina: 5, popularity: 5 },
      minus: { defense: -5 },
    },
  },
  NZ: {
    first: ['Joseph', 'David', 'Robert', 'Junior', 'Shane', 'Hemi', 'Kali', 'Sonny', 'Israel', 'Lani'],
    last:  ['Parker', 'Tua', 'Nyika', 'Fa', 'Cameron', 'Rangi', 'Ahio', 'Utanga', 'Leafa', 'Opetaia'],
    flag: '🇳🇿', nation: 'Nova Zelândia', continent: 'oceania',
    trait: {
      name: 'Força Kiwi',
      desc: 'Físico de rugby e calma de ilha — mas os pés não acompanham os pesados do mundo.',
      plus:  { strength: 5, composure: 4 },
      minus: { speed: -4 },
    },
  },
};

const NATIONALITIES = Object.keys(NAMES);

// Templates de comentários de luta por situação
const COMMENTARY = {
  roundStart: [
    '{a} sai do canto com {aStyle}.',
    '{a} abre o round com pressão.',
    '{b} tenta estabelecer o jab logo no início.',
    'Ambos os lutadores se estudam no início do round.',
    '{a} já vai direto para o centro do ringue.',
  ],
  jabLanded: [
    'Jab certeiro de {a}! {b} recua.',
    '{a} encontra o jab e marca ponto.',
    'Boa sequência de {a} com jab duplo.',
    '{a} usa o jab para controlar a distância.',
    'Jab penetrante de {a}, {b} pisca.',
  ],
  bigShot: [
    'CRUZADO DIRETO! {a} acerta em cheio!',
    '{a} encaixa um uppercut brutal! {b} sente!',
    'GOLPE DURO de {a}! A multidão vai ao delírio!',
    '{a} acerta um gancho de esquerda devastador!',
    'Combinação perfeita de {a}! {b} está em apuros!',
  ],
  bodyShot: [
    '{a} vai ao corpo! {b} curva-se de dor.',
    'Golpe no fígado de {a}! {b} grimace.',
    '{a} trabalha o corpo metodicamente.',
    'Bom golpe no estômago de {b} por {a}.',
  ],
  knockdown: [
    'KNOCKDOWN! {b} está no chão! A arena explode!',
    '{a} MANDA {b} AO TAPETE! Incrível!',
    '{b} cai! O árbitro começa a contagem!',
    'QUE GOLPE! {b} beija a lona!',
  ],
  getUp: [
    '{b} se levanta com coragem! A luta continua!',
    '{b} se recupera no tempo! {a} vai em cima!',
    '{b} está de pé antes dos 10! Coração de leão!',
  ],
  tired: [
    '{a} está claramente cansado.',
    '{b} respira pela boca – o gás está acabando.',
    '{a} baixa as mãos por um segundo.',
    'O ritmo de {b} caiu visivelmente.',
  ],
  clinch: [
    '{b} puxa para o clinch para ganhar tempo.',
    'O árbitro manda separar. {b} precisava do descanso.',
    '{a} tenta se soltar do clinch de {b}.',
  ],
  corner: [
    'O corner grita orientações para {a}.',
    '{a} recebe água e instrução entre os rounds.',
    'O técnico de {a} está animado no canto.',
    'Curativo aplicado no corte de {a}.',
  ],
  winningRound: [
    '{a} claramente venceu o round.',
    'Round para {a} na maioria dos livros de pontuação.',
    '{a} controla o ritmo e deve ganhar esse round.',
  ],
  closeFight: [
    'Round extremamente equilibrado.',
    'Difícil dar esse round para qualquer um.',
    'Os juízes terão trabalho nesse round.',
  ],
  finalRound: [
    'ROUND FINAL! Tudo ou nada!',
    'Último round – quem quiser vencer precisa ser agressivo agora!',
    '3 minutos que podem mudar tudo!',
  ],
};

// Templates de notícias
const NEWS_TEMPLATES = {
  win_ko: [
    '{winner} derruba {loser} no {round}º round! Nocaute impressionante!',
    'KO BRUTAL! {winner} finaliza {loser} com golpe devastador no {round}º!',
    '{winner} soca {loser} para nocaute no {round}º round. Que finalização!',
  ],
  win_tko: [
    '{winner} vence por nocaute técnico no {round}º round contra {loser}.',
    'O árbitro para a luta! {winner} vence por TKO sobre {loser} no {round}º.',
    '{loser} não responde! {winner} vence por TKO no {round}º round.',
  ],
  win_decision: [
    '{winner} supera {loser} na decisão dos juízes.',
    '{winner} vence {loser} por decisão após {rounds} rounds.',
    'Decisão para {winner} sobre {loser}. Luta equilibrada mas o resultado foi justo.',
  ],
  upset: [
    'ZEBRA! {winner} derrota o favorito {loser}! Ninguém acreditava!',
    'Maior surpresa da temporada! {winner} bate {loser} de forma convincente!',
    'O boxe é imprevisível! {winner} nocauteia o favoritíssimo {loser}!',
  ],
  title_won: [
    '{winner} É O NOVO CAMPEÃO! Destronou {loser} e conquistou o cinturão!',
    'NOVO CAMPEÃO MUNDIAL! {winner} finaliza reinado de {loser}!',
    '{winner} CAMPEÃO! A academia explode depois de {rounds} rounds épicos!',
  ],
  controversy: [
    'Decisão controversa em {a} vs {b} gera revolta nas redes sociais.',
    'Fãs furiosos com a decisão em {a} vs {b}. "Foi roubo!"',
    'Analistas divergem sobre a decisão em {a} vs {b}. Revanche inevitável?',
  ],
  injury: [
    '{fighter} sofre lesão durante o treino. Luta pode ser cancelada.',
    'Preocupação no camp de {fighter}: possível lesão atrasa preparação.',
    '{fighter} foi visto com curativo. Condição ainda é incerta.',
  ],
  ranking: [
    '{fighter} entra no top 10 da categoria {weightClass} após vitória convincente.',
    '{fighter} sobe para #{rank} no ranking do {weightClass}. Títulos à vista?',
    'Com a vitória, {fighter} pressiona o campeão {champ} na categoria {weightClass}.',
  ],
  fan_comments: [
    'Esse cara só pega luta fácil.',
    'Roubaram meu lutador. Essa decisão foi absurda.',
    'Ele não é campeão de verdade até unificar.',
    'Esse nocaute foi coisa de lenda.',
    'Já passou da hora dessa revanche acontecer.',
    'Ele fala demais e luta pouco.',
    'Esse prospecto é o futuro da categoria.',
    'Mais uma defesa de cinturão! Lenda!',
    'Quando esse cara vai enfrentar um adversário de verdade?',
    'Luta do ano! Os dois guerreiros.',
    'O técnico dele precisa ser demitido.',
    'Maior KO que eu já vi na minha vida.',
    'Quero a revanche agora!',
    'Esse cara vai ser campeão em 2 anos no máximo.',
    'Decisão dividida? Pra mim foi claro vencedor.',
  ],
  analyst: {
    equilibrado: [
      '"Luta equilibrada. Ambos têm argumentos para pedir revanche."',
      '"Vi rounds que poderiam ir para qualquer lado. Difícil decisão."',
      '"A partir do 6º round quem controlou foi {winner}. Justo o resultado."',
    ],
    tecnico: [
      '"A superioridade técnica de {winner} foi evidente. Jab impecável."',
      '"Taticamente, {winner} dominou. Explorou bem as fraquezas do adversário."',
      '"Esse camp foi excelente para {winner}. Preparação perfeita."',
    ],
    critico: [
      '"Decepcionante. Esperava mais de {loser} contra esse adversário."',
      '"O nível do camp de {loser} foi visível – despreparo físico claro."',
      '"Esse resultado vai levantar questões sobre o futuro de {loser}."',
    ],
  },
};

// English NEWS_TEMPLATES (used when I18n language is 'en')
const NEWS_TEMPLATES_EN = {
  win_ko: [
    '{winner} drops {loser} in round {round}! Stunning knockout!',
    'BRUTAL KO! {winner} finishes {loser} with a devastating shot in round {round}!',
    '{winner} punches {loser} into the canvas in round {round}. What a finish!',
  ],
  win_tko: [
    '{winner} wins by technical knockout in round {round} against {loser}.',
    'The referee steps in! {winner} wins by TKO over {loser} in round {round}.',
    '{loser} cannot continue! {winner} wins by TKO in round {round}.',
  ],
  win_decision: [
    '{winner} outpoints {loser} on the judges\' scorecards.',
    '{winner} defeats {loser} by decision after {rounds} rounds.',
    'Decision for {winner} over {loser}. Close fight but a fair result.',
  ],
  upset: [
    'UPSET! {winner} defeats the favored {loser}! Nobody saw this coming!',
    'Biggest shock of the season! {winner} beats {loser} convincingly!',
    'Boxing is unpredictable! {winner} knocks out the heavy favorite {loser}!',
  ],
  title_won: [
    '{winner} IS THE NEW CHAMPION! Dethroned {loser} and seized the belt!',
    'NEW WORLD CHAMPION! {winner} ends {loser}\'s reign!',
    '{winner} CHAMPION! The arena erupts after {rounds} epic rounds!',
  ],
  controversy: [
    'Controversial decision in {a} vs {b} sparks outrage on social media.',
    'Fans furious with the decision in {a} vs {b}. "It was robbery!"',
    'Analysts disagree on the decision in {a} vs {b}. Rematch inevitable?',
  ],
  injury: [
    '{fighter} suffers injury during training. Fight may be cancelled.',
    'Concern in {fighter}\'s camp: possible injury delays preparation.',
    '{fighter} was seen with a bandage. Condition still uncertain.',
  ],
  ranking: [
    '{fighter} enters the {weightClass} top 10 after a convincing win.',
    '{fighter} climbs to #{rank} in the {weightClass} rankings. Titles in sight?',
    'With the win, {fighter} puts pressure on champion {champ} in the {weightClass} division.',
  ],
  fan_comments: [
    'This guy only takes easy fights.',
    'They robbed my fighter. That decision was outrageous.',
    'He\'s not a real champion until he unifies.',
    'That knockout was legendary.',
    'That rematch is long overdue.',
    'He talks too much and fights too little.',
    'This prospect is the future of the division.',
    'Another belt defense! Legend!',
    'When is this guy going to face a real opponent?',
    'Fight of the year! Two warriors.',
    'His trainer needs to be fired.',
    'Biggest KO I\'ve ever seen in my life.',
    'I want the rematch right now!',
    'This guy will be champion within 2 years tops.',
    'Split decision? That was a clear winner to me.',
  ],
  analyst: {
    equilibrado: [
      '"Close fight. Both have grounds to ask for a rematch."',
      '"I saw rounds that could have gone either way. Tough call."',
      '"From round 6 onwards {winner} took control. Fair result."',
    ],
    tecnico: [
      '"The technical superiority of {winner} was evident. Flawless jab."',
      '"Tactically, {winner} dominated. Exploited the opponent\'s weaknesses well."',
      '"That was an excellent camp for {winner}. Perfect preparation."',
    ],
    critico: [
      '"Disappointing. Expected more from {loser} against this opponent."',
      '"The quality of {loser}\'s camp was visible — clear physical unpreparedness."',
      '"This result will raise questions about the future of {loser}."',
    ],
  },
};

// Returns the right NEWS_TEMPLATES based on current language
function getNewsTemplates() {
  return (typeof I18n !== 'undefined' && I18n.getLang() === 'en') ? NEWS_TEMPLATES_EN : NEWS_TEMPLATES;
}

// Apelidos para lutadores
const NICKNAMES = [
  'O Demolidor', 'A Máquina', 'Trem-Bala', 'O Monstro', 'Punho de Ferro',
  'A Cobra', 'O Furacão', 'Trovão', 'Relâmpago', 'O Guerreiro',
  'O Predador', 'Sangue Frio', 'Dinamite', 'O Algoz', 'Tempestade',
  'O Inquebrável', 'Dragão', 'O Canhão', 'Punição', 'O Venenoso',
  'Fúria', 'O Fanático', 'A Bala', 'Bigorna', 'Terremoto',
  'A Lenda', 'O Invicto', 'Nocaute', 'O Demolidor', 'Flash',
];

// Academias de boxe fictícias
const GYMS = [
  { name: 'Academia Fênix',         city: 'São Paulo',    country: 'BR', prestige: 75 },
  { name: 'Fight Zone Brasil',      city: 'Rio de Janeiro', country: 'BR', prestige: 70 },
  { name: 'Top Glove Gym',          city: 'Las Vegas',    country: 'US', prestige: 90 },
  { name: 'Iron Fist Boxing',       city: 'Los Angeles',  country: 'US', prestige: 85 },
  { name: 'Kronk Fighters',         city: 'Detroit',      country: 'US', prestige: 80 },
  { name: 'Azteca Boxing Club',     city: 'Guadalajara',  country: 'MX', prestige: 78 },
  { name: 'Holy Docks Gym',         city: 'Manchester',   country: 'GB', prestige: 72 },
  { name: 'Buenos Aires Boxing',    city: 'Buenos Aires', country: 'AR', prestige: 68 },
  { name: 'Manila Warriors',        city: 'Manila',       country: 'PH', prestige: 65 },
  { name: 'Kyiv Boxing Club',       city: 'Kiev',         country: 'UA', prestige: 73 },
];

// Promotoras fictícias
// tier: 'global' | 'continental' | 'national'
// scope: continent key or country key (for national/continental); null for global
// orgAffil: org primária (preferência de matchmaking quando contrato exclusivo)
// orgAffil2: org secundária (chance menor mas presente)
const PROMOTERS = [
  // ── Global ──────────────────────────────────────────────
  { id: 'apex',       name: 'Apex Promotions',            tier: 'global', scope: null,       orgAffil: 'WBC', orgAffil2: 'WBA', prestige: 95, purseMult: 1.45, minWins: 20, style: 'elite',    budget: 'alto',  desc: 'O topo absoluto: eventos monumentais, bolsas máximas.' },
  { id: 'crown_intl', name: 'Crown Boxing International', tier: 'global', scope: null,       orgAffil: 'IBF', orgAffil2: 'WBO', prestige: 88, purseMult: 1.35, minWins: 15, style: 'titles',   budget: 'alto',  desc: 'Especialista em unificações e disputas de cinturão mundial.' },

  // ── Continental ─────────────────────────────────────────
  { id: 'americas_bc',name: 'Americas Boxing Alliance',   tier: 'continental', scope: 'americas', orgAffil: 'WBC', orgAffil2: 'WBA', prestige: 78, purseMult: 1.25, minWins: 10, style: 'regional', budget: 'medio', desc: 'A maior rede promocional das Américas.' },
  { id: 'euro_boxing', name: 'European Boxing Union Promo',tier: 'continental', scope: 'europa',  orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 76, purseMult: 1.23, minWins: 10, style: 'titles',  budget: 'medio', desc: 'Referência no boxe europeu, liga a cena local ao mundo.' },
  { id: 'asia_pac',   name: 'Asia-Pacific Fight Corp',    tier: 'continental', scope: 'asia',     orgAffil: 'WBC', orgAffil2: 'WBO', prestige: 72, purseMult: 1.20, minWins: 8,  style: 'knockouts', budget: 'medio', desc: 'Domina os mercados asiático e do Pacífico.' },
  { id: 'africa_bp',  name: 'Pan-African Boxing Promo',   tier: 'continental', scope: 'africa',   orgAffil: 'WBA', orgAffil2: 'WBC', prestige: 65, purseMult: 1.14, minWins: 6,  style: 'activity', budget: 'medio', desc: 'A voz do boxe africano, do Cairo ao Cabo.' },
  { id: 'oceania_fs', name: 'Oceania Fight Series',       tier: 'continental', scope: 'oceania',  orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 62, purseMult: 1.12, minWins: 5,  style: 'activity', budget: 'medio', desc: 'Conecta Austrália, Nova Zelândia e ilhas do Pacífico.' },

  // ── Nacional — Américas ─────────────────────────────────
  // EUA: Top Rank → WBC/IBF; PBC/Showtime → WBA; pequenas → WBO
  { id: 'us_top',     name: 'Top Ring USA',               tier: 'national', scope: 'US', orgAffil: 'WBC', orgAffil2: 'IBF', prestige: 72, purseMult: 1.22, minWins: 6,  style: 'elite',    budget: 'medio', desc: 'Um dos circuitos mais competitivos dos EUA.' },
  { id: 'us_star',    name: 'American Star Boxing',       tier: 'national', scope: 'US', orgAffil: 'WBA', orgAffil2: 'WBO', prestige: 58, purseMult: 1.10, minWins: 2,  style: 'activity', budget: 'baixo', desc: 'Porta de entrada para o sonho americano do boxe.' },
  // México: historicamente WBC (desde Cleto Reyes); WBA secundária
  { id: 'mx_azteca',  name: 'Azteca Fight Promotions',   tier: 'national', scope: 'MX', orgAffil: 'WBC', orgAffil2: 'WBA', prestige: 70, purseMult: 1.20, minWins: 5,  style: 'knockouts',budget: 'medio', desc: 'Herdeira do espírito de Chávez: só nocautes importam.' },
  { id: 'mx_tri',     name: 'Tricolor Boxing Shows',     tier: 'national', scope: 'MX', orgAffil: 'WBC', orgAffil2: null,  prestige: 55, purseMult: 1.08, minWins: 1,  style: 'local',    budget: 'baixo', desc: 'Circuito de base que reveló gerações de campeões mexicanos.' },
  // Brasil: WBO (forte influência europeia/latina); WBA secundária
  { id: 'br_ring',    name: 'Ring Brasil Promotions',    tier: 'national', scope: 'BR', orgAffil: 'WBO', orgAffil2: 'WBA', prestige: 68, purseMult: 1.18, minWins: 5,  style: 'regional', budget: 'medio', desc: 'Maior promotora nacional, forte no Rio e em São Paulo.' },
  { id: 'br_camp',    name: 'Campeões do Brasil',        tier: 'national', scope: 'BR', orgAffil: 'WBO', orgAffil2: null,  prestige: 52, purseMult: 1.06, minWins: 1,  style: 'activity', budget: 'baixo', desc: 'Revela talentos do interior e das periferias.' },
  { id: 'ar_boca',    name: 'Boca de Lobo Promotions',  tier: 'national', scope: 'AR', orgAffil: 'WBA', orgAffil2: 'WBC', prestige: 60, purseMult: 1.12, minWins: 4,  style: 'knockouts',budget: 'medio', desc: 'Pauladas e coragem: o estilo porteño em cada evento.' },
  { id: 'ar_pamp',    name: 'Pampa Boxing Club',         tier: 'national', scope: 'AR', orgAffil: 'WBA', orgAffil2: null,  prestige: 48, purseMult: 1.04, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Circuito local argentino com eventos semanais.' },
  { id: 'cu_havana',  name: 'Havana Boxing Promotions',  tier: 'national', scope: 'CU', orgAffil: 'WBA', orgAffil2: 'IBF', prestige: 58, purseMult: 1.08, minWins: 3,  style: 'titles',   budget: 'baixo', desc: 'A arte cubana em ringues profissionais.' },
  { id: 'cu_caribe',  name: 'Caribe Fight Series',       tier: 'national', scope: 'CU', orgAffil: 'WBA', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Eventos caribenhos de base, cheios de talento bruto.' },
  { id: 'pr_boricua', name: 'Boricua Boxing',            tier: 'national', scope: 'PR', orgAffil: 'WBO', orgAffil2: 'WBC', prestige: 62, purseMult: 1.14, minWins: 4,  style: 'knockouts',budget: 'medio', desc: 'Porto Rico nunca para — eventos toda semana.' },
  { id: 'pr_isla',    name: 'Isla Fight Promotions',     tier: 'national', scope: 'PR', orgAffil: 'WBO', orgAffil2: null,  prestige: 46, purseMult: 1.03, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'A base do boxe boricua: ringues pequenos, sonhos grandes.' },

  // ── Nacional — Europa ────────────────────────────────────
  // UK: Matchroom → WBO (parceria histórica); Frank Warren → WBC/WBO
  { id: 'gb_match',   name: 'Matchroom Sport UK',        tier: 'national', scope: 'GB', orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 74, purseMult: 1.24, minWins: 7,  style: 'titles',   budget: 'medio', desc: 'O maior espetáculo do boxe britânico, do O2 às arenas.' },
  { id: 'gb_frank',   name: 'Frank Warren Promotions',   tier: 'national', scope: 'GB', orgAffil: 'WBC', orgAffil2: 'WBO', prestige: 60, purseMult: 1.11, minWins: 3,  style: 'regional', budget: 'medio', desc: 'Décadas construindo campeões britânicos.' },
  // Ucrânia/Rússia: forte na IBF e WBA
  { id: 'ua_golden',  name: 'Golden Ring Ukraine',       tier: 'national', scope: 'UA', orgAffil: 'IBF', orgAffil2: 'WBA', prestige: 60, purseMult: 1.10, minWins: 3,  style: 'titles',   budget: 'medio', desc: 'Escola ucraniana exibindo seus campeões ao mundo.' },
  { id: 'ua_kyiv',    name: 'Kyiv Boxing Night',         tier: 'national', scope: 'UA', orgAffil: 'IBF', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Eventos domésticos que formam a base do boxe ucraniano.' },
  { id: 'ru_siberia', name: 'Siberian Storm Promotions', tier: 'national', scope: 'RU', orgAffil: 'WBA', orgAffil2: 'IBF', prestige: 62, purseMult: 1.12, minWins: 4,  style: 'knockouts',budget: 'medio', desc: 'Rugidos do leste: nocautes garantidos em cada evento.' },
  { id: 'ru_red',     name: 'Red Corner Boxing',         tier: 'national', scope: 'RU', orgAffil: 'WBA', orgAffil2: null,  prestige: 48, purseMult: 1.04, minWins: 0,  style: 'activity', budget: 'baixo', desc: 'Circuito russo de base, prolífico e sem frescura.' },
  // Alemanha/Itália: IBF (muitos campeões europeus via IBF)
  { id: 'de_ring',    name: 'Deutsche Ring Promotions',  tier: 'national', scope: 'DE', orgAffil: 'IBF', orgAffil2: 'WBO', prestige: 58, purseMult: 1.09, minWins: 3,  style: 'titles',   budget: 'medio', desc: 'Disciplina germânica: eventos pontuais e bem organizados.' },
  { id: 'de_sturm',   name: 'Sturm und Drang Boxing',   tier: 'national', scope: 'DE', orgAffil: 'IBF', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Circuito local alemão, base para prospectos europeus.' },
  { id: 'it_pugi',    name: 'Pugile Italiano Events',   tier: 'national', scope: 'IT', orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 56, purseMult: 1.08, minWins: 2,  style: 'regional', budget: 'medio', desc: 'Elegância italiana dentro e fora do ringue.' },
  { id: 'it_toro',    name: 'Toro Boxing Shows',         tier: 'national', scope: 'IT', orgAffil: 'WBO', orgAffil2: null,  prestige: 42, purseMult: 1.01, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Eventos locais italianos — aqui nascem futuros campeões.' },
  { id: 'es_brava',   name: 'Brava Boxing Promotions',  tier: 'national', scope: 'ES', orgAffil: 'WBO', orgAffil2: 'WBC', prestige: 56, purseMult: 1.07, minWins: 2,  style: 'knockouts',budget: 'medio', desc: 'Fúria e paixão: eventos espanhóis repletos de ação.' },
  { id: 'es_arena',   name: 'Arena España Boxing',       tier: 'national', scope: 'ES', orgAffil: 'WBO', orgAffil2: null,  prestige: 42, purseMult: 1.01, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Circuito de base da Espanha, revelando talentos locais.' },
  { id: 'ie_celtic',  name: 'Celtic Warriors Boxing',   tier: 'national', scope: 'IE', orgAffil: 'WBO', orgAffil2: 'WBC', prestige: 58, purseMult: 1.09, minWins: 3,  style: 'knockouts',budget: 'medio', desc: 'Coragem irlandesa: sempre um evento marcante na Irlanda.' },
  { id: 'ie_dublin',  name: 'Dublin Fight Nights',       tier: 'national', scope: 'IE', orgAffil: 'WBO', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Noites de luta em Dublin — ringue pequeno, emoção grande.' },

  // ── Nacional — Ásia ─────────────────────────────────────
  // Filipinas/Japão: WBC e WBO (maior penetração asiática)
  { id: 'ph_manny',   name: 'Philippine Fight Corp',    tier: 'national', scope: 'PH', orgAffil: 'WBC', orgAffil2: 'WBO', prestige: 65, purseMult: 1.15, minWins: 5,  style: 'knockouts',budget: 'medio', desc: 'A nação do boxe asiático tem sempre um campeão na linha.' },
  { id: 'ph_manila',  name: 'Manila Boxing Nights',     tier: 'national', scope: 'PH', orgAffil: 'WBC', orgAffil2: null,  prestige: 50, purseMult: 1.05, minWins: 1,  style: 'activity', budget: 'baixo', desc: 'Circuito filipino de base: rápido, intenso e popular.' },
  { id: 'jp_sword',   name: 'Sword of the East Boxing', tier: 'national', scope: 'JP', orgAffil: 'WBC', orgAffil2: 'WBO', prestige: 66, purseMult: 1.16, minWins: 5,  style: 'titles',   budget: 'medio', desc: 'Perfeição técnica em cada evento — o jeito japonês de promover.' },
  { id: 'jp_fuji',    name: 'Fuji Fight Productions',   tier: 'national', scope: 'JP', orgAffil: 'WBC', orgAffil2: null,  prestige: 50, purseMult: 1.05, minWins: 1,  style: 'local',    budget: 'baixo', desc: 'Eventos locais japoneses com alto nível técnico.' },
  // Cazaquistão/Uzbequistão: IBF e WBA (foco olímpico → amador→profissional via IBF)
  { id: 'kz_steppe',  name: 'Steppe Champions Boxing',  tier: 'national', scope: 'KZ', orgAffil: 'IBF', orgAffil2: 'WBA', prestige: 60, purseMult: 1.10, minWins: 3,  style: 'knockouts',budget: 'medio', desc: 'Do Cazaquistão ao mundo: potência pura em cada evento.' },
  { id: 'kz_almaty',  name: 'Almaty Ring Promotions',   tier: 'national', scope: 'KZ', orgAffil: 'IBF', orgAffil2: null,  prestige: 46, purseMult: 1.03, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'A base do boxe cazaque, com eventos em Almaty e Astana.' },
  { id: 'uz_silk',    name: 'Silk Road Boxing Corp',    tier: 'national', scope: 'UZ', orgAffil: 'IBF', orgAffil2: 'WBO', prestige: 58, purseMult: 1.09, minWins: 3,  style: 'titles',   budget: 'medio', desc: 'Uzbequistão exporta medalhistas olímpicos — e campeões.' },
  { id: 'uz_tashk',   name: 'Tashkent Fight Nights',    tier: 'national', scope: 'UZ', orgAffil: 'IBF', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Eventos domésticos uzbeques com alta qualidade técnica.' },
  // Tailândia: WBC (parceria histórica com boxe tailandês)
  { id: 'th_muay',    name: 'Thai Boxing International', tier: 'national', scope: 'TH', orgAffil: 'WBC', orgAffil2: 'WBA', prestige: 60, purseMult: 1.10, minWins: 3,  style: 'knockouts',budget: 'medio', desc: 'Guerreiros tailandeses mostrando sua arte ao mundo.' },
  { id: 'th_bang',    name: 'Bangkok Fight Series',      tier: 'national', scope: 'TH', orgAffil: 'WBC', orgAffil2: null,  prestige: 46, purseMult: 1.03, minWins: 0,  style: 'activity', budget: 'baixo', desc: 'Eventos noturnos em Bangkok — atletas de ferro, todo sábado.' },

  // ── Nacional — África ────────────────────────────────────
  // África: WBA e WBC (maior representação histórica)
  { id: 'ng_lagos',   name: 'Lagos Boxing Commission',  tier: 'national', scope: 'NG', orgAffil: 'WBA', orgAffil2: 'WBC', prestige: 58, purseMult: 1.09, minWins: 3,  style: 'knockouts',budget: 'medio', desc: 'Potência nigeriana: nocautes garantidos em cada card.' },
  { id: 'ng_naija',   name: 'Naija Fight Promotions',   tier: 'national', scope: 'NG', orgAffil: 'WBA', orgAffil2: null,  prestige: 44, purseMult: 1.02, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Circuito de base nigeriano, revelando força bruta.' },
  { id: 'gh_accra',   name: 'Accra Fight Nights',       tier: 'national', scope: 'GH', orgAffil: 'WBC', orgAffil2: 'WBA', prestige: 56, purseMult: 1.08, minWins: 2,  style: 'knockouts',budget: 'medio', desc: 'De Bukom para o mundo: Gana nunca para de produzir campeões.' },
  { id: 'gh_bukom',   name: 'Bukom Boxing Arena',       tier: 'national', scope: 'GH', orgAffil: 'WBC', orgAffil2: null,  prestige: 42, purseMult: 1.01, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'A arena histórica de Bukom que revelou Azumah Nelson.' },
  { id: 'za_cape',    name: 'Cape Town Fight Series',   tier: 'national', scope: 'ZA', orgAffil: 'IBF', orgAffil2: 'WBO', prestige: 56, purseMult: 1.08, minWins: 3,  style: 'regional', budget: 'medio', desc: 'Sul-Africanos com velocidade e talento para o topo.' },
  { id: 'za_jo',      name: 'Johannesburg Ring Promo',  tier: 'national', scope: 'ZA', orgAffil: 'IBF', orgAffil2: null,  prestige: 42, purseMult: 1.01, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Base do boxe sul-africano em Joanesburgo.' },

  // ── Nacional — Oceania ───────────────────────────────────
  // Austrália/NZ: WBO e IBF
  { id: 'au_thunder', name: 'Thunder Down Under',       tier: 'national', scope: 'AU', orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 60, purseMult: 1.12, minWins: 4,  style: 'knockouts',budget: 'medio', desc: 'Australianos nunca recuam — espetáculos garantidos.' },
  { id: 'au_outback', name: 'Outback Fight Promotions', tier: 'national', scope: 'AU', orgAffil: 'WBO', orgAffil2: null,  prestige: 46, purseMult: 1.04, minWins: 0,  style: 'activity', budget: 'baixo', desc: 'Do interior australiano: dureza e fibra em cada evento.' },
  { id: 'nz_kiwi',    name: 'Kiwi Boxing Events',       tier: 'national', scope: 'NZ', orgAffil: 'WBO', orgAffil2: 'IBF', prestige: 56, purseMult: 1.08, minWins: 2,  style: 'regional', budget: 'medio', desc: 'Nova Zelândia com força de All Black dentro do ringue.' },
  { id: 'nz_pacific', name: 'Pacific Island Fight Co',  tier: 'national', scope: 'NZ', orgAffil: 'WBO', orgAffil2: null,  prestige: 42, purseMult: 1.01, minWins: 0,  style: 'local',    budget: 'baixo', desc: 'Circuito das ilhas do Pacífico: guerreiros de todas as nações.' },
];

// Quatro patamares para cada alcance de evento. O nível global vai de 1 a 20:
// local 1-4, regional 5-8, nacional 9-12, continental 13-16, mundial 17-20.
const EVENT_SCOPE_ORDER = ['local', 'regional', 'national', 'continental', 'world'];
const EVENT_ARENAS = {
  local: [
    { name: 'Ginásio de Bairro', capacity: 280, ticket: 12, look: 'community' },
    { name: 'Clube Municipal', capacity: 650, ticket: 16, look: 'club' },
    { name: 'Centro Esportivo Local', capacity: 1200, ticket: 22, look: 'local' },
    { name: 'Arena Municipal', capacity: 2200, ticket: 28, look: 'municipal' },
  ],
  regional: [
    { name: 'Ginásio Metropolitano', capacity: 3500, ticket: 34, look: 'metro' },
    { name: 'Centro de Convenções', capacity: 5200, ticket: 42, look: 'convention' },
    { name: 'Arena Estadual', capacity: 7500, ticket: 52, look: 'state' },
    { name: 'Palácio Regional do Esporte', capacity: 10000, ticket: 65, look: 'regional' },
  ],
  national: [
    { name: 'Arena Nacional', capacity: 12500, ticket: 78, look: 'national' },
    { name: 'Pavilhão da Capital', capacity: 16000, ticket: 92, look: 'capital' },
    { name: 'Domo Nacional', capacity: 20500, ticket: 110, look: 'dome' },
    { name: 'Estádio Nacional Coberto', capacity: 28000, ticket: 135, look: 'stadium' },
  ],
  continental: [
    { name: 'Arena Continental', capacity: 34000, ticket: 155, look: 'continental' },
    { name: 'Domo das Nações', capacity: 42000, ticket: 180, look: 'nations' },
    { name: 'Estádio Pancontinental', capacity: 55000, ticket: 215, look: 'mega' },
    { name: 'Coliseu Continental', capacity: 70000, ticket: 250, look: 'coliseum' },
  ],
  world: [
    { name: 'International Fight Arena', capacity: 80000, ticket: 290, look: 'international' },
    { name: 'Global Boxing Dome', capacity: 95000, ticket: 340, look: 'global' },
    { name: 'Champions Stadium', capacity: 115000, ticket: 410, look: 'champions' },
    { name: 'Grand World Coliseum', capacity: 140000, ticket: 500, look: 'world' },
  ],
};

function getEventArena(scope, level) {
  const normalizedScope = EVENT_SCOPE_ORDER.includes(scope) ? scope : 'local';
  const normalizedLevel = clamp(Math.round(level || 1), 1, 4);
  const arena = EVENT_ARENAS[normalizedScope][normalizedLevel - 1];
  return {
    ...arena,
    scope: normalizedScope,
    level: normalizedLevel,
    globalLevel: EVENT_SCOPE_ORDER.indexOf(normalizedScope) * 4 + normalizedLevel,
  };
}

// Federações de boxe
const FEDERATIONS = [
  { id: 'WBC', name: 'World Boxing Council',       prestige: 95, color: '#2ecc71' },
  { id: 'WBA', name: 'World Boxing Association',   prestige: 90, color: '#3498db' },
  { id: 'IBF', name: 'International Boxing Fed.',  prestige: 88, color: '#e74c3c' },
  { id: 'WBO', name: 'World Boxing Organization',  prestige: 85, color: '#9b59b6' },
];

const WORLD_ORGS = ['WBC', 'WBA', 'IBF', 'WBO'];

// Cinturões mundiais (um por federação)
const BELTS = {
  WBC: { name: 'Cinturão Mundial WBC', icon: '🏆', tier: 5, bonus: 60000, color: '#2ecc71' },
  WBA: { name: 'Cinturão Mundial WBA', icon: '🏆', tier: 5, bonus: 60000, color: '#3498db' },
  IBF: { name: 'Cinturão Mundial IBF', icon: '🏆', tier: 5, bonus: 60000, color: '#e74c3c' },
  WBO: { name: 'Cinturão Mundial WBO', icon: '🏆', tier: 5, bonus: 60000, color: '#9b59b6' },
};

// Tiers de cinturões territoriais. Chave composta: 'local:BR', 'national:MX',
// 'continental:americas' etc. Cada país tem sua própria escada de títulos.
const BELT_TIERS = {
  local:       { label: 'Título Local',         icon: '🏅', tier: 1, bonus: 2500,  color: '#8d99ae', scope: 'country' },
  regional:    { label: 'Cinturão Regional',    icon: '🥉', tier: 2, bonus: 6000,  color: '#cd7f32', scope: 'country' },
  national:    { label: 'Cinturão Nacional',    icon: '🥈', tier: 3, bonus: 15000, color: '#c0c0c0', scope: 'country' },
  continental: { label: 'Cinturão Continental', icon: '🥇', tier: 4, bonus: 30000, color: '#ffd700', scope: 'continent' },
};

// Banco de nomes culturais de organizações/torneios por país
// national: array de 4 organizações nacionais distintas (não-únicas, como torneios)
// regional: array de ~6-8 organizações regionais (escala 1:5 em relação aos nacionais)
// local:    array de ~10+ torneios locais (escala 1:15 em relação aos regionais)
const BELT_CULTURE = {
  BR: {
    national: [
      { abbrev: 'CBP',  full: 'Conselho Brasileiro de Pugilismo' },
      { abbrev: 'FBB',  full: 'Federação Brasileira de Boxe' },
      { abbrev: 'ABP',  full: 'Academia Brasileira de Pugilismo' },
      { abbrev: 'CNPB', full: 'Conselho Nacional de Pugilismo Brasileiro' },
    ],
    regional: ['FNOB — Federação Nordestina de Boxe', 'FSBP — Federação Sul-Brasileira de Pugilismo', 'CPB-SP — Conselho Paulista de Boxe', 'ARB — Associação Regional de Boxe'],
    local: ['Copa Cavalos da Bomba', 'Torneio Terra Crua', 'Copa Sangue e Suor', 'Torneio Ouro Negro', 'Copa Sertão Bravo', 'Torneio Guerreiro do Norte', 'Copa Rei do Ringue', 'Copa da Várzea Fight', 'Torneio Pão de Açúcar'],
  },
  US: {
    national: [
      { abbrev: 'USBA',  full: 'United States Boxing Association' },
      { abbrev: 'NABF',  full: 'North American Boxing Federation' },
      { abbrev: 'USBC',  full: 'US Boxing Council' },
      { abbrev: 'NABC',  full: 'National Athletic Boxing Commission' },
    ],
    regional: ['Golden State Boxing Commission', 'Lone Star Boxing Council', 'Atlantic Coast Boxing Federation', 'Great Lakes Boxing Union', 'Pacific Northwest Fight Alliance'],
    local: ['Golden Gloves Classic', 'Steel City Brawl', 'Iron Fist Open', 'Brick City Fight Night', 'Bayou Beatdown', 'Sun Belt Slugfest', 'Rocky Road Tournament', 'Harbor City Showdown', 'Motor City Maulers Cup'],
  },
  MX: {
    national: [
      { abbrev: 'FMB',   full: 'Federación Mexicana de Boxeo' },
      { abbrev: 'CMB-N', full: 'Consejo Mexicano de Boxeo Nacional' },
      { abbrev: 'UMB',   full: 'Unión Mexicana de Box' },
      { abbrev: 'ANMB',  full: 'Asociación Nacional de Box Mexicano' },
    ],
    regional: ['CNMB — Consejo del Norte', 'FPMB — Federación del Pacífico', 'LSMB — Liga del Sur'],
    local: ['Copa Azteca', 'Torneo Charro', 'Copa del Barrio', 'Torneo Tigre', 'Copa Nopal de Oro', 'Torneo Guerrero Jaguar', 'Copa Tierra Caliente', 'Torneo Sangre Azteca'],
  },
  AR: {
    national: [
      { abbrev: 'FAB',  full: 'Federación Argentina de Box' },
      { abbrev: 'CAB',  full: 'Consejo Argentino de Boxeo' },
      { abbrev: 'LAB',  full: 'Liga Argentina de Box' },
      { abbrev: 'UAB',  full: 'Unión Argentina de Box' },
    ],
    regional: ['ABB — Asociación Bonaerense de Box', 'FLB — Federación Litoral de Box', 'LPB — Liga Patagónica de Box'],
    local: ['Copa La Plata Fight', 'Torneo Gaucho Bravío', 'Copa Pampa', 'Torneo del Río de la Plata', 'Copa Puños de Acero', 'Torneo Sur Bravo'],
  },
  CU: {
    national: [
      { abbrev: 'FCB',  full: 'Federación Cubana de Boxeo' },
      { abbrev: 'INDER-B', full: 'INDER Sección Boxeo' },
      { abbrev: 'LCN',  full: 'Liga Cubana Nacional de Boxeo' },
      { abbrev: 'ACB',  full: 'Asociación Cubana de Box' },
    ],
    regional: ['AOB — Asociación Oriental de Box', 'LCB — Liga Central de Boxeo'],
    local: ['Copa Caña de Azúcar', 'Torneo Habana Fists', 'Copa Isla Brava', 'Torneo Cienfuegos', 'Copa Caribe Fighter'],
  },
  PR: {
    national: [
      { abbrev: 'CBP-PR', full: 'Comisión de Boxeo de Puerto Rico' },
      { abbrev: 'FBP',    full: 'Federación Boricua de Pugilismo' },
      { abbrev: 'ABP-PR', full: 'Asociación de Box de Puerto Rico' },
      { abbrev: 'LBN-PR', full: 'Liga Boricua Nacional de Box' },
    ],
    regional: ['ABB — Asociación Boricua de Box'],
    local: ['Copa Isla del Encanto', 'Torneo Puño de Puerto Rico', 'Copa San Juan Brawl', 'Torneo Boricua Fists'],
  },
  DO: {
    national: [
      { abbrev: 'FDB',  full: 'Federación Dominicana de Boxeo' },
      { abbrev: 'CDB',  full: 'Consejo Dominicano de Box' },
      { abbrev: 'ADB',  full: 'Asociación Dominicana de Box' },
      { abbrev: 'LDB',  full: 'Liga Dominicana de Boxeo' },
    ],
    regional: ['ACB — Asociación del Cibao'],
    local: ['Copa Quisqueya Fight', 'Torneo Santo Domingo Brawl', 'Copa Isla Hispaniola', 'Torneo Punta Cana Fists'],
  },
  PA: {
    national: [
      { abbrev: 'FPB',  full: 'Federación Panameña de Boxeo' },
      { abbrev: 'CPB',  full: 'Comisión Panameña de Boxeo' },
      { abbrev: 'LPB',  full: 'Liga Panameña de Box' },
      { abbrev: 'APB',  full: 'Asociación Panameña de Box' },
    ],
    regional: ['LAB — Liga del Atlántico', 'APP — Asociación del Pacífico Panameño'],
    local: ['Copa Canalera', 'Torneo Panamá Fight Night', 'Copa Colón Brawl', 'Torneo Puentes de Acero'],
  },
  CO: {
    national: [
      { abbrev: 'FCBox', full: 'Federación Colombiana de Boxeo' },
      { abbrev: 'CCB',   full: 'Consejo Colombiano de Box' },
      { abbrev: 'LCB',   full: 'Liga Colombiana de Boxeo' },
      { abbrev: 'ACB',   full: 'Asociación Colombiana de Box' },
    ],
    regional: ['LCB — Liga Caribe de Box', 'AAB — Asociación Andina de Boxeo'],
    local: ['Copa Café y Puños', 'Torneo Boyacá Fists', 'Copa Vallenato Bravío', 'Torneo Medellín Fight'],
  },
  VE: {
    national: [
      { abbrev: 'FVB',  full: 'Federación Venezolana de Box' },
      { abbrev: 'CVB',  full: 'Consejo Venezolano de Boxeo' },
      { abbrev: 'LVB',  full: 'Liga Venezolana de Box' },
      { abbrev: 'AVB',  full: 'Asociación Venezolana de Box' },
    ],
    regional: ['LLB — Liga del Llano', 'AAV — Asociación Andina Venezolana'],
    local: ['Copa Petróleo y Puños', 'Torneo Maracaibo Fists', 'Copa Caraqueño', 'Torneo Llanos Bravos'],
  },
  CL: {
    national: [
      { abbrev: 'FChB', full: 'Federación Chilena de Boxeo' },
      { abbrev: 'CCB',  full: 'Consejo Chileno de Box' },
      { abbrev: 'LChB', full: 'Liga Chilena de Box' },
      { abbrev: 'AChB', full: 'Asociación Chilena de Boxeo' },
    ],
    regional: ['LAB — Liga Andina de Box', 'ANG — Asociación Norte Grande'],
    local: ['Copa Cóndor Fight', 'Torneo Atacama Bravos', 'Copa Tierra del Fuego', 'Torneo Santiago Fists'],
  },
  PE: {
    national: [
      { abbrev: 'FPBox', full: 'Federación Peruana de Box' },
      { abbrev: 'CPB',   full: 'Consejo Peruano de Boxeo' },
      { abbrev: 'LPB',   full: 'Liga Peruana de Box' },
      { abbrev: 'APB',   full: 'Asociación Peruana de Box' },
    ],
    regional: ['LLB — Liga Lima de Box', 'ANB — Asociación Norteña de Boxeo'],
    local: ['Copa Inca Fight', 'Torneo Machu Picchu Brawl', 'Copa Sierra Bravía', 'Torneo Lima Iron Fists'],
  },
  EC: {
    national: [
      { abbrev: 'FEB',  full: 'Federación Ecuatoriana de Boxeo' },
      { abbrev: 'CEB',  full: 'Consejo Ecuatoriano de Box' },
      { abbrev: 'LEB',  full: 'Liga Ecuatoriana de Box' },
      { abbrev: 'AEB',  full: 'Asociación Ecuatoriana de Box' },
    ],
    regional: ['LGB — Liga Guayaquil de Box'],
    local: ['Copa Volcán Fight', 'Torneo Galápagos Fists', 'Copa Quito Brawl'],
  },
  GB: {
    national: [
      { abbrev: 'BBBofC', full: 'British Boxing Board of Control' },
      { abbrev: 'BIBA',   full: 'British & Irish Boxing Authority' },
      { abbrev: 'WBBofC', full: 'World & British Boxing Control' },
      { abbrev: 'BBBC',   full: 'British Boxing Board Championship' },
    ],
    regional: ['NABC — Northern Area Boxing Council', 'MBF — Midlands Boxing Federation', 'WBB — Welsh Boxing Board', 'SBC — Scottish Boxing Commission'],
    local: ['Lonsdale Belt Classic', 'Iron Jaw Cup', 'Rocky Road Tournament', 'Ringside Rumble', "The Dockers' Brawl", 'Crown & Fist Classic', 'East End Grudge Match'],
  },
  DE: {
    national: [
      { abbrev: 'BDB',  full: 'Bund Deutscher Berufsboxer' },
      { abbrev: 'GBV',  full: 'Gesamtdeutscher Box-Verband' },
      { abbrev: 'DBB',  full: 'Deutscher Berufsboxer-Bund' },
      { abbrev: 'NDB',  full: 'Nationalverband Deutscher Boxsport' },
    ],
    regional: ['NDBV — Norddeutscher Boxverband', 'BBV — Bayerischer Boxverband', 'WDBV — Westdeutscher Box-Verband'],
    local: ['Stahlhammer-Cup', 'Rhein-Ruhr Brawl', 'Eisenfaust-Turnier', 'Schwarzwald Boxing Classic', 'Hanseatic Fight Night'],
  },
  FR: {
    national: [
      { abbrev: 'FFB',  full: 'Fédération Française de Boxe' },
      { abbrev: 'CFB',  full: 'Conseil Français de Boxe' },
      { abbrev: 'LFB',  full: 'Ligue Française de Boxe' },
      { abbrev: 'FNPB', full: 'Fédération Nationale de Pugilisme' },
    ],
    regional: ['LIFB — Ligue Île-de-France de Boxe', 'LSB — Ligue Sud de Boxe', 'LAB — Ligue Atlantique de Boxe'],
    local: ['Coupe Marseille Fight', 'Trophée de la Seine', 'Tournoi Banlieue Bravos', 'Coupe Tour Eiffel Fists', 'Tournoi du Midi'],
  },
  ES: {
    national: [
      { abbrev: 'FEDB', full: 'Federación Española de Boxeo' },
      { abbrev: 'CEB',  full: 'Consejo Español de Box' },
      { abbrev: 'LEB',  full: 'Liga Española de Boxeo' },
      { abbrev: 'AEB',  full: 'Asociación Española de Box' },
    ],
    regional: ['FCB — Federació Catalana de Boxa', 'FVB — Federación Vasca de Boxeo', 'LAB — Liga Andaluza de Box'],
    local: ['Copa Toro Bravo', 'Torneo Madrid Fists', 'Copa del Sol Fighter', 'Torneo Ibérico Bravos', 'Copa Matador'],
  },
  IT: {
    national: [
      { abbrev: 'FPI',  full: 'Federazione Pugilistica Italiana' },
      { abbrev: 'CPI',  full: 'Consiglio Pugilistico Italiano' },
      { abbrev: 'LPI',  full: 'Lega Pugilistica Italiana' },
      { abbrev: 'UPI',  full: 'Unione Pugilistica Italiana' },
    ],
    regional: ['CRN — Comitato Regionale Nord', 'LMP — Lega Meridionale di Pugilato', 'CSB — Comitato Siciliano di Box'],
    local: ['Coppa Roma Fight', 'Torneo Gladiatore', 'Coppa del Colosseo', 'Trofeo Milano Fists', 'Torneo Napoli Bravos'],
  },
  RU: {
    national: [
      { abbrev: 'ФБР',  full: 'Федерация Бокса России' },
      { abbrev: 'РБС',  full: 'Российский Боксёрский Союз' },
      { abbrev: 'НБА-Р', full: 'Национальная Боксёрская Ассоциация России' },
      { abbrev: 'ПРБ',  full: 'Профессиональная Российская Боксёрская лига' },
    ],
    regional: ['СБЛ — Сибирская Боксёрская Лига', 'УФБ — Уральская Федерация Бокса', 'ЮБС — Южный Боксёрский Союз'],
    local: ['Кубок Стального Кулака', 'Турнир Медведь Fight', 'Кубок Сибирской Стали', 'Турнир Золотые Перчатки', 'Кубок Красной Звезды'],
  },
  UA: {
    national: [
      { abbrev: 'ФБУ',  full: 'Федерація Боксу України' },
      { abbrev: 'УБС',  full: 'Українська Боксерська Спілка' },
      { abbrev: 'НБА-У', full: 'Національна Боксерська Асоціація України' },
      { abbrev: 'ПБУ',  full: 'Професійний Бокс України' },
    ],
    regional: ['ДБЛ — Донецька Боксерська Ліга', 'ЛФБ — Львівська Федерація Боксу'],
    local: ['Кубок Козацького Духу', 'Турнір Залізний Кулак', 'Кубок Дніпра', 'Турнір Степового Воїна'],
  },
  KZ: {
    national: [
      { abbrev: 'ФБК',  full: 'Федерация Бокса Казахстана' },
      { abbrev: 'КБС',  full: 'Казахстанский Боксёрский Союз' },
      { abbrev: 'НБА-К', full: 'Национальная Боксёрская Ассоциация Казахстана' },
      { abbrev: 'ПБК',  full: 'Профессиональный Бокс Казахстана' },
    ],
    regional: ['АБЛ — Алматинская Боксёрская Лига', 'СБС — Северный Боксёрский Союз'],
    local: ['Кубок Степного Орла', 'Турнир Алтын Белдік', 'Кубок Великой Степи', 'Турнир Батыр Fight'],
  },
  UZ: {
    national: [
      { abbrev: 'UBF',  full: "O'zbekiston Boks Federatsiyasi" },
      { abbrev: 'OBU',  full: "O'zbekiston Boks Uyushmasi" },
      { abbrev: 'MBL',  full: "Milliy Boks Ligasi" },
      { abbrev: 'PBU',  full: "Professional Boks Uzbekistan" },
    ],
    regional: ["TBL — Toshkent Boks Ligasi", "SBI — Samarqand Boks Ittifoqi"],
    local: ["Ipak Yo'li Fight Cup", "Samarqand Brawl", "Toshkent Iron Fist", "Qo'qon Fighter Cup"],
  },
  AZ: {
    national: [
      { abbrev: 'ABF',  full: 'Azərbaycan Boks Federasiyası' },
      { abbrev: 'ABİ',  full: 'Azərbaycan Boks İttifaqı' },
      { abbrev: 'MBL',  full: 'Milli Boks Liqası' },
      { abbrev: 'PBA',  full: 'Professional Boks Azərbaycan' },
    ],
    regional: ['BBL — Bakı Boks Liqası'],
    local: ['Xəzər Kuboku', 'Bakı Dəmir Yumruq', 'Qafqaz Fight Cup', 'Odlar Yurdu Turniri'],
  },
  JP: {
    national: [
      { abbrev: 'JBC',  full: 'Japan Boxing Commission' },
      { abbrev: 'OPBF', full: 'Oriental & Pacific Boxing Federation' },
      { abbrev: 'JBF',  full: 'Japan Boxing Federation' },
      { abbrev: 'NBL',  full: 'Nippon Boxing League' },
    ],
    regional: ['TBF — Tōkyō Boxing Federation', 'OBC — Ōsaka Boxing Commission', 'KBL — Kyūshū Boxing League'],
    local: ['Samurai Fight Cup', 'Tōkyō Iron Fist', 'Rising Sun Brawl', 'Bushido Boxing Classic', 'Fuji Fight Tournament'],
  },
  KR: {
    national: [
      { abbrev: 'KBA',  full: 'Korea Boxing Association' },
      { abbrev: 'KBC',  full: 'Korea Boxing Council' },
      { abbrev: 'KBF',  full: 'Korean Boxing Federation' },
      { abbrev: 'NBK',  full: 'National Boxing of Korea' },
    ],
    regional: ['SBF — Seoul Boxing Federation', 'BBL — Busan Boxing League'],
    local: ['Iron Fist of Korea Cup', 'Seoul Brawl Classic', 'Han River Fight Night', 'K-Fight Open'],
  },
  CN: {
    national: [
      { abbrev: 'CBA',  full: 'China Boxing Association' },
      { abbrev: 'CBC',  full: 'China Boxing Council' },
      { abbrev: 'CBF',  full: 'Chinese Boxing Federation' },
      { abbrev: 'CBL',  full: 'China Boxing League' },
    ],
    regional: ['BBF — Beijing Boxing Federation', 'GBL — Guangdong Boxing League', 'SBC — Shanghai Boxing Commission'],
    local: ['Dragon Fists Cup', 'Great Wall Classic', 'Shanghai Brawl', 'Red Dragon Fight Night', 'Silk Road Cup'],
  },
  PH: {
    national: [
      { abbrev: 'ABP',  full: 'Association of Boxing Alliances in the Philippines' },
      { abbrev: 'GBP',  full: 'Games & Amusements Board — Boxing' },
      { abbrev: 'PBF',  full: 'Philippine Boxing Federation' },
      { abbrev: 'NBP',  full: 'National Boxing Philippines' },
    ],
    regional: ['VBL — Visayas Boxing League', 'MBC — Mindanao Boxing Council'],
    local: ['Manila Brawl Classic', 'Typhoon Fight Cup', 'Isla Fists Open', 'Barangay Slugfest', 'Pacquiao Legacy Cup'],
  },
  TH: {
    national: [
      { abbrev: 'WBT',  full: 'World Boxing Thailand' },
      { abbrev: 'TBA',  full: 'Thailand Boxing Authority' },
      { abbrev: 'TBF',  full: 'Thai Boxing Federation' },
      { abbrev: 'NBT',  full: 'National Boxing of Thailand' },
    ],
    regional: ['CTBL — Central Thailand Boxing League', 'NMTBF — Northern Fight Federation'],
    local: ['Rajadamnern Cup', 'Bangkok Iron Fists', 'Songkran Fight Classic', 'Elephant Cup', 'Golden Buddha Brawl'],
  },
  IR: {
    national: [
      { abbrev: 'IBF-Ir', full: 'Iran Boxing Federation' },
      { abbrev: 'IBC',    full: 'Iran Boxing Council' },
      { abbrev: 'INBF',   full: 'Iran National Boxing Federation' },
      { abbrev: 'PBI',    full: 'Professional Boxing Iran' },
    ],
    regional: ['TBL — Tehran Boxing League', 'IsBA — Isfahan Boxing Association'],
    local: ['Persian Lion Cup', 'Tehran Iron Fists', 'Caspian Fight Classic', 'Kavir Brawl'],
  },
  TR: {
    national: [
      { abbrev: 'TBF',  full: 'Türkiye Boks Federasyonu' },
      { abbrev: 'TBB',  full: 'Türkiye Boks Birliği' },
      { abbrev: 'MTBF', full: 'Milli Türkiye Boks Federasyonu' },
      { abbrev: 'PBT',  full: 'Profesyonel Boks Türkiye' },
    ],
    regional: ['İBL — İstanbul Boks Ligi', 'ABB — Anadolu Boks Birliği'],
    local: ['Boğaziçi Kupası', 'İstanbul Demir Yumruk', 'Anadolu Fight Cup', 'Sultans Brawl Classic'],
  },
  AU: {
    national: [
      { abbrev: 'BAust', full: 'Boxing Australia' },
      { abbrev: 'ABC',   full: 'Australian Boxing Council' },
      { abbrev: 'ABF',   full: 'Australian Boxing Federation' },
      { abbrev: 'NBA',   full: 'National Boxing Australia' },
    ],
    regional: ['NSWBC — NSW Boxing Commission', 'QBB — Queensland Boxing Board', 'VBF — Victorian Boxing Federation'],
    local: ['Outback Brawl', 'Harbour City Fists', 'Red Dirt Rumble', 'Southern Cross Classic', 'Kangaroo Fight Cup'],
  },
  ZA: {
    national: [
      { abbrev: 'SABF', full: 'South African Boxing Federation' },
      { abbrev: 'SABC', full: 'South African Boxing Council' },
      { abbrev: 'BSA',  full: 'Boxing South Africa' },
      { abbrev: 'NABF', full: 'National Amateur Boxing Federation SA' },
    ],
    regional: ['GBC — Gauteng Boxing Council', 'CBB — Cape Boxing Board', 'KZNBF — KZN Boxing Federation'],
    local: ['Ubuntu Fight Cup', 'Joburg Iron Fists', 'Cape Storm Brawl', 'Highveld Slugfest', 'Soweto Fight Classic'],
  },
  NG: {
    national: [
      { abbrev: 'NBF',  full: 'Nigeria Boxing Federation' },
      { abbrev: 'NBC',  full: 'Nigeria Boxing Council' },
      { abbrev: 'NABF', full: 'Nigerian Amateur Boxing Federation' },
      { abbrev: 'PBN',  full: 'Professional Boxing Nigeria' },
    ],
    regional: ['LSBA — Lagos State Boxing Association', 'NNBL — Northern Nigeria Boxing League'],
    local: ['Lagos Iron Fist Cup', 'Naija Brawl', 'Delta Fight Classic', 'Savanna Slugfest', 'Abuja Fight Night'],
  },
  GH: {
    national: [
      { abbrev: 'GBA',  full: 'Ghana Boxing Authority' },
      { abbrev: 'GBF',  full: 'Ghana Boxing Federation' },
      { abbrev: 'GBC',  full: 'Ghana Boxing Council' },
      { abbrev: 'NBG',  full: 'National Boxing Ghana' },
    ],
    regional: ['ABC — Accra Boxing Commission', 'AsHBF — Ashanti Boxing Federation'],
    local: ['Black Stars Fight Cup', 'Accra Brawl Classic', 'Golden Stool Open', 'Kente Fight Night', 'Volta River Rumble'],
  },
  MA: {
    national: [
      { abbrev: 'FMBox', full: 'Fédération Marocaine de Boxe' },
      { abbrev: 'CMB',   full: 'Conseil Marocain de Boxe' },
      { abbrev: 'LMB',   full: 'Ligue Marocaine de Boxe' },
      { abbrev: 'UMB',   full: 'Union Marocaine de Box' },
    ],
    regional: ['LNB — Liga Nord de Box', 'AOB — Association Orientale de Boxe'],
    local: ['Coupe Atlas Fight', 'Tournoi Médina Brawl', 'Coupe Sahara Fists', 'Tournoi Casablanca Classic'],
  },
  CM: {
    national: [
      { abbrev: 'FCBox-CM', full: 'Fédération Camerounaise de Boxe' },
      { abbrev: 'CCBox',    full: 'Conseil Camerounais de Boxe' },
      { abbrev: 'LCBox',    full: 'Ligue Camerounaise de Boxe' },
      { abbrev: 'UCBox',    full: 'Union Camerounaise de Box' },
    ],
    regional: ['LCB — Ligue Centre de Boxe'],
    local: ['Coupe Lions Fight', 'Tournoi Yaoundé Bravos', 'Coupe Cameroun Classic', 'Tournoi Wouri Fists'],
  },
  JM: {
    national: [
      { abbrev: 'ABA-JA', full: 'Amateur Boxing Association of Jamaica' },
      { abbrev: 'JBF',    full: 'Jamaica Boxing Federation' },
      { abbrev: 'JBC',    full: 'Jamaica Boxing Council' },
      { abbrev: 'NBJ',    full: 'National Boxing Jamaica' },
    ],
    regional: ['KBC — Kingston Boxing Club'],
    local: ['Reggae Rumble', 'Kingston Brawl Classic', 'Island Fists Cup', 'Blue Mountain Boxing Open'],
  },
  IE: {
    national: [
      { abbrev: 'BUI', full: 'Boxing Union of Ireland' },
      { abbrev: 'IABA-P', full: 'Irish Athletic Boxing Association Professional' },
      { abbrev: 'IBC', full: 'Irish Boxing Council' },
      { abbrev: 'NBI', full: 'National Boxing Ireland' },
    ],
    regional: ['Dublin Boxing Board', 'Ulster Boxing Council', 'Munster Boxing League', 'Connacht Boxing Association'],
    local: ['Celtic Warrior Cup', 'Dublin Docklands Brawl', 'Emerald Gloves', 'Shamrock Fight Night', 'Galway Bay Boxing Open'],
  },
  NZ: {
    national: [
      { abbrev: 'NZPBA', full: 'New Zealand Professional Boxing Association' },
      { abbrev: 'BANZ', full: 'Boxing Association of New Zealand' },
      { abbrev: 'NZBC', full: 'New Zealand Boxing Council' },
      { abbrev: 'NBNZ', full: 'National Boxing New Zealand' },
    ],
    regional: ['Auckland Boxing Commission', 'Wellington Boxing Board', 'Canterbury Boxing League', 'Otago Fight Council'],
    local: ['Kiwi Iron Fist Cup', 'Southern Alps Brawl', 'Aotearoa Boxing Classic', 'Harbour Gloves Open', 'Rotorua Fight Night'],
  },
};

// Mantem a escala do ecossistema sem exigir centenas de entradas repetidas.
// Os nomes-base continuam culturais; as variantes representam filiais,
// temporadas e circuitos independentes daquele mesmo cenário nacional.
const CULTURAL_TOURNAMENT_PARTS = {
  US: { regions: ['Appalachia','Great Lakes','Gulf Coast','New England','Pacific Northwest','Rocky Mountains','Deep South','Southwest','Midwest','Atlantic Coast'], motifs: ['Liberty','Frontier','Stars and Stripes','Steel City','Golden Gate','Lone Star','Bayou','Route 66','Heartland','Broadway'], regional: ['{r} Boxing Commission','{r} Golden Gloves League'], local: ['{m} Boxing Classic','{m} Fight Night','{r} Golden Gloves','{r} Ringside Rumble'] },
  MX: { regions: ['Bajío','Jalisco','Sonora','Yucatán','Oaxaca','Chihuahua','Veracruz','Sinaloa','Nuevo León','Valle de México'], motifs: ['Azteca','Jaguar','Águila Real','Maguey','Charro','Cenote','Volcán','Nopal de Oro','Maya','Lucha del Barrio'], regional: ['Liga de Boxeo - {r}','Consejo Pugilístico - {r}'], local: ['Copa {m}','Torneo {m}','Guantes de Oro - {r}','Noche de Boxeo {m}'] },
  BR: { regions: ['Amazônia','Nordeste','Sertão','Cerrado','Pantanal','Pampas','Mata Atlântica','Vale do Paraíba','Recôncavo','Zona da Mata'], motifs: ['Cavalos da Bomba','Onça Pintada','Arara Azul','Ouro Negro','Mandacaru','Pão de Açúcar','Terra Roxa','Trovão Tropical','Jangadeiro','Guerreiro do Quilombo'], regional: ['Liga de Boxe - {r}','Conselho Pugilístico - {r}'], local: ['Copa {m}','Torneio {m}','Luvas de Ouro - {r}','Festival de Boxe {m}'] },
  AR: { regions: ['Patagonia','Pampa','Cuyo','Litoral','Córdoba','Mendoza','Tucumán','Salta','Gran Chaco','Río de la Plata'], motifs: ['Gaucho Bravío','Cóndor Andino','Sol de Mayo','Puma Pampeano','Glaciar Azul','Tango de Acero','Mate Amargo','Malambo','Aconcagua','Ceibo Rojo'], regional: ['Liga de Boxeo de {r}','Consejo Pugilístico de {r}'], local: ['Copa {m}','Torneo {m}','Guantes de Oro de {r}','Noche de Combate {m}'] },
  CU: { regions: ['Habana','Oriente','Camagüey','Pinar del Río','Matanzas','Cienfuegos','Granma','Santiago','Villa Clara','Isla de la Juventud'], motifs: ['Caña de Azúcar','Caimán Verde','Palma Real','Sierra Maestra','Caribe Rojo','Malecón','Son de Acero','Guajiro','Mambí','Tocororo'], regional: ['Liga de Boxeo de {r}','Escuela Pugilística de {r}'], local: ['Copa {m}','Torneo {m}','Guantes de Oro de {r}','Cartel de Boxeo {m}'] },
  PR: { regions: ['San Juan','Ponce','Mayagüez','Arecibo','Caguas','Bayamón','Carolina','Humacao','Guayama','Cordillera Central'], motifs: ['Isla del Encanto','Coquí de Oro','Borinquen','Yunque','Flamboyán','Bahía Brava','Cafetal','Pirata Caribeño','Sol Taíno','Tambor Boricua'], regional: ['Liga Boricua de {r}','Consejo de Boxeo de {r}'], local: ['Copa {m}','Torneo {m}','Guantes Dorados de {r}','Noche Boricua {m}'] },
  GB: { regions: ['Northern England','Midlands','London','Yorkshire','Lancashire','Wales','Scotland','East Anglia','West Country','Thames Valley'], motifs: ['Lonsdale','Lionheart','Union Crown','Iron Duke','White Rose','Red Dragon','Highland Stag','Docklands','Albion','Britannia'], regional: ['{r} Boxing Board','{r} Area Boxing Council'], local: ['{m} Boxing Classic','{m} Prizefighters Cup','{r} Golden Gloves','{m} Ringside Night'] },
  IE: { regions: ['Leinster','Munster','Connacht','Ulster','Dublin','Cork','Galway','Kerry','Donegal','The Midlands'], motifs: ['Celtic Warrior','Emerald Isle','Shamrock','Claddagh','Wild Atlantic','Tara','Harp of Erin','Red Hand','Gaelic Thunder','Boyne'], regional: ['{r} Boxing Board','{r} Provincial Boxing League'], local: ['{m} Cup','{m} Golden Gloves','{r} Boxing Open','{m} Fight Night'] },
  UA: { regions: ['Київ','Львів','Одеса','Харків','Дніпро','Поділля','Полісся','Карпати','Донбас','Причорноморʼя'], motifs: ['Козацький Дух','Залізний Тризуб','Степовий Воїн','Золотий Лев','Карпатський Грім','Дніпровська Хвиля','Сокіл','Калина','Булава','Чорноморський Вітер'], regional: ['Боксерська Ліга — {r}','Федерація Боксу — {r}'], local: ['Кубок «{m}»','Турнір «{m}»','Золоті Рукавички — {r}','Вечір Боксу «{m}»'] },
  RU: { regions: ['Москва','Санкт-Петербург','Сибирь','Урал','Поволжье','Кавказ','Дальний Восток','Черноземье','Кубань','Золотое Кольцо'], motifs: ['Стальной Кулак','Русский Медведь','Красная Звезда','Сибирский Тигр','Уральский Молот','Волжский Витязь','Белая Ночь','Золотой Орёл','Казачья Слава','Ледяной Воин'], regional: ['Боксёрская Лига — {r}','Федерация Бокса — {r}'], local: ['Кубок «{m}»','Турнир «{m}»','Золотые Перчатки — {r}','Вечер Бокса «{m}»'] },
  DE: { regions: ['Bayern','Nordrhein-Westfalen','Sachsen','Brandenburg','Hessen','Schwarzwald','Rheinland','Ruhrgebiet','Norddeutschland','Thüringen'], motifs: ['Stahlhammer','Eiserne Faust','Schwarzer Adler','Rheingold','Hansekrone','Alpenjäger','Ruhrstahl','Waldmeister','Donaublitz','Berglöwe'], regional: ['Boxverband {r}','Pugilisten-Liga {r}'], local: ['{m}-Pokal','{m}-Turnier','Goldene Handschuhe {r}','Boxnacht {m}'] },
  IT: { regions: ['Lombardia','Piemonte','Veneto','Toscana','Lazio','Campania','Sicilia','Sardegna','Emilia-Romagna','Puglia'], motifs: ['Gladiatore','Lupo Romano','Leone di San Marco','Etna di Fuoco','Aquila d’Oro','Vesuvio','Tricolore','Centurione','Mare Nostrum','Ferro Toscano'], regional: ['Lega Pugilistica {r}','Comitato Boxe {r}'], local: ['Coppa {m}','Trofeo {m}','Guanti d’Oro {r}','Notte della Boxe {m}'] },
  ES: { regions: ['Andalucía','Cataluña','País Vasco','Galicia','Castilla','Valencia','Asturias','Canarias','Aragón','Madrid'], motifs: ['Toro Bravo','Águila Ibérica','Sol de Andalucía','León de Castilla','Furia Roja','Matador','Cid Campeador','Teide','Camino de Acero','Luna Flamenca'], regional: ['Liga de Boxeo de {r}','Consejo Pugilístico de {r}'], local: ['Copa {m}','Torneo {m}','Guantes de Oro de {r}','Noche de Boxeo {m}'] },
  PH: { regions: ['Luzon','Visayas','Mindanao','Metro Manila','Cebu','Davao','Ilocos','Bicol','Palawan','Negros'], motifs: ['Typhoon','Maharlika','Carabao','Pearl of the Orient','Sarimanok','Bayanihan','Mayon','Tamaraw','Golden Sun','Barangay Pride'], regional: ['{r} Boxing League','{r} Pugilistic Council'], local: ['{m} Fight Cup','{m} Boxing Open','{r} Golden Gloves','{m} Brawl Night'] },
  JP: { regions: ['Kantō','Kansai','Hokkaidō','Tōhoku','Chūbu','Chūgoku','Shikoku','Kyūshū','Okinawa','Tōkyō'], motifs: ['Samurai','Bushidō','Rising Sun','Fuji','Sakura','Raijin','Tora','Shogun','Koi no Taki','Yamato'], regional: ['{r} Boxing Federation','{r} Pugilistic League'], local: ['{m} Fight Cup','{m} Boxing Tournament','{r} Golden Gloves','{m} Championship Night'] },
  KZ: { regions: ['Алматы','Астана','Шымкент','Жетісу','Сарыарқа','Маңғыстау','Алтай','Түркістан','Қарағанды','Каспий'], motifs: ['Дала Бүркіті','Алтын Белдік','Батыр','Көк Бөрі','Тұлпар','Ұлы Дала','Қыран','Алатау','Домбыра','Каспий Жолбарысы'], regional: ['Бокс Лигасы — {r}','Бокс Федерациясы — {r}'], local: ['«{m}» Кубогы','«{m}» Турнирі','Алтын Қолғап — {r}','«{m}» Бокс Кеші'] },
  UZ: { regions: ['Toshkent','Samarqand','Buxoro','Farg‘ona','Xorazm','Qashqadaryo','Surxondaryo','Navoiy','Andijon','Qoraqalpog‘iston'], motifs: ['Ipak Yo‘li','Amir Temur','Oltin Qo‘lqop','Jasur Bahodir','Registon','Moviy Gumbaz','Turon Burguti','Cho‘l Arsloni','Zarafshon','Afrosiyob'], regional: ['{r} Boks Ligasi','{r} Boks Ittifoqi'], local: ['{m} Kubogi','{m} Turniri','{r} Oltin Qo‘lqop','{m} Boks Kechasi'] },
  TH: { regions: ['Bangkok','Chiang Mai','Isan','Phuket','Ayutthaya','Chonburi','Nakhon Ratchasima','Krabi','Lanna','Mekong'], motifs: ['White Elephant','Garuda','Golden Buddha','Naga','Siam Tiger','Lotus','Emerald Temple','Songkran','Mekong Warrior','Royal Orchid'], regional: ['{r} Boxing League','{r} Pugilistic Authority'], local: ['{m} Boxing Cup','{m} Fight Festival','{r} Golden Gloves','{m} Championship Night'] },
  NG: { regions: ['Lagos','Abuja','Kano','Kaduna','Delta','Rivers','Oyo','Enugu','Borno','Plateau'], motifs: ['Naija Pride','Green Eagle','Lagos Lion','Savanna Thunder','Niger Warrior','Benin Bronze','Yankari','Aso Rock','Delta Force','Calabash King'], regional: ['{r} State Boxing League','{r} Boxing Association'], local: ['{m} Fight Cup','{m} Boxing Classic','{r} Golden Gloves','{m} Brawl Night'] },
  GH: { regions: ['Greater Accra','Ashanti','Volta','Central Region','Northern Region','Western Region','Eastern Region','Bono','Upper East','Upper West'], motifs: ['Black Star','Golden Stool','Kente Warrior','Volta Thunder','Adinkra','Ashanti Lion','Cape Coast','Cocoa Gold','Akwaaba','Sankofa'], regional: ['{r} Boxing League','{r} Pugilistic Council'], local: ['{m} Fight Cup','{m} Boxing Open','{r} Golden Gloves','{m} Championship Night'] },
  ZA: { regions: ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','Free State','North West','Northern Cape','Highveld'], motifs: ['Ubuntu Warrior','Springbok','Protea','Table Mountain','Highveld Thunder','Zulu Shield','Cape Storm','Karoo Lion','Drakensberg','Golden Reef'], regional: ['{r} Boxing Board','{r} Provincial Boxing League'], local: ['{m} Fight Cup','{m} Boxing Classic','{r} Golden Gloves','{m} Ringside Night'] },
  AU: { regions: ['New South Wales','Queensland','Victoria','Western Australia','South Australia','Tasmania','Northern Territory','Australian Capital Territory','Outback','Gold Coast'], motifs: ['Southern Cross','Red Kangaroo','Kookaburra','Dreamtime','Ironbark','Great Barrier','Bushranger','Uluru','Tasman Devil','Harbour Bridge'], regional: ['{r} Boxing Board','{r} State Boxing League'], local: ['{m} Fight Cup','{m} Boxing Classic','{r} Golden Gloves','{m} Ringside Rumble'] },
  NZ: { regions: ['Auckland','Wellington','Canterbury','Otago','Waikato','Bay of Plenty','Northland','Taranaki','Hawke’s Bay','Southland'], motifs: ['Aotearoa','Silver Fern','Kiwi Warrior','Southern Alps','Pounamu','Koru','Taniwha','Matariki','Tasman Thunder','Waitomo'], regional: ['{r} Boxing Board','{r} Regional Boxing League'], local: ['{m} Fight Cup','{m} Boxing Classic','{r} Golden Gloves','{m} Ringside Night'] },
};

function _formatCulturalName(template, region, motif) {
  return template.replace('{r}', region).replace('{m}', motif);
}

function _buildLocalizedPool(parts, templates, target) {
  const names = new Set();
  for (let offset = 0; names.size < target && offset < parts.regions.length * parts.motifs.length; offset++) {
    for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
      const region = parts.regions[(offset + templateIndex) % parts.regions.length];
      const motif = parts.motifs[(offset * 3 + templateIndex) % parts.motifs.length];
      names.add(_formatCulturalName(templates[templateIndex], region, motif));
      if (names.size >= target) return [...names];
    }
  }
  for (const template of templates) {
    for (const region of parts.regions) {
      for (const motif of parts.motifs) {
        const baseName = _formatCulturalName(template, region, motif);
        names.add(baseName);
        if (names.size >= target) return [...names];
        if (!template.includes('{r}')) names.add(`${baseName} — ${region}`);
        else if (!template.includes('{m}')) names.add(`${baseName} — ${motif}`);
        if (names.size >= target) return [...names];
      }
    }
  }
  return [...names];
}

for (const nationality of NATIONALITIES) {
  const nation = NAMES[nationality]?.nation || nationality;
  const culture = BELT_CULTURE[nationality] || {};
  if (!Array.isArray(culture.national) || culture.national.length < 4) {
    const prefix = nationality.toUpperCase();
    culture.national = [
      { abbrev: `${prefix}BA`, full: `${nation} Boxing Association` },
      { abbrev: `${prefix}BC`, full: `${nation} Boxing Council` },
      { abbrev: `${prefix}BF`, full: `${nation} Boxing Federation` },
      { abbrev: `NB${prefix}`, full: `National Boxing ${nation}` },
    ];
  }
  culture.national = culture.national.slice(0, 4);
  const parts = CULTURAL_TOURNAMENT_PARTS[nationality];
  culture.regional = parts
    ? _buildLocalizedPool(parts, parts.regional, 20)
    : culture.regional.slice(0, 20);
  culture.local = parts
    ? _buildLocalizedPool(parts, parts.local, 70)
    : culture.local.slice(0, 70);
  BELT_CULTURE[nationality] = culture;
}

// Organizações continentais fictícias
const CONTINENTAL_ORGS = {
  americas: { abbrev: 'CPAB', full: 'Consejo Panamericano de Boxeo' },
  europa:   { abbrev: 'UEB',  full: 'União Europeia de Boxe' },
  asia:     { abbrev: 'PABC', full: 'Pan-Asian Boxing Council' },
  africa:   { abbrev: 'CAPA', full: 'Confederação Africana de Pugilismo' },
  oceania:  { abbrev: 'OBF',  full: 'Oceania Boxing Federation' },
};

function _beltCultureHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

// Retorna o nome de exibição cultural do cinturão.
// opts: { year, weightClass }
// year → acrescenta o ano nos torneios locais ("Copa Cavalos da Bomba 2025")
// weightClass → usado para variar o torneio local por categoria
function getBeltDisplayName(beltKey, opts = {}) {
  const { year, weightClass } = opts || {};
  if (!beltKey) return '';

  // Cinturões mundiais: nome original (WBC, WBA, etc.)
  if (BELTS[beltKey]) return BELTS[beltKey].name;

  const [tierKey, scope] = beltKey.split(':');
  if (!tierKey || !scope) return beltKey;

  const culture = BELT_CULTURE[scope];

  if (tierKey === 'local') {
    const pool = culture?.local;
    if (!pool?.length) {
      const n = NAMES[scope]?.nation || scope;
      return year ? `Copa ${n} Fight ${year}` : `Copa ${n} Fight`;
    }
    const idx = _beltCultureHash(scope + (weightClass || '') + (year || '')) % pool.length;
    return year ? `${pool[idx]} ${year}` : pool[idx];
  }

  if (tierKey === 'regional') {
    const pool = culture?.regional;
    if (!pool?.length) {
      const fallback = `Federação Regional de Boxe (${scope})`;
      return year ? `${fallback} ${year}` : fallback;
    }
    const idx = _beltCultureHash(scope + 'R' + (weightClass || '') + (year || '')) % pool.length;
    return year ? `${pool[idx]} ${year}` : pool[idx];
  }

  if (tierKey === 'national') {
    const nat = culture?.national;
    if (!nat) return year ? `${scope}NB ${year}` : `${scope}NB`;
    if (Array.isArray(nat)) {
      const idx = _beltCultureHash(scope + 'N' + (weightClass || '') + (year || '')) % nat.length;
      return year ? `${nat[idx].abbrev} ${year}` : nat[idx].abbrev;
    }
    return year ? `${nat.abbrev} ${year}` : nat.abbrev;
  }

  if (tierKey === 'continental') {
    return CONTINENTAL_ORGS[scope]?.abbrev || `${scope.toUpperCase()} Boxing`;
  }

  return getBeltInfo(beltKey).name;
}

// Resolve qualquer chave de cinturão (mundial ou territorial) para exibição
function getBeltInfo(key) {
  if (BELTS[key]) return BELTS[key];
  const [tierKey, scope] = (key || '').split(':');
  const base = BELT_TIERS[tierKey];
  if (!base) return { name: key, icon: '🏅', tier: 0, bonus: 0, color: '#888' };

  const scopeName = base.scope === 'country'
    ? (NAMES[scope]?.nation || scope)
    : (CONTINENTS[scope]?.name || scope);

  const displayName = getBeltDisplayName(key);

  return {
    name:        `${base.label} (${scopeName})`,
    displayName: displayName || `${base.label} (${scopeName})`,
    icon:        base.icon,
    tier:        base.tier,
    bonus:       base.bonus,
    color:       base.color,
    scope:       base.scope,
    scopeKey:    scope,
  };
}

// Equipe técnica — funções, níveis e salários semanais
const STAFF_ROLES = [
  {
    id: 'coach', icon: '🧠', name: 'Técnico Principal',
    effect: 'Aumenta os ganhos de atributo nos camps de treino',
    tiers: [
      { name: 'Treinador Local',     salary: 120,  bonus: 0.10 },
      { name: 'Treinador Nacional',  salary: 450,  bonus: 0.25 },
      { name: 'Treinador de Elite',  salary: 1500, bonus: 0.45 },
    ],
  },
  {
    id: 'physio', icon: '💪', name: 'Preparador Físico',
    effect: 'Reduz o risco de lesão durante os treinos',
    tiers: [
      { name: 'Estagiário',          salary: 90,   bonus: 0.15 },
      { name: 'Profissional',        salary: 350,  bonus: 0.35 },
      { name: 'Especialista de Elite', salary: 1200, bonus: 0.55 },
    ],
  },
  {
    id: 'nutritionist', icon: '🥗', name: 'Nutricionista',
    effect: 'Acelera a recuperação de lesões',
    tiers: [
      { name: 'Nutricionista Júnior', salary: 80,  bonus: 0.25 },
      { name: 'Nutricionista Esportivo', salary: 300, bonus: 0.50 },
      { name: 'Referência Mundial',  salary: 1000, bonus: 0.80 },
    ],
  },
  {
    id: 'cutman', icon: '🩹', name: 'Cutman',
    effect: 'Reduz a chance do árbitro parar a luta (TKO sofrido)',
    tiers: [
      { name: 'Cutman Iniciante',    salary: 70,   bonus: 0.20 },
      { name: 'Cutman Experiente',   salary: 280,  bonus: 0.40 },
      { name: 'Lenda do Corner',     salary: 900,  bonus: 0.60 },
    ],
  },
  {
    id: 'psychologist', icon: '🧘', name: 'Psicólogo Esportivo',
    effect: 'Aumenta a confiança do lutador no início da luta',
    tiers: [
      { name: 'Psicólogo Clínico',   salary: 100,  bonus: 5 },
      { name: 'Psicólogo Esportivo', salary: 380,  bonus: 12 },
      { name: 'Mestre Mental',       salary: 1100, bonus: 20 },
    ],
  },
  {
    id: 'analyst', icon: '📊', name: 'Analista de Adversários',
    effect: 'Revela atributos do adversário e melhora o plano de luta',
    tiers: [
      { name: 'Analista Amador',     salary: 110,  bonus: 0.03 },
      { name: 'Analista Profissional', salary: 420, bonus: 0.06 },
      { name: 'Gênio Tático',        salary: 1300, bonus: 0.10 },
    ],
  },
  {
    id: 'agent', icon: '🤝', name: 'Agente',
    effect: 'Melhora propostas, contrapropostas e valores de contrato',
    tiers: [
      { name: 'Agente Independente', salary: 100, bonus: 0.06 },
      { name: 'Agente Renomado',     salary: 400, bonus: 0.14 },
      { name: 'Superagente',         salary: 1400, bonus: 0.25 },
    ],
  },
];

const TRAINING_COST_PER_WEEK = 250;

// Estratégias de luta
const STRATEGIES = [
  { id: 'pressure',     name: 'Pressão Total',        desc: 'Pressionar desde o início' },
  { id: 'counter',      name: 'Contra-ataque',        desc: 'Esperar erro e punir' },
  { id: 'jab_control',  name: 'Controle de Jab',      desc: 'Trabalhar com jab e distância' },
  { id: 'body_attack',  name: 'Atacar o Corpo',       desc: 'Desgastar o adversário no corpo' },
  { id: 'go_for_ko',    name: 'Buscar Nocaute',       desc: 'Risco máximo, buscar finalização' },
  { id: 'points',       name: 'Pontuar com Segurança',desc: 'Estratégia conservadora por pontos' },
  { id: 'adapt',        name: 'Adaptar no Ringue',    desc: 'Reagir conforme a luta evolui' },
];

// Focos de treinamento
const TRAINING_FOCUSES = [
  { id: 'conditioning',  name: 'Condicionamento Físico', attrs: ['stamina', 'speed'],                    risk: 0.05 },
  { id: 'power',         name: 'Força e Potência',       attrs: ['strength', 'chin'],                    risk: 0.08 },
  { id: 'technique',     name: 'Fundamentos e Jab',      attrs: ['jab', 'precision', 'distance'],        risk: 0.03 },
  { id: 'power_punches', name: 'Socos Longos',           attrs: ['straight', 'cross'],                   risk: 0.06 },
  { id: 'combos_hooks',  name: 'Ganchos e Uppercuts',    attrs: ['uppercut', 'combinations'],            risk: 0.07 },
  { id: 'defense',       name: 'Defesa e Esquiva',       attrs: ['defense', 'footwork', 'reflexes'],     risk: 0.04 },
  { id: 'sparring',      name: 'Sparring Intenso',       attrs: ['ringIQ', 'counter', 'pressure'],       risk: 0.15 },
  { id: 'body_work',     name: 'Trabalho de Corpo',      attrs: ['bodyPunch', 'stamina'],                risk: 0.06 },
  { id: 'mental',        name: 'Preparação Mental',      attrs: ['composure', 'courage', 'discipline'],  risk: 0.02 },
  { id: 'resilience',    name: 'Resiliência e Queixo',   attrs: ['resilience', 'chin'],                  risk: 0.07 },
  { id: 'weight_cut',    name: 'Corte de Peso',          attrs: [],                                      risk: 0.10 },
];

const ACADEMY_PHILOSOPHIES = [
  { id: 'technical', name: 'Escola Técnica', desc: 'Prioriza leitura, defesa e fundamentos.', icon: '📐', focus: 'technique', bonus: 0.10 },
  { id: 'pressure', name: 'Forja de Guerreiros', desc: 'Forma atletas agressivos, resistentes e intensos.', icon: '🔥', focus: 'conditioning', bonus: 0.10 },
  { id: 'development', name: 'Projeto de Base', desc: 'Extrai mais crescimento de prospectos jovens.', icon: '🌱', focus: 'mental', bonus: 0.14 },
  { id: 'commercial', name: 'Fábrica de Estrelas', desc: 'Equilibra evolução esportiva e apelo popular.', icon: '✦', focus: 'sparring', bonus: 0.08 },
];

// Academia
const GYM_LEVELS = [
  { id: 0, name: 'Academia Pública',       desc: 'Treino básico sem custo extra.', icon: '🏚️', cost: 0,      maintenance: 0,    gainBonus: 0,    riskBonus: 0 },
  { id: 1, name: 'Academia Alugada',       desc: 'Equipamentos melhores e treinadores disponíveis.', icon: '🏋️', cost: 15000, maintenance: 400,  gainBonus: 0.08, riskBonus: 0.08 },
  { id: 2, name: 'Academia Própria',       desc: 'Seu nome na porta. Controle total do ambiente.', icon: '🥊', cost: 50000, maintenance: 1200, gainBonus: 0.18, riskBonus: 0.18 },
  { id: 3, name: 'Centro de Treinamento', desc: 'Estrutura profissional com área de sparring dedicada.', icon: '🏟️', cost: 150000, maintenance: 3500, gainBonus: 0.30, riskBonus: 0.28 },
  { id: 4, name: 'Complexo Profissional',  desc: 'Elite mundial. Atrai os melhores sparrings do mundo.', icon: '🏆', cost: 500000, maintenance: 8000, gainBonus: 0.45, riskBonus: 0.40 },
];

// Sparrings
const SPARRING_TYPES = [
  { id: 'sp_pressure', name: 'Especialista em Pressão',       attrs: { pressure: 6, stamina: 4 },    cost: 3000, icon: '⚡' },
  { id: 'sp_counter',  name: 'Especialista em Contra-Golpe',  attrs: { counter: 6, reflexes: 4 },    cost: 3000, icon: '🔄' },
  { id: 'sp_power',    name: 'Especialista em Poder',         attrs: { chin: 5, strength: 3 },       cost: 4000, icon: '💪' },
  { id: 'sp_jab',      name: 'Especialista em Jab e Distância', attrs: { jab: 6, defense: 3 },       cost: 2500, icon: '🎯' },
  { id: 'sp_body',     name: 'Especialista em Corpo',         attrs: { bodyPunch: 6, stamina: 4 },   cost: 2500, icon: '🩻' },
  { id: 'sp_ringiq',   name: 'Veterano Experiente',           attrs: { ringIQ: 6, composure: 4 },   cost: 5000, icon: '🧠' },
  { id: 'sp_defense',  name: 'Especialista em Defesa',        attrs: { defense: 5, footwork: 5 },   cost: 3500, icon: '🛡️' },
];

// Campanhas de Mídia
const MEDIA_CAMPAIGNS = [
  { id: 'social',       name: 'Campanha nas Redes',       desc: 'Posts patrocinados e stories.', icon: '📱', cost: 3000,  popularity: 5,  reputation: 0, cooldownWeeks: 4 },
  { id: 'magazine',     name: 'Matéria em Revista',       desc: 'Entrevista exclusiva em publicação especializada.', icon: '📰', cost: 8000, popularity: 8, reputation: 3, cooldownWeeks: 8 },
  { id: 'tv_show',      name: 'Aparição em Programa de TV', desc: 'Entrevista em programa de grande audiência.', icon: '📺', cost: 20000, popularity: 15, reputation: 2, cooldownWeeks: 12 },
  { id: 'documentary',  name: 'Mini-Documentário',        desc: 'Produção sobre sua trajetória no boxe.', icon: '🎬', cost: 45000, popularity: 22, reputation: 8, cooldownWeeks: 26 },
];

// Estilo de Vida
const LIFESTYLE_ITEMS = [
  { id: 'jewelry',   name: 'Joias e Acessórios', desc: 'Chegou na balada com estilo.',    icon: '💎', cost: 12000,  morale: 4 },
  { id: 'car',       name: 'Carro Esportivo',    desc: 'Status nas ruas.',               icon: '🚗', cost: 35000,  morale: 6 },
  { id: 'apartment', name: 'Apartamento',        desc: 'Sai do aluguel. Lugar seu.',     icon: '🏠', cost: 25000,  morale: 5 },
  { id: 'house',     name: 'Casa com Quintal',   desc: 'Espaço para relaxar entre treinos.', icon: '🏡', cost: 80000, morale: 8 },
  { id: 'mansion',   name: 'Mansão',             desc: 'Chegou lá.',                      icon: '🏰', cost: 350000, morale: 15 },
  { id: 'yacht',     name: 'Iate',               desc: 'Para os dias sem treino.',       icon: '⛵', cost: 200000, morale: 12 },
];

// Tratamentos de Recuperação
const RECOVERY_TREATMENTS = [
  { id: 'cryo',       name: 'Crioterapia',           desc: 'Reduz inflamação e acelera recuperação muscular.', icon: '🧊', cost: 2000,  weeksReduced: 1, staminaBonus: 10 },
  { id: 'physio',     name: 'Fisioterapia Intensiva', desc: 'Sessões diárias com especialistas.', icon: '🏥', cost: 5000,  weeksReduced: 2, staminaBonus: 5  },
  { id: 'hyperbaric', name: 'Câmara Hiperbárica',     desc: 'Oxigenação acelerada do tecido muscular.', icon: '🫧', cost: 12000, weeksReduced: 3, staminaBonus: 15 },
];

// Equipe Técnica da Academia
const ACADEMY_STAFF = [
  {
    id: 'head_coach', name: 'Treinador Principal', icon: '🥊',
    desc: 'O coração da academia. Define o estilo e lidera os treinos.',
    tiers: [
      { tier: 1, label: 'Iniciante',  salary: 800,  bonus: { trainGain: 0.10 } },
      { tier: 2, label: 'Experiente', salary: 2200, bonus: { trainGain: 0.22 } },
      { tier: 3, label: 'Elite',      salary: 5500, bonus: { trainGain: 0.38 } },
    ],
  },
  {
    id: 'strength_coach', name: 'Preparador Físico', icon: '💪',
    desc: 'Reduz risco de lesão e acelera ganhos de força/resistência.',
    tiers: [
      { tier: 1, label: 'Iniciante',  salary: 600,  bonus: { injuryRisk: -0.15, condBonus: 5 } },
      { tier: 2, label: 'Certificado', salary: 1600, bonus: { injuryRisk: -0.28, condBonus: 10 } },
      { tier: 3, label: 'Elite',      salary: 3800, bonus: { injuryRisk: -0.42, condBonus: 18 } },
    ],
  },
  {
    id: 'nutritionist', name: 'Nutricionista', icon: '🥗',
    desc: 'Corta peso com segurança e acelera recuperação entre lutas.',
    tiers: [
      { tier: 1, label: 'Técnico',      salary: 500,  bonus: { recovery: 0.15, weightCutRisk: -0.20 } },
      { tier: 2, label: 'Especialista', salary: 1400, bonus: { recovery: 0.28, weightCutRisk: -0.40 } },
      { tier: 3, label: 'Elite',        salary: 3200, bonus: { recovery: 0.45, weightCutRisk: -0.65 } },
    ],
  },
  {
    id: 'cutman', name: 'Cutman', icon: '🩹',
    desc: 'Mantém atletas na luta mesmo com cortes graves.',
    tiers: [
      { tier: 1, label: 'Experiente', salary: 450,  bonus: { tkoResist: 0.10 } },
      { tier: 2, label: 'Veterano',   salary: 1100, bonus: { tkoResist: 0.22 } },
      { tier: 3, label: 'Lendário',   salary: 2800, bonus: { tkoResist: 0.38 } },
    ],
  },
  {
    id: 'sports_psychologist', name: 'Psicólogo Esportivo', icon: '🧠',
    desc: 'Mentalidade vence batalhas. Aumenta morale e compostura.',
    tiers: [
      { tier: 1, label: 'Pós-Graduado', salary: 700,  bonus: { morale: 3,  mentalBonus: 0.10 } },
      { tier: 2, label: 'Especialista', salary: 1800, bonus: { morale: 6,  mentalBonus: 0.22 } },
      { tier: 3, label: 'Referência',   salary: 4200, bonus: { morale: 10, mentalBonus: 0.35 } },
    ],
  },
  {
    id: 'video_analyst', name: 'Analista de Vídeo', icon: '📊',
    desc: 'Decompõe os adversários quadro a quadro. Melhora as odds de vitória.',
    tiers: [
      { tier: 1, label: 'Júnior',   salary: 600,  bonus: { fightBonus: 0.04 } },
      { tier: 2, label: 'Pleno',    salary: 1600, bonus: { fightBonus: 0.09 } },
      { tier: 3, label: 'Sênior',   salary: 3800, bonus: { fightBonus: 0.16 } },
    ],
  },
  {
    id: 'scout', name: 'Olheiro', icon: '🔭',
    desc: 'Varre o mercado em busca de diamantes brutos.',
    tiers: [
      { tier: 1, label: 'Regional',    salary: 800,  bonus: { scoutQuality: 8,  scoutCost: -0.20 } },
      { tier: 2, label: 'Nacional',    salary: 2000, bonus: { scoutQuality: 18, scoutCost: -0.45 } },
      { tier: 3, label: 'Internacional', salary: 4500, bonus: { scoutQuality: 30, scoutCost: -0.70 } },
    ],
  },
  {
    id: 'matchmaker', name: 'Matchmaker', icon: '📋',
    desc: 'Encontra lutas com bolsas maiores e adversários ideais para o momento.',
    tiers: [
      { tier: 1, label: 'Local',      salary: 700,  bonus: { purseBonus: 0.10, fightOptions: 2 } },
      { tier: 2, label: 'Regional',   salary: 1900, bonus: { purseBonus: 0.22, fightOptions: 4 } },
      { tier: 3, label: 'Nacional',   salary: 4600, bonus: { purseBonus: 0.38, fightOptions: 6 } },
    ],
  },
  {
    id: 'pr_manager', name: 'Gerente de Relações Públicas', icon: '📣',
    desc: 'Coloca a academia no mapa. Atrai patrocínios e melhora visibilidade.',
    tiers: [
      { tier: 1, label: 'Assistente',  salary: 900,  bonus: { repGain: 1.5, sponsorBonus: 0.15 } },
      { tier: 2, label: 'Coordenador', salary: 2400, bonus: { repGain: 2.8, sponsorBonus: 0.30 } },
      { tier: 3, label: 'Diretor',     salary: 5800, bonus: { repGain: 4.5, sponsorBonus: 0.55 } },
    ],
  },
];

// Upgrades de Instalações
const ACADEMY_UPGRADES = [
  {
    id: 'ring',       name: 'Ringue Profissional', icon: '🟥',
    desc: 'Treinos mais realistas. Atrai sparrings de melhor nível.',
    levels: [
      { level: 1, label: 'Ringue Improvisado', cost: 0,      effect: {} },
      { level: 2, label: 'Ringue Padrão',      cost: 8000,   effect: { trainGain: 0.05 } },
      { level: 3, label: 'Ringue Olímpico',    cost: 25000,  effect: { trainGain: 0.12, scoutQuality: 5 } },
      { level: 4, label: 'Ringue de Elite',    cost: 75000,  effect: { trainGain: 0.20, scoutQuality: 12, fightBonus: 0.04 } },
    ],
  },
  {
    id: 'gym',        name: 'Sala de Musculação', icon: '🏋️',
    desc: 'Equipamentos modernos para força e condicionamento.',
    levels: [
      { level: 1, label: 'Sem sala própria',  cost: 0,      effect: {} },
      { level: 2, label: 'Básica',            cost: 6000,   effect: { injuryRisk: -0.08, condBonus: 4 } },
      { level: 3, label: 'Completa',          cost: 20000,  effect: { injuryRisk: -0.16, condBonus: 9 } },
      { level: 4, label: 'Centro de Alto Rendimento', cost: 60000, effect: { injuryRisk: -0.28, condBonus: 16 } },
    ],
  },
  {
    id: 'recovery',   name: 'Área de Recuperação', icon: '🛁',
    desc: 'Sauna, crioterapia e fisioterapia. Atletas sempre prontos.',
    levels: [
      { level: 1, label: 'Sem área',         cost: 0,      effect: {} },
      { level: 2, label: 'Sauna e Gelo',     cost: 10000,  effect: { recovery: 0.15 } },
      { level: 3, label: 'Fisioterapia',     cost: 32000,  effect: { recovery: 0.30, injuryWeeks: -1 } },
      { level: 4, label: 'Centro Médico',    cost: 90000,  effect: { recovery: 0.50, injuryWeeks: -2 } },
    ],
  },
  {
    id: 'video_room', name: 'Sala de Análise', icon: '🖥️',
    desc: 'Tecnologia de ponta para estudo de adversários.',
    levels: [
      { level: 1, label: 'Sem sala',         cost: 0,      effect: {} },
      { level: 2, label: 'Tela e Projetor',  cost: 5000,   effect: { fightBonus: 0.03 } },
      { level: 3, label: 'Studio Completo',  cost: 18000,  effect: { fightBonus: 0.07 } },
      { level: 4, label: 'Análise em Tempo Real', cost: 55000, effect: { fightBonus: 0.12 } },
    ],
  },
  {
    id: 'dorms',      name: 'Alojamentos', icon: '🛏️',
    desc: 'Atletas de fora podem se instalar. Amplia o alcance de recrutamento.',
    levels: [
      { level: 1, label: 'Sem alojamento',   cost: 0,      effect: {} },
      { level: 2, label: '4 quartos',        cost: 15000,  effect: { scoutQuality: 8, maxRosterBonus: 2 } },
      { level: 3, label: '10 quartos',       cost: 40000,  effect: { scoutQuality: 16, maxRosterBonus: 4 } },
      { level: 4, label: 'Complexo Residencial', cost: 120000, effect: { scoutQuality: 28, maxRosterBonus: 8 } },
    ],
  },
  {
    id: 'arena',      name: 'Arena Própria', icon: '🏟️',
    desc: 'Capacidade para hospedar eventos. Fonte de renda independente.',
    levels: [
      { level: 1, label: 'Sem arena',         cost: 0,       effect: {} },
      { level: 2, label: 'Salão (200 pessoas)',cost: 30000,   effect: { canHostEvents: true,  eventCap: 200 } },
      { level: 3, label: 'Ginásio (800)',      cost: 100000,  effect: { canHostEvents: true,  eventCap: 800 } },
      { level: 4, label: 'Arena (3000)',       cost: 350000,  effect: { canHostEvents: true,  eventCap: 3000 } },
    ],
  },
];

// Economia Paralela (atividades ilegais)
const ACADEMY_SHADOW_ECONOMY = [
  {
    id: 'match_fixing', name: 'Manipulação de Resultado', icon: '🎭',
    desc: 'Pague o adversário para "cair". Vitória garantida, mas risco de escândalo.',
    cost: 8000,
    effect: { winChance: 0.92 },
    risk: 0.18,
    exposure: 25,
    scandal: { repLoss: 35, fine: 30000, suspensionWeeks: 12, headline: 'Academia investigada por manipulação de resultado' },
  },
  {
    id: 'doping',       name: 'Doping Não Declarado', icon: '💉',
    desc: 'PEDs não detectados (por enquanto). Treino 50% mais rápido.',
    costPerWeek: 600,
    effect: { trainGainMult: 1.50, winChanceMult: 1.08 },
    risk: 0.10,
    exposure: 20,
    scandal: { repLoss: 45, fine: 15000, suspensionWeeks: 26, headline: 'Atleta flagrado em exame antidoping' },
  },
  {
    id: 'gambling',     name: 'Apostas Clandestinas', icon: '🎰',
    desc: 'Aposte no seu próprio atleta usando informação privilegiada. Alto retorno.',
    costPercent: 0.30,
    effect: { returnMult: 3.5 },
    risk: 0.14,
    exposure: 18,
    scandal: { repLoss: 30, fine: 25000, suspensionWeeks: 8, headline: 'Treinador suspeito de apostas em lutas de seus próprios atletas' },
  },
  {
    id: 'judge_bribe',  name: 'Suborno de Juízes', icon: '⚖️',
    desc: 'Decisão garantida numa luta que vai para os pontos.',
    cost: 5000,
    effect: { decisionFlip: true },
    risk: 0.22,
    exposure: 30,
    scandal: { repLoss: 40, fine: 20000, suspensionWeeks: 16, headline: 'Comissão Atlética abre investigação sobre resultado suspeito' },
  },
  {
    id: 'promoter_deal', name: 'Acordo com Promotor Corrupto', icon: '🤝',
    desc: 'Bolsas infladas e lutas escolhidas a dedo. Percentual pago por fora.',
    cost: 12000,
    effect: { purseBonus: 0.45, fightOptions: 5 },
    risk: 0.12,
    exposure: 22,
    scandal: { repLoss: 28, fine: 40000, suspensionWeeks: 0, headline: 'Academia suspeita de esquema com promotora irregular' },
    durationWeeks: 12,
  },
];

// Eventos Organizados pela Academia
const ACADEMY_EVENT_TYPES = [
  {
    id: 'amateur_show',  name: 'Show Amador',     icon: '🥋',
    desc: 'Card de estreias. Baixo custo, exposição local.',
    cost: 2000,  capacityRequired: 0,   revenueBase: 4000,  repGain: 2,
  },
  {
    id: 'regional_card', name: 'Card Regional',   icon: '🎟️',
    desc: 'Lutas profissionais regionais no seu ginásio.',
    cost: 8000,  capacityRequired: 200, revenueBase: 16000, repGain: 5,
  },
  {
    id: 'local_title',   name: 'Disputa de Cinturão Local', icon: '🏅',
    desc: 'Card com disputa de cinturão local como main event.',
    cost: 18000, capacityRequired: 200, revenueBase: 38000, repGain: 10,
  },
  {
    id: 'big_show',      name: 'Grande Show',     icon: '🌟',
    desc: 'Evento de destaque com atletas de nome.',
    cost: 45000, capacityRequired: 800, revenueBase: 95000, repGain: 20,
  },
];

// Academia Builder
// 6 níveis × 15 itens. Cada item desbloqueado aparece na fachada/grid.
// unlocks: { rosterSlots, staffSlots, sponsorSlots } adicionados ao expandir.
const ACADEMY_BUILDER_LEVELS = [
  {
    level: 1,
    name: 'Garagem', nameEN: 'Garage Gym',
    expandCost: 80000,
    unlocks: { rosterSlots: 0, staffSlots: 0, sponsorSlots: 0 },
    items: [
      { id: 'basic_ring',     name: 'Ring Improvisado',     icon: '🥊', cost: 2000,  effect: 'rosterSlots+1' },
      { id: 'heavy_bag',      name: 'Saco de Pancada',      icon: '💥', cost: 800,   effect: 'trainBonus+2' },
      { id: 'mirror',         name: 'Espelhos',             icon: '🪞', cost: 600,   effect: 'trainBonus+1' },
      { id: 'jump_rope',      name: 'Cordas de Pular',      icon: '⬜', cost: 200,   effect: 'trainBonus+1' },
      { id: 'locker',         name: 'Armários',             icon: '🗄️',  cost: 1200,  effect: 'rosterSlots+1' },
      { id: 'first_aid',      name: 'Kit de Primeiros Socorros', icon: '🩹', cost: 500, effect: 'injuryRisk-2' },
      { id: 'radio',          name: 'Rádio/Som',            icon: '📻', cost: 300,   effect: 'morale+2' },
      { id: 'timer',          name: 'Timer de Round',       icon: '⏱️',  cost: 150,   effect: 'trainBonus+1' },
      { id: 'mat',            name: 'Tatame',               icon: '🟫', cost: 1000,  effect: 'injuryRisk-2' },
      { id: 'speed_bag',      name: 'Saco de Velocidade',   icon: '🔴', cost: 700,   effect: 'trainBonus+2' },
      { id: 'watercooler',    name: 'Bebedouro',            icon: '💧', cost: 400,   effect: 'morale+1' },
      { id: 'basic_weights',  name: 'Halteres Básicos',     icon: '🏋️',  cost: 1500,  effect: 'trainBonus+2' },
      { id: 'glove_rack',     name: 'Rack de Equipamentos', icon: '🧤', cost: 600,   effect: 'trainBonus+1' },
      { id: 'sign',           name: 'Placa da Academia',    icon: '🪧', cost: 800,   effect: 'reputation+5' },
      { id: 'camera_basic',   name: 'Câmera de Treino',     icon: '📷', cost: 1200,  effect: 'scoutBonus+5' },
    ],
  },
  {
    level: 2,
    name: 'Academia Local', nameEN: 'Local Gym',
    expandCost: 200000,
    unlocks: { rosterSlots: 2, staffSlots: 1, sponsorSlots: 1 },
    items: [
      { id: 'pro_ring',       name: 'Ring Profissional',    icon: '🟦', cost: 15000, effect: 'rosterSlots+2' },
      { id: 'weight_room',    name: 'Sala de Musculação',   icon: '💪', cost: 12000, effect: 'trainBonus+5' },
      { id: 'showers',        name: 'Vestiário com Chuveiro', icon: '🚿', cost: 8000, effect: 'morale+5' },
      { id: 'cardio_area',    name: 'Área de Cardio',       icon: '🏃', cost: 6000,  effect: 'trainBonus+3' },
      { id: 'mini_office',    name: 'Mini Escritório',      icon: '🖥️',  cost: 4000,  effect: 'staffSlots+1' },
      { id: 'video_basic',    name: 'Sala de Vídeo Básica', icon: '📺', cost: 5000,  effect: 'scoutBonus+8' },
      { id: 'clinic_basic',   name: 'Enfermaria',           icon: '🏥', cost: 7000,  effect: 'injuryRisk-5' },
      { id: 'stretch_area',   name: 'Área de Alongamento',  icon: '🧘', cost: 3000,  effect: 'injuryRisk-3' },
      { id: 'nutrition_fridge', name: 'Frigobar Nutricional', icon: '🥗', cost: 4500, effect: 'trainBonus+3' },
      { id: 'lit_sign',       name: 'Placa Iluminada',      icon: '✨', cost: 3500,  effect: 'reputation+10' },
      { id: 'parking',        name: 'Estacionamento',       icon: '🅿️',  cost: 10000, effect: 'morale+3' },
      { id: 'second_ring',    name: 'Segundo Ring',         icon: '🥊', cost: 12000, effect: 'rosterSlots+2' },
      { id: 'meeting_room',   name: 'Sala de Reunião',      icon: '🤝', cost: 6000,  effect: 'sponsorSlots+1' },
      { id: 'ac',             name: 'Ar Condicionado',      icon: '❄️',  cost: 8000,  effect: 'morale+4' },
      { id: 'security',       name: 'Sistema de Segurança', icon: '🔒', cost: 5000,  effect: 'reputation+5' },
    ],
  },
  {
    level: 3,
    name: 'Centro de Treinamento', nameEN: 'Training Center',
    expandCost: 500000,
    unlocks: { rosterSlots: 3, staffSlots: 2, sponsorSlots: 1 },
    items: [
      { id: 'olympic_ring',   name: 'Ring Olímpico',        icon: '🏟️',  cost: 40000, effect: 'rosterSlots+2' },
      { id: 'sauna',          name: 'Sauna',                icon: '🧖', cost: 20000, effect: 'injuryRisk-5' },
      { id: 'pro_clinic',     name: 'Clínica Esportiva',    icon: '⚕️',  cost: 35000, effect: 'injuryRisk-8' },
      { id: 'film_room',      name: 'Film Room',            icon: '🎬', cost: 25000, effect: 'scoutBonus+15' },
      { id: 'dorms',          name: 'Dormitórios',          icon: '🛏️',  cost: 50000, effect: 'rosterSlots+3' },
      { id: 'cafeteria',      name: 'Cantina',              icon: '🍽️',  cost: 18000, effect: 'morale+8' },
      { id: 'pool',           name: 'Piscina',              icon: '🏊', cost: 45000, effect: 'trainBonus+8' },
      { id: 'sponsor_wall',   name: 'Parede de Patrocinadores', icon: '📋', cost: 15000, effect: 'sponsorSlots+2' },
      { id: 'press_room',     name: 'Sala de Imprensa',     icon: '📰', cost: 20000, effect: 'reputation+15' },
      { id: 'trophy_room',    name: 'Sala de Troféus',      icon: '🏆', cost: 12000, effect: 'reputation+10' },
      { id: 'third_ring',     name: 'Terceiro Ring',        icon: '🟥', cost: 30000, effect: 'rosterSlots+2' },
      { id: 'physio_suite',   name: 'Suite de Fisioterapia', icon: '🦴', cost: 28000, effect: 'injuryRisk-6' },
      { id: 'pro_weights',    name: 'Musculação Profissional', icon: '🏋️', cost: 22000, effect: 'trainBonus+6' },
      { id: 'coaches_room',   name: 'Sala dos Treinadores', icon: '📊', cost: 16000, effect: 'staffSlots+2' },
      { id: 'brand_sign',     name: 'Fachada Profissional', icon: '🏢', cost: 30000, effect: 'reputation+20' },
    ],
  },
  {
    level: 4,
    name: 'Complexo Esportivo', nameEN: 'Sports Complex',
    expandCost: 1200000,
    unlocks: { rosterSlots: 4, staffSlots: 2, sponsorSlots: 2 },
    items: [
      { id: 'arena_ring',     name: 'Ring de Arena',        icon: '🌟', cost: 100000, effect: 'rosterSlots+3' },
      { id: 'hypoxic_chamber', name: 'Câmara Hipóxica',    icon: '🌬️',  cost: 80000,  effect: 'trainBonus+12' },
      { id: 'recovery_suite', name: 'Suite de Recuperação', icon: '🛁', cost: 60000,  effect: 'injuryRisk-10' },
      { id: 'hot_cold_pool',  name: 'Piscina Quente/Fria',  icon: '♨️',  cost: 70000,  effect: 'injuryRisk-8' },
      { id: 'broadcast_studio', name: 'Estúdio de Broadcast', icon: '📡', cost: 85000, effect: 'reputation+25' },
      { id: 'vip_lounge',     name: 'Lounge VIP',           icon: '🛋️',  cost: 50000,  effect: 'sponsorSlots+2' },
      { id: 'hotel_wing',     name: 'Ala Hotel',            icon: '🏨', cost: 120000, effect: 'rosterSlots+4' },
      { id: 'nutrition_lab',  name: 'Laboratório Nutricional', icon: '🔬', cost: 65000, effect: 'trainBonus+8' },
      { id: 'strength_lab',   name: 'Lab de Força/Condição', icon: '📈', cost: 55000, effect: 'trainBonus+10' },
      { id: 'combat_sim',     name: 'Simulador de Combate', icon: '🤖', cost: 90000,  effect: 'scoutBonus+20' },
      { id: 'fan_shop',       name: 'Loja da Academia',     icon: '👕', cost: 40000,  effect: 'reputation+15' },
      { id: 'conference_hall', name: 'Salão de Conferências', icon: '🎤', cost: 75000, effect: 'sponsorSlots+3' },
      { id: 'helipad',        name: 'Heliporto',            icon: '🚁', cost: 150000, effect: 'reputation+30' },
      { id: 'outdoor_ring',   name: 'Ring Externo Coberto', icon: '⛺', cost: 60000,  effect: 'rosterSlots+2' },
      { id: 'elite_sign',     name: 'Letreiro de Elite',    icon: '💎', cost: 45000,  effect: 'reputation+20' },
    ],
  },
  {
    level: 5,
    name: 'Academia de Elite', nameEN: 'Elite Academy',
    expandCost: 3000000,
    unlocks: { rosterSlots: 5, staffSlots: 3, sponsorSlots: 2 },
    items: [
      { id: 'world_ring',     name: 'Ring de Campeonato Mundial', icon: '🌍', cost: 300000, effect: 'rosterSlots+4' },
      { id: 'cryotherapy',    name: 'Crioterapia',          icon: '🧊', cost: 200000, effect: 'injuryRisk-15' },
      { id: 'sports_science', name: 'Dept. Ciência do Esporte', icon: '🧬', cost: 250000, effect: 'trainBonus+20' },
      { id: 'mental_perf',    name: 'Centro de Performance Mental', icon: '🧠', cost: 180000, effect: 'morale+20' },
      { id: 'media_center',   name: 'Media Center Profissional', icon: '🎥', cost: 220000, effect: 'reputation+40' },
      { id: 'world_class_gym', name: 'Ginásio World-Class', icon: '🏛️', cost: 350000, effect: 'trainBonus+15' },
      { id: 'private_clinic', name: 'Clínica Privada',      icon: '🏥', cost: 280000, effect: 'injuryRisk-12' },
      { id: 'athlete_village', name: 'Vila dos Atletas',    icon: '🏘️',  cost: 400000, effect: 'rosterSlots+6' },
      { id: 'global_scouts',  name: 'Rede Global de Scouts', icon: '🌐', cost: 200000, effect: 'scoutBonus+30' },
      { id: 'luxury_sponsor', name: 'Espaço de Patrocínio Luxury', icon: '💰', cost: 300000, effect: 'sponsorSlots+4' },
      { id: 'hall_of_fame',   name: 'Hall da Fama',         icon: '⭐', cost: 150000, effect: 'reputation+30' },
      { id: 'boxing_school',  name: 'Escola de Boxe',       icon: '🎓', cost: 250000, effect: 'scoutBonus+20' },
      { id: 'indoor_arena',   name: 'Arena Indoor',         icon: '🏟️',  cost: 500000, effect: 'rosterSlots+5' },
      { id: 'documentary',    name: 'Estúdio Documentário', icon: '🎞️',  cost: 180000, effect: 'reputation+25' },
      { id: 'iconic_facade',  name: 'Fachada Icônica',      icon: '🗽', cost: 200000, effect: 'reputation+50' },
    ],
  },
  {
    level: 6,
    name: 'Lenda do Boxe', nameEN: 'Boxing Legend',
    expandCost: null, // nível máximo
    unlocks: { rosterSlots: 6, staffSlots: 4, sponsorSlots: 3 },
    items: [
      { id: 'olympic_facility', name: 'Instalação Olímpica', icon: '🥇', cost: 1000000, effect: 'trainBonus+25' },
      { id: 'world_arena',    name: 'Arena Mundial',         icon: '🌎', cost: 2000000, effect: 'rosterSlots+8' },
      { id: 'bio_lab',        name: 'Laboratório Bio-Médico', icon: '🧪', cost: 800000,  effect: 'injuryRisk-20' },
      { id: 'ai_training',    name: 'Sistema de Treino IA',  icon: '🤖', cost: 1500000, effect: 'trainBonus+30' },
      { id: 'titan_ring',     name: 'Ring dos Titãs',        icon: '👑', cost: 1200000, effect: 'rosterSlots+5' },
      { id: 'world_media',    name: 'Hub de Mídia Mundial',  icon: '📡', cost: 900000,  effect: 'reputation+60' },
      { id: 'museum',         name: 'Museu do Boxe',         icon: '🏛️',  cost: 600000,  effect: 'reputation+40' },
      { id: 'charity_wing',   name: 'Ala de Caridade',       icon: '💝', cost: 500000,  effect: 'morale+30' },
      { id: 'legend_hotel',   name: 'Hotel Lenda',           icon: '🌠', cost: 1500000, effect: 'rosterSlots+6' },
      { id: 'global_broadcast', name: 'Rede de Broadcast Global', icon: '🛰️', cost: 1200000, effect: 'sponsorSlots+6' },
      { id: 'goat_clinic',    name: 'Instituto Médico GOAT', icon: '🐐', cost: 800000,  effect: 'injuryRisk-25' },
      { id: 'infinity_pool',  name: 'Piscina Infinita',      icon: '🌊', cost: 700000,  effect: 'injuryRisk-10' },
      { id: 'power_plant',    name: 'Planta de Energia Própria', icon: '⚡', cost: 1000000, effect: 'morale+20' },
      { id: 'monument',       name: 'Monumento da Academia', icon: '🗿', cost: 500000,  effect: 'reputation+50' },
      { id: 'legend_sign',    name: 'Fachada Lendária',      icon: '🌟', cost: 600000,  effect: 'reputation+80' },
    ],
  },
];

// Item flavor descriptions — used in the interior top-down view
const ITEM_FLAVOR = {
  // ── Nível 1 — Garagem ───────────────────────────────────────
  basic_ring:       { room:'ring',     flavor: 'Ring improvisado com cordas gastas e chão de madeira velha. Não é dos melhores, mas já treinou gente boa.' },
  heavy_bag:        { room:'training', flavor: 'Saco pesado cheio de areia. Batido por gerações, ainda aguenta muita porrada.' },
  mirror:           { room:'training', flavor: 'Parece simples, mas treinar na frente do espelho transforma a técnica. Não tem como mentir para si mesmo.' },
  jump_rope:        { room:'training', flavor: 'Cardio fundamental. Cada round de corda é um round a mais no tanque.' },
  locker:           { room:'comfort',  flavor: 'Armários simples, mas todo atleta precisa de um lugar para guardar o equipamento com segurança.' },
  first_aid:        { room:'medical',  flavor: 'Curativos, gelo e o básico para os primeiros socorros. Previne mais do que trata.' },
  radio:            { room:'comfort',  flavor: 'Um som ambiente levanta o ânimo do treino. Às vezes é o que faz a diferença em um dia pesado.' },
  timer:            { room:'training', flavor: 'Timer digital que marca os rounds com apito. A disciplina começa na contagem regressiva.' },
  mat:              { room:'training', flavor: 'Tatame para trabalho no chão e condicionamento. Amortece as quedas — e as dores.' },
  speed_bag:        { room:'training', flavor: 'Saco de velocidade para reflexo e coordenação. O ritmo fala por si. Tá, tá, tá, tá.' },
  watercooler:      { room:'comfort',  flavor: 'Hidratação é treino também. Sempre gelado, sempre disponível.' },
  basic_weights:    { room:'training', flavor: 'Set de halteres que já viram muito suor. Básico e funcional — força não precisa de luxo para crescer.' },
  glove_rack:       { room:'comfort',  flavor: 'Rack para organizar equipamentos. Ginásio arrumado é mente focada.' },
  sign:             { room:'prestige', flavor: 'Placa na frente da academia. Simples, direta. A primeira impressão do seu trabalho.' },
  camera_basic:     { room:'media',    flavor: 'Câmera de treino que grava rounds para análise. O vídeo não mente — e o erro não tem onde se esconder.' },

  // ── Nível 2 — Academia Local ─────────────────────────────────
  pro_ring:         { room:'ring',     flavor: 'Ring profissional com lonas novas e medidas regulamentares. Sparrings de qualidade exigem isso.' },
  weight_room:      { room:'training', flavor: 'Sala de musculação completa. Força é a base de tudo no boxe — aqui ela é levada a sério.' },
  showers:          { room:'comfort',  flavor: 'Vestiário com chuveiros quentes. O mínimo que um atleta merece depois de horas de suor.' },
  cardio_area:      { room:'training', flavor: 'Área dedicada ao cardio: esteiras, bicicletas e elípticos. Quem não tem gás não tem luta.' },
  mini_office:      { room:'admin',    flavor: 'Escritório pequeno, mas suficiente para contratos, planejamento e uma boa xícara de café.' },
  video_basic:      { room:'media',    flavor: 'Sala de vídeo básica para assistir adversários. Cada detalhe assistido aqui vale pontos lá dentro.' },
  clinic_basic:     { room:'medical',  flavor: 'Enfermaria equipada para atender lesões menores sem sair da academia. Tempo é carreira.' },
  stretch_area:     { room:'training', flavor: 'Área de alongamento e mobilidade. Previne lesões antes que apareçam — o atleta que não alonga paga o preço.' },
  nutrition_fridge: { room:'comfort',  flavor: 'Frigobar com suplementos e refeições pré-treino. Nutrição é metade da batalha dentro do ringue.' },
  lit_sign:         { room:'prestige', flavor: 'Placa iluminada que brilha à noite. A academia virou referência no bairro.' },
  parking:          { room:'comfort',  flavor: 'Estacionamento próprio. Detalhe pequeno que faz diferença para atletas que vêm de longe.' },
  second_ring:      { room:'ring',     flavor: 'Segundo ring permite dois grupos treinando ao mesmo tempo. A academia cresceu de verdade.' },
  meeting_room:     { room:'admin',    flavor: 'Sala de reunião para negociar contratos e receber patrocinadores. Aqui as lutas começam antes do ringue.' },
  ac:               { room:'comfort',  flavor: 'Ar condicionado para treinar no calor sem perder ritmo. O clima não vai mais ser desculpa.' },
  security:         { room:'admin',    flavor: 'Sistema de segurança com câmeras e alarme. Os equipamentos estão protegidos — e os atletas também.' },

  // ── Nível 3 — Centro de Treinamento ─────────────────────────
  olympic_ring:     { room:'ring',     flavor: 'Ring com especificações olímpicas. Qualidade que atletas internacionais reconhecem ao entrar.' },
  sauna:            { room:'medical',  flavor: 'Sauna finlandesa para recuperação muscular e corte de peso controlado. Purifica corpo e mente.' },
  pro_clinic:       { room:'medical',  flavor: 'Clínica esportiva com médico e fisioterapeuta residentes. Lesão tratada é carreira preservada.' },
  film_room:        { room:'media',    flavor: 'Film room com tela grande e software de análise tática. O adversário não tem mais segredos.' },
  dorms:            { room:'comfort',  flavor: 'Dormitórios para atletas de fora. Quem mora aqui vive o boxe 24 horas por dia.' },
  cafeteria:        { room:'comfort',  flavor: 'Cantina com nutrição supervisionada. A dieta começa na mesa, não no treino.' },
  pool:             { room:'training', flavor: 'Piscina para treino de resistência sem impacto. Recovery de elite para atletas de elite.' },
  sponsor_wall:     { room:'prestige', flavor: 'Parede de patrocinadores na entrada. Quem financia a academia merece visibilidade — e eles sabem disso.' },
  press_room:       { room:'media',    flavor: 'Sala de imprensa para coletivas e entrevistas. A academia virou pauta nos jornais esportivos.' },
  trophy_room:      { room:'prestige', flavor: 'Sala de troféus dedicada. Cada conquista dos atletas tem seu lugar aqui. Os prospectos entram e sonham.' },
  third_ring:       { room:'ring',     flavor: 'Três rings: uma academia de verdade. Grupos separados por nível, sem interrupção.' },
  physio_suite:     { room:'medical',  flavor: 'Suite de fisioterapia com equipamentos modernos. Recuperação que acelera o retorno ao treinamento.' },
  pro_weights:      { room:'training', flavor: 'Musculação profissional com plataformas e rack olímpico. Força de atleta de alto nível, tratada como tal.' },
  coaches_room:     { room:'admin',    flavor: 'Sala dos treinadores com mesa tática e biblioteca de vídeos. O melhor staff precisa do melhor espaço.' },
  brand_sign:       { room:'prestige', flavor: 'Fachada profissional com identidade visual. A academia virou uma marca reconhecida.' },

  // ── Nível 4 — Complexo Esportivo ─────────────────────────────
  arena_ring:       { room:'ring',     flavor: 'Ring de arena com iluminação profissional e câmeras embutidas. Você pode usar aqui para pequenos eventos.' },
  hypoxic_chamber:  { room:'training', flavor: 'Câmara hipóxica que simula altitude de 3.000 metros. Resistência que vai além do que o ar normal permite.' },
  recovery_suite:   { room:'medical',  flavor: 'Suite de recuperação completa com crioterapia, pressoterapia e imersão. Recuperação de campeão mundial.' },
  hot_cold_pool:    { room:'medical',  flavor: 'Contraste quente/frio: o protocolo de recuperação mais eficiente do esporte. Os atletas odeiam e amam ao mesmo tempo.' },
  broadcast_studio: { room:'media',    flavor: 'Estúdio de broadcast para transmissões ao vivo dos treinos. A academia é mídia. Prospectos assistem de casa.' },
  vip_lounge:       { room:'admin',    flavor: 'Lounge VIP para receber patrocinadores premium e figuras do mundo do boxe. Negócios fechados com whisky premium.' },
  hotel_wing:       { room:'comfort',  flavor: 'Ala hotel para atletas em preparação intensiva. Viver a luta, literalmente, 24 horas aqui.' },
  nutrition_lab:    { room:'training', flavor: 'Laboratório nutricional com análises personalizadas. Cada atleta tem seu plano — sem margem para erro.' },
  strength_lab:     { room:'training', flavor: 'Lab de força com sensores e análise biomecânica. Ciência aplicada ao boxe. Os números não mentem.' },
  combat_sim:       { room:'training', flavor: 'Simulador de combate com IA que imita estilos de adversários reais. O futuro do treinamento, agora.' },
  fan_shop:         { room:'prestige', flavor: 'Loja da academia com camisetas e equipamentos. Os fãs vestem a marca. A academia virou ídolo.' },
  conference_hall:  { room:'admin',    flavor: 'Salão de conferências para grandes anúncios de lutas e eventos. A mídia internacional cobre daqui.' },
  helipad:          { room:'prestige', flavor: 'Heliporto. Atletas internacionais chegam direto. O mundo inteiro presta atenção nessa academia.' },
  outdoor_ring:     { room:'ring',     flavor: 'Ring externo coberto para treinos ao ar livre. Quando o sol racha, o treinamento continua.' },
  elite_sign:       { room:'prestige', flavor: 'Letreiro de elite com iluminação LED personalizada. Você chegou lá. Todo mundo sabe.' },

  // ── Nível 5 — Academia de Elite ─────────────────────────────
  world_ring:       { room:'ring',     flavor: 'Ring com as mesmas especificações usadas em campeonatos mundiais. Treinar aqui é treinar para o topo.' },
  cryotherapy:      { room:'medical',  flavor: 'Crioterapia de corpo inteiro a −120°C. Recuperação que reduz a inflamação em horas, não dias.' },
  sports_science:   { room:'training', flavor: 'Departamento completo de ciência do esporte. Biomecânica, fisiologia, psicologia — tudo integrado.' },
  mental_perf:      { room:'medical',  flavor: 'Centro de performance mental com psicólogos esportivos. A cabeça também precisa de treino.' },
  media_center:     { room:'media',    flavor: 'Media center de nível mundial com estúdios de gravação e edição. A academia produz seu próprio conteúdo.' },
  world_class_gym:  { room:'training', flavor: 'Ginásio world-class onde os melhores do mundo pedem para treinar. Você que deixa — ou não.' },
  private_clinic:   { room:'medical',  flavor: 'Clínica privada exclusiva para os atletas da academia. Zero fila, zero espera, máximo cuidado.' },
  athlete_village:  { room:'comfort',  flavor: 'Vila dos atletas com casas, jardins e área de lazer. Uma comunidade construída em torno do boxe.' },
  global_scouts:    { room:'admin',    flavor: 'Rede global de scouts em todos os continentes. O próximo campeão pode estar em qualquer país.' },
  luxury_sponsor:   { room:'admin',    flavor: 'Espaço de patrocínio luxury com naming rights e exposição premium. As marcas disputam uma vaga aqui.' },
  hall_of_fame:     { room:'prestige', flavor: 'Hall da Fama da academia com busts, fotos e memorabilia. Os melhores da história estão aqui para sempre.' },
  boxing_school:    { room:'admin',    flavor: 'Escola de boxe com currículo estruturado e certificação. Forma técnicos e atletas com método.' },
  indoor_arena:     { room:'ring',     flavor: 'Arena indoor com 5.000 lugares para eventos próprios. A academia recebe lutas de nível mundial.' },
  documentary:      { room:'media',    flavor: 'Estúdio documentário que conta a história dos atletas da casa. Legados gravados para sempre.' },
  iconic_facade:    { room:'prestige', flavor: 'Fachada icônica reconhecida mundialmente. Um ponto turístico da cidade. Uma lenda de tijolo e concreto.' },

  // ── Nível 6 — Lenda do Boxe ──────────────────────────────────
  olympic_facility: { room:'training', flavor: 'Instalação com padrão olímpico oficial. Governos pedem para usar no período pré-Olimpíadas.' },
  world_arena:      { room:'ring',     flavor: 'Arena mundial com 20.000 lugares. As maiores lutas do planeta acontecem aqui.' },
  bio_lab:          { room:'medical',  flavor: 'Laboratório bio-médico de pesquisa avançada. Publica estudos científicos. O esporte aprende aqui.' },
  ai_training:      { room:'training', flavor: 'Sistema de treino com inteligência artificial que aprende e se adapta a cada atleta. Décadas à frente.' },
  titan_ring:       { room:'ring',     flavor: 'Ring dos Titãs — o lugar onde campeões mundiais escolhem treinar quando estão na cidade.' },
  world_media:      { room:'media',    flavor: 'Hub de mídia mundial que transmite para 180 países. A academia é a produtora dos maiores eventos.' },
  museum:           { room:'prestige', flavor: 'Museu do Boxe com acervo histórico e interativo. Turistas do mundo inteiro visitam. Uma instituição.' },
  charity_wing:     { room:'comfort',  flavor: 'Ala de caridade para jovens de comunidades carentes. O boxe como ferramenta de transformação social.' },
  legend_hotel:     { room:'comfort',  flavor: 'Hotel Lenda com 100 suítes. Visitantes de todas as partes do mundo ficam aqui para eventos.' },
  global_broadcast: { room:'media',    flavor: 'Rede de broadcast global com parceiros em todos os continentes. Cada luta aqui é evento mundial.' },
  goat_clinic:      { room:'medical',  flavor: 'Instituto Médico GOAT com a mais avançada pesquisa em medicina esportiva do mundo.' },
  infinity_pool:    { room:'comfort',  flavor: 'Piscina infinita com vista panorâmica. Recovery com vista para a cidade. Merecido.' },
  power_plant:      { room:'admin',    flavor: 'Planta de energia própria com painéis solares e baterias. A academia é autossuficiente.' },
  monument:         { room:'prestige', flavor: 'Monumento da academia na praça de entrada. Estátuas, história e um legado de gerações.' },
  legend_sign:      { room:'prestige', flavor: 'Fachada lendária visível de quilômetros de distância. Uma estrela no mapa do boxe mundial.' },
};

// Room layout for interior top-down view
const INTERIOR_ROOMS = [
  { id: 'ring',     label: 'Ringues',       icon: '🟥', color: '#1a0a0a', border: '#8b0000', cols: 3 },
  { id: 'training', label: 'Área de Treino',icon: '💪', color: '#0a1008', border: '#2d6a1e', cols: 4 },
  { id: 'medical',  label: 'Medicina',      icon: '⚕️',  color: '#080c18', border: '#1a3a6a', cols: 3 },
  { id: 'media',    label: 'Mídia & Vídeo', icon: '📺', color: '#100818', border: '#5a1a7a', cols: 3 },
  { id: 'prestige', label: 'Troféus & Fama',icon: '🏆', color: '#100c00', border: '#7a5a00', cols: 3 },
  { id: 'admin',    label: 'Administração', icon: '📊', color: '#0a0c10', border: '#2a3a5a', cols: 3 },
  { id: 'comfort',  label: 'Vestiário & Conforto', icon: '🚿', color: '#0a0a10', border: '#3a3a5a', cols: 4 },
];

// Academy sponsor catalog
// tier: 1=local, 2=regional, 3=nacional, 4=premium
// category: equipment, nutrition, apparel, media, betting, finance
const ACADEMY_SPONSORS = [
  // Tier 1 — locais, requisitos mínimos
  { id: 'sp_gym_supply',   name: 'GymSupply BR',      category: 'equipment', tier: 1, icon: '🥊', weeklyPay: 400,  duration: 12, minRep: 5,  minWins: 0,  obligation: 'Usar equipamentos da marca nos treinos.' },
  { id: 'sp_nutri_basic',  name: 'NutriForce',         category: 'nutrition', tier: 1, icon: '🥗', weeklyPay: 300,  duration: 8,  minRep: 0,  minWins: 0,  obligation: 'Mencionar o produto em 2 posts por mês.' },
  { id: 'sp_local_news',   name: 'Portal Esporte Local', category: 'media',  tier: 1, icon: '📰', weeklyPay: 250,  duration: 10, minRep: 8,  minWins: 2,  obligation: 'Conceder 1 entrevista por mês.' },
  { id: 'sp_sports_wear',  name: 'TKO Apparel',        category: 'apparel',  tier: 1, icon: '👕', weeklyPay: 350,  duration: 16, minRep: 5,  minWins: 0,  obligation: 'Atletas usam shorts da marca nas lutas.' },
  { id: 'sp_health_clinic', name: 'Clínica Vitallis',   category: 'nutrition', tier: 1, icon: '💊', weeklyPay: 280,  duration: 12, minRep: 10, minWins: 3,  obligation: 'Check-up mensal dos atletas na clínica.' },

  // Tier 2 — regionais
  { id: 'sp_protex',       name: 'Protex Sports',      category: 'equipment', tier: 2, icon: '🛡️', weeklyPay: 900,  duration: 20, minRep: 20, minWins: 5,  obligation: 'Logo nos equipamentos de todos atletas.' },
  { id: 'sp_prime_nutrition', name: 'Prime Nutrition',  category: 'nutrition', tier: 2, icon: '💪', weeklyPay: 1100, duration: 16, minRep: 25, minWins: 8,  obligation: 'Atletas usam suplemento exclusivo da marca.' },
  { id: 'sp_regional_tv',  name: 'TV Esporte Regional', category: 'media',    tier: 2, icon: '📺', weeklyPay: 1400, duration: 12, minRep: 30, minWins: 10, obligation: 'Participar de 1 programa por bimestre.' },
  { id: 'sp_bet_regional', name: 'BetBox',              category: 'betting',  tier: 2, icon: '🎲', weeklyPay: 1200, duration: 8,  minRep: 20, minWins: 6,  obligation: 'Logo em shorts e redes sociais.' },
  { id: 'sp_ringwear',     name: 'RingWear Pro',        category: 'apparel',  tier: 2, icon: '🧢', weeklyPay: 800,  duration: 24, minRep: 22, minWins: 7,  obligation: 'Uniforme exclusivo nos eventos regionais.' },

  // Tier 3 — nacionais
  { id: 'sp_powergloves',  name: 'PowerGloves',         category: 'equipment', tier: 3, icon: '🥋', weeklyPay: 2500, duration: 26, minRep: 45, minWins: 15, obligation: 'Usar apenas luvas da marca em lutas nacionais.' },
  { id: 'sp_hyper_nutr',   name: 'HyperNutrition',      category: 'nutrition', tier: 3, icon: '⚗️', weeklyPay: 3000, duration: 20, minRep: 50, minWins: 18, obligation: 'Divulgar resultados de performance dos atletas.' },
  { id: 'sp_nacional_tv',  name: 'Rede Esporte Nacional', category: 'media',  tier: 3, icon: '🎙️', weeklyPay: 4000, duration: 16, minRep: 55, minWins: 20, obligation: 'Documentário semestral sobre a academia.' },
  { id: 'sp_knockout_bet', name: 'KnockoutBet',          category: 'betting',  tier: 3, icon: '🎰', weeklyPay: 3500, duration: 12, minRep: 45, minWins: 15, obligation: 'Endosso em campanhas digitais.' },
  { id: 'sp_champion_wear', name: 'Champion Wear',        category: 'apparel',  tier: 3, icon: '🏅', weeklyPay: 2200, duration: 30, minRep: 48, minWins: 16, obligation: 'Coleção exclusiva com nome da academia.' },

  // Tier 4 — premium/global
  { id: 'sp_apex_gear',    name: 'APEX Combat Gear',    category: 'equipment', tier: 4, icon: '⚡', weeklyPay: 7000, duration: 52, minRep: 75, minWins: 30, obligation: 'Parceria exclusiva de equipamentos. Nenhum concorrente.' },
  { id: 'sp_global_nutr',  name: 'GlobalNutrition Pro', category: 'nutrition', tier: 4, icon: '🌍', weeklyPay: 8500, duration: 40, minRep: 80, minWins: 35, obligation: 'Embaixadores globais. 2 atletas com cinturão mínimo.' },
  { id: 'sp_espn_deal',    name: 'ESPN Latam',           category: 'media',    tier: 4, icon: '📡', weeklyPay: 12000,duration: 52, minRep: 85, minWins: 40, obligation: 'Transmissão exclusiva de lutas nacionais.' },
  { id: 'sp_luxury_brand', name: 'Élite Sports Group',  category: 'finance',  tier: 4, icon: '💎', weeklyPay: 15000,duration: 26, minRep: 90, minWins: 45, obligation: 'Eventos exclusivos com executivos da marca.' },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Lendas históricas do boxe — exibidas no Hall da Fama
const BOXING_LEGENDS = [
  {
    id: 'legend_iron_marcus', name: 'Marcus "Iron" Rocha',
    nationality: 'BR', flag: '🇧🇷', era: '1975–1992',
    record: '49–1–0', wins: 49, losses: 1, draws: 0, kos: 43,
    koPct: 87, titleDefs: 25, divisions: 1, unifications: 3,
    weightClass: 'heavyweight',
    belts: ['IBF', 'WBC', 'WBA', 'WBO'],
    style: 'slugger',
    bio: 'Nocauteador implacável que foi campeão indiscutível dos pesados por sete anos. Suas 43 vitórias por nocaute ainda são o maior percentual da história.',
    goatScore: 2180,
    highlights: ['25 defesas consecutivas do cinturão IBF', 'Campeão Indiscutível dos Pesados (1981–1988)', 'Somente uma derrota em 50 lutas profissionais'],
  },
  {
    id: 'legend_veloz', name: 'Esteban "El Veloz" Vargas',
    nationality: 'MX', flag: '🇲🇽', era: '1983–2001',
    record: '61–3–1', wins: 61, losses: 3, draws: 1, kos: 38,
    koPct: 62, titleDefs: 18, divisions: 3, unifications: 2,
    weightClass: 'super_featherweight',
    belts: ['WBC', 'WBA'],
    style: 'outboxer',
    bio: 'Um dos maiores pesos-leves da história. Campeão em três divisões com um estilo técnico revolucionário que influenciou gerações de boxeadores mexicanos.',
    goatScore: 1950,
    highlights: ['Campeão Mundial em 3 divisões diferentes', '18 defesas de título entre 1987 e 1996', 'Técnica considerada perfeita pela crítica especializada'],
  },
  {
    id: 'legend_shadowhand', name: 'Kofi "Shadow Hand" Mensah',
    nationality: 'GH', flag: '🇬🇭', era: '1990–2007',
    record: '52–4–2', wins: 52, losses: 4, draws: 2, kos: 29,
    koPct: 55, titleDefs: 14, divisions: 2, unifications: 2,
    weightClass: 'welterweight',
    belts: ['IBF', 'WBO'],
    style: 'technical',
    bio: 'Boxeador mais técnico de sua geração. Sua defesa e leitura de luta eram consideradas sobrenaturais. Dois títulos mundiais e uma carreira de 17 anos de alto nível.',
    goatScore: 1740,
    highlights: ['Carreira de 17 anos sem nunca ser nocauteado', 'Vencedor do Prêmio de Lutador do Ano 4 vezes', 'Dois reinados como campeão unificado dos meio-médios'],
  },
  {
    id: 'legend_manila_storm', name: 'Eduardo "Manila Storm" Santos',
    nationality: 'PH', flag: '🇵🇭', era: '1988–2005',
    record: '58–7–2', wins: 58, losses: 7, draws: 2, kos: 40,
    koPct: 69, titleDefs: 11, divisions: 4, unifications: 1,
    weightClass: 'super_bantamweight',
    belts: ['WBC', 'WBA', 'IBF', 'WBO'],
    style: 'pressure',
    bio: 'O maior boxeador filipino de todos os tempos. Campeão mundial em 4 divisões, de mosca a super-pena, com uma pressão e volume de socos inigualáveis.',
    goatScore: 1890,
    highlights: ['Campeão mundial em 4 divisões', 'Recorde de mais de 1.000 socos disparados em uma única luta', '17 anos de carreira profissional em alto nível'],
  },
  {
    id: 'legend_tundra', name: 'Sergei "Tundra" Volkov',
    nationality: 'RU', flag: '🇷🇺', era: '1995–2012',
    record: '47–2–1', wins: 47, losses: 2, draws: 1, kos: 35,
    koPct: 74, titleDefs: 16, divisions: 1, unifications: 3,
    weightClass: 'light_heavyweight',
    belts: ['IBF', 'WBC', 'WBA', 'WBO'],
    style: 'counterpuncher',
    bio: 'Campeão indiscutível dos meio-pesados que dominou a divisão por quase uma década. Nocauteador preciso com reflexos sobre-humanos.',
    goatScore: 1820,
    highlights: ['Campeão Indiscutível dos Meio-Pesados (2002–2009)', '16 defesas de título com 11 por nocaute', 'Invicto por 12 anos antes da primeira derrota'],
  },
  {
    id: 'legend_southpaw_queen', name: 'Amara "Southpaw Queen" Diallo',
    nationality: 'NG', flag: '🇳🇬', era: '2000–2016',
    record: '43–2–0', wins: 43, losses: 2, draws: 0, kos: 28,
    koPct: 65, titleDefs: 13, divisions: 2, unifications: 2,
    weightClass: 'middleweight',
    belts: ['IBF', 'WBO'],
    style: 'outboxer',
    bio: 'Considerada a lutadora mais completa da história. Visionária do boxe sul-coreano, duas vezes campeã unificada dos médios.',
    goatScore: 1620,
    highlights: ['13 defesas de título mundial', 'Dois reinados como campeã unificada', 'Primeira campeã mundial africana dos médios'],
  },
];

const FIGHT_METHOD_GROUPS = {
  knockout: ['KO'],
  stoppage: ['TKO', 'Interrupção Médica', 'Abandono (RTD)'],
  decision: ['Decisão Unânime', 'Decisão Majoritária', 'Decisão Dividida', 'Decisão Técnica'],
  draw: ['Empate', 'Empate Técnico'],
  noContest: ['No Contest'],
  disqualification: ['Desqualificação (DQ)'],
};

function fightMethodIn(group, method) {
  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const target = normalize(method);
  return (FIGHT_METHOD_GROUPS[group] || []).some(item => normalize(item) === target);
}

function isKnockoutResult(method) {
  return fightMethodIn('knockout', method) || fightMethodIn('stoppage', method);
}

function isDecisionResult(method) {
  return fightMethodIn('decision', method);
}

function formatCurrency(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

function romanRound(n) {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return r[n - 1] || n;
}

let _idCounter = 1;
function generateId() { return _idCounter++; }

function ensureIdCounterAbove(ids = []) {
  const maxId = ids.reduce((max, id) => {
    const numericId = Number(id);
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);
  _idCounter = Math.max(_idCounter, maxId + 1);
}

const HOF_BIO_PARTS = {
  origins: {
    americas: [
      "{name} nasceu em {country} e desde cedo soube que o boxe seria seu caminho. Chegou ao topo carregando a bandeira da América com orgulho.",
      "Vindo das ruas de {country}, {name} transformou dificuldade em determinação e determinação em ouro.",
      "O boxe de {country} ganhou uma lenda quando {name} cruzou as cordas pela primeira vez. O mundo ainda não sabia o que estava prestes a ver.",
      "De {country} para o mundo: {name} percorreu um caminho longo e glorioso até chegar ao topo da hierarquia mundial do boxe.",
      "Filho das academias de {country}, {name} foi moldado por treinadores duros e adversários ainda mais duros antes de brilhar no cenário global.",
      "{name} cresceu em {country} sonhando com cinturões. Décadas depois, esses sonhos viraram realidade — várias vezes.",
      "A trajetória de {name} começou nos ringues modestos de {country} e terminou nos palcos mais grandiosos do boxe mundial.",
      "Poucos saíram de {country} para dominar o boxe mundial como {name}. Uma história de sacrifício, talento e vontade inabalável.",
      "Em {country}, nomes como {name} não se esquecem. No mundo do boxe, menos ainda.",
      "O legado de {name} começa em {country}, mas pertence ao mundo inteiro.",
      "{name} é a prova viva de que {country} produz campeões da melhor estirpe.",
      "Das academias de bairro de {country} até os maiores ginásios do mundo, {name} nunca perdeu de vista o objetivo.",
    ],
    europa: [
      "Forjado nas academias europeias, {name} trouxe a disciplina e a técnica de {country} para os ringues de todo o mundo.",
      "{name} representou {country} com a excelência que a Europa sempre esperou de seus campeões.",
      "A tradição boxística de {country} encontrou em {name} seu maior representante da era moderna.",
      "O boxe europeu ganhou um ícone quando {name} emergiu de {country} e começou a derrubar adversários em série.",
      "Criado na escola dura do boxe europeu, {name} de {country} construiu uma carreira que deixou o continente de pé.",
      "{name} chegou de {country} carregando a frieza e a técnica que são marcas registradas do boxe europeu.",
      "Poucos lutadores de {country} alcançaram o que {name} alcançou. Uma carreira que será estudada por gerações.",
      "A Europa do boxe tem seus heróis. {name}, de {country}, está entre os maiores de todos.",
      "Com a precisão característica do boxe de {country}, {name} desmontou adversários ao longo de uma carreira memorável.",
      "De {country} para a eternidade: {name} escreveu seu nome nos anais do boxe com cada luta.",
      "{name} mostrou ao mundo o que {country} é capaz de produzir quando o talento encontra a dedicação.",
      "A carreira de {name} em {country} começou em silêncio — e terminou com o mundo inteiro prestando atenção.",
    ],
    asia: [
      "O boxe asiático encontrou em {name}, de {country}, um embaixador à altura de sua riqueza técnica.",
      "De {country} para os ringues do mundo: {name} mostrou que a Ásia produz alguns dos melhores boxeadores do planeta.",
      "{name} carregou a honra de {country} em cada luta, representando uma tradição milenar de disciplina e arte marcial.",
      "As academias de {country} são conhecidas por produzir guerreiros. {name} foi a prova mais acabada disso.",
      "Com a agilidade e a determinação que caracterizam os lutadores de {country}, {name} dominou a cena mundial.",
      "{name} nasceu em {country} e aprendeu que boxe é mais do que força — é inteligência, velocidade e coração.",
      "A Ásia sempre produziu campeões silenciosos. {name}, de {country}, foi um deles — até que o mundo não pôde mais ignorá-lo.",
      "De ringues modestos em {country} até os palcos mundiais, a jornada de {name} é uma inspiração para toda uma geração.",
      "O espírito guerreiro de {country} vive em cada punch de {name}. Uma carreira que honrou toda uma nação.",
      "{name} provou que {country} está entre as maiores potências do boxe mundial. Seus números falam por si.",
      "Poucas histórias no boxe asiático são tão completas quanto a de {name}. Uma vida dedicada às cordas.",
    ],
    africa: [
      "Nascido em {country}, {name} transformou potência bruta em arte refinada e conquistou o mundo do boxe.",
      "O continente africano produziu alguns dos maiores nocauteadores da história. {name}, de {country}, é um deles.",
      "{name} emergiu de {country} como uma força da natureza. Ningém no mundo estava pronto para o que ele trazia.",
      "A garra e o poder que {country} coloca em seus lutadores encontraram em {name} sua expressão máxima.",
      "De {country} para o topo do mundo: {name} provou que a África não só compete — domina.",
      "{name} carregou {country} nos ombros cada vez que subiu no ringue. E raramente decepcionou.",
      "O boxe africano tem suas lendas. {name}, de {country}, garantiu seu lugar entre elas com sangue e suor.",
      "Com a resistência e a intensidade que {country} cultiva em seus atletas, {name} desgastou e nocauteou adversários por anos.",
      "{name} é o tipo de lutador que {country} produz de tempos em tempos — aqueles que mudam a conversa do boxe mundial.",
      "Poucos fizeram o que {name} fez saindo de {country}. Uma história de superação que vai além do esporte.",
    ],
    oceania: [
      "Das terras da Oceania, {name} de {country} chegou ao boxe mundial com a ferocidade que essa parte do mundo é conhecida por produzir.",
      "{name} representou {country} com a dureza e a honestidade que os lutadores da Oceania sempre trouxeram ao esporte.",
      "Em {country}, falam de {name} como o melhor que já saiu dessas terras para o boxe mundial. Difícil contestar.",
      "A Oceania não é terra de lutadores fáceis. {name}, de {country}, foi a prova mais recente disso.",
      "{name} cruzou o oceano com {wins} vitórias no cartel e uma reputação que nenhum adversário queria enfrentar.",
      "De {country} para o ringue mundial: {name} mostrou que o boxe da Oceania está em constante evolução.",
    ],
  },

  style: {
    pressure: [
      "Seu estilo de pressão incessante tirava o sono dos adversários antes mesmo de a luta começar.",
      "Avançava sem parar, encurralava e destruía — o estilo de {name} não deixava respiro nem espaço.",
      "Fighters de pressão como {name} são raros: a combinação de motor de alto rendimento com poder real era devastadora.",
      "Cada luta de {name} era uma guerra de atrito. E no atrito, ele era imbatível.",
      "{name} pressionava do primeiro ao último round sem nunca parecer cansado. Os adversários não podiam dizer o mesmo.",
      "Seu jogo de pressão era metódico e sufocante. Não havia onde escapar.",
      "A pressão constante de {name} quebrava fisicamente e mentalmente os adversários que tentavam sobreviver os 12 rounds.",
    ],
    boxer: [
      "Sua movimentação elegante e jab preciso transformavam cada luta em uma aula de boxe.",
      "{name} boxeava com uma fluidez que poucos conseguiram imitar e ninguém conseguiu superar.",
      "Técnica pura: {name} fazia parecer fácil o que é quase impossível — controlar um ringue por 12 rounds sem se machucar.",
      "O boxe de {name} era uma obra de arte. Distância, ângulos, timing — tudo no lugar certo na hora certa.",
      "Adversários que esperavam uma guerra encontravam uma aula de geometria. {name} usava cada centímetro do ringue.",
      "Seu jab era uma arma, sua defesa era um escudo e sua inteligência era a diferença entre vencer e dominar.",
      "Poucos boxeadores conseguiram fazer o que {name} fazia: controlar completamente o ritmo e o espaço da luta.",
    ],
    slugger: [
      "Um soco de {name} era suficiente para encerrar a noite de qualquer adversário. Ele sabia disso — e eles também.",
      "O poder nas mãos de {name} era uma ameaça constante. Nenhum adversário podia relaxar por um segundo sequer.",
      "{name} não precisava de 12 rounds para provar seu ponto. Muitas vezes, bastavam 3.",
      "A KO percentage de {name} conta a história melhor do que qualquer análise técnica poderia.",
      "Quando {name} conectava o golpe certo, as lutas terminavam. Simples assim.",
      "Poucos nocauteadores da história eram tão perigosos quanto {name}. O poder estava em ambas as mãos.",
      "Seu poder de nocaute era fenomenal. {name} transformou o ringue em seu território de caça por anos a fio.",
    ],
    boxer_puncher: [
      "A combinação perfeita de técnica e poder fez de {name} um dos oponentes mais difíceis de preparar.",
      "{name} tinha a habilidade para boxear e o poder para nocautear — uma combinação que poucos conseguem contrariar.",
      "Podia vencer por pontos ou por nocaute. Essa versatilidade fazia de {name} um pesadelo para qualquer estilo.",
      "Técnica suficiente para controlar a distância, poder suficiente para fechar a luta a qualquer momento.",
      "{name} escolhia a abordagem certa para cada adversário. E na maioria das vezes, a abordagem certa era ambas.",
      "A versatilidade de {name} era seu maior diferencial. Tanto fazia se o adversário queria guerrear ou boxear.",
    ],
    counterpuncher: [
      "{name} tinha a paciência de uma esfinge e o timing de um relojoeiro suíço. Os adversários pagavam caro por cada erro.",
      "Cada soco que o adversário lançava era uma oportunidade para {name}. Ele raramente desperdiçava essas oportunidades.",
      "O contra-ataque de {name} era uma armadilha. Os adversários sabiam disso e ainda assim caíam nela.",
      "Deixava os adversários se esgotarem e então cobrava o preço. {name} tornou a reatividade em arte.",
      "Boxeadores ativos enfrentavam {name} e descobriam que cada ataque era mais perigoso do que a inação.",
      "Seu timing para o contra-ataque era sobrenatural. {name} fazia parecer fácil o que levou anos para aperfeiçoar.",
    ],
    brawler: [
      "{name} nunca deu um passo para trás em toda a sua carreira. Essa mentalidade o levou ao topo.",
      "Cada luta de {name} era uma batalha épica. Ele não conhecia outro jeito de lutar.",
      "A guerra era o idioma de {name}. E nesse idioma, ele era fluente como poucos.",
      "Adversários que tentaram intimidar {name} saíam da luta mais respeitosos — quando saíam por conta própria.",
      "O coração de {name} dentro do ringue era tão grande quanto seu poder. Nunca se rendeu, nunca recuou.",
      "Brigar era o que {name} fazia melhor. E fazia muito bem por muito tempo.",
    ],
  },

  peak: {
    undisputed: [
      "Conquistou os quatro cinturões mundiais e se tornou Campeão Indiscutível — o título mais raro e mais respeitado do boxe.",
      "Quando {name} unificou os quatro cinturões, a divisão teve que reconhecer: havia um rei, e ele usava todas as coroas.",
      "Ser Campeão Indiscutível é o sonho de todo pugilista. {name} viveu esse sonho com {wins} vitórias no cartel.",
      "WBC, WBA, IBF, WBO — {name} os conquistou todos. Um feito que coloca seu nome entre os maiores da história.",
      "Com {titleDefs} defesas de título e quatro cinturões, {name} dominou a divisão de uma forma que poucas gerações testemunham.",
    ],
    unified: [
      "Unificou múltiplos cinturões mundiais e reinou como o melhor da sua divisão por anos consecutivos.",
      "Com múltiplos cinturões mundiais no seu currículo, {name} provou ser o lutador mais completo de sua geração.",
      "{name} unificou o boxe na sua divisão. Os outros cinturões que não detinha eram apenas questão de tempo.",
      "Dois, três cinturões mundiais — {name} colecionava títulos com a mesma naturalidade com que outros colecionam vitórias.",
      "Campeão unificado, {name} comandou a divisão e forçou todo candidato a passar por ele antes de sonhar com ouro.",
    ],
    multiDiv: [
      "Conquistou títulos mundiais em {divisions} categorias de peso diferentes — um feito que poucos atletas conseguem imaginar.",
      "Subiu e desceu de divisão com a elegância de quem sabe que o ringue é sua casa, independente do peso.",
      "{name} provou que o talento não cabe numa única divisão: dominou {divisions} categorias com a mesma maestria.",
      "Campeão em múltiplas divisões, {name} entrou para um seleto grupo de lutadores que transcendem os limites do peso.",
      "De uma divisão para outra, {name} levou suas habilidades e trouxe de volta cinturões. {divisions} vezes.",
    ],
    superBelt: [
      "Defendeu seu cinturão {titleDefs} vezes — um testemunho da supremacia absoluta que {name} exercia na divisão.",
      "Com {titleDefs} defesas consecutivas, {name} transformou o reinado em dinastia.",
      "Ninguém queria enfrentar {name} em seu auge. Os {titleDefs} desafiantes que tentaram podem confirmar.",
      "Um reinado de {titleDefs} defesas que colocou {name} entre os campeões mais dominantes da história do boxe.",
      "O Super Cinturão foi conquistado com sangue e determinação. {titleDefs} lutadores tentaram tirar — e falharam.",
    ],
    ko_artist: [
      "Com {koPct}% de nocautes na carreira, {name} deixou claro que suas lutas raramente iam para os juízes.",
      "{kos} nocautes em {wins} vitórias. Os números de {name} falam mais alto do que qualquer análise.",
      "Poucos nocauteadores tiveram o impacto que {name} teve. {koPct}% de KO rate é território de lenda.",
      "Os adversários que sobreviveram a {name} por 12 rounds podem se considerar afortunados. A maioria não conseguiu.",
      "Sua porcentagem de nocaute colocou {name} entre os finalizadores mais eficientes da história recente do boxe.",
    ],
    longevity: [
      "Mais de uma década no topo do boxe mundial. {name} não só chegou lá — ficou por muito tempo.",
      "Uma carreira que atravessou gerações de lutadores. {name} viu rivais entrarem e saírem enquanto ele permanecia.",
      "A longevidade de {name} é tão impressionante quanto seus títulos. Competitivo do início ao fim.",
      "Quando {name} finalmente se aposentou, o boxe perdeu um dos últimos elos com uma era dourada.",
      "{wins} vitórias acumuladas ao longo de anos de dedicação. {name} provou que longevidade e excelência podem coexistir.",
    ],
    champion: [
      "Chegou ao topo do mundo e provou que todos que duvidaram estavam errados.",
      "Campeão mundial e orgulho de {country} — a carreira de {name} é uma celebração do que o boxe tem de melhor.",
      "Com {wins} vitórias e um título mundial no currículo, {name} deixou sua marca permanente no esporte.",
      "Sonhou, treinou, lutou e conquistou. A história de {name} é simples assim — e extraordinária assim.",
      "Tornar-se campeão mundial não é para qualquer um. {name} sabia disso melhor do que ninguém.",
    ],
  },

  legacy: [
    "Seu nome ficará para sempre associado à grandeza dentro do ringue.",
    "Uma geração inteira de lutadores cresceu querendo ser {name}.",
    "O Hall da Fama recebe poucos com um legado tão completo quanto o de {name}.",
    "Quando as histórias do boxe desta era forem contadas, o nome de {name} estará entre os primeiros.",
    "Sua influência vai além dos cinturões e das vitórias — {name} mudou a forma como o boxe é visto em {country}.",
    "Rivais o respeitavam, fãs o adoravam, treinadores o estudavam. Isso é legado.",
    "Décadas depois, os números de {name} ainda impressionam. Isso é eternidade.",
    "Lutou com elegância ou com brutalidade — sempre com excelência. O boxe é mais rico por ter tido {name}.",
    "Cada geração tem seus escolhidos. {name} foi o escolhido da sua.",
    "Os que tiveram a chance de vê-lo lutar ao vivo guardam essas memórias para sempre.",
    "No final, o que fica não é o cinturão — é a história. E a história de {name} é das maiores.",
    "Aposentou-se com o respeito de toda a comunidade do boxe. Poucos conquistam isso.",
    "Seu cartel de {wins}-{losses}-{draws} com {kos} nocautes conta apenas parte da história. O resto está na memória de quem acompanhou.",
    "O ringue perdeu um gigante quando {name} pendurou as luvas. O esporte ganhou uma lenda.",
    "Não existe uma medida única para o legado de {name}. Ele foi simplesmente imenso.",
  ],
};
