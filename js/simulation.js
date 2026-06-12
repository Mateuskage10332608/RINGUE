// ============================================================
//  simulation.js  –  Engine de Simulação de Luta
// ============================================================

class FightSimulation {
  constructor(fighter1, fighter2, opts = {}) {
    this.f1 = fighter1;  // player or corner fighter
    this.f2 = fighter2;
    this.rounds    = opts.rounds    || 12;
    this.strategy1 = opts.strategy1 || 'adapt';
    this.strategy2 = opts.strategy2 || pick(STRATEGIES).id;
    this.isTitleFight = opts.isTitleFight || false;
    this.contestedBelts = opts.contestedBelts || [];
    this.bonus1    = opts.bonus1    || {}; // staff effects for f1: {confidence, tkoResist, matchup}

    // Fight state clones (we don't modify originals until end)
    this.s1 = this._buildState(fighter1);
    this.s2 = this._buildState(fighter2);
    this.s1.confidence = clamp(this.s1.confidence + (this.bonus1.confidence || 0), 30, 100);

    this.roundResults = [];  // array of round objects
    this.log         = [];   // full commentary log
    this.finalResult = null;
  }

  _buildState(f) {
    return {
      hp:         100,
      stamina:    100,
      confidence: clamp(f.morale, 30, 100),
      knockdowns: 0,
      totalDmg:   0,
      cutSeverity: 0,
      cutAccidental: false,
      foulWarnings: 0,
      staggered:  false,
      adaptScore: 0,   // tracks adjustments mid-fight
    };
  }

  // ── Strategy multipliers ──────────────────────────────────
  _strategyMod(stratId, phase) {
    const mods = {
      pressure:    { atk: 1.15, def: 0.85, stam: 1.15 },
      counter:     { atk: 0.90, def: 1.15, stam: 0.85 },
      jab_control: { atk: 0.95, def: 1.10, stam: 0.90 },
      body_attack: { atk: 1.05, def: 0.95, stam: 1.10, bodyDmg: 1.3 },
      go_for_ko:   { atk: 1.30, def: 0.70, stam: 1.30 },
      points:      { atk: 0.80, def: 1.20, stam: 0.75 },
      adapt:       { atk: 1.00, def: 1.00, stam: 0.95 },
    };
    return mods[stratId] || mods.adapt;
  }

  // ── Style matchup modifier ────────────────────────────────
  _styleMatchup(attackerStyle, defenderStyle) {
    return getStyleMatchup(attackerStyle, defenderStyle);
  }

  _personalityMod(fighter, state, opponentState, roundNum) {
    const late = roundNum >= this.rounds - 1;
    const behind = state.hp < opponentState.hp - 12;
    const mod = { atk: 1, def: 1, stam: 1, ko: 1 };
    switch (fighter.personalityId) {
      case 'disciplined': mod.def *= 1.04; mod.stam *= 0.93; break;
      case 'charismatic': state.confidence = clamp(state.confidence + 1, 30, 100); break;
      case 'arrogant': if (roundNum <= 2) mod.atk *= 1.10; if (behind) mod.atk *= 0.93; break;
      case 'humble': mod.def *= 1.03; break;
      case 'volatile': mod.atk *= 1.07; mod.ko *= 1.15; mod.stam *= 1.12; break;
      case 'calculating': mod.def *= 1.06; if (late) mod.atk *= 1.06; break;
      case 'hungry': if (behind) { mod.atk *= 1.13; mod.ko *= 1.10; } break;
      case 'veteran': if (late) { mod.atk *= 1.07; mod.def *= 1.06; } mod.stam *= 0.96; break;
    }
    return mod;
  }

  // ── Core round simulation ─────────────────────────────────
  simulateRound(roundNum) {
    const isLast   = roundNum === this.rounds;
    const comments = [];
    if (isLast) comments.push(pick(COMMENTARY.finalRound));

    const mod1 = this._strategyMod(this.strategy1);
    const mod2 = this._strategyMod(this.strategy2);

    // Stamina factor (tired fighters are less effective)
    const stamFac1 = 0.5 + (this.s1.stamina / 200);
    const stamFac2 = 0.5 + (this.s2.stamina / 200);

    // Confidence factor
    const confFac1 = 0.85 + (this.s1.confidence / 667);
    const confFac2 = 0.85 + (this.s2.confidence / 667);

    // Style matchup
    const matchup12 = this._styleMatchup(this.f1.styleId, this.f2.styleId);
    const matchup21 = this._styleMatchup(this.f2.styleId, this.f1.styleId);

    // Sinergia estilo + personalidade
    const syn1 = getSynergy(this.f1.styleId, this.f1.personalityId) || {};
    const syn2 = getSynergy(this.f2.styleId, this.f2.personalityId) || {};
    const pers1 = this._personalityMod(this.f1, this.s1, this.s2, roundNum);
    const pers2 = this._personalityMod(this.f2, this.s2, this.s1, roundNum);

    // Attack power (keep in 30-120 range — NOT divided by 100)
    const analystBoost = 1 + (this.bonus1.matchup || 0);
    const atk1 = this.f1.offensiveRating * mod1.atk * stamFac1 * confFac1 * matchup12 * analystBoost * (syn1.atk || 1) * pers1.atk + randFloat(-8, 8);
    const atk2 = this.f2.offensiveRating * mod2.atk * stamFac2 * confFac2 * matchup21 * (syn2.atk || 1) * pers2.atk + randFloat(-8, 8);

    // Defense (same scale)
    const def1 = this.f1.defensiveRating * mod1.def * stamFac1 * (syn1.def || 1) * pers1.def + randFloat(-8, 8);
    const def2 = this.f2.defensiveRating * mod2.def * stamFac2 * (syn2.def || 1) * pers2.def + randFloat(-8, 8);

    // Effective damage per round — normalise to 0-15 range
    const dmg1to2 = clamp((atk1 - def2 * 0.7) / 8, 0, 15);
    const dmg2to1 = clamp((atk2 - def1 * 0.7) / 8, 0, 15);

    // Apply damage
    this.s1.hp      = clamp(this.s1.hp      - dmg2to1, 0, 100);
    this.s2.hp      = clamp(this.s2.hp      - dmg1to2, 0, 100);
    this.s1.totalDmg += dmg2to1;
    this.s2.totalDmg += dmg1to2;

    this._updateCuts(this.s2, dmg1to2);
    this._updateCuts(this.s1, dmg2to1);

    const foulResult = this._checkFoul(roundNum, comments);
    if (foulResult) return foulResult;

    const accidentalResult = this._checkAccidentalInjury(roundNum, comments);
    if (accidentalResult) return accidentalResult;

    // Stamina drain
    this.s1.stamina = clamp(this.s1.stamina - (mod1.stam || 1) * pers1.stam * rand(6, 12), 0, 100);
    this.s2.stamina = clamp(this.s2.stamina - (mod2.stam || 1) * pers2.stam * rand(6, 12), 0, 100);

    // ─ Events ─────────────────────────────────────────────
    // Jab landed
    if (Math.random() < 0.55) {
      const t = pick(COMMENTARY.jabLanded)
                  .replace(/{a}/g, this.f1.name.split(' ')[0])
                  .replace(/{b}/g, this.f2.name.split(' ')[0]);
      comments.push(t);
    }

    // Big shot
    if (dmg1to2 > 5 && Math.random() < 0.5) {
      const t = pick(COMMENTARY.bigShot)
                  .replace(/{a}/g, this.f1.name.split(' ')[0])
                  .replace(/{b}/g, this.f2.name.split(' ')[0]);
      comments.push(t);
    }

    if (dmg2to1 > 5 && Math.random() < 0.5) {
      const t = pick(COMMENTARY.bigShot)
                  .replace(/{a}/g, this.f2.name.split(' ')[0])
                  .replace(/{b}/g, this.f1.name.split(' ')[0]);
      comments.push(t);
    }

    // Body shot
    if ((this.strategy1 === 'body_attack' && Math.random() < 0.5) ||
        (this.strategy2 === 'body_attack' && Math.random() < 0.5)) {
      const attacker = this.strategy1 === 'body_attack' ? this.f1 : this.f2;
      const defender = attacker === this.f1 ? this.f2 : this.f1;
      const t = pick(COMMENTARY.bodyShot)
                  .replace(/{a}/g, attacker.name.split(' ')[0])
                  .replace(/{b}/g, defender.name.split(' ')[0]);
      comments.push(t);
      // Extra stamina drain on body shots
      if (attacker === this.f1) this.s2.stamina = clamp(this.s2.stamina - rand(3, 8), 0, 100);
      else                       this.s1.stamina = clamp(this.s1.stamina - rand(3, 8), 0, 100);
    }

    // Knockdown check
    const kd1 = this._knockdownCheck(this.f1, this.f2, this.s2, dmg1to2);
    const kd2 = this._knockdownCheck(this.f2, this.f1, this.s1, dmg2to1);

    let knockdownEvent = null;

    this._roundKD1 = false;
    this._roundKD2 = false;

    if (kd1 && !this.s2.isDown) {
      this.s2.knockdowns++;
      this._roundKD2 = true;
      const t = pick(COMMENTARY.knockdown)
                  .replace(/{a}/g, this.f1.name.split(' ')[0])
                  .replace(/{b}/g, this.f2.name.split(' ')[0]);
      comments.push(t);
      knockdownEvent = { knockedDown: 'f2', round: roundNum };

      const getsUp = Math.random() < (this.f2.chin + this.f2.courage) / 220;
      if (getsUp) {
        const t2 = pick(COMMENTARY.getUp).replace(/{b}/g, this.f2.name.split(' ')[0]);
        comments.push(t2);
        this.s2.hp       = clamp(this.s2.hp, 5, 100);
        this.s2.stamina  = clamp(this.s2.stamina - 15, 5, 100);
        this.s2.confidence = clamp(this.s2.confidence - 15, 10, 100);
      } else {
        // KO!
        return this._endFight('KO', roundNum, this.f1, this.f2, comments, knockdownEvent);
      }
    }

    if (kd2 && !this.s1.isDown) {
      this.s1.knockdowns++;
      this._roundKD1 = true;
      const t = pick(COMMENTARY.knockdown)
                  .replace(/{a}/g, this.f2.name.split(' ')[0])
                  .replace(/{b}/g, this.f1.name.split(' ')[0]);
      comments.push(t);
      knockdownEvent = { knockedDown: 'f1', round: roundNum };

      const getsUp = Math.random() < (this.f1.chin + this.f1.courage) / 220;
      if (getsUp) {
        const t2 = pick(COMMENTARY.getUp).replace(/{b}/g, this.f1.name.split(' ')[0]);
        comments.push(t2);
        this.s1.hp       = clamp(this.s1.hp, 5, 100);
        this.s1.stamina  = clamp(this.s1.stamina - 15, 5, 100);
        this.s1.confidence = clamp(this.s1.confidence - 15, 10, 100);
      } else {
        return this._endFight('KO', roundNum, this.f2, this.f1, comments, knockdownEvent);
      }
    }

    // TKO check – fighter too damaged to continue (threshold 20 on 0-100 hp scale)
    if (this.s2.hp < 20 && Math.random() < 0.65) {
      comments.push(`O árbitro para a luta! ${this.f2.name.split(' ')[0]} não pode continuar!`);
      return this._endFight('TKO', roundNum, this.f1, this.f2, comments);
    }
    if (this.s1.hp < 20 && Math.random() < 0.65 * (1 - (this.bonus1.tkoResist || 0))) {
      comments.push(`O árbitro para a luta! ${this.f1.name.split(' ')[0]} não pode continuar!`);
      return this._endFight('TKO', roundNum, this.f2, this.f1, comments);
    }

    const medicalResult = this._checkMedicalStoppage(roundNum, comments);
    if (medicalResult) return medicalResult;

    const retirementResult = this._checkCornerRetirement(roundNum, comments);
    if (retirementResult) return retirementResult;

    // Tired commentary
    if (this.s1.stamina < 25 && Math.random() < 0.5) {
      const t = pick(COMMENTARY.tired)
                  .replace(/{a}/g, this.f1.name.split(' ')[0])
                  .replace(/{b}/g, this.f2.name.split(' ')[0]);
      comments.push(t);
    }
    if (this.s2.stamina < 25 && Math.random() < 0.5) {
      const t = pick(COMMENTARY.tired)
                  .replace(/{a}/g, this.f2.name.split(' ')[0])
                  .replace(/{b}/g, this.f1.name.split(' ')[0]);
      comments.push(t);
    }

    // Clinch commentary
    if (Math.random() < 0.25) {
      const t = pick(COMMENTARY.clinch)
                  .replace(/{a}/g, this.f1.name.split(' ')[0])
                  .replace(/{b}/g, this.f2.name.split(' ')[0]);
      comments.push(t);
    }

    // Score the round
    const roundScore = this._scoreRound(dmg1to2, dmg2to1, roundNum, comments);

    this.roundResults.push({
      round: roundNum,
      dmg1: dmg1to2,
      dmg2: dmg2to1,
      score1: roundScore.s1,
      score2: roundScore.s2,
      comments,
      hp1: this.s1.hp,
      hp2: this.s2.hp,
      stamina1: this.s1.stamina,
      stamina2: this.s2.stamina,
      knockdownEvent,
      ended: false,
    });

    return null;  // fight continues
  }

  _updateCuts(state, damage) {
    if (damage < 4 || Math.random() >= 0.055) return;
    state.cutSeverity = clamp(state.cutSeverity + (damage >= 8 ? 2 : 1), 0, 5);
    state.cutAccidental = false;
  }

  _checkFoul(roundNum, comments) {
    if (Math.random() >= 0.003) return null;
    const offenderIsF1 = Math.random() < 0.5;
    const offender = offenderIsF1 ? this.f1 : this.f2;
    const victim = offenderIsF1 ? this.f2 : this.f1;
    const state = offenderIsF1 ? this.s1 : this.s2;
    state.foulWarnings++;
    if (state.foulWarnings >= 2 || Math.random() < 0.18) {
      comments.push(`${offender.name.split(' ')[0]} é desclassificado após uma falta grave!`);
      return this._endFight('Desqualificação (DQ)', roundNum, victim, offender, comments);
    }
    comments.push(`O árbitro adverte ${offender.name.split(' ')[0]} por golpe ilegal.`);
    return null;
  }

  _checkAccidentalInjury(roundNum, comments) {
    if (Math.random() >= 0.0025) return null;
    const injuredIsF1 = Math.random() < 0.5;
    const injured = injuredIsF1 ? this.f1 : this.f2;
    const state = injuredIsF1 ? this.s1 : this.s2;
    state.cutSeverity = 5;
    state.cutAccidental = true;
    comments.push(`Choque acidental de cabeças abre um corte grave em ${injured.name.split(' ')[0]}.`);
    return this._accidentalStoppage(roundNum, comments);
  }

  _checkMedicalStoppage(roundNum, comments) {
    for (const [state, injured, opponent] of [
      [this.s1, this.f1, this.f2],
      [this.s2, this.f2, this.f1],
    ]) {
      if (state.cutSeverity < 3 || Math.random() >= 0.22 * state.cutSeverity) continue;
      comments.push(`O médico examina o corte de ${injured.name.split(' ')[0]} e encerra a luta.`);
      if (state.cutAccidental) return this._accidentalStoppage(roundNum, comments);
      return this._endFight('Interrupção Médica', roundNum, opponent, injured, comments);
    }
    return null;
  }

  _checkCornerRetirement(roundNum, comments) {
    if (roundNum >= this.rounds) return null;
    for (const [state, fighter, opponent] of [
      [this.s1, this.f1, this.f2],
      [this.s2, this.f2, this.f1],
    ]) {
      const exhausted = state.hp < 24 || state.stamina < 6;
      if (!exhausted || Math.random() >= 0.12) continue;
      comments.push(`O corner de ${fighter.name.split(' ')[0]} interrompe a luta no intervalo.`);
      return this._endFight('Abandono (RTD)', roundNum, opponent, fighter, comments);
    }
    return null;
  }

  _accidentalStoppage(roundNum, comments) {
    if (roundNum < 4 || this.roundResults.length < 3) {
      return this._noContest(roundNum, comments);
    }
    return this._technicalDecision(roundNum, comments);
  }

  _technicalDecision(roundNum, comments) {
    const total1 = this.roundResults.reduce((sum, r) => sum + (r.score1 || 0), 0);
    const total2 = this.roundResults.reduce((sum, r) => sum + (r.score2 || 0), 0);
    if (total1 === total2) {
      return {
        method: 'Empate Técnico', round: roundNum, winner: null,
        winnerFighter: null, loserFighter: null, comments,
        hp1: this.s1.hp, hp2: this.s2.hp, stamina1: this.s1.stamina, stamina2: this.s2.stamina,
        ended: true, isDraw: true, isControversial: false,
      };
    }
    const winner = total1 > total2 ? this.f1 : this.f2;
    const loser = winner === this.f1 ? this.f2 : this.f1;
    comments.push(`${winner.name} vence por decisão técnica após a interrupção acidental.`);
    return this._endFight('Decisão Técnica', roundNum, winner, loser, comments);
  }

  _noContest(roundNum, comments) {
    comments.push('A luta termina sem resultado oficial.');
    return {
      method: 'No Contest', round: roundNum, winner: null,
      winnerFighter: null, loserFighter: null, comments,
      hp1: this.s1.hp, hp2: this.s2.hp, stamina1: this.s1.stamina, stamina2: this.s2.stamina,
      ended: true, isDraw: false, isNoContest: true, isControversial: false,
    };
  }

  _knockdownCheck(attacker, defender, defState, dmgDealt) {
    if (dmgDealt < 5) return false;
    // Chance based on attacker KO threat vs defender chin
    const knockPower = attacker.koThreat / 100;
    const chinFactor = defender.chin / 100;
    const chance     = (knockPower - chinFactor * 0.7) * 0.35;
    return Math.random() < clamp(chance, 0.01, 0.35);
  }

  _scoreRound(dmg1to2, dmg2to1, roundNum, comments) {
    // 10-point must system — threshold 1.5 on 0-15 damage scale
    let s1 = 10, s2 = 10;

    if (dmg1to2 > dmg2to1 + 1.2) {
      s2 = 9;
      comments.push(pick(COMMENTARY.winningRound)
        .replace(/{a}/g, this.f1.name.split(' ')[0]));
    } else if (dmg2to1 > dmg1to2 + 1.2) {
      s1 = 9;
      comments.push(pick(COMMENTARY.winningRound)
        .replace(/{a}/g, this.f2.name.split(' ')[0]));
    } else {
      comments.push(pick(COMMENTARY.closeFight));
    }

    // Knockdown in this round = 1 extra point loss (use per-round KD event instead of cumulative)
    if (this._roundKD2) { s2 -= 1; this._roundKD2 = false; }
    if (this._roundKD1) { s1 -= 1; this._roundKD1 = false; }

    return { s1: clamp(s1, 7, 10), s2: clamp(s2, 7, 10) };
  }

  _endFight(method, round, winner, loser, comments, kdEvent = null) {
    const result = {
      method,
      round,
      winner: winner === this.f1 ? 'f1' : 'f2',
      winnerFighter: winner,
      loserFighter:  loser,
      comments,
      hp1: this.s1.hp,
      hp2: this.s2.hp,
      stamina1: this.s1.stamina,
      stamina2: this.s2.stamina,
      knockdownEvent: kdEvent,
      ended: true,
    };
    this.roundResults.push({ round, ...result });
    return result;
  }

  // ── Main simulation entry ─────────────────────────────────
  simulate() {
    for (let r = 1; r <= this.rounds; r++) {
      // Corner advice between rounds
      const cornerComment = pick(COMMENTARY.corner)
        .replace(/{a}/g, this.f1.name.split(' ')[0]);

      if (r > 1 && r < this.rounds) {
        // Could inject corner event here
      }

      const earlyEnd = this.simulateRound(r);
      if (earlyEnd) {
        this.finalResult = earlyEnd;
        return this.finalResult;
      }

      // Partial stamina recovery between rounds
      this.s1.stamina = clamp(this.s1.stamina + rand(3, 8), 0, 100);
      this.s2.stamina = clamp(this.s2.stamina + rand(3, 8), 0, 100);
    }

    // Decision
    this.finalResult = this._judgesDecision();
    return this.finalResult;
  }

  _judgesDecision() {
    let total1 = 0, total2 = 0;
    const cards = [];

    // 3 judges, each with slight bias
    for (let j = 0; j < 3; j++) {
      const bias = randFloat(-2, 2); // slight random judge bias
      let j1 = 0, j2 = 0;
      for (const rr of this.roundResults) {
        j1 += (rr.score1 || 0) + (j === 0 ? bias * 0.1 : 0);
        j2 += (rr.score2 || 0) - (j === 0 ? bias * 0.1 : 0);
      }
      cards.push({ j1: Math.round(j1), j2: Math.round(j2) });
      total1 += j1;
      total2 += j2;
    }

    const w1 = cards.filter(c => c.j1 > c.j2).length;
    const w2 = cards.filter(c => c.j2 > c.j1).length;
    const td = cards.filter(c => c.j1 === c.j2).length;

    let method, winner, loser;
    if (w1 > w2) {
      winner = this.f1; loser = this.f2;
      method = w1 === 3 ? 'Decisão Unânime' : (td > 0 ? 'Decisão Majoritária' : 'Decisão Dividida');
    } else if (w2 > w1) {
      winner = this.f2; loser = this.f1;
      method = w2 === 3 ? 'Decisão Unânime' : (td > 0 ? 'Decisão Majoritária' : 'Decisão Dividida');
    } else {
      // Empate
      return {
        method: 'Empate',
        round: this.rounds,
        winner: null,
        winnerFighter: null,
        loserFighter: null,
        cards,
        comments: ['Os juízes empatam a luta!', `${this.f1.name} e ${this.f2.name} dividem a luta.`],
        hp1: this.s1.hp,
        hp2: this.s2.hp,
        stamina1: this.s1.stamina,
        stamina2: this.s2.stamina,
        ended: true,
        isDraw: true,
      };
    }

    const isControversial = w1 !== 3 && w2 !== 3;
    const scoreLine1 = cards.map(c => c.j1).join('-');
    const scoreLine2 = cards.map(c => c.j2).join('-');

    return {
      method,
      round: this.rounds,
      winner: winner === this.f1 ? 'f1' : 'f2',
      winnerFighter: winner,
      loserFighter:  loser,
      cards,
      comments: [
        `${method}: ${winner.name} vence ${loser.name}!`,
        `Placar dos juízes: ${scoreLine1} / ${scoreLine2}`,
        isControversial ? 'Decisão controversa! A arena vaiar o resultado.' : 'Resultado justo segundo a maioria.',
      ],
      hp1: this.s1.hp,
      hp2: this.s2.hp,
      stamina1: this.s1.stamina,
      stamina2: this.s2.stamina,
      ended: true,
      isControversial,
      isDraw: false,
    };
  }

  // ── Apply fight result to actual fighter objects ──────────
  applyResult() {
    const r = this.finalResult;
    if (!r) return;

    if (r.isNoContest) {
      this.f1.recordNoContest(this.f2, r.method, r.round);
      this.f2.recordNoContest(this.f1, r.method, r.round);
      return;
    }

    if (r.isDraw) {
      this.f1.recordDraw(this.f2, r.method, r.round);
      this.f2.recordDraw(this.f1, r.method, r.round);
      return;
    }

    const winner = r.winnerFighter;
    const loser  = r.loserFighter;

    winner.recordWin(r.method, r.round, loser, loser.ranking);
    loser.recordLoss(r.method, r.round, winner);

    // Possible post-fight injury for loser
    if (r.method === 'Interrupção Médica') {
      loser.isInjured = true;
      loser.injuryWeeks = rand(4, 12);
    } else if (isKnockoutResult(r.method) && Math.random() < 0.35) {
      loser.isInjured   = true;
      loser.injuryWeeks = rand(4, 16);
    }

    // Cinturões só mudam de mãos quando foram explicitamente colocados em jogo.
    if (this.isTitleFight && this.contestedBelts.length > 0) {
      const eligible = this.contestedBelts.filter(b => (loser.belts || []).includes(b));
      for (const b of eligible) {
        if (!winner.belts.includes(b)) winner.belts.push(b);
      }
      loser.belts = loser.belts.filter(b => !eligible.includes(b));
    }
  }

  // ── Build fight summary for UI ────────────────────────────
  getSummary() {
    const r = this.finalResult;
    return {
      result:     r,
      rounds:     this.roundResults,
      f1Stats: { name: this.f1.name, totalDmg: this.s1.totalDmg, knockdowns: this.s1.knockdowns, hpLeft: this.s1.hp },
      f2Stats: { name: this.f2.name, totalDmg: this.s2.totalDmg, knockdowns: this.s2.knockdowns, hpLeft: this.s2.hp },
    };
  }
}
