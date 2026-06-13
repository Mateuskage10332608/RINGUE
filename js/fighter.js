// ============================================================
//  fighter.js  –  Modelo do Lutador
// ============================================================

class Fighter {
  constructor(opts = {}) {
    this.id          = opts.id          ?? generateId();
    this.name        = opts.name        || 'Desconhecido';
    this.nickname    = opts.nickname    || '';
    this.nicknameLocked = opts.nicknameLocked || false; // apelido escolhido pelo jogador
    this.age         = opts.age         || rand(20, 32);
    this.nationality = opts.nationality || 'BR';
    this.gym         = opts.gym         || null;
    this.weightClass = opts.weightClass || 'welter';
    this.styleId     = opts.styleId     || 'pressure';
    this.personalityId = opts.personalityId || 'disciplined';
    this.isPlayer    = opts.isPlayer    || false;

    // Record
    this.wins   = opts.wins   || 0;
    this.losses = opts.losses || 0;
    this.draws  = opts.draws  || 0;
    this.noContests = opts.noContests || 0;
    this.kos    = opts.kos    || 0;
    this.tkos   = opts.tkos   || 0;
    this.fightHistory = opts.fightHistory || [];

    // Rankings & status
    this.ranking      = opts.ranking      || null;  // null = unranked
    const savedBelts = opts.belts || [];
    const legacyTerritorialTitles = [...new Set([
      ...savedBelts,
      ...(opts.titlesWon || []),
    ].filter(b => /^(local|regional|national):/.test(b)))];
    const existingTrophyKeys = new Set((opts.trophies || []).map(t =>
      `${t.tier}:${t.scope}:${t.weightClass || opts.weightClass || 'welter'}`
    ));
    const legacyTrophies = legacyTerritorialTitles
      .map(b => {
        const [tier, scope] = b.split(':');
        return {
          tier,
          scope,
          name: getBeltDisplayName(b, { weightClass: opts.weightClass || 'welter' }),
          year: opts.retiredAt || null,
          weightClass: opts.weightClass || 'welter',
          migrated: true,
        };
      })
      .filter(t => !existingTrophyKeys.has(`${t.tier}:${t.scope}:${t.weightClass}`));
    this.belts        = savedBelts.filter(b => !/^(local|regional|national):/.test(b));
    this.trophies     = [...(opts.trophies || []), ...legacyTrophies];
    this.popularity   = opts.popularity   || rand(10, 40);
    this.reputation   = opts.reputation   || rand(20, 50);
    this.fanReach = opts.fanReach || {
      local: clamp(Math.round(this.popularity * 1.25), 0, 100),
      national: clamp(Math.round(this.popularity * 0.70), 0, 100),
      international: clamp(Math.round(this.popularity * 0.25), 0, 100),
    };

    // Financials
    this.money        = opts.money        || (this.isPlayer ? 5000 : rand(1000, 30000));
    this.contract     = opts.contract     || null;

    // State
    this.morale       = opts.morale       || 75;
    this.fatigue      = opts.fatigue      || 0;   // 0-100, higher = worse
    this.isInjured    = opts.isInjured    || false;
    this.injuryWeeks  = opts.injuryWeeks  || 0;
    this.retiredAt    = opts.retiredAt    || null;
    this.retirementReason = opts.retirementReason || null;
    this.weeksSinceTraining = opts.weeksSinceTraining || 0;
    this.careerWear   = opts.careerWear   || 0;
    this.inactivityLosses = opts.inactivityLosses || {};
    this.weightClassHistory = opts.weightClassHistory || [{
      weightClass: this.weightClass,
      year: 2024,
      direction: 'start',
    }];
    this.weightTransition = opts.weightTransition || null;
    this.lastWeightChangeAt = opts.lastWeightChangeAt ?? null;
    this.divisionRankingPenalty = opts.divisionRankingPenalty || 0;

    // Legacy tracking
    this.beltDefenses    = opts.beltDefenses    || {};  // { 'WBC': 3 }
    // Super-cinturões pertencem à combinação organização + categoria.
    // Saves antigos guardavam apenas "WBC"; a migração os associa à divisão
    // registrada no histórico (ou à divisão atual como último recurso).
    this.superBelts = (opts.superBelts || []).map(entry => {
      if (entry && typeof entry === 'object') {
        return {
          belt: entry.belt,
          weightClass: entry.weightClass || this.weightClass,
          year: entry.year || opts.retiredAt || 2024,
          defenses: entry.defenses || 10,
        };
      }
      const historical = (opts.superBeltHistory || []).find(item => item.belt === entry);
      return {
        belt: entry,
        weightClass: historical?.weightClass || this.weightClass,
        year: historical?.year || opts.retiredAt || 2024,
        defenses: historical?.defenses || (opts.beltDefenses || {})[entry] || 10,
      };
    }).filter(entry => entry.belt && WORLD_ORGS.includes(entry.belt));
    this.totalTitleWins  = opts.totalTitleWins  || 0;
    this.unificationWins = opts.unificationWins || 0;
    this.worldTitleHistory = opts.worldTitleHistory || [...new Set([
      ...(opts.titlesWon || []),
      ...this.belts,
    ].filter(b => WORLD_ORGS.includes(b)))].map(belt => ({
      belt,
      weightClass: this.weightClass,
      year: opts.retiredAt || 2024,
      migrated: true,
    }));
    this.titleReigns = opts.titleReigns || this.worldTitleHistory.map(entry => ({
      belt: entry.belt,
      weightClass: entry.weightClass || this.weightClass,
      startYear: entry.year || 2024,
      startWeek: entry.week || 1,
      endYear: null,
      endWeek: null,
      defenses: (opts.beltDefenses || {})[entry.belt] || 0,
      migrated: true,
    }));
    this.divisionDefenses = opts.divisionDefenses || {};
    this.superBeltHistory = opts.superBeltHistory || [];
    this.eventHistory = opts.eventHistory || [];
    this.careerAwards = opts.careerAwards || [];
    this.eventRecords = opts.eventRecords || {
      maxAttendance: 0,
      maxGate: 0,
      sellouts: 0,
      mainEvents: 0,
    };
    this.titlesWon       = [...new Set([
      ...(opts.titlesWon || []).filter(b => !/^(local|regional|national):/.test(b)),
      ...this.belts,
    ])];

    // Physical attrs (0-100)
    this.strength  = opts.strength  || rand(40, 75);
    this.speed     = opts.speed     || rand(40, 75);
    this.stamina   = opts.stamina   || rand(40, 80);
    this.chin      = opts.chin      || rand(35, 75);
    this.durability= opts.durability|| rand(40, 75);
    this.reflexes  = opts.reflexes  || rand(40, 75);

    // Technical attrs (0-100)
    this.jab        = opts.jab        || rand(40, 75);
    this.straight   = opts.straight   || rand(40, 75);
    this.cross      = opts.cross      || rand(40, 75);
    this.uppercut   = opts.uppercut   || rand(35, 70);
    this.defense    = opts.defense    || rand(35, 70);
    this.footwork   = opts.footwork   || rand(35, 70);
    this.bodyPunch  = opts.bodyPunch  || rand(35, 70);
    this.combinations=opts.combinations||rand(35, 70);
    this.distance   = opts.distance   || rand(40, 75);
    this.clinch     = opts.clinch     || rand(30, 65);
    this.counter    = opts.counter    || rand(30, 70);
    this.precision  = opts.precision  || rand(40, 75);
    this.ringIQ     = opts.ringIQ     || rand(40, 75);

    // Mental attrs (0-100)
    this.courage    = opts.courage    || rand(50, 85);
    this.discipline = opts.discipline || rand(40, 80);
    this.composure  = opts.composure  || rand(40, 75);
    this.adaptation = opts.adaptation || rand(40, 75);
    this.pressure   = opts.pressure   || rand(40, 75);
    this.resilience = opts.resilience || rand(40, 80);

    this.purseMult = opts.purseMult || 1;

    // Apply style/personality/nationality modifiers exactly once —
    // fighters rebuilt from a save already carry them baked into the attrs
    if (!opts._modifiersApplied) {
      this._applyStyleModifiers();
      this._applyPersonality();
      this._applyTrait();
    }
    this._modifiersApplied = true;

    // Potential (hidden) – affects growth rate
    this.potential  = opts.potential  || rand(50, 99);
    this.peakAge    = opts.peakAge    || rand(26, 33);
  }

  // ── Style modifiers ──────────────────────────────────────
  _applyStyleModifiers() {
    const style = FIGHTING_STYLES.find(s => s.id === this.styleId);
    if (!style) return;
    for (const [attr, val] of Object.entries(style.bonus  || {})) {
      if (this[attr] !== undefined) this[attr] = clamp(this[attr] + val, 1, 99);
    }
    for (const [attr, val] of Object.entries(style.penalty || {})) {
      if (this[attr] !== undefined) this[attr] = clamp(this[attr] + val, 1, 99);
    }
  }

  _applyTrait() {
    const trait = NAMES[this.nationality]?.trait;
    if (!trait) return;
    for (const [attr, val] of Object.entries(trait.plus || {})) {
      if (attr === 'popularity') this.popularity = clamp(this.popularity + val, 0, 100);
      else if (this[attr] !== undefined) this[attr] = clamp(this[attr] + val, 1, 99);
    }
    for (const [attr, val] of Object.entries(trait.minus || {})) {
      if (attr === 'popularity') this.popularity = clamp(this.popularity + val, 0, 100);
      else if (this[attr] !== undefined) this[attr] = clamp(this[attr] + val, 1, 99);
    }
    if (trait.special?.purseMult) this.purseMult = trait.special.purseMult;
  }

  _applyPersonality() {
    const p = PERSONALITIES.find(x => x.id === this.personalityId);
    if (!p) return;
    if (p.id === 'disciplined') {
      this.discipline = clamp(this.discipline + 10, 1, 99);
      this.composure  = clamp(this.composure  + 5,  1, 99);
    } else if (p.id === 'charismatic') {
      this.popularity = clamp(this.popularity + 15, 1, 100);
    } else if (p.id === 'hungry') {
      this.courage    = clamp(this.courage    + 8,  1, 99);
      this.resilience = clamp(this.resilience + 8,  1, 99);
    }
  }

  // ── Computed properties ───────────────────────────────────
  get style() { return FIGHTING_STYLES.find(s => s.id === this.styleId); }
  get isChampion() { return (this.belts || []).some(b => WORLD_ORGS.includes(b)); }
  get beltOrg() { return (this.belts || []).find(b => WORLD_ORGS.includes(b)) || null; }
  get topBelt() {
    if (!this.belts || !this.belts.length) return null;
    return this.belts.slice().sort((a, b) => getBeltInfo(b).tier - getBeltInfo(a).tier)[0];
  }
  get personality() { return PERSONALITIES.find(p => p.id === this.personalityId); }
  get trainingBonus() { return this.personality?.trainingBonus || 0; }
  get mediaBonus() { return this.personality?.mediaBonus || 0; }
  get weightClassData() { return WEIGHT_CLASSES.find(w => w.id === this.weightClass); }
  get nationalityData() { return NAMES[this.nationality]; }

  get record() {
    return `${this.wins}-${this.losses}-${this.draws}${this.noContests ? ` (${this.noContests} NC)` : ''}`;
  }

  get displayName() {
    if (this.nickname) return `"${this.nickname}" ${this.name}`;
    return this.name;
  }

  get overall() {
    // Weighted average of key attributes
    const phys = (this.strength + this.speed + this.stamina + this.chin + this.reflexes) / 5;
    const tech = (this.jab + this.straight + this.defense + this.footwork + this.combinations + this.ringIQ) / 6;
    const ment = (this.courage + this.composure + this.resilience) / 3;
    return Math.round(phys * 0.35 + tech * 0.45 + ment * 0.20);
  }

  get offensiveRating() {
    return Math.round((this.strength * 0.3 + this.speed * 0.2 + this.jab * 0.15 +
                       this.straight * 0.15 + this.combinations * 0.1 + this.precision * 0.1));
  }

  get defensiveRating() {
    return Math.round((this.defense * 0.35 + this.footwork * 0.25 + this.reflexes * 0.2 +
                       this.counter * 0.1 + this.distance * 0.1));
  }

  get koThreat() {
    return Math.round((this.strength * 0.5 + this.precision * 0.3 + this.uppercut * 0.2));
  }

  get careerWinPct() {
    const total = this.wins + this.losses + this.draws;
    if (total === 0) return 0;
    return Math.round((this.wins / total) * 100);
  }

  get koPct() {
    if (this.wins === 0) return 0;
    return Math.round(((this.kos + this.tkos) / this.wins) * 100);
  }

  get isActive() { return !this.retiredAt && !this.isInjured; }

  get conditioningStatus() {
    if (this.weeksSinceTraining >= 24) return 'Fora de forma';
    if (this.weeksSinceTraining >= 12) return 'Ritmo baixo';
    if (this.weeksSinceTraining >= 6) return 'Forma regular';
    return 'Em forma';
  }

  get retirementRisk() {
    const agePressure = Math.max(0, this.age - this.peakAge) * 6;
    const wearPressure = this.careerWear || 0;
    const inactivityPressure = Math.max(0, this.weeksSinceTraining - 12);
    return clamp(Math.round(agePressure + wearPressure + inactivityPressure), 0, 100);
  }

  markTraining() {
    this.weeksSinceTraining = 0;
    this.careerWear = clamp(this.careerWear - 2, 0, 100);
    const recoverable = Object.entries(this.inactivityLosses)
      .filter(([, amount]) => amount > 0);
    if (!recoverable.length) return [];

    const recoveryCount = this.age <= this.peakAge ? 2 : 1;
    const recovered = [];
    for (let i = 0; i < recoveryCount && recoverable.length; i++) {
      const [attr] = recoverable.shift();
      this[attr] = clamp(this[attr] + 1, 1, 99);
      this.inactivityLosses[attr]--;
      if (this.inactivityLosses[attr] <= 0) delete this.inactivityLosses[attr];
      recovered.push(attr);
    }
    return recovered;
  }

  applyCareerWear(weeks = 1) {
    const previousInactivity = this.weeksSinceTraining;
    this.weeksSinceTraining += weeks;
    const inactivity = this.weeksSinceTraining;
    const yearsPastPeak = Math.max(0, this.age - this.peakAge);
    const graceWeeks = yearsPastPeak >= 8 ? 2
      : yearsPastPeak >= 5 ? 3
      : yearsPastPeak >= 2 ? 4
      : this.age >= this.peakAge ? 5
      : this.age >= 30 ? 6
      : 8;
    if (inactivity < graceWeeks) return [];

    const interval = yearsPastPeak >= 8 ? 2
      : yearsPastPeak >= 4 ? 3
      : yearsPastPeak >= 1 ? 4
      : this.age >= 30 ? 5
      : 6;
    const previousTicks = Math.max(0, Math.floor((previousInactivity - graceWeeks) / interval));
    const currentTicks = Math.max(0, Math.floor((inactivity - graceWeeks) / interval));
    let checks = currentTicks - previousTicks;
    if (previousInactivity < graceWeeks && inactivity >= graceWeeks) checks++;
    if (checks <= 0) return [];

    const physical = ['speed', 'stamina', 'reflexes', 'strength', 'durability'];
    const veteran = ['footwork', 'precision', 'defense', 'composure', 'ringIQ'];
    const attrPool = yearsPastPeak > 0 ? [...physical, ...veteran] : physical;
    const losses = [];

    for (let i = 0; i < checks; i++) {
      const attr = pick(attrPool);
      if (this[attr] <= 1) continue;
      const amount = yearsPastPeak >= 8 && inactivity >= 16 ? 2 : 1;
      const actual = Math.min(amount, this[attr] - 1);
      this[attr] = clamp(this[attr] - actual, 1, 99);
      this.inactivityLosses[attr] = (this.inactivityLosses[attr] || 0) + actual;
      this.careerWear = clamp(this.careerWear + actual + Math.floor(yearsPastPeak / 3), 0, 100);
      losses.push({ attr, amount: actual });
    }
    return losses;
  }

  // ── Fight result recording ────────────────────────────────
  recordWin(method, round, opponent, oppRanking = null) {
    this.wins++;
    if (method === 'KO')  this.kos++;
    if (fightMethodIn('stoppage', method)) this.tkos++;
    this.morale = clamp(this.morale + 15, 0, 100);
    const isKO = fightMethodIn('stoppage', method) || method === 'KO';
    const popularityGain = Math.max(1, Math.round(rand(isKO ? 2 : 1, isKO ? 5 : 3) * (1 + this.mediaBonus)));
    this.popularity = clamp(this.popularity + popularityGain, 0, 100);
    this.reputation = clamp(this.reputation + Math.max(1, Math.round(rand(1, 3) * (1 + this.mediaBonus))), 0, 100);
    this.fightHistory.unshift({
      result: 'W', method, round,
      opponent: { id: opponent.id, name: opponent.name, record: opponent.record },
      opponentRanking: oppRanking !== null ? oppRanking : (opponent.ranking || null),
      date: window.gameState ? window.gameState.dateString : '?',
    });
  }

  recordLoss(method, round, opponent) {
    this.losses++;
    this.morale = clamp(this.morale - 20, 0, 100);
    const popularityLoss = Math.max(1, Math.round(rand(1, 5) * (1 - this.mediaBonus * 0.5)));
    this.popularity = clamp(this.popularity - popularityLoss, 0, 100);
    this.reputation = clamp(this.reputation - rand(0, 2), 0, 100);
    this.fightHistory.unshift({
      result: 'L', method, round,
      opponent: { id: opponent.id, name: opponent.name, record: opponent.record },
      date: window.gameState ? window.gameState.dateString : '?',
    });
  }

  recordDraw(opponent, method = 'Empate', round = 12) {
    this.draws++;
    this.morale = clamp(this.morale + 3, 0, 100);
    this.fightHistory.unshift({
      result: 'D', method, round,
      opponent: { id: opponent.id, name: opponent.name, record: opponent.record },
      date: window.gameState ? window.gameState.dateString : '?',
    });
  }

  recordNoContest(opponent, method = 'No Contest', round = 1) {
    this.noContests++;
    this.fightHistory.unshift({
      result: 'N', method, round,
      opponent: { id: opponent.id, name: opponent.name, record: opponent.record },
      date: window.gameState ? window.gameState.dateString : '?',
    });
  }

  // ── Aging ─────────────────────────────────────────────────
  birthday() {
    this.age++;
    const ageFactor = this._ageFactor();
    // Past peak: slight stat decline
    if (this.age > this.peakAge) {
      const decay = 0.5 + (this.age - this.peakAge) * 0.3;
      const attrs = ['speed', 'reflexes', 'stamina', 'chin'];
      for (const a of attrs) {
        if (Math.random() < 0.6) {
          this[a] = clamp(this[a] - rand(1, Math.ceil(decay)), 1, 99);
        }
      }
    }
  }

  _ageFactor() {
    if (this.age < this.peakAge) return 1 + (this.peakAge - this.age) * 0.02;
    if (this.age === this.peakAge) return 1;
    return Math.max(0.5, 1 - (this.age - this.peakAge) * 0.04);
  }

  // ── Serialisation ─────────────────────────────────────────
  toJSON() {
    return { ...this };
  }

  static fromJSON(data) {
    const f = new Fighter(data);
    return f;
  }

  hasSuperBelt(belt, weightClass = this.weightClass) {
    return (this.superBelts || []).some(entry =>
      (typeof entry === 'string' ? entry === belt : entry.belt === belt && entry.weightClass === weightClass)
    );
  }

  getSuperBelt(belt, weightClass = this.weightClass) {
    return (this.superBelts || []).find(entry =>
      typeof entry === 'string' ? entry === belt : entry.belt === belt && entry.weightClass === weightClass
    ) || null;
  }
}

// ── Fighter Generator ─────────────────────────────────────────
function generateFighter(opts = {}) {
  const natKey = opts.nationality || pick(NATIONALITIES);
  const nat    = NAMES[natKey];
  const firstName = pick(nat.first);
  const lastName  = pick(nat.last);

  const styleId   = opts.styleId || pick(FIGHTING_STYLES).id;
  const wc        = opts.weightClass || pick(WEIGHT_CLASSES.slice(2, 12)).id;
  const level     = opts.level || rand(40, 75); // base attribute range

  return new Fighter({
    name:         `${firstName} ${lastName}`,
    nickname:     Math.random() < 0.5 ? pick(NICKNAMES) : '',
    age:          opts.age || rand(20, 35),
    nationality:  natKey,
    gym:          pick(GYMS),
    weightClass:  wc,
    styleId,
    personalityId: pick(PERSONALITIES).id,
    wins:    opts.wins   !== undefined ? opts.wins   : rand(0, 25),
    losses:  opts.losses !== undefined ? opts.losses : rand(0, 8),
    draws:   0,
    kos:     0,
    tkos:    0,

    strength:  rand(level - 15, level + 15),
    speed:     rand(level - 15, level + 15),
    stamina:   rand(level - 10, level + 15),
    chin:      rand(level - 20, level + 10),
    durability:rand(level - 15, level + 15),
    reflexes:  rand(level - 15, level + 15),
    jab:       rand(level - 15, level + 15),
    straight:  rand(level - 15, level + 15),
    cross:     rand(level - 15, level + 15),
    uppercut:  rand(level - 20, level + 10),
    defense:   rand(level - 15, level + 15),
    footwork:  rand(level - 15, level + 15),
    bodyPunch: rand(level - 20, level + 10),
    combinations: rand(level - 15, level + 15),
    distance:  rand(level - 15, level + 15),
    clinch:    rand(level - 20, level + 10),
    counter:   rand(level - 20, level + 10),
    precision: rand(level - 15, level + 15),
    ringIQ:    rand(level - 15, level + 15),
    courage:   rand(level - 10, level + 15),
    discipline:rand(level - 15, level + 15),
    composure: rand(level - 15, level + 15),
    adaptation:rand(level - 15, level + 15),
    pressure:  rand(level - 15, level + 15),
    resilience:rand(level - 10, level + 15),

    popularity: rand(5, 50),
    reputation: rand(10, 60),
    potential:  rand(50, 95),
    peakAge:    rand(26, 33),
    money:      rand(1000, 50000),
    ...opts,
  });
}

function createPlayerFighter(formData) {
  const natKey    = formData.nationality || 'BR';
  const styleId   = formData.style;
  const wcId      = formData.weightClass;
  const pts       = formData.attributePoints || {};

  const base = 55;
  return new Fighter({
    name:         formData.name,
    nickname:     formData.nickname || '',
    nicknameLocked: !!(formData.nickname && formData.nickname.trim()),
    age:          parseInt(formData.age) || 22,
    nationality:  natKey,
    gym:          pick(GYMS.filter(g => g.country === natKey)) || GYMS[0],
    weightClass:  wcId,
    styleId,
    personalityId: formData.personality || 'disciplined',
    wins:   0,
    losses: 0,
    draws:  0,
    kos:    0,
    tkos:   0,
    isPlayer: true,

    strength:   clamp(base + (pts.strength   || 0), 40, 99),
    speed:      clamp(base + (pts.speed      || 0), 40, 99),
    stamina:    clamp(base + (pts.stamina    || 0), 40, 99),
    chin:       clamp(base + (pts.chin       || 0), 40, 99),
    durability: clamp(base + (pts.durability || 0), 40, 99),
    reflexes:   clamp(base + (pts.reflexes   || 0), 40, 99),

    jab:         clamp(base + (pts.jab          || 0), 40, 99),
    straight:    clamp(base + (pts.straight     || 0), 40, 99),
    cross:       clamp(base + (pts.cross        || 0), 40, 99),
    uppercut:    clamp(base + (pts.uppercut     || 0), 40, 99),
    defense:     clamp(base + (pts.defense      || 0), 40, 99),
    footwork:    clamp(base + (pts.footwork     || 0), 40, 99),
    bodyPunch:   clamp(base + (pts.bodyPunch    || 0), 40, 99),
    combinations:clamp(base + (pts.combinations|| 0), 40, 99),
    distance:    clamp(base + (pts.distance     || 0), 40, 99),
    counter:     clamp(base + (pts.counter      || 0), 40, 99),
    precision:   clamp(base + (pts.precision    || 0), 40, 99),
    ringIQ:      clamp(base + (pts.ringIQ       || 0), 40, 99),

    courage:    clamp(base + (pts.courage    || 0), 40, 99),
    discipline: clamp(base + (pts.discipline || 0), 40, 99),
    composure:  clamp(base + (pts.composure  || 0), 40, 99),
    resilience: clamp(base + (pts.resilience || 0), 40, 99),

    popularity: 15,
    reputation: 20,
    potential:  rand(70, 95),
    peakAge:    rand(27, 32),
    money:      5000,
  });
}
