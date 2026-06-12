// ============================================================
//  training.js  –  Sistema de Treinamento
// ============================================================

class TrainingCamp {
  constructor(fighter, weeks, focuses = [], mods = {}) {
    this.fighter  = fighter;
    this.weeks    = clamp(weeks, 1, 12);
    this.focuses  = focuses; // array of focus ids, max 3
    this.gainMod  = mods.gain || 0;  // coach bonus (0-0.45)
    this.riskMod  = mods.risk || 0;  // physio injury-risk reduction (0-0.55)
    this.personalityGainMod = fighter.trainingBonus || 0;
    this.results  = [];
    this.injury   = null;
  }

  simulate() {
    this.results = [];
    this.injury  = null;

    const effectiveWeeks = Math.min(this.weeks, 12);
    const focusBonus = this.focuses.length > 0 ? 1.0 : 0.6;

    for (const focusId of this.focuses.slice(0, 3)) {
      const focus = TRAINING_FOCUSES.find(f => f.id === focusId);
      if (!focus) continue;

      // Injury risk check (physio reduces it)
      const injRisk = focus.risk * (effectiveWeeks / 8) *
                      (1 - this.fighter.discipline / 200) *
                      (1 - this.riskMod);
      if (Math.random() < injRisk) {
        this.injury = {
          type:  focusId,
          weeks: rand(2, 8),
          desc:  this._injuryDesc(focusId),
        };
        // Reduce improvements if injured
        break;
      }

      // Improvement calculations
      for (const attr of focus.attrs) {
        if (this.fighter[attr] === undefined) continue;

        const current  = this.fighter[attr];
        const ceiling  = 99;

        if (current >= ceiling) continue;

        const ageFactor    = this._ageFactor();
        const potentialFactor = 0.75 + clamp(this.fighter.potential || 75, 50, 99) / 200;
        const discFactor   = 0.8 + (this.fighter.discipline / 500);
        const weeksImpact  = Math.sqrt(effectiveWeeks) * 0.7;
        const improvement  = Math.round(
          randFloat(0.5, 2.5) * focusBonus * ageFactor * potentialFactor * discFactor * weeksImpact *
          (1 + this.gainMod + this.personalityGainMod)
        );

        if (improvement > 0) {
          const old = this.fighter[attr];
          this.fighter[attr] = clamp(current + improvement, 1, ceiling);
          const actual = this.fighter[attr] - old;
          if (actual > 0) {
            this.results.push({
              attr,
              label: this._attrLabel(attr),
              gain: actual,
            });
          }
        }
      }
    }

    // General conditioning even without focus
    if (!this.injury) {
      this.fighter.fatigue = clamp(this.fighter.fatigue - rand(10, 25), 0, 100);
      this.fighter.morale  = clamp(this.fighter.morale  + rand(5, 15),  0, 100);
    }

    if (this.injury) {
      this.fighter.isInjured   = true;
      this.fighter.injuryWeeks = this.injury.weeks;
      this.fighter.morale      = clamp(this.fighter.morale - 20, 0, 100);
    }

    return {
      improvements: this.results,
      injury:       this.injury,
      weeksUsed:    effectiveWeeks,
    };
  }

  _ageFactor() {
    const f = this.fighter;
    if (f.age < f.peakAge - 3) return 1.2;
    if (f.age < f.peakAge)     return 1.0;
    if (f.age < f.peakAge + 3) return 0.8;
    if (f.age < f.peakAge + 6) return 0.5;
    return 0.3;
  }

  _injuryDesc(focusId) {
    const descs = {
      conditioning: 'Sobrecarga muscular durante o condicionamento.',
      power:        'Lesão na mão durante treino de força.',
      technique:    'Distensão muscular durante sessão de técnica.',
      defense:      'Contusão leve durante exercícios de esquiva.',
      sparring:     'Corte e contusão no sparring intenso.',
      body_work:    'Dor nas costelas após trabalho de corpo.',
      mental:       null,
      weight_cut:   'Desidratação severa durante o corte de peso.',
    };
    return descs[focusId] || 'Lesão durante o treino.';
  }

  _attrLabel(attr) {
    const labels = {
      strength: 'Força',    speed: 'Velocidade',   stamina: 'Resistência',
      chin: 'Queixo',       reflexes: 'Reflexos',   durability: 'Durabilidade',
      jab: 'Jab',           straight: 'Direto',     cross: 'Cruzado',
      uppercut: 'Uppercut', defense: 'Defesa',      footwork: 'Jogo de Pés',
      bodyPunch: 'Corpo',   combinations: 'Combinações', distance: 'Distância',
      clinch: 'Clinch',     counter: 'Contragolpe', precision: 'Precisão',
      ringIQ: 'Ring IQ',    courage: 'Coragem',     discipline: 'Disciplina',
      composure: 'Equilíbrio', adaptation: 'Adaptação', pressure: 'Pressão',
      resilience: 'Resiliência',
    };
    return labels[attr] || attr;
  }
}

// ── Recovery system ──────────────────────────────────────────
function recoverFighter(fighter, weeks) {
  if (!fighter.isInjured) return false;

  fighter.injuryWeeks = clamp(fighter.injuryWeeks - weeks, 0, 52);
  if (fighter.injuryWeeks <= 0) {
    fighter.isInjured   = false;
    fighter.injuryWeeks = 0;
    fighter.morale      = clamp(fighter.morale + 10, 0, 100);
    return true; // recovered
  }
  return false;
}

// ── Quick pre-fight prep (lighter version) ────────────────────
function lightPrep(fighter, focusId) {
  const focus = TRAINING_FOCUSES.find(f => f.id === focusId);
  if (!focus) return null;

  const improvement = rand(1, 3);
  for (const attr of focus.attrs.slice(0, 1)) {
    if (fighter[attr] !== undefined) {
      fighter[attr] = clamp(fighter[attr] + improvement, 1, 99);
    }
  }
  fighter.fatigue = clamp(fighter.fatigue + rand(5, 15), 0, 100);
  return { attr: focus.attrs[0], gain: improvement };
}
