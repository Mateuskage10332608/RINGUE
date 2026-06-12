// ============================================================
//  livefight.js  –  Engine de Luta ao Vivo (tick a tick)
//  O round corre num relógio comprimido; cada tick rola chances
//  de eventos (golpes, knockdowns, KO). O nocaute pode acontecer
//  a qualquer segundo. Entre rounds o jogador troca a estratégia.
// ============================================================

class LiveFightEngine {
  constructor(f1, f2, opts = {}) {
    this.f1 = f1;   // player side
    this.f2 = f2;
    this.rounds    = opts.rounds    || 12;
    this.strategy1 = opts.strategy1 || 'adapt';
    this.strategy2 = opts.strategy2 || pick(STRATEGIES).id;
    this.bonus1    = opts.bonus1    || {};   // staff: {confidence, tkoResist, matchup}

    this.s1 = this._buildState(f1);
    this.s2 = this._buildState(f2);
    this.s1.confidence = clamp(this.s1.confidence + (this.bonus1.confidence || 0), 30, 100);
    // Carismáticos sobem ao ringue embalados pela torcida
    if (f1.personalityId === 'charismatic') this.s1.confidence = clamp(this.s1.confidence + 8, 30, 100);
    if (f2.personalityId === 'charismatic') this.s2.confidence = clamp(this.s2.confidence + 8, 30, 100);

    this.round    = 1;
    this.clock    = 0;        // segundos de jogo no round atual
    this.roundLen = 180;      // 3 minutos
    this.phase    = 'round';  // round | corner | over
    this.roundScores = [];    // {round, s1, s2, dmg1, dmg2}
    this.finalResult = null;
    this._rd = this._freshRound();
    this._listeners = [];
    this._pendingKD  = null;  // pausado durante contagem
  }

  _buildState(f) {
    return { hp: 100, stamina: 100, confidence: clamp(f.morale, 30, 100),
             knockdowns: 0, totalDmg: 0, landed: 0,
             cutSeverity: 0, cutAccidental: false, foulWarnings: 0 };
  }

  _freshRound() { return { dmg1: 0, dmg2: 0, kd1: 0, kd2: 0 }; }

  on(fn)    { this._listeners.push(fn); }
  _emit(ev) { for (const fn of this._listeners) fn(ev); }

  setStrategy(id) { this.strategy1 = id; }

  _mod(id) {
    const mods = {
      pressure:    { atk: 1.15, def: 0.85, stam: 1.15 },
      counter:     { atk: 0.90, def: 1.15, stam: 0.85 },
      jab_control: { atk: 0.95, def: 1.10, stam: 0.90 },
      body_attack: { atk: 1.05, def: 0.95, stam: 1.10 },
      go_for_ko:   { atk: 1.30, def: 0.70, stam: 1.30 },
      points:      { atk: 0.80, def: 1.20, stam: 0.75 },
      adapt:       { atk: 1.00, def: 1.00, stam: 0.95 },
    };
    return mods[id] || mods.adapt;
  }

  _styleMatchup(a, b) {
    return getStyleMatchup(a, b);
  }

  // Modificadores de combate por personalidade + sinergia estilo/personalidade.
  // Reagem ao contexto da luta (round atual, quem está na frente).
  // Retorna { atk, def, stam, ko } como multiplicadores.
  _intangibles(who) {
    const f    = who === 1 ? this.f1 : this.f2;
    const self = who === 1 ? this.s1 : this.s2;
    const opp  = who === 1 ? this.s2 : this.s1;
    const lateRounds = this.round >= this.rounds - 1;

    let myScore = 0, oppScore = 0;
    for (const r of this.roundScores) {
      myScore  += who === 1 ? r.s1 : r.s2;
      oppScore += who === 1 ? r.s2 : r.s1;
    }
    const behind = (oppScore - myScore >= 2) || (self.hp < opp.hp - 12);

    let atk = 1, def = 1, stam = 1, ko = 1;
    switch (f.personalityId) {
      case 'disciplined': stam *= 0.93; def *= 1.04; break;
      case 'arrogant':    if (this.round <= 2) atk *= 1.10; if (behind) atk *= 0.93; break;
      case 'volatile':    atk *= 1.07; ko *= 1.15; stam *= 1.12; break;
      case 'calculating': def *= 1.06; if (lateRounds) atk *= 1.06; break;
      case 'hungry':      if (behind) { atk *= 1.13; ko *= 1.10; } break;
      case 'veteran':     if (lateRounds) { atk *= 1.07; def *= 1.06; } stam *= 0.96; break;
      case 'humble':      def *= 1.03; break;
      // charismatic: bônus de confiança aplicado no _buildState/corner
    }

    // Sinergia estilo + personalidade
    const syn = getSynergy(f.styleId, f.personalityId);
    if (syn) {
      atk  *= syn.atk  || 1;
      def  *= syn.def  || 1;
      stam *= syn.stam || 1;
      ko   *= syn.ko   || 1;
    }
    return { atk, def, stam, ko };
  }

  // ── Main tick: dt em segundos de jogo ─────────────────────
  tick(dt) {
    if (this.phase !== 'round') return;
    if (this._pendingKD) return; // pausado durante contagem de knockdown
    this.clock += dt;

    const m1 = this._mod(this.strategy1);
    const m2 = this._mod(this.strategy2);
    const i1 = this._intangibles(1);
    const i2 = this._intangibles(2);
    this._i1 = i1; this._i2 = i2;

    // Desgaste passivo de stamina (personalidade afeta a eficiência)
    this.s1.stamina = clamp(this.s1.stamina - dt * 0.05 * (m1.stam || 1) * i1.stam, 0, 100);
    this.s2.stamina = clamp(this.s2.stamina - dt * 0.05 * (m2.stam || 1) * i2.stam, 0, 100);

    // Chance de trocação neste tick (~28 trocações/round em ritmo normal)
    const pace = ((m1.atk || 1) + (m2.atk || 1)) / 2;
    if (Math.random() < dt * 0.16 * pace) this._exchange(m1, m2);

    // Eventos de ambientação ocasionais
    if (this.phase === 'round' && Math.random() < dt * 0.008) this._flavor();

    if (this.phase === 'round' && this.clock >= this.roundLen) this._endRound();
  }

  _exchange(m1, m2) {
    const stamF1 = 0.55 + this.s1.stamina / 220;
    const stamF2 = 0.55 + this.s2.stamina / 220;
    const confF1 = 0.85 + this.s1.confidence / 650;
    const confF2 = 0.85 + this.s2.confidence / 650;
    const mu12 = this._styleMatchup(this.f1.styleId, this.f2.styleId);
    const mu21 = this._styleMatchup(this.f2.styleId, this.f1.styleId);
    const i1 = this._i1 || this._intangibles(1);
    const i2 = this._i2 || this._intangibles(2);

    const pow1 = this.f1.offensiveRating * m1.atk * stamF1 * confF1 * mu12 * i1.atk * (1 + (this.bonus1.matchup || 0));
    const pow2 = this.f2.offensiveRating * m2.atk * stamF2 * confF2 * mu21 * i2.atk;

    const atkIs1 = Math.random() < pow1 / (pow1 + pow2);
    const A  = atkIs1 ? this.f1 : this.f2;
    const D  = atkIs1 ? this.f2 : this.f1;
    const sA = atkIs1 ? this.s1 : this.s2;
    const sD = atkIs1 ? this.s2 : this.s1;
    const mA = atkIs1 ? m1 : m2;
    const mD = atkIs1 ? m2 : m1;
    const stamFD = atkIs1 ? stamF2 : stamF1;
    const atkScore = atkIs1 ? pow1 : pow2;
    const defIntang = atkIs1 ? i2.def : i1.def;
    const defScore = D.defensiveRating * (mD.def || 1) * stamFD * defIntang;

    // Acerta?
    const pLand = clamp(0.30 + (atkScore - defScore) / 160, 0.12, 0.80);
    sA.stamina = clamp(sA.stamina - 0.4, 0, 100);

    if (Math.random() > pLand) {
      if (Math.random() < 0.15) {
        this._emit({ type: 'miss', who: atkIs1 ? 'p1' : 'p2',
          text: pick([
            `${D.name.split(' ')[0]} esquiva com classe!`,
            `${A.name.split(' ')[0]} erra o golpe, ${D.name.split(' ')[0]} escapa.`,
            `Bloqueio firme de ${D.name.split(' ')[0]}.`,
          ]) });
      }
      return;
    }

    // Tipo de golpe (estratégia pesa)
    let wJab = 0.50, wPow = 0.28, wBody = 0.22;
    const strat = atkIs1 ? this.strategy1 : this.strategy2;
    if (strat === 'jab_control') { wJab += 0.20; wPow -= 0.10; wBody -= 0.10; }
    if (strat === 'body_attack') { wBody += 0.22; wJab -= 0.12; wPow -= 0.10; }
    if (strat === 'go_for_ko')   { wPow += 0.22; wJab -= 0.16; wBody -= 0.06; }
    const roll = Math.random() * (wJab + wPow + wBody);
    const type = roll < wJab ? 'jab' : roll < wJab + wPow ? 'power' : 'body';

    // Dano
    let dmg;
    if (type === 'jab') {
      dmg = randFloat(0.25, 0.7) * (A.precision / 70);
    } else if (type === 'body') {
      dmg = randFloat(0.6, 1.5) * (A.bodyPunch / 70);
      sD.stamina = clamp(sD.stamina - randFloat(1.0, 2.5), 0, 100);
    } else {
      dmg = randFloat(1.3, 3.4) * (A.strength / 70);
    }

    sD.hp = clamp(sD.hp - dmg, 0, 100);
    sD.totalDmg += dmg;
    sD.stamina = clamp(sD.stamina - 0.2, 0, 100);
    sA.landed++;
    if (atkIs1) this._rd.dmg1 += dmg; else this._rd.dmg2 += dmg;

    if (dmg >= 1.7 && Math.random() < 0.035) {
      sD.cutSeverity = clamp(sD.cutSeverity + (dmg >= 2.8 ? 2 : 1), 0, 5);
      sD.cutAccidental = false;
      this._emit({ type: 'comment', text: `Um corte se abre no rosto de ${D.name.split(' ')[0]}!` });
    }

    if (Math.random() < 0.0008) {
      const offenderState = atkIs1 ? this.s1 : this.s2;
      offenderState.foulWarnings++;
      if (offenderState.foulWarnings >= 2 || Math.random() < 0.16) {
        this._emit({ type: 'comment', text: `${A.name.split(' ')[0]} é desclassificado por uma falta grave!` });
        this._finish('Desqualificação (DQ)', D, A);
        return;
      }
      this._emit({ type: 'comment', text: `O árbitro adverte ${A.name.split(' ')[0]} por golpe ilegal.` });
    }

    if (Math.random() < 0.00065) {
      sD.cutSeverity = 5;
      sD.cutAccidental = true;
      this._emit({ type: 'comment', text: `Choque acidental de cabeças! ${D.name.split(' ')[0]} sofre um corte grave.` });
      this._accidentalStoppage();
      return;
    }

    // Comentário
    const aName = A.name.split(' ')[0];
    const bName = D.name.split(' ')[0];
    const big = type === 'power' && dmg > 2.0;
    const commentChance = type === 'jab' ? 0.22 : type === 'body' ? 0.45 : 0.8;
    if (Math.random() < commentChance) {
      const pool = type === 'jab' ? COMMENTARY.jabLanded
                 : type === 'body' ? COMMENTARY.bodyShot
                 : COMMENTARY.bigShot;
      this._emit({ type: 'punch', who: atkIs1 ? 'p1' : 'p2', big, punchType: type,
        text: pick(pool).replace(/{a}/g, aName).replace(/{b}/g, bName) });
    } else {
      this._emit({ type: 'punch', who: atkIs1 ? 'p1' : 'p2', big, punchType: type, text: null });
    }

    // Knockdown? (apenas golpes potentes)
    if (type === 'power' && dmg > 2.2) {
      const koIntang = atkIs1 ? i1.ko : i2.ko;
      const chance = clamp((A.koThreat / 100 - D.chin / 140) * 0.5 * koIntang, 0.02, 0.50);
      if (Math.random() < chance || sD.hp <= 2) {
        this._knockdown(atkIs1, A, D, sD);
        return;
      }
    }

    // TKO? Árbitro pode parar se o lutador está muito castigado
    if (sD.hp < 16 && type !== 'jab') {
      let pStop = 0.35;
      if (!atkIs1) pStop *= (1 - (this.bonus1.tkoResist || 0)); // cutman protege o jogador
      if (Math.random() < pStop) {
        this._emit({ type: 'comment',
          text: `O árbitro para a luta! ${bName} não tem mais condições de continuar!` });
        this._finish('TKO', A, D);
        return;
      }
    }

    if (sD.cutSeverity >= 3 && Math.random() < 0.04 * sD.cutSeverity) {
      this._emit({ type: 'comment', text: `O médico examina ${bName} e manda encerrar a luta!` });
      if (sD.cutAccidental) this._accidentalStoppage();
      else this._finish('Interrupção Médica', A, D);
    }
  }

  _knockdown(downIs2, A, D, sD) {
    sD.knockdowns++;
    if (downIs2) this._rd.kd2++; else this._rd.kd1++;

    const aName = A.name.split(' ')[0];
    const bName = D.name.split(' ')[0];
    this._emit({ type: 'knockdown', who: downIs2 ? 'p2' : 'p1',
      text: pick(COMMENTARY.knockdown).replace(/{a}/g, aName).replace(/{b}/g, bName) });

    sD.hp = clamp(sD.hp - 4, 0, 100);

    // Probabilidade de se levantar (veteranos têm sangue-frio para se reerguer)
    const vetBonus    = D.personalityId === 'veteran' ? 1.12 : 1.0;
    const getUpChance = clamp(((D.chin + D.resilience) / 230) * (0.45 + sD.hp / 180) * vetBonus, 0.05, 0.88);
    const kdThisRound = downIs2 ? this._rd.kd2 : this._rd.kd1;

    // Pausar engine — UI faz a contagem e chama resolveKnockdown()
    this._pendingKD = { downIs2, A, D, sD, bName, getUpChance, kdThisRound };
  }

  // Chamado pela UI após a contagem 1–10
  resolveKnockdown(gotUp) {
    const kd = this._pendingKD;
    if (!kd) return;
    this._pendingKD = null;
    const { downIs2, A, D, sD, bName, kdThisRound } = kd;

    if (!gotUp) {
      this._emit({ type: 'ko', who: downIs2 ? 'p2' : 'p1',
        text: `${bName} NÃO LEVANTA! O árbitro encerra a contagem!` });
      this._finish('KO', A, D);
      return;
    }

    sD.stamina    = clamp(sD.stamina - 12, 5, 100);
    sD.confidence = clamp(sD.confidence - 12, 10, 100);
    sD.hp         = Math.max(sD.hp, 5);
    this._emit({ type: 'getup', who: downIs2 ? 'p2' : 'p1',
      text: pick(COMMENTARY.getUp).replace(/{b}/g, bName) });

    // Regra dos 3 knockdowns no mesmo round
    if (kdThisRound >= 3) {
      this._emit({ type: 'comment',
        text: `Três quedas no mesmo round! O árbitro encerra a luta!` });
      this._finish('TKO', A, D);
    }
  }

  _flavor() {
    const tired1 = this.s1.stamina < 30;
    const tired2 = this.s2.stamina < 30;
    const n1 = this.f1.name.split(' ')[0];
    const n2 = this.f2.name.split(' ')[0];

    if (tired1 || tired2) {
      const who = tired1 ? n1 : n2;
      this._emit({ type: 'comment',
        text: pick(COMMENTARY.tired).replace(/{a}/g, who).replace(/{b}/g, who) });
    } else if (Math.random() < 0.4) {
      this._emit({ type: 'comment',
        text: pick(COMMENTARY.clinch).replace(/{a}/g, n1).replace(/{b}/g, n2) });
    }
  }

  // ── Round end / corner ────────────────────────────────────
  _endRound() {
    let s1 = 10, s2 = 10;
    if (this._rd.dmg1 > this._rd.dmg2 + 1.2)      s2 = 9;
    else if (this._rd.dmg2 > this._rd.dmg1 + 1.2) s1 = 9;
    s1 -= this._rd.kd1;
    s2 -= this._rd.kd2;
    s1 = clamp(s1, 7, 10);
    s2 = clamp(s2, 7, 10);

    this.roundScores.push({ round: this.round, s1, s2, dmg1: this._rd.dmg1, dmg2: this._rd.dmg2 });

    if (this.round < this.rounds) {
      const retire1 = (this.s1.hp < 22 || this.s1.stamina < 5) && Math.random() < 0.10;
      const retire2 = (this.s2.hp < 22 || this.s2.stamina < 5) && Math.random() < 0.10;
      if (retire1 || retire2) {
        const loser = retire1 ? this.f1 : this.f2;
        const winner = retire1 ? this.f2 : this.f1;
        this._emit({ type: 'comment', text: `O corner de ${loser.name.split(' ')[0]} encerra a luta no intervalo!` });
        this._finish('Abandono (RTD)', winner, loser, false);
        return;
      }
    }

    if (this.round >= this.rounds) {
      this._decision();
      return;
    }

    // Recuperação no corner
    this.s1.stamina = clamp(this.s1.stamina + rand(10, 16), 0, 100);
    this.s2.stamina = clamp(this.s2.stamina + rand(10, 16), 0, 100);
    this.s1.hp = clamp(this.s1.hp + 2 + (this.bonus1.tkoResist ? 3 : 0), 0, 100); // cutman ajuda
    this.s2.hp = clamp(this.s2.hp + 2, 0, 100);
    // Recuperação de confiança no corner (humildes reagrupam melhor)
    this.s1.confidence = clamp(this.s1.confidence + (this.f1.personalityId === 'humble' ? 8 : 3), 10, 100);
    this.s2.confidence = clamp(this.s2.confidence + (this.f2.personalityId === 'humble' ? 8 : 3), 10, 100);

    this.phase = 'corner';
    const winner = s1 > s2 ? this.f1.name.split(' ')[0]
                 : s2 > s1 ? this.f2.name.split(' ')[0] : null;
    this._emit({ type: 'roundEnd', round: this.round, s1, s2,
      dmg1: this._rd.dmg1, dmg2: this._rd.dmg2,
      text: winner ? `Round ${this.round} para ${winner} (${s1}-${s2}).`
                   : `Round ${this.round} equilibrado (${s1}-${s2}).` });
  }

  startNextRound() {
    if (this.phase !== 'corner') return;
    this.round++;
    this.clock = 0;
    this._rd = this._freshRound();
    this.phase = 'round';
    this._emit({ type: 'roundStart', round: this.round,
      text: this.round === this.rounds
        ? pick(COMMENTARY.finalRound)
        : `🔔 Round ${this.round}!` });
  }

  // ── Decision / finish ─────────────────────────────────────
  _decision() {
    const cards = [];
    for (let j = 0; j < 3; j++) {
      const bias = randFloat(-0.6, 0.6);
      let j1 = 0, j2 = 0;
      for (const r of this.roundScores) {
        j1 += r.s1; j2 += r.s2;
        // juiz com leve viés em rounds equilibrados
        if (r.s1 === r.s2 && Math.abs(r.dmg1 - r.dmg2) < 1.2) {
          if (bias > 0.3) j1 += 0;  // mantém
          else if (bias < -0.3) j2 += 0;
        }
      }
      // micro-variação por juiz
      if (Math.abs(j1 - j2) <= 2 && Math.random() < 0.35) {
        if (Math.random() < 0.5) j1 += 1; else j2 += 1;
      }
      cards.push({ j1, j2 });
    }

    const w1 = cards.filter(c => c.j1 > c.j2).length;
    const w2 = cards.filter(c => c.j2 > c.j1).length;
    const even = cards.filter(c => c.j1 === c.j2).length;

    if (w1 === w2) {
      this.finalResult = {
        method: 'Empate', round: this.rounds, winner: null,
        winnerFighter: null, loserFighter: null, cards,
        comments: ['Os juízes empatam a luta!'],
        hp1: this.s1.hp, hp2: this.s2.hp,
        stamina1: this.s1.stamina, stamina2: this.s2.stamina,
        ended: true, isDraw: true, isControversial: false,
      };
      this.phase = 'over';
      this._emit({ type: 'fightEnd', result: this.finalResult });
      return;
    }

    const f1Wins = w1 > w2;
    const winner = f1Wins ? this.f1 : this.f2;
    const loser  = f1Wins ? this.f2 : this.f1;
    const unanimous = (f1Wins ? w1 : w2) === 3;
    const method = unanimous ? 'Decisão Unânime'
                 : even > 0 ? 'Decisão Majoritária' : 'Decisão Dividida';

    this.finalResult = {
      method, round: this.rounds,
      winner: f1Wins ? 'f1' : 'f2',
      winnerFighter: winner, loserFighter: loser, cards,
      comments: [
        `${method}: ${winner.name} vence!`,
        `Placar: ${cards.map(c => `${c.j1}-${c.j2}`).join(' / ')}`,
      ],
      hp1: this.s1.hp, hp2: this.s2.hp,
      stamina1: this.s1.stamina, stamina2: this.s2.stamina,
      ended: true, isDraw: false, isControversial: !unanimous,
    };
    this.phase = 'over';
    this._emit({ type: 'fightEnd', result: this.finalResult });
  }

  _accidentalStoppage() {
    if (this.round < 4 || this.roundScores.length < 3) {
      this._finishNoContest();
      return;
    }
    const total1 = this.roundScores.reduce((sum, r) => sum + r.s1, 0);
    const total2 = this.roundScores.reduce((sum, r) => sum + r.s2, 0);
    if (total1 === total2) {
      this.finalResult = {
        method: 'Empate Técnico', round: this.round, winner: null,
        winnerFighter: null, loserFighter: null, cards: [],
        comments: ['A luta vai aos cartões e termina em empate técnico.'],
        hp1: this.s1.hp, hp2: this.s2.hp, stamina1: this.s1.stamina, stamina2: this.s2.stamina,
        ended: true, isDraw: true, isControversial: false,
      };
      this.phase = 'over';
      this._emit({ type: 'fightEnd', result: this.finalResult });
      return;
    }
    const winner = total1 > total2 ? this.f1 : this.f2;
    const loser = winner === this.f1 ? this.f2 : this.f1;
    this._finish('Decisão Técnica', winner, loser);
  }

  _finishNoContest() {
    this.finalResult = {
      method: 'No Contest', round: this.round, winner: null,
      winnerFighter: null, loserFighter: null, comments: ['A luta termina sem resultado oficial.'],
      hp1: this.s1.hp, hp2: this.s2.hp, stamina1: this.s1.stamina, stamina2: this.s2.stamina,
      ended: true, isDraw: false, isNoContest: true, isControversial: false,
    };
    this.phase = 'over';
    this._emit({ type: 'fightEnd', result: this.finalResult });
  }

  _finish(method, winner, loser, addPartialScore = true) {
    if (this.phase === 'over') return;
    this.finalResult = {
      method, round: this.round,
      winner: winner === this.f1 ? 'f1' : 'f2',
      winnerFighter: winner, loserFighter: loser,
      comments: [],
      hp1: this.s1.hp, hp2: this.s2.hp,
      stamina1: this.s1.stamina, stamina2: this.s2.stamina,
      ended: true, isDraw: false, isControversial: false,
    };
    // pontua o round parcial para o placar exibido
    if (addPartialScore) {
      this.roundScores.push({
        round: this.round,
        s1: winner === this.f1 ? 10 : 8,
        s2: winner === this.f2 ? 10 : 8,
        dmg1: this._rd.dmg1, dmg2: this._rd.dmg2,
      });
    }
    this.phase = 'over';
    this._emit({ type: 'fightEnd', result: this.finalResult });
  }

  // ── Compatível com processFightResult(sim) ───────────────
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
    winner.recordWin(r.method, r.round, loser);
    loser.recordLoss(r.method, r.round, winner);

    if (r.method === 'Interrupção Médica') {
      loser.isInjured = true;
      loser.injuryWeeks = rand(4, 12);
    } else if (isKnockoutResult(r.method) && Math.random() < 0.35) {
      loser.isInjured   = true;
      loser.injuryWeeks = rand(4, 16);
    }

    // Belt transfer is handled by career.processFightResult based on fight.titleBelt
  }

  getSummary() {
    return {
      result: this.finalResult,
      rounds: this.roundScores,
      f1Stats: { name: this.f1.name, totalDmg: this.s1.totalDmg, knockdowns: this.s1.knockdowns, hpLeft: this.s1.hp },
      f2Stats: { name: this.f2.name, totalDmg: this.s2.totalDmg, knockdowns: this.s2.knockdowns, hpLeft: this.s2.hp },
    };
  }
}
