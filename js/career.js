// Language helper for bilingual news headlines
const nl = (pt, en) => (typeof I18n !== 'undefined' && I18n.getLang() === 'en') ? en : pt;

class GameState {
  constructor() {
    this.gameMode      = 'athlete';
    this.player        = null;
    this.academy       = null;
    this.academyRecruitCandidates = [];
    this.allFighters   = [];
    this.rankings      = {};   // weightClassId -> [Fighter] sorted
    this.orgRankings   = {};   // org -> { weightClassId -> { champion, contenders[] } }
    this.staff         = {};   // roleId -> tierIndex (player's hired team)
    this.news          = [];   // { headline, type, date, fighters }
    this.week          = 1;
    this.year          = 2024;
    this.inFightCamp   = false;
    this.nextFight     = null; // scheduled fight
    this.availableFights = [];
    this.contractOffers = [];
    this.incomingChallenges = [];
    this.trainingState = null;
    this.lastFightResult = null;
    this.lastFightPayout = 0;
    this.tournamentOffers  = [];   // pending tournament invitations
    this.activeTournament  = null; // current bracket tournament
    this.worldSimFights = []; // recent AI fights
    this.npcRivalries = []; // rivalidades persistentes entre lutadores controlados pelo mundo
    this.currentSlot   = 1;
    this.rivals        = []; // { fighterId, name, intensity(1-5), reason, wins, losses, week, year }
    this.mediaCooldowns = {}; // campaignId → weekNumber when it was last used
    this.mediaHistory = []; // respostas, perguntas, encaradas e repercussões
    this.mediaCrisis = null;
    this.hallOfFame  = BOXING_LEGENDS.map(l => ({ ...l, inducted: true, inductedYear: l.era.split('–')[1] || '?' }));
  }

  get date() {
    const startDate = new Date(this.year, 0, 1);
    startDate.setDate(startDate.getDate() + (this.week - 1) * 7);
    return startDate;
  }

  get dateString() {
    return this.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getAcademyFounderProjection(fighter = this.player) {
    if (!fighter) return null;
    const worldTitles = new Set([
      ...(fighter.worldTitleHistory || []).map(entry => entry.belt),
      ...(fighter.titlesWon || []).filter(belt => WORLD_ORGS.includes(belt)),
    ]).size;
    const continentalTitles = new Set([
      ...(fighter.titleReigns || []).filter(reign => getBeltInfo(reign.belt).tier === 4).map(reign => `${reign.belt}:${reign.weightClass}`),
      ...(fighter.titlesWon || []).filter(belt => getBeltInfo(belt).tier === 4),
    ]).size;
    const defenses = Object.values(fighter.beltDefenses || {}).reduce((sum, count) => sum + count, 0) +
      Object.values(fighter.divisionDefenses || {}).reduce((sum, division) =>
        sum + Object.values(division || {}).reduce((subtotal, count) => subtotal + count, 0), 0);
    const trophyPoints = (fighter.trophies || []).reduce((sum, trophy) =>
      sum + (trophy.tier === 'national' ? 10 : trophy.tier === 'regional' ? 5 : 2), 0);
    const careerScore = Math.max(0,
      fighter.wins * 3 - fighter.losses * 2 +
      worldTitles * 130 + continentalTitles * 55 + defenses * 14 +
      trophyPoints + Math.round((fighter.reputation || 0) * 1.2)
    );
    const moneyContribution = clamp(Math.round((fighter.money || 0) * 0.35), 0, 250000);
    const money = 65000 + moneyContribution + careerScore * 110;
    const reputation = clamp(6 + Math.floor(careerScore / 28) + Math.floor((fighter.popularity || 0) / 5), 5, 78);
    const level = careerScore >= 650 ? 3 : careerScore >= 230 ? 2 : 1;
    const maxRoster = 5 + level * 2;
    const label = careerScore >= 900 ? 'Fundador lendário'
      : careerScore >= 500 ? 'Nome de elite'
      : careerScore >= 180 ? 'Ex-atleta reconhecido'
      : careerScore >= 60 ? 'Profissional respeitado'
      : 'Recomeço difícil';

    // Staff da carreira que pode ser trazido para a academia
    const staffToCarry = Object.entries(this.staff || {}).map(([roleId, tierIdx]) => {
      const athleteRole = STAFF_ROLES.find(r => r.id === roleId);
      if (!athleteRole) return null;
      // Map athlete staff roles to equivalent academy staff roles
      const roleMap = { coach: 'head_coach', physio: 'strength_coach', nutritionist: 'nutritionist',
                        cutman: 'cutman', psychologist: 'sports_psychologist', analyst: 'video_analyst' };
      const academyRoleId = roleMap[roleId];
      if (!academyRoleId) return null;
      const academyRole = ACADEMY_STAFF?.find(r => r.id === academyRoleId);
      if (!academyRole) return null;
      const mappedTier = Math.min(tierIdx, academyRole.tiers.length - 1);
      return { athleteRoleId: roleId, academyRoleId, tierIdx: mappedTier,
               name: academyRole.name, icon: academyRole.icon,
               salary: academyRole.tiers[mappedTier]?.salary || 0 };
    }).filter(Boolean);

    // Sugestões de nome baseadas no apelido/nome/conquistas
    const nick = fighter.nickname;
    const firstName = fighter.name?.split(' ')[0] || fighter.name;
    const nameSuggestions = [];
    if (nick) {
      nameSuggestions.push(`Academia "${nick}"`);
      nameSuggestions.push(`Gym ${nick}`);
    }
    nameSuggestions.push(`Academia ${firstName}`);
    if (worldTitles > 0) nameSuggestions.push(`${firstName} Boxing Club`);
    if (careerScore >= 400) nameSuggestions.push(`${firstName} Elite Boxing`);
    nameSuggestions.push(`Escola de Boxe ${firstName}`);

    // Itens do builder pré-desbloqueados pelo legado (níveis inteiros)
    const builderPrePurchased = [];
    if (level >= 2) ACADEMY_BUILDER_LEVELS[0].items.forEach(it => builderPrePurchased.push(it.id));
    if (level >= 3) ACADEMY_BUILDER_LEVELS[1].items.forEach(it => builderPrePurchased.push(it.id));

    // Itens exclusivos de fundador — visíveis desde o dia 1, baseados no legado real
    const founderItems = [];
    const displayName = fighter.displayName || fighter.name;

    // Placa do Fundador — sempre presente
    founderItems.push({
      id: 'founder_plaque',
      name: `Placa de Fundador`,
      icon: '🪧',
      desc: `"${displayName}" — fundador e ex-pugilista profissional.`,
      effect: { reputation: 8, morale: 5 },
      condition: 'Sempre desbloqueado',
    });

    // Corredor de cinturões — se tiver qualquer título
    const allTitles = [...new Set([...(fighter.titlesWon || []), ...(fighter.belts || [])])];
    if (allTitles.length > 0) {
      founderItems.push({
        id: 'founder_belt_wall',
        name: 'Parede de Cinturões',
        icon: '🥇',
        desc: `${allTitles.length} cinturão(ões) exibido(s): ${allTitles.slice(0,3).map(b => getBeltInfo(b).name).join(', ')}${allTitles.length > 3 ? '...' : ''}.`,
        effect: { reputation: 10 + allTitles.length * 3, scoutBonus: 5 },
        condition: `${allTitles.length} título(s) conquistado(s)`,
      });
    }

    // Sala de Troféus — títulos mundiais
    if (worldTitles >= 1) {
      founderItems.push({
        id: 'founder_trophy_room',
        name: 'Sala de Troféus',
        icon: '🏆',
        desc: `${worldTitles} título(s) mundial(is). Prospectos sonham em treinar onde um campeão treinou.`,
        effect: { reputation: 15 + worldTitles * 10, scoutBonus: 10 },
        condition: `${worldTitles} título(s) mundial(is)`,
      });
    }

    // Hall da Fama pessoal — defesas de título
    if (defenses >= 5) {
      founderItems.push({
        id: 'founder_hall_of_fame',
        name: 'Hall da Fama Pessoal',
        icon: '⭐',
        desc: `${defenses} defesas de título. Uma parede de fotos e recordações de uma carreira longa e vitoriosa.`,
        effect: { reputation: 20, morale: 15, scoutBonus: 8 },
        condition: `${defenses} defesas de título`,
      });
    }

    // Apelido na fachada — se tiver apelido
    if (nick) {
      founderItems.push({
        id: 'founder_nickname_sign',
        name: `Letreiro "${nick}"`,
        icon: '🔠',
        desc: `O apelido que fez história agora brilha na fachada. Todo mundo sabe quem fundou esta academia.`,
        effect: { reputation: 12, morale: 8 },
        condition: `Apelido "${nick}"`,
      });
    }

    // Super-cinturão / Indiscutível
    if ((fighter.superBelts || []).length > 0 || (fighter.unificationWins || 0) >= 3) {
      founderItems.push({
        id: 'founder_undisputed',
        name: 'Troféu Indiscutível',
        icon: '👑',
        desc: `Conquistou a unificação. Uma peça única que atrai atenção da mídia e dos melhores talentos do país.`,
        effect: { reputation: 30, scoutBonus: 20, morale: 10 },
        condition: 'Campeão Unificado / Super-Campeão',
      });
    }

    // Record invicto longo
    const losses = fighter.losses || 0;
    if (losses === 0 && (fighter.wins || 0) >= 10) {
      founderItems.push({
        id: 'founder_undefeated',
        name: 'Carreira Invicta',
        icon: '🛡️',
        desc: `${fighter.wins}-0. A academia é fundada com o prestígio de um cartel sem derrotas.`,
        effect: { reputation: 20, morale: 20 },
        condition: `${fighter.wins} vitórias sem derrotas`,
      });
    }

    // ── GOAT Checklist → bônus de transição ──────────────────
    const wins     = fighter.wins  || 0;
    const losses2  = fighter.losses || 0;
    const kos2     = (fighter.kos || 0) + (fighter.tkos || 0);
    const koPct2   = wins > 0 ? Math.round(kos2 / wins * 100) : 0;
    const careerYears = Math.max(1, Math.floor(((this.year - (fighter.careerStartYear || this.year)) * 52 + defenses) / 52));
    const notableWins2 = (fighter.fightHistory || []).filter(h => h.result === 'W' && h.opponentRanking && h.opponentRanking <= 5).length;
    const chDivisions = new Set((fighter.worldTitleHistory || []).map(e => e.weightClass)).size;

    const goatCriteria = [
      losses2 === 0 || (wins + losses2 >= 25 && wins / (wins + losses2) >= 0.94),
      wins >= 30,
      koPct2 >= 65,
      worldTitles >= 1,
      defenses >= 10,
      notableWins2 >= 3,
      chDivisions >= 2,
      (fighter.unificationWins || 0) >= 3,
      careerYears >= 15,
      (fighter.superBelts || []).length >= 1,
    ];
    const goatCount = goatCriteria.filter(Boolean).length;
    const isGoat    = goatCount >= 8;
    const isLegend  = goatCount >= 5;

    // Bônus escalados pelo checklist
    const goatMoneyBonus      = goatCount * 60000;
    const goatRepBonus        = goatCount * 4;
    const goatSponsorSlots    = isGoat ? 3 : isLegend ? 2 : 1;
    const goatMaxRosterBonus  = isGoat ? 4 : isLegend ? 2 : 0;

    const finalMoney     = money + goatMoneyBonus;
    const finalRep       = clamp(reputation + goatRepBonus, 5, 98);
    const finalMaxRoster = maxRoster + goatMaxRosterBonus;

    // Itens exclusivos GOAT/Lenda
    if (isLegend) {
      founderItems.push({
        id: 'founder_goat_wall',
        name: 'Galeria das Lendas',
        icon: '🐐',
        desc: `Um mural dedicado a uma carreira histórica: ${goatCount}/10 critérios GOAT atingidos. Atletas se inspiram só de olhar.`,
        effect: { reputation: 18 + goatCount * 3, morale: 12, scoutBonus: 12 },
        condition: `${goatCount}/10 critérios GOAT`,
      });
    }
    if (isGoat) {
      founderItems.push({
        id: 'founder_goat_statue',
        name: 'Estátua do G.O.A.T.',
        icon: '🗿',
        desc: `Uma estátua na entrada da academia. Fundada pelo maior de todos os tempos. O nome ecoa pelo mundo do boxe.`,
        effect: { reputation: 40, morale: 25, scoutBonus: 25 },
        condition: '8/10 critérios G.O.A.T. atingidos',
      });
    }

    return { careerScore, money: finalMoney, reputation: finalRep, level, maxRoster: finalMaxRoster, label,
             worldTitles, continentalTitles, defenses, staffToCarry, nameSuggestions, builderPrePurchased,
             founderItems, goatCount, isGoat, isLegend, sponsorSlots: goatSponsorSlots };
  }

  createAcademy({ name, country = 'BR', city = '', philosophy = 'technical', founder = null }) {
    const founderProjection = founder ? this.getAcademyFounderProjection(founder) : null;
    const founderSnapshot = founder ? {
      id: founder.id,
      name: founder.name,
      nickname: founder.nickname,
      displayName: founder.displayName,
      nationality: founder.nationality,
      record: founder.record,
      wins: founder.wins,
      losses: founder.losses,
      draws: founder.draws,
      money: founder.money,
      popularity: founder.popularity,
      reputation: founder.reputation,
      retiredAt: founder.retiredAt,
      projection: founderProjection,
    } : null;
    this.gameMode = 'academy';
    this.player = null;
    this.academy = {
      id: `academy_${Date.now()}`,
      name: name.trim(),
      country,
      city: city.trim(),
      philosophy,
      foundedYear: this.year,
      money: founderProjection?.money || 120000,
      reputation: founderProjection?.reputation || 12,
      level: founderProjection?.level || 1,
      rosterIds: [],
      maxRoster: founderProjection?.maxRoster || 6,
      trainingPlan: {},
      transactions: [],
      weeklyReports: [],
      lastFightResults: [],
      scheduledFights: [],
      founder: founderSnapshot,
      origin: founder ? 'retired_fighter' : 'independent_manager',
      // Staff & infraestrutura
      staff: {},          // { roleId: tier }
      upgrades: {},       // { upgradeId: level }
      // Shadow economy
      shadowExposure: 0,  // 0-100 risco acumulado de escândalo
      activeIllegal: {},  // { actionId: { startWeek, ... } }
      shadowHistory: [],  // escândalos passados
      // Eventos
      hostedEvents: [],
      // Builder
      builder: {
        level: founderProjection?.level || 1,
        purchased: founderProjection?.builderPrePurchased ? [...founderProjection.builderPrePurchased] : [],
      },
      // Itens exclusivos do fundador (legado do atleta)
      founderItems: founderProjection?.founderItems || [],
      // Patrocinadores
      sponsorOffers:  [],
      activeSponsors: [],
      sponsorSlots:   founderProjection?.sponsorSlots || 1,
    };

    // Carry staff from athlete career
    if (founderProjection?.staffToCarry?.length) {
      for (const s of founderProjection.staffToCarry) {
        this.academy.staff[s.academyRoleId] = s.tierIdx;
      }
    }

    // Apply founder item effects to starting reputation/bonuses
    if (founderProjection?.founderItems?.length) {
      for (const item of founderProjection.founderItems) {
        if (item.effect.reputation) this.academy.reputation = Math.min(100, this.academy.reputation + item.effect.reputation);
      }
    }

    if (!founder || this.allFighters.length === 0) this.generateWorld();
    else this.rebuildRankings();
    this.refreshAcademyCandidates(true);
    // Seed initial sponsor offers
    this.generateSponsorOffers();
    this.generateSponsorOffers();
    this.addNews({
      headline: founder
        ? `${founder.name} inicia nova fase após a aposentadoria e funda a ${this.academy.name}.`
        : `${this.academy.name} abre as portas em ${city || NAMES[country]?.nation || 'sua cidade'} com foco na formação de novos talentos.`,
      type: 'academy',
      scope: 'local',
      fighters: [],
    });
    return this.academy;
  }

  getAcademyRoster() {
    const ids = new Set(this.academy?.rosterIds || []);
    return this.allFighters.filter(f => ids.has(f.id));
  }

  getAcademyCandidates() {
    const ids = new Set(this.academyRecruitCandidates || []);
    return this.allFighters.filter(f => ids.has(f.id) && !f.retiredAt && !f.academyId);
  }

  refreshAcademyCandidates(initial = false) {
    if (!this.academy) return { success: false, reason: 'Academia não criada.' };
    const cost = initial ? 0 : 1500;
    if (!initial && this.academy.money < cost) return { success: false, reason: 'Caixa insuficiente para nova rodada de observação.' };
    const rosterIds    = new Set(this.academy.rosterIds);
    const prevIds      = new Set(this.academyRecruitCandidates || []);
    const localContinent = NAMES[this.academy.country]?.continent;
    let pool = this.allFighters
      .filter(f => !f.retiredAt && !f.academyId && !rosterIds.has(f.id) && !prevIds.has(f.id)
        && f.age >= 16 && f.age <= 30 && !(f.belts || []).length && (f.potential || 60) >= 48)
      .map(f => ({
        fighter: f,
        score: (f.nationality === this.academy.country ? 30 : 0) +
          (NAMES[f.nationality]?.continent === localContinent ? 15 : 0) +
          Math.max(0, 28 - f.age) * 2.5 +
          (f.potential || 60) * 0.4 +
          Math.random() * 35,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.fighter.id);

    // Se o mundo envelheceu e não há jovens, gera novos prospectos
    if (pool.length < 4) {
      const localNats = NATIONALITIES.filter(n => NAMES[n]?.continent === localContinent);
      const srcNats   = localNats.length >= 3 ? localNats : NATIONALITIES;
      const toSpawn   = 8 - pool.length;
      for (let i = 0; i < toSpawn; i++) {
        const nat = pick(srcNats);
        const wc  = pick(WEIGHT_CLASSES).id;
        const age = rand(17, 23);
        const ovr = rand(38, 60);
        const f   = generateFighter({ nationality: nat, weightClass: wc, age, overall: ovr });
        f.promoter = this._assignNPCPromoter(f);
        this.allFighters.push(f);
        pool.push(f.id);
      }
    }

    this.academyRecruitCandidates = pool;
    if (!initial && pool.length > 0) {
      this.academy.money -= cost;
      this._academyTransaction(-cost, 'Observação de novos prospectos');
    } else if (!initial && pool.length === 0) {
      return { success: false, reason: 'Nenhum prospecto disponível no momento. Avance semanas.' };
    }
    return { success: true, candidates: this.getAcademyCandidates() };
  }

  getAcademyFightOptions(fighterId) {
    const fighter = this.allFighters.find(f => f.id === fighterId);
    if (!fighter || !this.academy) return [];
    const wc             = fighter.weightClass;
    const localContinent = NAMES[this.academy.country]?.continent;
    const fighterRank    = (this.rankings[wc] || []).findIndex(f => f.id === fighterId) + 1 || 99;

    // Determine scope based on wins and ranking
    const scope = fighter.wins >= 10 || fighterRank <= 10 ? 'world'
                : fighter.wins >= 5  ? 'continental'
                : 'local';

    // For ranked fighters (top-15), allow world title holders as opponents
    const allowWorldBelt = fighterRank <= 15 && fighter.wins >= 10;

    const candidates = this.allFighters.filter(f => {
      if (f.retiredAt || f.id === fighterId || f.weightClass !== wc) return false;
      const hasWorldBelt = (f.belts || []).some(b => WORLD_ORGS.includes(b));
      if (hasWorldBelt && !allowWorldBelt) return false;
      if (scope === 'world') return true;
      if (scope === 'continental') return NAMES[f.nationality]?.continent === localContinent;
      return f.nationality === this.academy.country || NAMES[f.nationality]?.continent === localContinent;
    });

    // For each org, find what rank this fighter holds in that org's contender list
    const fighterOrgRanks = {};
    for (const org of WORLD_ORGS) {
      const idx = (this.orgRankings?.[org]?.[wc]?.contenders || []).findIndex(f => f.id === fighterId);
      if (idx >= 0) fighterOrgRanks[org] = idx + 1;
    }

    return candidates
      .map(f => ({ fighter: f, diff: Math.abs(f.overall - fighter.overall) + Math.random() * 8 }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 10)
      .map(({ fighter: opp }) => {
        const ovDiff      = opp.overall - fighter.overall;
        const risk        = ovDiff > 8 ? 3 : ovDiff > 3 ? 2 : ovDiff < -8 ? 0 : 1;
        const purse       = Math.round(800 + fighter.overall * 35 + (this.academy.reputation || 0) * 20 + risk * 400);
        const oppWorldBelts = (opp.belts || []).filter(b => WORLD_ORGS.includes(b));
        // Belts at stake: orgs where this fighter is a top contender AND opponent is champion
        const beltStakes  = oppWorldBelts.filter(org => fighterOrgRanks[org] && fighterOrgRanks[org] <= 5);
        // Also show opponent's org ranking positions
        const oppOrgRanks = {};
        for (const org of WORLD_ORGS) {
          if (oppWorldBelts.includes(org)) { oppOrgRanks[org] = 'C'; continue; }
          const idx = (this.orgRankings?.[org]?.[wc]?.contenders || []).findIndex(f => f.id === opp.id);
          if (idx >= 0) oppOrgRanks[org] = idx + 1;
        }
        return { opponent: opp, risk, purse, beltStakes, oppOrgRanks, fighterOrgRanks };
      });
  }

  bookAcademyFight(fighterId, opponentId) {
    if (!this.academy) return { success: false, reason: 'Academia não criada.' };
    const fighter  = this.allFighters.find(f => f.id === fighterId);
    const opponent = this.allFighters.find(f => f.id === opponentId);
    if (!fighter || !opponent) return { success: false, reason: 'Lutador não encontrado.' };
    if (!this.academy.rosterIds.includes(fighterId)) return { success: false, reason: 'Atleta não pertence à academia.' };
    if (!this.academy.scheduledFights) this.academy.scheduledFights = [];
    if (this.academy.scheduledFights.some(s => s.fighterId === fighterId)) return { success: false, reason: 'Este atleta já tem luta agendada.' };

    // Determine fight importance and lead time
    const hasBelt   = (opponent.belts || []).some(b => getBeltInfo(b).tier >= 4);
    const worldFight = (opponent.belts || []).some(b => WORLD_ORGS.includes(b));
    const ovDiff    = Math.abs(opponent.overall - fighter.overall);
    let weeksOut, importance;
    if (worldFight)        { weeksOut = 10 + Math.floor(Math.random() * 4);  importance = 'mundial';      }
    else if (hasBelt)      { weeksOut = 7  + Math.floor(Math.random() * 3);  importance = 'continental';  }
    else if (ovDiff <= 5 && fighter.wins >= 8) { weeksOut = 6 + Math.floor(Math.random() * 3); importance = 'nacional'; }
    else if (fighter.wins >= 4) { weeksOut = 4 + Math.floor(Math.random() * 3); importance = 'regional';    }
    else                   { weeksOut = 2 + Math.floor(Math.random() * 2);   importance = 'local';        }

    const fightWeek  = this.week + weeksOut;
    const fightYear  = this.year + Math.floor((this.week + weeksOut - 1) / 52);
    const event      = this._buildManagerFightEvent(fighter, opponent, importance, this.academy);
    // Determine belt stakes from org rankings
    const wc             = fighter.weightClass;
    const fighterOrgRanks = {};
    for (const org of WORLD_ORGS) {
      const idx = (this.orgRankings?.[org]?.[wc]?.contenders || []).findIndex(f => f.id === fighterId);
      if (idx >= 0) fighterOrgRanks[org] = idx + 1;
    }
    const oppWorldBelts = (opponent.belts || []).filter(b => WORLD_ORGS.includes(b));
    const beltStakes    = oppWorldBelts.filter(org => fighterOrgRanks[org] && fighterOrgRanks[org] <= 5);
    this.academy.scheduledFights.push({
      fighterId, opponentId,
      week: fightWeek % 52 || 52, year: fightYear,
      weeksOut, importance,
      campFocus: this.academy.trainingPlan[fighterId] || 'technique',
      campWeeksDone: 0,
      event,
      beltStakes,
    });
    return { success: true, weeksOut, importance };
  }

  cancelAcademyFight(fighterId) {
    if (!this.academy?.scheduledFights) return false;
    this.academy.scheduledFights = this.academy.scheduledFights.filter(s => s.fighterId !== fighterId);
    return true;
  }

  // Staff da Academia
  getAcademyStaffBonus() {
    const a = this.academy;
    if (!a) return {};
    const bonus = { trainGain: 0, injuryRisk: 0, condBonus: 0, morale: 0, mentalBonus: 0,
      fightBonus: 0, recovery: 0, tkoResist: 0, scoutQuality: 0, scoutCost: 0,
      purseBonus: 0, fightOptions: 0, repGain: 0, sponsorBonus: 0 };
    for (const [roleId, tier] of Object.entries(a.staff || {})) {
      const role = ACADEMY_STAFF.find(r => r.id === roleId);
      if (!role) continue;
      const tierData = role.tiers.find(t => t.tier === tier);
      if (!tierData?.bonus) continue;
      for (const [k, v] of Object.entries(tierData.bonus)) {
        if (k in bonus) bonus[k] += v;
      }
    }
    // Upgrades de instalações
    for (const [upgradeId, level] of Object.entries(a.upgrades || {})) {
      const upgrade = ACADEMY_UPGRADES.find(u => u.id === upgradeId);
      if (!upgrade) continue;
      const levelData = upgrade.levels.find(l => l.level === level);
      if (!levelData?.effect) continue;
      for (const [k, v] of Object.entries(levelData.effect)) {
        if (k in bonus) bonus[k] += v;
      }
    }
    return bonus;
  }

  hireAcademyStaff(roleId, tier) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    const role = ACADEMY_STAFF.find(r => r.id === roleId);
    if (!role) return { success: false, reason: 'Cargo inválido.' };
    const tierData = role.tiers.find(t => t.tier === tier);
    if (!tierData) return { success: false, reason: 'Nível inválido.' };
    const currentTier = a.staff[roleId] || 0;
    if (currentTier >= tier) return { success: false, reason: 'Já contratado neste nível ou superior.' };
    // Signing fee = 4 weeks salary for new hire, 2 weeks for upgrade
    const signingFee = tierData.salary * (currentTier === 0 ? 4 : 2);
    if (a.money < signingFee) return { success: false, reason: `Contratação exige ${formatCurrency(signingFee)} de entrada.` };
    a.money -= signingFee;
    a.staff[roleId] = tier;
    this._academyTransaction(-signingFee, `Contratação: ${role.name} (${tierData.label})`);
    return { success: true, role, tier: tierData };
  }

  fireAcademyStaff(roleId) {
    const a = this.academy;
    if (!a || !a.staff[roleId]) return { success: false, reason: 'Membro não contratado.' };
    const role = ACADEMY_STAFF.find(r => r.id === roleId);
    delete a.staff[roleId];
    this.addNews({ headline: `${a.name} dispensa ${role?.name || roleId}.`, type: 'academy', scope: 'local', fighters: [] });
    return { success: true };
  }

  getAcademyWeeklyStaffCost() {
    const a = this.academy;
    if (!a) return 0;
    return Object.entries(a.staff || {}).reduce((sum, [roleId, tier]) => {
      const role = ACADEMY_STAFF.find(r => r.id === roleId);
      const tierData = role?.tiers.find(t => t.tier === tier);
      return sum + (tierData?.salary || 0);
    }, 0);
  }

  // Upgrades de Instalações
  buyAcademyUpgrade(upgradeId) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    const upgrade = ACADEMY_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return { success: false, reason: 'Upgrade inválido.' };
    const currentLevel = a.upgrades[upgradeId] || 1;
    const nextLevelData = upgrade.levels.find(l => l.level === currentLevel + 1);
    if (!nextLevelData) return { success: false, reason: 'Já no nível máximo.' };
    if (a.money < nextLevelData.cost) return { success: false, reason: `Necessário ${formatCurrency(nextLevelData.cost)}.` };
    a.money -= nextLevelData.cost;
    a.upgrades[upgradeId] = currentLevel + 1;
    this._academyTransaction(-nextLevelData.cost, `Upgrade: ${upgrade.name} → ${nextLevelData.label}`);
    return { success: true, upgrade, newLevel: nextLevelData };
  }

  // Shadow Economy
  getShadowExposureRisk() {
    const a = this.academy;
    if (!a) return 0;
    const base = (a.shadowExposure || 0);
    // Each active illegal action adds ongoing exposure
    const activeBonus = Object.keys(a.activeIllegal || {}).length * 8;
    return Math.min(100, base + activeBonus);
  }

  startIllegalAction(actionId, fighterId = null) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    const action = ACADEMY_SHADOW_ECONOMY.find(x => x.id === actionId);
    if (!action) return { success: false, reason: 'Ação inválida.' };
    const cost = action.cost || 0;
    if (cost > 0 && a.money < cost) return { success: false, reason: `Necessário ${formatCurrency(cost)}.` };
    if (cost > 0) { a.money -= cost; this._academyTransaction(-cost, `[⚠️ Ilegal] ${action.name}`); }
    if (!a.activeIllegal) a.activeIllegal = {};
    a.activeIllegal[actionId] = { startWeek: this.week, startYear: this.year, fighterId };
    a.shadowExposure = Math.min(100, (a.shadowExposure || 0) + (action.exposure || 0));
    return { success: true, action };
  }

  stopIllegalAction(actionId) {
    if (!this.academy?.activeIllegal) return false;
    delete this.academy.activeIllegal[actionId];
    return true;
  }

  _checkShadowScandal() {
    const a = this.academy;
    if (!a || !Object.keys(a.activeIllegal || {}).length) return null;
    const exposure = this.getShadowExposureRisk();
    const roll = Math.random() * 100;
    if (roll > exposure * 0.35) return null; // weighted chance based on exposure

    // Pick one active action to expose
    const ids = Object.keys(a.activeIllegal);
    const exposedId = ids[Math.floor(Math.random() * ids.length)];
    const action = ACADEMY_SHADOW_ECONOMY.find(x => x.id === exposedId);
    if (!action) return null;

    const scandal = action.scandal;
    a.reputation = clamp((a.reputation || 0) - scandal.repLoss, 0, 100);
    if (scandal.fine) { a.money -= scandal.fine; this._academyTransaction(-scandal.fine, `[MULTA] Escândalo: ${action.name}`); }
    delete a.activeIllegal[exposedId];
    a.shadowExposure = Math.max(0, (a.shadowExposure || 0) - 20);
    if (!a.shadowHistory) a.shadowHistory = [];
    a.shadowHistory.unshift({ actionId: exposedId, week: this.week, year: this.year, headline: scandal.headline });
    this.addNews({ headline: `🚨 ${scandal.headline} — ${a.name} enfrenta consequências.`, type: 'scandal', scope: 'national', fighters: [] });
    return { scandal, action };
  }

  // Hospedar Eventos
  hostAcademyEvent(eventTypeId) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    const evType = ACADEMY_EVENT_TYPES.find(e => e.id === eventTypeId);
    if (!evType) return { success: false, reason: 'Tipo de evento inválido.' };

    // Check arena capacity
    const arenaLevel  = a.upgrades?.arena || 1;
    const arenaData   = ACADEMY_UPGRADES.find(u => u.id === 'arena')?.levels.find(l => l.level === arenaLevel);
    const canHost     = arenaData?.effect?.canHostEvents;
    const cap         = arenaData?.effect?.eventCap || 0;
    if (evType.capacityRequired > 0 && (!canHost || cap < evType.capacityRequired)) {
      return { success: false, reason: `Necessário arena com capacidade ≥ ${evType.capacityRequired}.` };
    }
    if (a.money < evType.cost) return { success: false, reason: `Necessário ${formatCurrency(evType.cost)}.` };

    a.money -= evType.cost;
    this._academyTransaction(-evType.cost, `Evento: ${evType.name}`);

    const repBonus = (a.reputation || 0) * 0.04;
    const revenue  = Math.round(evType.revenueBase * (1 + repBonus) * (0.8 + Math.random() * 0.4));
    const profit   = revenue - evType.cost;
    a.money += revenue;
    this._academyTransaction(revenue, `Receita evento: ${evType.name}`);
    a.reputation = clamp((a.reputation || 0) + evType.repGain, 0, 100);
    if (!a.hostedEvents) a.hostedEvents = [];
    a.hostedEvents.unshift({ typeId: eventTypeId, week: this.week, year: this.year, revenue, profit });
    this.addNews({
      headline: `${a.name} organiza "${evType.name}" com receita de ${formatCurrency(revenue)}.`,
      type: 'academy', scope: 'local', fighters: [],
    });
    return { success: true, revenue, profit, repGain: evType.repGain };
  }

  // Vender/Transferir Atleta
  getAthleteTransferValue(fighterId) {
    const f = this.allFighters.find(x => x.id === fighterId);
    if (!f) return 0;
    const rank = this.rankings[f.weightClass]?.findIndex(r => r.fighter?.id === f.id);
    const rankBonus = rank >= 0 && rank < 20 ? (20 - rank) * 3000 : 0;
    return Math.round(5000 + f.overall * 600 + (f.potential || 70) * 400 + (f.wins || 0) * 1200 + rankBonus);
  }

  transferAthlete(fighterId) {
    const a = this.academy;
    if (!a?.rosterIds.includes(fighterId)) return { success: false, reason: 'Atleta não pertence à academia.' };
    const fighter = this.allFighters.find(f => f.id === fighterId);
    if (!fighter) return { success: false, reason: 'Atleta não encontrado.' };
    const value = this.getAthleteTransferValue(fighterId);
    a.money += value;
    this._academyTransaction(value, `Transferência: ${fighter.name}`);
    a.rosterIds = a.rosterIds.filter(id => id !== fighterId);
    delete a.trainingPlan[fighterId];
    a.scheduledFights = (a.scheduledFights || []).filter(s => s.fighterId !== fighterId);
    this._tryInductAcademyAthlete(fighter, 'transferred');
    fighter.academyId = null;
    fighter.gym = null;
    this.addNews({
      headline: `${fighter.name} é transferido pela ${a.name} por ${formatCurrency(value)}.`,
      type: 'academy', scope: 'national', fighters: [fighter],
    });
    return { success: true, value };
  }

  // Academia Hall of Fame / Trophy Room
  _academyLegacyScore(fighter) {
    // Normalized score: 1.0 = eligible for trophy room / hall of fame
    const locals       = (fighter.trophies || []).filter(t => t.tier === 'local').length;
    const regionals    = (fighter.trophies || []).filter(t => t.tier === 'regional').length;
    const nationals    = (fighter.trophies || []).filter(t => t.tier === 'national').length;
    const allBelts     = [...new Set([...(fighter.titlesWon || []), ...(fighter.belts || [])])];
    const continentals = allBelts.filter(b => getBeltInfo(b).tier === 4).length;
    const worlds       = allBelts.filter(b => WORLD_ORGS.includes(b)).length;
    return locals / 15 + regionals / 7 + nationals / 3 + continentals + worlds * 3;
  }

  _tryInductAcademyAthlete(fighter, reason = 'departed') {
    const a = this.academy;
    if (!a) return;
    a.legacyAthletes = a.legacyAthletes || [];
    if (a.legacyAthletes.some(e => e.fighterId === fighter.id)) return; // already inducted
    const score = this._academyLegacyScore(fighter);
    if (score < 1.0) return;
    const allBelts = [...new Set([...(fighter.titlesWon || []), ...(fighter.belts || [])])];
    const worlds = allBelts.filter(b => WORLD_ORGS.includes(b));
    const continentals = allBelts.filter(b => getBeltInfo(b).tier === 4 && !WORLD_ORGS.includes(b));
    const entry = {
      fighterId:   fighter.id,
      name:        fighter.name,
      nickname:    fighter.nickname || null,
      displayName: fighter.displayName || fighter.name,
      nationality: fighter.nationality,
      weightClass: fighter.weightClass,
      record:      fighter.record,
      wins:        fighter.wins,
      losses:      fighter.losses,
      kos:         fighter.kos || 0,
      worldBelts:  worlds,
      continentalBelts: continentals,
      trophies:    fighter.trophies || [],
      score:       Math.round(score * 100) / 100,
      reason,      // 'departed' | 'transferred' | 'active'
      inductedWeek: this.week,
      inductedYear: this.year,
    };
    a.legacyAthletes.push(entry);
    this.addNews({
      headline: `${fighter.name} entra para o Hall de Conquistas da ${a.name} com ${fighter.record}.`,
      type: 'academy', scope: 'national', fighters: [fighter],
    });
  }

  // Check active roster for athletes who already qualify (called weekly)
  _checkActiveRosterInductions() {
    const a = this.academy;
    if (!a) return;
    for (const id of a.rosterIds) {
      const f = this.allFighters.find(x => x.id === id);
      if (f) this._tryInductAcademyAthlete(f, 'active');
    }
  }

  // Academia Builder
  getBuilderState() {
    const a = this.academy;
    if (!a) return null;
    a.builder = a.builder || { level: 1, purchased: [] };
    const b = a.builder;
    const levelData = ACADEMY_BUILDER_LEVELS[b.level - 1];
    const purchased = new Set(b.purchased);
    const levelItems = levelData.items.map(it => ({ ...it, bought: purchased.has(it.id) }));
    const levelComplete = levelItems.every(it => it.bought);
    // aggregate bonuses from all purchased items across all levels
    let bonuses = { trainBonus: 0, injuryRisk: 0, scoutBonus: 0, morale: 0, reputation: 0 };
    b.purchased.forEach(id => {
      for (const lvl of ACADEMY_BUILDER_LEVELS) {
        const it = lvl.items.find(x => x.id === id);
        if (it) { const [k, v] = it.effect.split(/([+-]\d+)/); bonuses[k] = (bonuses[k] || 0) + parseInt(v || 0); }
      }
    });
    // Add founder item bonuses
    const founderItems = a.founderItems || [];
    for (const item of founderItems) {
      for (const [k, v] of Object.entries(item.effect || {})) {
        if (k !== 'reputation') bonuses[k] = (bonuses[k] || 0) + v; // reputation already applied at creation
      }
    }
    const legacyAthletes = (a.legacyAthletes || []).slice().sort((x, y) => y.score - x.score);
    return { level: b.level, levelData, levelItems, levelComplete, purchased: b.purchased, bonuses, founderItems, legacyAthletes };
  }

  buyBuilderItem(itemId) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    a.builder = a.builder || { level: 1, purchased: [] };
    const b = a.builder;
    const levelData = ACADEMY_BUILDER_LEVELS[b.level - 1];
    const item = levelData.items.find(it => it.id === itemId);
    if (!item) return { success: false, reason: 'Item não encontrado neste nível.' };
    if (b.purchased.includes(itemId)) return { success: false, reason: 'Já comprado.' };
    if (a.money < item.cost) return { success: false, reason: `Caixa insuficiente (${formatCurrency(item.cost)}).` };
    a.money -= item.cost;
    this._academyTransaction(-item.cost, `Construção: ${item.name}`);
    b.purchased.push(itemId);
    // apply roster/staff/sponsor slot effects immediately
    const [key, valStr] = item.effect.match(/([a-zA-Z]+)([+-]\d+)/).slice(1);
    const val = parseInt(valStr);
    if (key === 'rosterSlots') a.maxRoster = (a.maxRoster || 5) + val;
    if (key === 'staffSlots')  a.maxStaff  = (a.maxStaff  || 3) + val;
    if (key === 'sponsorSlots') a.sponsorSlots = (a.sponsorSlots || 1) + val;
    return { success: true, item };
  }

  expandAcademy() {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    a.builder = a.builder || { level: 1, purchased: [] };
    const b = a.builder;
    const levelData = ACADEMY_BUILDER_LEVELS[b.level - 1];
    if (b.level >= 6) return { success: false, reason: 'Nível máximo atingido.' };
    const levelItems = levelData.items;
    if (!levelItems.every(it => b.purchased.includes(it.id))) return { success: false, reason: 'Compre todos os itens do nível atual primeiro.' };
    const cost = levelData.expandCost;
    if (a.money < cost) return { success: false, reason: `Expansão custa ${formatCurrency(cost)}.` };
    a.money -= cost;
    this._academyTransaction(-cost, `Expansão: Nível ${b.level + 1}`);
    b.level += 1;
    const nextLevel = ACADEMY_BUILDER_LEVELS[b.level - 1];
    a.maxRoster  = (a.maxRoster  || 5) + nextLevel.unlocks.rosterSlots;
    a.maxStaff   = (a.maxStaff   || 3) + nextLevel.unlocks.staffSlots;
    a.sponsorSlots = (a.sponsorSlots || 1) + nextLevel.unlocks.sponsorSlots;
    a.level = b.level;
    this.addNews({ headline: `${a.name} expande para nível ${b.level}: "${nextLevel.name}"!`, type: 'academy', scope: 'national', fighters: [] });
    return { success: true, newLevel: b.level };
  }

  // Sponsor management
  generateSponsorOffers() {
    const a = this.academy;
    if (!a) return;
    a.sponsorOffers = a.sponsorOffers || [];
    a.activeSponsors = a.activeSponsors || [];

    const slots    = a.sponsorSlots || 1;
    const active   = a.activeSponsors.length;
    const rep      = a.reputation || 0;
    const wins     = this.getAcademyRoster().reduce((s, f) => s + (f.wins || 0), 0);
    const pending  = a.sponsorOffers.length;

    // Only generate if there's space and not too many pending
    if (active >= slots || pending >= 3) return;

    const eligible = ACADEMY_SPONSORS.filter(sp => {
      const alreadyActive  = a.activeSponsors.some(c => c.sponsorId === sp.id);
      const alreadyPending = a.sponsorOffers.some(o => o.sponsorId === sp.id);
      return !alreadyActive && !alreadyPending && rep >= sp.minRep && wins >= sp.minWins;
    });

    if (!eligible.length) return;

    // Pick 1–2 offers per call, weighted toward lower tiers for low reputation
    const weighted = eligible.flatMap(sp => {
      const weight = sp.tier === 1 ? 4 : sp.tier === 2 ? 3 : sp.tier === 3 ? 2 : 1;
      return Array(weight).fill(sp);
    });
    const offer = pick(weighted);
    // Small pay variation ±10%
    const payVariation = 0.9 + Math.random() * 0.2;
    a.sponsorOffers.push({
      sponsorId:   offer.id,
      name:        offer.name,
      category:    offer.category,
      tier:        offer.tier,
      icon:        offer.icon,
      weeklyPay:   Math.round(offer.weeklyPay * payVariation),
      duration:    offer.duration,
      obligation:  offer.obligation,
      expiresWeek: this.week + 4, // offer expires in 4 weeks
    });
  }

  acceptSponsor(sponsorId) {
    const a = this.academy;
    if (!a) return { success: false, reason: 'Academia não criada.' };
    a.sponsorOffers  = a.sponsorOffers  || [];
    a.activeSponsors = a.activeSponsors || [];

    const offer = a.sponsorOffers.find(o => o.sponsorId === sponsorId);
    if (!offer) return { success: false, reason: 'Oferta não encontrada.' };

    const slots = a.sponsorSlots || 1;
    if (a.activeSponsors.length >= slots)
      return { success: false, reason: `Sem vagas de patrocinador (${a.activeSponsors.length}/${slots}). Expanda a academia.` };

    // Check category exclusivity (tier 4 sponsors demand exclusive category)
    const sp = ACADEMY_SPONSORS.find(s => s.id === sponsorId);
    if (sp?.tier === 4) {
      const conflict = a.activeSponsors.find(c => c.category === sp.category);
      if (conflict) return { success: false, reason: `${sp.name} exige exclusividade na categoria ${sp.category}. Rescinda o contrato com ${conflict.name} primeiro.` };
    }

    a.sponsorOffers = a.sponsorOffers.filter(o => o.sponsorId !== sponsorId);
    a.activeSponsors.push({
      ...offer,
      weeksRemaining: offer.duration,
      weekSigned:     this.week,
      yearSigned:     this.year,
    });
    this.addNews({ headline: `${a.name} fecha patrocínio com ${offer.name}!`, type: 'academy', scope: 'local', fighters: [] });
    return { success: true };
  }

  declineSponsor(sponsorId) {
    const a = this.academy;
    if (!a) return;
    a.sponsorOffers = (a.sponsorOffers || []).filter(o => o.sponsorId !== sponsorId);
  }

  terminateSponsor(sponsorId) {
    const a = this.academy;
    if (!a) return { success: false };
    const contract = (a.activeSponsors || []).find(c => c.sponsorId === sponsorId);
    if (!contract) return { success: false, reason: 'Contrato não encontrado.' };
    // Penalty: lose 1 week of pay
    const penalty = contract.weeklyPay;
    if (a.money < penalty) return { success: false, reason: `Multa rescisória de ${formatCurrency(penalty)} — caixa insuficiente.` };
    a.money -= penalty;
    this._academyTransaction(-penalty, `Multa rescisória: ${contract.name}`);
    a.activeSponsors = a.activeSponsors.filter(c => c.sponsorId !== sponsorId);
    return { success: true };
  }

  _processAcademySponsors() {
    const a = this.academy;
    if (!a) return 0;
    a.activeSponsors = a.activeSponsors || [];
    a.sponsorOffers  = a.sponsorOffers  || [];

    // Expire pending offers
    a.sponsorOffers = a.sponsorOffers.filter(o => !o.expiresWeek || o.expiresWeek > this.week);

    // Tick down active contracts
    let totalPay = 0;
    a.activeSponsors = a.activeSponsors.filter(c => {
      c.weeksRemaining--;
      totalPay += c.weeklyPay;
      if (c.weeksRemaining <= 0) {
        this.addNews({ headline: `Contrato com ${c.name} encerrado. Renovação disponível em breve.`, type: 'academy', scope: 'local', fighters: [] });
        return false;
      }
      return true;
    });

    // Maybe generate a new offer (≈30% chance per week when there's room)
    if (Math.random() < 0.30) this.generateSponsorOffers();

    return totalPay;
  }

  academySigningCost(fighter) {
    return Math.round(1800 + fighter.overall * 55 + fighter.popularity * 30 + Math.max(0, fighter.potential - 70) * 80);
  }

  academyWeeklyWage(fighter) {
    return Math.round(250 + fighter.overall * 12 + fighter.popularity * 4);
  }

  signAcademyFighter(fighterId) {
    const academy = this.academy;
    const fighter = this.allFighters.find(f => f.id === fighterId);
    if (!academy || !fighter || fighter.academyId) return { success: false, reason: 'Prospecto indisponível.' };
    if (academy.rosterIds.length >= academy.maxRoster) return { success: false, reason: 'O elenco está no limite de vagas.' };
    const cost = this.academySigningCost(fighter);
    if (academy.money < cost) return { success: false, reason: `A contratação exige ${formatCurrency(cost)}.` };
    academy.money -= cost;
    academy.rosterIds.push(fighter.id);
    academy.trainingPlan[fighter.id] = ACADEMY_PHILOSOPHIES.find(p => p.id === academy.philosophy)?.focus || 'technique';
    fighter.academyId = academy.id;
    fighter.gym = { academyId: academy.id, name: academy.name, level: academy.level };
    this.academyRecruitCandidates = this.academyRecruitCandidates.filter(id => id !== fighter.id);
    this._academyTransaction(-cost, `Assinatura de ${fighter.name}`);
    this.addNews({ headline: `${academy.name} anuncia ${fighter.name}, prospecto de ${fighter.age} anos dos ${fighter.weightClassData?.name}.`, type: 'academy', scope: 'local', fighters: [fighter] });
    return { success: true, fighter, cost };
  }

  releaseAcademyFighter(fighterId) {
    const fighter = this.getAcademyRoster().find(f => f.id === fighterId);
    if (!fighter) return { success: false, reason: 'Atleta não pertence à academia.' };
    this._tryInductAcademyAthlete(fighter, 'departed');
    this.academy.rosterIds = this.academy.rosterIds.filter(id => id !== fighterId);
    delete this.academy.trainingPlan[fighterId];
    fighter.academyId = null;
    fighter.gym = null;
    this.addNews({ headline: `${fighter.name} deixa a equipe da ${this.academy.name}.`, type: 'academy', scope: 'local', fighters: [fighter] });
    return { success: true };
  }

  setAcademyTrainingFocus(fighterId, focusId) {
    if (!this.academy?.rosterIds.includes(fighterId) || !TRAINING_FOCUSES.some(f => f.id === focusId)) return false;
    this.academy.trainingPlan[fighterId] = focusId;
    return true;
  }

  getAcademyScoutingReport(fighter) {
    const academy = this.academy;
    const uncertainty = Math.max(4, 14 - (academy?.level || 1) * 2);
    const low = clamp(fighter.potential - uncertainty, 40, 99);
    const high = clamp(fighter.potential + uncertainty, low, 99);
    const trait = NAMES[fighter.nationality]?.trait;
    const synergy = getSynergy(fighter.styleId, fighter.personalityId);
    return {
      potential: `${low}-${high}`,
      style: fighter.style?.name || fighter.styleId,
      personality: fighter.personality?.name || fighter.personalityId,
      trait: trait?.name || 'Sem traço nacional',
      synergy: synergy?.label || 'Sem sinergia especial',
      wage: this.academyWeeklyWage(fighter),
      signingCost: this.academySigningCost(fighter),
    };
  }

  academyWeeklyBudget() {
    const a      = this.academy;
    const roster = this.getAcademyRoster();
    const staffBonus = this.getAcademyStaffBonus();
    const staffCost  = this.getAcademyWeeklyStaffCost();
    const wages      = roster.reduce((sum, fighter) => sum + this.academyWeeklyWage(fighter), 0);
    const maintenance = 900 + (a?.level || 1) * 650;
    const memberships = 1500 + (a?.level || 1) * 900 + roster.length * 180;
    const contractPay = (a?.activeSponsors || []).reduce((s, c) => s + c.weeklyPay, 0);
    const sponsors    = Math.round(contractPay * (1 + (staffBonus.sponsorBonus || 0)));
    const dopingCost  = Object.entries(a?.activeIllegal || {})
      .reduce((sum, [id]) => {
        const action = ACADEMY_SHADOW_ECONOMY.find(x => x.id === id);
        return sum + (action?.costPerWeek || 0);
      }, 0);
    const total = wages + staffCost + maintenance + dopingCost;
    const income = memberships + sponsors;
    return { wages, staffCost, maintenance, dopingCost, memberships, sponsors, net: income - total };
  }

  _academyTransaction(amount, label) {
    if (!this.academy) return;
    this.academy.transactions.unshift({ amount, label, year: this.year, week: this.week });
    this.academy.transactions = this.academy.transactions.slice(0, 30);
  }

  _runAcademyWeek() {
    if (!this.academy) return { training: [], fights: [], scandal: null };
    const a          = this.academy;
    this._processAcademySponsors();
    const budget     = this.academyWeeklyBudget();
    const staffBonus = this.getAcademyStaffBonus();
    a.money += budget.net;
    this._academyTransaction(budget.memberships + budget.sponsors, 'Receitas semanais');
    this._academyTransaction(-(budget.wages + budget.staffCost + budget.maintenance + budget.dopingCost), 'Folha e custos');

    // Weekly PR reputation gain
    if (staffBonus.repGain) {
      a.reputation = clamp((a.reputation || 0) + staffBonus.repGain, 0, 100);
    }
    // Morale boost from psychologist
    if (staffBonus.morale) {
      for (const fighter of this.getAcademyRoster()) {
        fighter.morale = clamp((fighter.morale || 60) + 1, 0, 100);
      }
    }

    const philosophy    = ACADEMY_PHILOSOPHIES.find(p => p.id === a.philosophy);
    const dopingActive  = !!a.activeIllegal?.doping;
    const trainingReports = [];

    // Determine which fighters are in fight camp this week
    const inCamp = new Set((a.scheduledFights || []).map(s => s.fighterId));

    for (const fighter of this.getAcademyRoster()) {
      if (fighter.retiredAt || fighter.isInjured) continue;
      const sched   = (a.scheduledFights || []).find(s => s.fighterId === fighter.id);
      const focus   = sched ? (sched.campFocus || a.trainingPlan[fighter.id]) : (a.trainingPlan[fighter.id] || philosophy?.focus || 'technique');
      // Camp fighters get a focused bonus; non-camp fighters train normally
      const campBonus = sched ? 0.20 : 0;
      const gainMult = (philosophy?.bonus || 0) + (staffBonus.trainGain || 0) + (staffBonus.mentalBonus || 0)
                     + (dopingActive ? 0.50 : 0) + campBonus;
      const riskMod  = (staffBonus.injuryRisk || 0);
      const camp     = new TrainingCamp(fighter, 1, [focus], { gain: gainMult, risk: Math.max(0.01, a.level * 0.03 + riskMod) });
      const result   = camp.simulate();
      fighter.markTraining();
      if (sched) sched.campWeeksDone = (sched.campWeeksDone || 0) + 1;
      trainingReports.push({ fighterId: fighter.id, name: fighter.name, focus, inCamp: !!sched, ...result });
    }

    // Separate fights due this week — return as pendingFights so UI can show watch screen
    const now = this.week;
    const pendingFights = (a.scheduledFights || []).filter(s => s.week <= now);
    const fightResults  = [];

    // Only auto-simulate fights NOT pending for live watch
    // (pendingFights will be resolved by simulateAcademyFight after player watches)
    a.scheduledFights = (a.scheduledFights || []).filter(s => s.week > now);

    // Reduce shadow exposure slowly over time (cooling off)
    if (a.shadowExposure > 0) a.shadowExposure = Math.max(0, a.shadowExposure - 3);

    // Roll for scandal
    const scandal = this._checkShadowScandal();

    a.weeklyReports    = trainingReports;
    a.lastFightResults = fightResults;
    if (a.money < 0) a.reputation = clamp(a.reputation - 2, 0, 100);
    return { training: trainingReports, fights: fightResults, scandal, pendingFights };
  }

  advanceAcademyWeek() {
    if (!this.academy) return { training: [], fights: [], pendingFights: [] };
    const results = this._runAcademyWeek();
    this._checkActiveRosterInductions();
    this.advanceWeeks(1, { academyManaged: true });
    return results;
  }

  // Resolve a pending fight after player watches/skips.
  // engineResult: optional result from LiveFightEngine (when player watched live)
  simulateAcademyFight(fighterId, opponentId, cornerAdvice = [], engineResult = null) {
    const a        = this.academy;
    if (!a) return null;
    const fighter  = this.allFighters.find(f => f.id === fighterId);
    const opponent = this.allFighters.find(f => f.id === opponentId);
    if (!fighter || !opponent) return null;

    const staffBonus     = this.getAcademyStaffBonus();
    const matchmakeBonus = staffBonus.purseBonus || 0;
    const fightWinBonus  = staffBonus.fightBonus || 0;
    const tkoResist      = staffBonus.tkoResist  || 0;
    const judgesFixed    = !!a.activeIllegal?.judge_bribe;
    const matchFixed     = !!a.activeIllegal?.match_fixing;
    const gambleActive   = !!a.activeIllegal?.gambling;

    const adviceBonus = Math.min(0.15, cornerAdvice.length * 0.04);

    let r;
    if (engineResult) {
      // Use the live engine result directly — player watched the fight
      r = {
        winnerId: engineResult.winnerFighter?.id,
        method:   engineResult.method,
        round:    engineResult.round,
      };
    } else {
      const rounds = fighter.wins >= 8 ? 10 : 6;
      const sim    = new FightSimulation(fighter, opponent, {
        rounds,
        tkoResistBonus: tkoResist,
        bonus1: adviceBonus,
      });
      r = sim.simulate();
    }
    let won   = r.winnerId === fighter.id;

    if (!won && matchFixed  && Math.random() < 0.92) won = true;
    if (!won && judgesFixed && r.method?.includes('Decisão') && Math.random() < 0.85) won = true;
    if (!won && fightWinBonus > 0 && Math.random() < fightWinBonus) won = true;

    const basePurse  = Math.round(800 + fighter.overall * 35 + (a.reputation || 0) * 20);
    const purse      = Math.round(basePurse * (1 + matchmakeBonus));
    fighter.money    = (fighter.money || 0) + purse;
    const academyCut = Math.round(purse * 0.12);
    a.money         += academyCut;
    this._academyTransaction(academyCut, `Corte da luta de ${fighter.name}`);

    if (gambleActive && won) {
      const profit = Math.round(purse * 0.30 * 3.5);
      a.money     += profit;
      this._academyTransaction(profit, `[⚠️ Apostas] Ganho em ${fighter.name}`);
    }

    if (won) {
      fighter.recordWin(opponent, r.method, r.round);
      a.reputation = clamp((a.reputation || 0) + 2, 0, 100);
    } else {
      fighter.recordLoss(opponent, r.method, r.round);
    }
    this.rebuildRankings();
    this._tryInductAcademyAthlete(fighter, 'active');
    this.addNews({
      headline: `${won ? '✅' : '❌'} ${fighter.name} ${won ? 'vence' : 'perde para'} ${opponent.name} por ${r.method} no R${r.round} (${a.name})`,
      type: 'academy', scope: 'local', fighters: [fighter, opponent],
    });

    return { fighterId, won, fighter, opponent, method: r.method, round: r.round, purse, academyCut, roundLog: r.roundLog || [] };
  }

  setAcademyCampFocus(fighterId, focus) {
    const sched = (this.academy?.scheduledFights || []).find(s => s.fighterId === fighterId);
    if (!sched) return false;
    sched.campFocus = focus;
    return true;
  }

  // World generation
  generateWorld() {
    this.allFighters = [];

    // Group nationalities by continent
    const natsByCont = {};
    for (const nat of NATIONALITIES) {
      const cont = NAMES[nat].continent;
      if (!natsByCont[cont]) natsByCont[cont] = [];
      natsByCont[cont].push(nat);
    }

    // Target fighters per continent (distributed evenly across 12 weight classes)
    const CONT_TARGETS = {
      americas: 960, europa: 960, asia: 960, africa: 960, oceania: 960,
    };

    for (const [cont, target] of Object.entries(CONT_TARGETS)) {
      const nats = natsByCont[cont];
      if (!nats || !nats.length) continue;
      const perWC = Math.round(target / WEIGHT_CLASSES.length); // ~17, ~13, ~9, ~5

      for (const wc of WEIGHT_CLASSES) {
        const count = rand(perWC - 1, perWC + 1);
        for (let i = 0; i < count; i++) {
          const nat   = pick(nats);
          const level = i < 3 ? rand(76, 92)
                      : i < 8 ? rand(60, 79)
                      :          rand(38, 62);
          const f = generateFighter({
            nationality: nat,
            weightClass: wc.id,
            level,
            wins:   i < 3 ? rand(18, 35) : i < 8 ? rand(5, 22) : rand(0, 12),
            losses: i < 3 ? rand(0, 4)   : i < 8 ? rand(1, 6)  : rand(0, 5),
          });
          this.allFighters.push(f);
        }
      }
    }

    // Assign world belts: top 4 overall per weight class get one each
    // Assign continental belts: best unbelted fighter of each continent per weight class
    for (const wc of WEIGHT_CLASSES) {
      const wcFighters = this.allFighters
        .filter(f => f.weightClass === wc.id)
        .sort((a, b) => b.overall - a.overall);

      WORLD_ORGS.forEach((org, i) => {
        if (wcFighters[i]) wcFighters[i].belts.push(org);
      });

      for (const contKey of Object.keys(CONTINENTS)) {
        const best = wcFighters.find(f =>
          NAMES[f.nationality]?.continent === contKey && f.belts.length === 0);
        if (best) best.belts.push(`continental:${contKey}`);
      }
    }

    // Assign promoter to every NPC fighter based on their level
    for (const f of this.allFighters) {
      f.promoter = this._assignNPCPromoter(f);
    }

    this.rebuildRankings();
    this._generateInitialNews();
  }

  _assignNPCPromoter(fighter) {
    const wins    = fighter.wins || 0;
    const ovr     = fighter.overall || 50;
    const nat     = fighter.nationality || '';
    const hasBelt = (fighter.belts || []).some(b => WORLD_ORGS.includes(b));

    // Continent map mirrors data.js COUNTRIES
    const CONT = {
      US:'americas', MX:'americas', BR:'americas', AR:'americas', CU:'americas', PR:'americas',
      GB:'europa',   UA:'europa',   RU:'europa',   DE:'europa',   IT:'europa',   ES:'europa',   IE:'europa',
      PH:'asia',     JP:'asia',     KZ:'asia',     UZ:'asia',     TH:'asia',
      NG:'africa',   GH:'africa',   ZA:'africa',
      AU:'oceania',  NZ:'oceania',
    };
    const continent = CONT[nat] || null;

    const byId  = id  => PROMOTERS.find(p => p.id  === id);
    const natP  = tier => PROMOTERS.filter(p => p.tier === 'national'     && p.scope === nat  ).sort((a,b) => b.prestige - a.prestige)[tier === 'hi' ? 0 : 1] || null;
    const contP = ()   => PROMOTERS.find(p => p.tier === 'continental'    && p.scope === continent);
    const pick  = (...ids) => { for (const id of ids) { const p = typeof id === 'string' ? byId(id) : id; if (p) return p; } return PROMOTERS[PROMOTERS.length - 1]; };

    // Elite → global
    if (hasBelt || ovr >= 85 || wins >= 22) return pick('apex', 'crown_intl', contP());
    if (ovr >= 78 || wins >= 16)            return pick('crown_intl', 'apex', contP());

    // Mid-high → continental or top national
    if (ovr >= 70 || wins >= 10)            return pick(contP(), natP('hi'));

    // Mid → top national promoter of their country
    if (ovr >= 60 || wins >= 5)             return pick(natP('hi'), contP());

    // Low → lower national promoter
    if (wins >= 2)                          return pick(natP('lo'), natP('hi'));

    // Prospect → lowest national promoter
    return pick(natP('lo'), contP()) || PROMOTERS[PROMOTERS.length - 1];
  }

  // Rankings
  rebuildRankings() {
    this.rankings    = {};
    this.orgRankings = {};  // { org: { weightClassId: [fighter, ...] } }  — top-15 contenders per org

    for (const wc of WEIGHT_CLASSES) {
      const fighters = this.allFighters
        .filter(f => f.weightClass === wc.id && !f.retiredAt)
        .sort((a, b) => this._rankScore(b) - this._rankScore(a));

      fighters.forEach((f, i) => {
        f.ranking = i + 1;
        if (f.id !== this.player?.id) f.promoter = this._assignNPCPromoter(f);
      });
      this.rankings[wc.id] = fighters;
    }

    // Include player in their weight class
    if (this.player) {
      const wc = this.player.weightClass;
      if (!this.rankings[wc]) this.rankings[wc] = [];
      if (!this.rankings[wc].find(f => f.id === this.player.id)) {
        this.rankings[wc].push(this.player);
        this.rankings[wc].sort((a, b) => this._rankScore(b) - this._rankScore(a));
        this.rankings[wc].forEach((f, i) => { f.ranking = i + 1; });
      }
    }

    // Build per-org rankings: top-15 contenders (excludes current belt holder for that org)
    for (const org of WORLD_ORGS) {
      this.orgRankings[org] = {};
      for (const wc of WEIGHT_CLASSES) {
        const champion = (this.rankings[wc.id] || []).find(f => (f.belts || []).includes(org));
        const contenders = (this.rankings[wc.id] || [])
          .filter(f => !(f.belts || []).includes(org) && !f.retiredAt)
          .slice()
          .sort((a, b) => this._orgRankScore(b, org) - this._orgRankScore(a, org))
          .slice(0, 15);
        contenders.forEach((f, i) => {
          if (!f.orgRankings) f.orgRankings = {};
          f.orgRankings[org] = f.orgRankings[org] || {};
          f.orgRankings[org][wc.id] = i + 1;
        });
        this.orgRankings[org][wc.id] = { champion: champion || null, contenders };
      }
    }
  }

  // Score ligeiramente diferente por organização — cada uma valoriza aspectos diferentes
  _orgRankScore(f, org) {
    const base = this._rankScore(f);
    const kos  = (f.kos || 0) + (f.tkos || 0);
    const bias = {
      WBC: (f.wins || 0)            * 0.5,   // atividade e vitórias
      WBA: kos                       * 0.7,   // poder de nocaute
      IBF: (f.overall || 50)         * 0.4,   // qualidade técnica
      WBO: (f.popularity || 0)       * 0.6,   // apelo popular
    }[org] || 0;
    return base + bias;
  }

  _rankScore(f) {
    const wins    = f.wins * 3;
    const losses  = f.losses * -2;
    const quality = f.overall * 0.5;
    const recent  = Math.min(f.wins, 3) * 2;
    const pop     = f.popularity * 0.1;
    const divisionPenalty = f.isPlayer ? (f.divisionRankingPenalty || 0) : 0;
    return wins + losses + quality + recent + pop - divisionPenalty;
  }

  // Retorna posição do jogador nos rankings de cada org (apenas onde é contendor, não campeão)
  getPlayerOrgRankings() {
    if (!this.player) return {};
    const wc = this.player.weightClass;
    const result = {};
    for (const org of WORLD_ORGS) {
      const orgWc = this.orgRankings?.[org]?.[wc];
      if (!orgWc) continue;
      const isChamp = (this.player.belts || []).includes(org);
      if (isChamp) {
        result[org] = { rank: 'C', isChampion: true };
      } else {
        const idx = (orgWc.contenders || []).findIndex(f => f.id === this.player.id);
        if (idx >= 0) result[org] = { rank: idx + 1, isChampion: false };
      }
    }
    return result;
  }

  getPlayerRanking() {
    if (!this.player) return null;
    const wc = this.rankings[this.player.weightClass];
    if (!wc) return null;
    const idx = wc.findIndex(f => f.id === this.player.id);
    return idx >= 0 ? idx + 1 : null;
  }

  getWeightClassOptions() {
    if (!this.player) return [];
    const index = WEIGHT_CLASSES.findIndex(w => w.id === this.player.weightClass);
    if (index < 0) return [];
    return [
      index > 0 ? { ...WEIGHT_CLASSES[index - 1], direction: 'down' } : null,
      index < WEIGHT_CLASSES.length - 1 ? { ...WEIGHT_CLASSES[index + 1], direction: 'up' } : null,
    ].filter(Boolean);
  }

  canChangeWeightClass(targetId) {
    const p = this.player;
    const target = WEIGHT_CLASSES.find(w => w.id === targetId);
    const currentIndex = WEIGHT_CLASSES.findIndex(w => w.id === p?.weightClass);
    const targetIndex = WEIGHT_CLASSES.findIndex(w => w.id === targetId);
    if (!p || !target) return { ok: false, reason: 'Categoria inválida.' };
    if (Math.abs(targetIndex - currentIndex) !== 1) return { ok: false, reason: 'Só é possível mudar uma divisão por vez.' };
    if (p.retiredAt) return { ok: false, reason: 'Atletas aposentados não podem mudar de divisão.' };
    if (p.isInjured) return { ok: false, reason: 'Recupere-se da lesão antes de mudar de divisão.' };
    if (this.nextFight) return { ok: false, reason: 'Cancele ou conclua a luta marcada antes da mudança.' };
    if (p.weightTransition?.weeksRemaining > 0) return { ok: false, reason: 'A adaptação da última mudança ainda não terminou.' };
    const now = (this.year - 2024) * 52 + this.week;
    if (p.lastWeightChangeAt !== null && now - p.lastWeightChangeAt < 26) {
      return { ok: false, reason: `A equipe recomenda aguardar mais ${26 - (now - p.lastWeightChangeAt)} semana(s).` };
    }
    return { ok: true, target, direction: targetIndex > currentIndex ? 'up' : 'down' };
  }

  changeWeightClass(targetId) {
    const check = this.canChangeWeightClass(targetId);
    if (!check.ok) return check;
    const p = this.player;
    const previousId = p.weightClass;
    const previous = WEIGHT_CLASSES.find(w => w.id === previousId);
    const direction = check.direction;
    const vacatedBelts = [...(p.belts || [])];

    for (const belt of vacatedBelts) {
      this._closeTitleReign(p, belt, 'vacated_weight_change', null, previousId);
    }
    this._vacatePlayerBelts(previousId, vacatedBelts);
    if (Object.keys(p.beltDefenses || {}).length) {
      p.divisionDefenses[previousId] = {
        ...(p.divisionDefenses[previousId] || {}),
        ...p.beltDefenses,
      };
    }
    for (const belt of p.superBelts || []) {
      if (!p.superBeltHistory.some(entry => entry.belt === belt && entry.weightClass === previousId)) {
        p.superBeltHistory.push({ belt, weightClass: previousId, year: this.year });
      }
    }

    const permanent = direction === 'up'
      ? { strength: 3, chin: 2, durability: 1, speed: -1 }
      : { speed: 2, reflexes: 2, footwork: 1, strength: -2, chin: -2 };
    const temporary = direction === 'up'
      ? { stamina: 3, reflexes: 3, footwork: 2 }
      : { stamina: 4, durability: 4, composure: 3, strength: 2 };
    const weeks = direction === 'up' ? 6 : 8;

    for (const [attr, delta] of Object.entries(permanent)) {
      p[attr] = clamp(p[attr] + delta, 1, 99);
    }
    for (const [attr, penalty] of Object.entries(temporary)) {
      p[attr] = clamp(p[attr] - penalty, 1, 99);
    }

    p.weightClass = targetId;
    p.belts = [];
    p.beltDefenses = {};
    p.superBelts = [];
    p.divisionRankingPenalty = direction === 'up' ? 28 : 34;
    p.weightTransition = {
      from: previousId,
      to: targetId,
      direction,
      totalWeeks: weeks,
      weeksRemaining: weeks,
      temporaryPenalties: temporary,
      restored: {},
    };
    p.lastWeightChangeAt = (this.year - 2024) * 52 + this.week;
    p.weightClassHistory.push({ weightClass: targetId, from: previousId, year: this.year, week: this.week, direction });
    p.popularity = clamp(p.popularity + (direction === 'up' ? 4 : 2), 0, 100);
    p.reputation = clamp(p.reputation + 2, 0, 100);
    p.morale = clamp(p.morale + 5, 0, 100);
    p.fatigue = clamp(p.fatigue + (direction === 'down' ? 15 : 8), 0, 100);
    p.purseMult = Math.max(p.purseMult || 1, 1 + (new Set(p.weightClassHistory.map(entry => entry.weightClass)).size - 1) * 0.05);

    this.availableFights = [];
    this.incomingChallenges = [];
    this.rebuildRankings();
    this.addNews({
      headline: direction === 'up'
        ? `${p.name} anuncia subida dos ${previous.name} para os ${check.target.name} em busca de novos desafios.`
        : `${p.name} confirma descida dos ${previous.name} para os ${check.target.name} e inicia um corte de peso exigente.`,
      type: 'weight_change',
      scope: p.worldTitleHistory.length ? 'world' : 'national',
      fighters: [p],
    });
    if (vacatedBelts.length) {
      this.addNews({
        headline: nl(`${p.name} deixa ${vacatedBelts.length} cinturão(ões) vago(s) ao mudar de divisão.`, `${p.name} vacates ${vacatedBelts.length} belt(s) by changing division.`),
        type: 'title_change',
        scope: 'world',
        fighters: [p],
      });
    }
    this.generateAvailableFights();
    return { ok: true, direction, previous, target: check.target, weeks, vacatedBelts };
  }

  _vacatePlayerBelts(weightClassId, belts) {
    const pool = (this.rankings[weightClassId] || []).filter(f => !f.isPlayer && !f.retiredAt);
    for (const belt of belts) {
      const info = getBeltInfo(belt);
      const heir = pool.find(f => {
        if ((f.belts || []).includes(belt)) return false;
        if (info.scope === 'country') return f.nationality === info.scopeKey;
        if (info.scope === 'continent') return NAMES[f.nationality]?.continent === info.scopeKey;
        return true;
      });
      if (heir) heir.belts.push(belt);
    }
  }

  _advanceWeightTransition(weeks) {
    const transition = this.player?.weightTransition;
    if (!transition?.weeksRemaining) return;
    const elapsed = Math.min(weeks, transition.weeksRemaining);
    const progressedBefore = transition.totalWeeks - transition.weeksRemaining;
    const progressedAfter = progressedBefore + elapsed;
    for (const [attr, totalPenalty] of Object.entries(transition.temporaryPenalties)) {
      const shouldBeRestored = totalPenalty * (progressedAfter / transition.totalWeeks);
      const alreadyRestored = transition.restored[attr] || 0;
      const restore = shouldBeRestored - alreadyRestored;
      this.player[attr] = clamp(this.player[attr] + restore, 1, 99);
      transition.restored[attr] = shouldBeRestored;
    }
    transition.weeksRemaining -= elapsed;
    if (transition.weeksRemaining <= 0) {
      const targetName = this.player.weightClassData?.name || 'nova divisão';
      this.addNews({
        headline: nl(`${this.player.name} conclui a adaptação física aos ${targetName}.`, `${this.player.name} completes physical adaptation to ${targetName}.`),
        type: 'weight_change',
        scope: 'national',
        fighters: [this.player],
      });
      this.player.weightTransition = null;
    }
  }

  // Belts
  _everyFighter() {
    return this.player ? [...this.allFighters, this.player] : this.allFighters;
  }

  getTitleHolder(weightClassId, belt) {
    return this._everyFighter().find(f =>
      f.weightClass === weightClassId && !f.retiredAt && (f.belts || []).includes(belt)
    ) || null;
  }

  getWorldChampions(weightClassId) {
    return WORLD_ORGS
      .map(org => ({ org, fighter: this.getTitleHolder(weightClassId, org) }))
      .filter(x => x.fighter);
  }

  // Staff
  staffWeeklyCost() {
    let total = 0;
    for (const [roleId, tier] of Object.entries(this.staff)) {
      const role = STAFF_ROLES.find(r => r.id === roleId);
      if (role && role.tiers[tier]) total += role.tiers[tier].salary;
    }
    return total;
  }

  staffBonus(roleId) {
    const tier = this.staff[roleId];
    if (tier === undefined) return 0;
    const role = STAFF_ROLES.find(r => r.id === roleId);
    return role?.tiers[tier]?.bonus || 0;
  }

  // Academia
  // Calcula o nível de plateia (0-4) para uma luta.
  // Usado pela animação do ringue e, futuramente, por outros modos.
  // fight: objeto de luta (pode ter titleBelt, rounds, purse)
  // f1, f2: Fighter objects (ou objetos com .popularity)
  calcCrowdLevel(fight, f1, f2) {
    if (fight?.event?.arena?.globalLevel) return fight.event.arena.globalLevel;
    // Popularidade média dos lutadores → 0-2 pts
    const avgPop = ((f1?.popularity || 0) + (f2?.popularity || 0)) / 2;
    const popScore = (avgPop / 100) * 2;

    // Importância do cinturão → 0-2 pts
    // tier: 1=local, 2=regional, 3=nacional, 4=continental, 5=mundial
    const beltTier = fight?.titleBelt ? (getBeltInfo(fight.titleBelt).tier || 0) : 0;
    const beltScore = Math.min(2, beltTier * 0.5);

    // Rounds da luta → 0-0.5 pts (lutas curtas = menor evento)
    const rounds = fight?.rounds || 4;
    const roundScore = rounds >= 12 ? 0.5 : rounds >= 8 ? 0.3 : rounds >= 6 ? 0.15 : 0;

    // Purse / cachê → indicador de prestígio da promotora
    const purse = fight?.purse || 0;
    const purseScore = purse >= 50000 ? 0.5 : purse >= 10000 ? 0.3 : purse >= 2000 ? 0.1 : 0;

    const total = popScore + beltScore + roundScore + purseScore;

    // Mapeia 0-5 → 0-4, mínimo 0 (sem nenhuma plateia só se os dois forem total desconhecidos)
    // Na prática: iniciante (pop~15) sem título = ~0.3 → nivel 0 (plateia mínima mas existe)
    if (total < 0.25) return 1;
    if (total < 0.80) return 2;
    if (total < 1.60) return 3;
    if (total < 2.50) return 4;
    return 5;
  }

  gymBonus() {
    const level = this.player?.gym?.level || 0;
    const g = GYM_LEVELS[level];
    return { gain: g.gainBonus, risk: g.riskBonus };
  }

  buyGym(level) {
    const g = GYM_LEVELS[level];
    if (!g || level === 0) return { success: false, reason: 'Nível inválido.' };
    const current = this.player.gym?.level || 0;
    if (level <= current) return { success: false, reason: 'Você já tem uma academia igual ou melhor.' };
    const upgradeCost = g.cost - (GYM_LEVELS[current].cost || 0);
    if (this.player.money < upgradeCost) return { success: false, reason: `Faltam ${formatCurrency(upgradeCost - this.player.money)}.` };
    this.player.money -= upgradeCost;
    this.player.gym = { level, name: g.name };
    this.addNews({ headline: nl(`${this.player.name} investe em uma ${g.name}!`, `${this.player.name} invests in a ${g.name}!`), type: 'career', fighters: [this.player] });
    return { success: true };
  }

  // Mídia paga
  buyMediaCampaign(id) {
    const campaign = MEDIA_CAMPAIGNS.find(c => c.id === id);
    if (!campaign) return { success: false, reason: 'Campanha não encontrada.' };
    const totalWeek = this.year * 52 + this.week;
    const lastUsed  = this.mediaCooldowns[id] || 0;
    if (totalWeek - lastUsed < campaign.cooldownWeeks)
      return { success: false, reason: `Disponível em ${campaign.cooldownWeeks - (totalWeek - lastUsed)} semana(s).` };
    if (this.player.money < campaign.cost)
      return { success: false, reason: `Faltam ${formatCurrency(campaign.cost - this.player.money)}.` };
    this.player.money -= campaign.cost;
    this.player.popularity  = clamp((this.player.popularity  || 50) + campaign.popularity,  0, 100);
    this.player.reputation  = clamp((this.player.reputation  || 50) + campaign.reputation,  0, 100);
    this.mediaCooldowns[id] = totalWeek;
    this.addNews({ headline: nl(`${this.player.name} aparece em ${campaign.name.toLowerCase()} e ganha visibilidade.`, `${this.player.name} appears in ${campaign.name.toLowerCase()} and gains visibility.`), type: 'general', fighters: [this.player] });
    return { success: true };
  }

  // Estilo de vida
  buyLifestyleItem(id) {
    const item = LIFESTYLE_ITEMS.find(i => i.id === id);
    if (!item) return { success: false, reason: 'Item não encontrado.' };
    if ((this.player.lifestyle || []).includes(id))
      return { success: false, reason: 'Você já tem este item.' };
    if (this.player.money < item.cost)
      return { success: false, reason: `Faltam ${formatCurrency(item.cost - this.player.money)}.` };
    this.player.money -= item.cost;
    this.player.morale = clamp((this.player.morale || 70) + item.morale, 0, 100);
    this.player.lifestyle = this.player.lifestyle || [];
    this.player.lifestyle.push(id);
    this.addNews({ headline: nl(`${this.player.name} compra ${item.name.toLowerCase()}. ${item.desc}`, `${this.player.name} purchases ${item.name.toLowerCase()}. ${item.desc}`), type: 'general', fighters: [this.player] });
    return { success: true };
  }

  // Recuperação
  buyRecoveryTreatment(id) {
    const t = RECOVERY_TREATMENTS.find(t => t.id === id);
    if (!t) return { success: false, reason: 'Tratamento não encontrado.' };
    if (this.player.money < t.cost)
      return { success: false, reason: `Faltam ${formatCurrency(t.cost - this.player.money)}.` };
    this.player.money -= t.cost;
    if (this.player.injuryWeeks > 0) {
      this.player.injuryWeeks = Math.max(0, this.player.injuryWeeks - t.weeksReduced);
    }
    this.player.stamina = clamp((this.player.stamina || 80) + t.staminaBonus, 1, 99);
    this.addNews({ headline: nl(`${this.player.name} realiza ${t.name.toLowerCase()} e acelera recuperação.`, `${this.player.name} undergoes ${t.name.toLowerCase()} and speeds up recovery.`), type: 'career', fighters: [this.player] });
    return { success: true };
  }

  _payStaff(weeks) {
    if (!this.player) return;
    const gymLevel = this.player.gym?.level || 0;
    const gymMaintenance = (GYM_LEVELS[gymLevel].maintenance / 4) * weeks; // mensal → semanal
    const cost = this.staffWeeklyCost() * weeks + gymMaintenance;
    if (cost <= 0) return;
    this.player.money -= cost;

    // Can't afford the team: fire the most expensive member until solvent
    while (this.player.money < 0 && Object.keys(this.staff).length > 0) {
      let worst = null, worstSalary = -1;
      for (const [roleId, tier] of Object.entries(this.staff)) {
        const role = STAFF_ROLES.find(r => r.id === roleId);
        const sal  = role?.tiers[tier]?.salary || 0;
        if (sal > worstSalary) { worstSalary = sal; worst = roleId; }
      }
      if (!worst) break;
      const role = STAFF_ROLES.find(r => r.id === worst);
      delete this.staff[worst];
      this.addNews({
        headline: nl(`Sem dinheiro para salários, ${this.player.name} demite ${role?.name?.toLowerCase() || 'membro da equipe'}.`, `Unable to pay wages, ${this.player.name} releases ${role?.name?.toLowerCase() || 'a staff member'}.`),
        type: 'staff',
      });
    }
    if (this.player.money < 0) this.player.money = 0;
  }

  // Fight generation
  generateAvailableFights(options = {}) {
    if (!this.player) return [];

    // Org-biased matchmaking: se contrato exclusivo com promotora afiliada, 70% dos adversários vêm da org
    const activePromoter = this.getActivePromoter();
    const isExclusive = !!this.player.contract?.exclusivity;
    const orgAffil = isExclusive && activePromoter?.orgAffil ? activePromoter.orgAffil : null;
    let orgPool = [];
    if (orgAffil && this.orgRankings[orgAffil]) {
      const wcData = this.orgRankings[orgAffil][this.player.weightClass];
      if (wcData?.contenders) {
        orgPool = wcData.contenders.filter(f => f.id !== this.player.id && !f.isInjured && !f.retiredAt);
      }
    }

    // Rivais activos entram no pool com prioridade
    const rivalIds = (this.rivals || []).filter(r => r.intensity >= 2).map(r => r.fighterId);
    const opponents = this._getMatchmakingPool(options.excludeOpponentIds || [], rivalIds, orgPool);
    const offers = opponents.slice(0, 4).map(opp => {
      const rival = this.getRival(opp.id);
      const offer = this._makeOffer(opp);
      if (rival) {
        offer.isRivalry = true;
        offer.rivalIntensity = rival.intensity;
        offer.purse = Math.round(offer.purse * (1 + rival.intensity * 0.12)); // até +60%
      }
      return offer;
    });

    // Add a title shot if the player has earned one
    const beltKey = this._eligibleBeltTier();
    if (beltKey) {
      const holder = this.getTitleHolder(this.player.weightClass, beltKey);
      if (holder && holder.id !== this.player.id && !holder.isInjured) {
        if (!offers.find(o => o.opponent.id === holder.id)) {
          offers.push(this._makeOffer(holder, beltKey));
        }
      } else if (!holder) {
        // Cinturão vago: luta contra um adversário do mesmo escopo
        const opp = this._findScopedOpponent(beltKey);
        if (opp && !offers.find(o => o.opponent.id === opp.id)) {
          offers.push(this._makeOffer(opp, beltKey, true));
        }
      }
    }

    // Campeonatos territoriais são circuitos anuais e continuam disponíveis
    // mesmo depois que o atleta avança para cinturões continentais ou mundiais.
    const recurringTier = this._eligibleRecurringTrophyTier(beltKey);
    if (recurringTier) {
      const excluded = offers.map(o => o.opponent?.id).filter(Boolean);
      const opponent = this._findScopedOpponent(recurringTier, excluded);
      if (opponent) offers.push(this._makeOffer(opponent, recurringTier, true));
    }

    // Upgrade existing world title offers to unification when player already holds a world belt
    const myWorldBelts = (this.player.belts || []).filter(b => WORLD_ORGS.includes(b));
    if (myWorldBelts.length >= 1) {
      for (const offer of offers) {
        if (offer.isTitle && WORLD_ORGS.includes(offer.titleBelt) && !myWorldBelts.includes(offer.titleBelt)) {
          offer.isUnification = true;
          offer.myBelt        = myWorldBelts[0];
          offer.rounds        = 12;
        }
      }
    }

    // Unification offer: if no unification was already added via eligibleBeltTier, try to create one
    if (this._canOfferUnification() && !offers.some(f => f.isUnification)) {
      const unifOffer = this._makeUnificationOffer();
      if (unifOffer && !offers.find(o => o.opponent.id === unifOffer.opponent.id)) {
        offers.push(unifOffer);
      }
    }

    for (const offer of offers) offer.event = this._buildFightEvent(offer);
    this.availableFights = offers;
    return offers;
  }

  getActivePromoter() {
    if (!this.player?.contract?.promoterId || this.player.contract.fightsRemaining <= 0) return null;
    return PROMOTERS.find(p => p.id === this.player.contract.promoterId) || null;
  }

  generateContractOffers() {
    if (!this.player || this.player.contract?.fightsRemaining > 0) {
      this.contractOffers = [];
      return [];
    }

    const p          = this.player;
    const agentBonus = this.staffBonus('agent');
    const nat        = p.nationality;
    const cont       = NAMES[nat]?.continent || 'americas';
    const wins       = p.wins;
    const rank       = p.ranking || 99;

    // Escada geográfica de acesso às promotoras:
    //   0–4 vitórias  → apenas nacionais do mesmo país
    //   5–11 vitórias → nacionais do país + continentais do mesmo continente
    //   12–19 vitórias (ou top-30) → todo o espectro regional + globais apenas se top-15
    //   20+ vitórias (ou top-10)   → todas, incluindo globais
    const canAccessGlobal      = wins >= 20 || rank <= 10;
    const canAccessContinental = wins >= 5  || rank <= 40;
    const canAccessForeignNat  = wins >= 12 || rank <= 30;

    const eligible = PROMOTERS.filter(promoter => {
      // Verifica requisito mínimo de vitórias da promotora
      const meetsMin = wins >= promoter.minWins ||
        p.popularity + p.reputation >= promoter.minWins * 5;
      if (!meetsMin) return false;

      if (promoter.tier === 'global')      return canAccessGlobal;
      if (promoter.tier === 'continental') return canAccessContinental && promoter.scope === cont;
      // nacional
      if (promoter.scope === nat)          return true;          // sempre pode contratar do próprio país
      if (canAccessForeignNat)             return NAMES[promoter.scope]?.continent === cont; // mesmo continente
      return false;
    });

    // Garantia: se não houver nenhuma elegível, pega as 2 nacionais do país do atleta
    const pool = eligible.length
      ? eligible
      : PROMOTERS.filter(p => p.tier === 'national' && p.scope === nat);

    // Ordena por prestígio e limita a 3 (ou 4 com agente bom)
    const maxOffers = Math.min(3 + (agentBonus >= 0.14 ? 1 : 0), pool.length);
    this.contractOffers = pool
      .sort((a, b) => b.prestige - a.prestige)
      .slice(0, maxOffers)
      .map(promoter => this._makeContractOffer(promoter, agentBonus));
    return this.contractOffers;
  }

  _makeContractOffer(promoter, agentBonus = 0) {
    const p = this.player;
    const careerValue = 1 + Math.min(0.35, p.wins * 0.012 + p.popularity * 0.002);
    const fights = promoter.prestige >= 85 ? rand(4, 6) : rand(2, 4);
    const purseMultiplier = Number((promoter.purseMult * careerValue * (1 + agentBonus)).toFixed(2));
    const signingBonus = Math.round((promoter.prestige * 100 + p.popularity * 150) * (1 + agentBonus));
    const knockoutBonus = promoter.style === 'knockouts' ? 0.18 : promoter.prestige >= 85 ? 0.10 : 0.06;
    // Cláusulas que a promotora resiste (baseado no perfil)
    const hardClauses = promoter.prestige >= 85
      ? ['exclusivity', 'fights']          // grandes promotoras não abrem mão de exclusividade ou lutas
      : promoter.style === 'knockouts'
        ? ['knockoutBonus', 'mediaObligations']
        : ['terminationFee'];
    return {
      id: generateId(),
      promoterId: promoter.id,
      promoterName: promoter.name,
      fightsTotal: fights,
      fightsRemaining: fights,
      purseMultiplier,
      signingBonus,
      winBonus: Number((0.12 + promoter.prestige / 1000 + agentBonus * 0.35).toFixed(2)),
      knockoutBonus,
      exclusivity: promoter.id !== 'local',
      mediaObligations: promoter.prestige >= 85 ? 3 : promoter.prestige >= 70 ? 2 : 1,
      mediaCompleted: 0,
      terminationFee: Math.round(signingBonus * (promoter.prestige >= 80 ? 1.5 : 1)),
      negotiationRoundsLeft: 2,    // jogador pode negociar até 2 rodadas
      negotiatedClauses: [],       // cláusulas já negociadas neste contrato
      hardClauses,                 // cláusulas que a promotora resiste fortemente
    };
  }

  // Negociação por cláusula individual — até 2 rodadas por contrato.
  // clause: 'purse' | 'signingBonus' | 'winBonus' | 'knockoutBonus' |
  //         'terminationFee' | 'mediaObligations' | 'exclusivity' | 'fights'
  negotiateClause(offerId, clause) {
    const offer = this.contractOffers.find(o => o.id === offerId);
    if (!offer) return { success: false, reason: 'Proposta não encontrada.' };
    if (offer.negotiationRoundsLeft <= 0) return { success: false, reason: 'Não há mais rodadas de negociação disponíveis.' };
    if (offer.negotiatedClauses.includes(clause)) return { success: false, reason: 'Esta cláusula já foi negociada.' };

    const agentBonus  = this.staffBonus('agent');
    const repBonus    = this.player.reputation / 500;
    const isHard      = (offer.hardClauses || []).includes(clause);
    const baseChance  = isHard ? 0.22 : 0.52;
    const chance      = clamp(baseChance + agentBonus * 2 + repBonus, 0.05, 0.92);

    offer.negotiationRoundsLeft--;
    offer.negotiatedClauses.push(clause);

    if (Math.random() > chance) {
      const refusals = {
        purse:            'A promotora diz que a bolsa já está acima da média.',
        signingBonus:     'As luvas já foram generosas, segundo a promotora.',
        winBonus:         'A promotora não vai além desse percentual de vitória.',
        knockoutBonus:    'Bônus de KO já é o teto da promotora.',
        terminationFee:   'A promotora não reduz a taxa de rescisão.',
        mediaObligations: 'As obrigações de mídia são não-negociáveis.',
        exclusivity:      'Exclusividade é condição inegociável para esta promotora.',
        fights:           'O número de lutas está fixado no contrato.',
      };
      return { success: false, reason: refusals[clause] || 'Proposta recusada.', roundsLeft: offer.negotiationRoundsLeft };
    }

    // Aplica melhoria na cláusula
    const boost = isHard ? 0.04 : 0.08;
    switch (clause) {
      case 'purse':
        offer.purseMultiplier = Number((offer.purseMultiplier * (1 + boost + agentBonus * 0.3)).toFixed(2));
        break;
      case 'signingBonus':
        offer.signingBonus = Math.round(offer.signingBonus * (1 + boost + agentBonus * 0.4));
        break;
      case 'winBonus':
        offer.winBonus = Number((offer.winBonus + 0.04 + agentBonus * 0.02).toFixed(2));
        break;
      case 'knockoutBonus':
        offer.knockoutBonus = Number((offer.knockoutBonus + 0.03 + agentBonus * 0.01).toFixed(2));
        break;
      case 'terminationFee':
        offer.terminationFee = Math.round(offer.terminationFee * (0.82 - agentBonus * 0.1));
        break;
      case 'mediaObligations':
        offer.mediaObligations = Math.max(0, offer.mediaObligations - 1);
        break;
      case 'exclusivity':
        offer.exclusivity = false;
        break;
      case 'fights':
        offer.fightsTotal    = Math.max(1, offer.fightsTotal - 1);
        offer.fightsRemaining = offer.fightsTotal;
        break;
    }
    return { success: true, clause, offer, roundsLeft: offer.negotiationRoundsLeft };
  }

  // Mantém compatibilidade — negociação legado (melhora tudo de uma vez)
  negotiateContractOffer(offerId) {
    return this.negotiateClause(offerId, 'purse');
  }

  acceptContractOffer(offerId) {
    const offer = this.contractOffers.find(o => o.id === offerId);
    if (!offer || this.player.contract?.fightsRemaining > 0) return false;
    this.player.contract = {
      ...offer,
      signedWeek: this.week,
      signedYear: this.year,
    };
    this.player.money += offer.signingBonus;
    this.contractOffers = [];
    this.availableFights = [];
    this.generateAvailableFights();
    this.addNews({
      headline: nl(`${this.player.name} assina contrato de ${offer.fightsTotal} lutas com a ${offer.promoterName}.`, `${this.player.name} signs a ${offer.fightsTotal}-fight contract with ${offer.promoterName}.`),
      type: 'contract',
      fighters: [this.player],
    });
    return true;
  }

  terminateContract() {
    const contract = this.player?.contract;
    if (!contract || contract.fightsRemaining <= 0) return { success: false, reason: 'Nenhum contrato ativo.' };
    if (this.player.money < contract.terminationFee) {
      return { success: false, reason: `A rescisão custa ${formatCurrency(contract.terminationFee)}.` };
    }
    this.player.money -= contract.terminationFee;
    const promoterName = contract.promoterName;
    this.player.contract = null;
    this.contractOffers = [];
    this.availableFights = [];
    this.generateAvailableFights();
    this.addNews({
      headline: nl(`${this.player.name} rompe contrato com a ${promoterName}.`, `${this.player.name} breaks contract with ${promoterName}.`),
      type: 'contract',
      fighters: [this.player],
    });
    return { success: true };
  }

  refreshAvailableFights() {
    const previousOpponentIds = this.availableFights.map(f => f.opponent?.id).filter(Boolean);
    return this.generateAvailableFights({ excludeOpponentIds: previousOpponentIds });
  }

  generateIncomingChallenge(force = false) {
    const p = this.player;
    if (!p || p.retiredAt || p.isInjured || this.nextFight || this.incomingChallenges.length >= 3) return null;

    const rank = this.getPlayerRanking();
    const worldBelts = (p.belts || []).filter(b => WORLD_ORGS.includes(b));
    const isChampion = worldBelts.length > 0;

    // Frequência escala com número de cinturões mundiais
    // 0 cinturões: chance padrão por ranking
    // 1 cinturão: 0.22/semana  2: 0.34  3: 0.46  4: 0.58
    const champChance = isChampion ? 0.18 + worldBelts.length * 0.12 : 0;
    const contenderChance = !isChampion ? (rank <= 5 ? 0.18 : rank <= 10 ? 0.12 : rank <= 20 ? 0.07 : 0) : 0;
    const weeklyChance = Math.max(champChance, contenderChance);
    if (!weeklyChance) return null;
    if (!force && Math.random() > weeklyChance) return null;

    // ── Campeão: desafio baseado em rankings por organização ──
    if (isChampion) {
      const wc = p.weightClass;

      // Monta mapa: fighterId → orgs em que ele é top-contender (top-5 da org que o jogador detém)
      const challengerMap = new Map(); // fighterId → { fighter, orgs: string[] }
      for (const org of worldBelts) {
        const orgData = this.orgRankings?.[org]?.[wc];
        if (!orgData) continue;
        const topContenders = (orgData.contenders || [])
          .filter(f => !f.isInjured && !this.incomingChallenges.some(c => c.opponent?.id === f.id))
          .slice(0, 5);
        for (const f of topContenders) {
          if (!challengerMap.has(f.id)) challengerMap.set(f.id, { fighter: f, orgs: [] });
          challengerMap.get(f.id).orgs.push(org);
        }
      }
      if (!challengerMap.size) return null;

      // Prefere desafiante presente em mais orgs (possível unificação), depois aleatoriza
      const entries = [...challengerMap.values()].sort((a, b) => b.orgs.length - a.orgs.length);
      // Peso: mais orgs → mais provável, mas não determinístico
      const weights  = entries.map((_, i) => Math.max(1, entries.length - i));
      const totalW   = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalW;
      let chosen = entries[entries.length - 1];
      for (let i = 0; i < entries.length; i++) { r -= weights[i]; if (r <= 0) { chosen = entries[i]; break; } }

      const opponent   = chosen.fighter;
      const beltStakes = chosen.orgs; // orgs cujo cinturão está em jogo
      const primaryBelt = beltStakes[0];

      const fight = this._makeOffer(opponent, primaryBelt);
      fight.incomingChallenge  = true;
      fight.beltStakes         = beltStakes;  // todos os cinturões em jogo
      fight.titleBelt          = primaryBelt;
      fight.challengerPromoter = pick(PROMOTERS.filter(p => p.tier !== 'national') .length ? PROMOTERS.filter(p => p.tier !== 'national') : PROMOTERS);
      fight.promoter           = fight.challengerPromoter;
      fight.purse              = Math.round(fight.purse * (1.3 + beltStakes.length * 0.12));
      fight.event              = this._buildFightEvent(fight);

      const challenge = {
        ...fight,
        receivedWeek: this.week,
        receivedYear: this.year,
        expiresIn: 6,
        status: 'pending',
      };
      this.incomingChallenges.unshift(challenge);

      const orgRankInfo = beltStakes.map(org => {
        const idx = (this.orgRankings?.[org]?.[wc]?.contenders || []).findIndex(f => f.id === opponent.id);
        return `#${idx + 1} ${org}`;
      }).join(' / ');

      const beltNames = beltStakes.length > 1
        ? beltStakes.map(b => getBeltDisplayName(b, { year: this.year, weightClass: wc })).join(' + ')
        : getBeltDisplayName(primaryBelt, { year: this.year, weightClass: wc });

      this.addNews({
        headline: beltStakes.length > 1
          ? nl(`${opponent.name} (${orgRankInfo}) desafia ${p.name} por uma luta de unificação: ${beltNames}!`,
               `${opponent.name} (${orgRankInfo}) challenges ${p.name} for a unification fight: ${beltNames}!`)
          : nl(`${opponent.name} (${orgRankInfo}) exige disputa pelo ${beltNames}!`,
               `${opponent.name} (${orgRankInfo}) demands a shot at the ${beltNames}!`),
        type: 'challenge',
        fighters: [p, opponent],
      });
      return challenge;
    }

    // ── Contendor: desafio padrão por ranking unificado ──────
    const pool = (this.rankings[p.weightClass] || []).filter(f =>
      f.id !== p.id && !f.retiredAt && !f.isInjured &&
      !this.incomingChallenges.some(c => c.opponent?.id === f.id) &&
      Math.abs((f.ranking || 99) - rank) <= (rank <= 10 ? 8 : 5)
    );
    if (!pool.length) return null;

    const opponent = pick(pool.slice(0, 10));
    const fight    = this._makeOffer(opponent, null);
    fight.incomingChallenge  = true;
    fight.beltStakes         = [];
    fight.challengerPromoter = pick(PROMOTERS);
    fight.promoter           = fight.challengerPromoter;
    fight.purse              = Math.round(fight.purse * (rank <= 10 ? 1.2 : 1.1));
    fight.event              = this._buildFightEvent(fight);

    const challenge = {
      ...fight,
      receivedWeek: this.week,
      receivedYear: this.year,
      expiresIn: 4,
      status: 'pending',
    };
    this.incomingChallenges.unshift(challenge);
    this.addNews({
      headline: nl(`${opponent.name} desafia publicamente o #${rank} ${p.name}.`, `${opponent.name} publicly challenges #${rank} ${p.name}.`),
      type: 'challenge',
      fighters: [p, opponent],
    });
    return challenge;
  }

  acceptIncomingChallenge(challengeId) {
    if (this.nextFight) return { success: false, reason: 'Você já tem uma luta marcada.' };
    const index = this.incomingChallenges.findIndex(c => c.id === challengeId && c.status === 'pending');
    if (index < 0) return { success: false, reason: 'Desafio não encontrado.' };
    const challenge = this.incomingChallenges[index];
    this.incomingChallenges.splice(index, 1);
    this.nextFight = challenge;
    this.availableFights = [];
    this.addNews({
      headline: nl(`${this.player.name} aceita o desafio de ${challenge.opponent.name}. A luta está confirmada!`, `${this.player.name} accepts ${challenge.opponent.name}'s challenge. The fight is confirmed!`),
      type: 'challenge',
      fighters: [this.player, challenge.opponent],
    });
    return { success: true, fight: challenge };
  }

  declineIncomingChallenge(challengeId) {
    const index = this.incomingChallenges.findIndex(c => c.id === challengeId && c.status === 'pending');
    if (index < 0) return { success: false, reason: 'Desafio não encontrado.' };
    const [challenge] = this.incomingChallenges.splice(index, 1);
    const penalty = (challenge.titleBelt && getBeltInfo(challenge.titleBelt).tier >= 4) ? 3 : 1;
    this.player.reputation = clamp(this.player.reputation - penalty, 0, 100);
    this.addNews({
      headline: nl(`${this.player.name} recusa o desafio de ${challenge.opponent.name}.`, `${this.player.name} declines ${challenge.opponent.name}'s challenge.`),
      type: 'challenge',
      fighters: [this.player, challenge.opponent],
    });
    return { success: true, reputationLost: penalty };
  }

  recordTraining() {
    if (this.player) this.player.markTraining();
  }

  _startTitleReign(fighter, belt, weightClass = fighter.weightClass) {
    if (!fighter || getBeltInfo(belt).tier < 4) return;
    fighter.titleReigns = fighter.titleReigns || [];
    if (fighter.titleReigns.some(reign =>
      reign.belt === belt && reign.weightClass === weightClass && !reign.endYear
    )) return;
    fighter.titleReigns.push({
      belt, weightClass,
      startYear: this.year, startWeek: this.week,
      endYear: null, endWeek: null, defenses: 0,
    });
  }

  _closeTitleReign(fighter, belt, reason = 'lost', opponent = null, weightClass = fighter?.weightClass) {
    if (!fighter || getBeltInfo(belt).tier < 4) return;
    fighter.titleReigns = fighter.titleReigns || [];
    let active = [...fighter.titleReigns].reverse().find(reign =>
      reign.belt === belt && reign.weightClass === weightClass && !reign.endYear
    );
    if (!active) {
      this._startTitleReign(fighter, belt, weightClass);
      active = fighter.titleReigns[fighter.titleReigns.length - 1];
    }
    active.endYear = this.year;
    active.endWeek = this.week;
    active.endReason = reason;
    active.endedBy = opponent?.name || null;
    active.defenses = (fighter.beltDefenses || {})[belt] || active.defenses || 0;
  }

  _canOfferUnification() {
    const p = this.player;
    const held = (p.belts || []).filter(b => WORLD_ORGS.includes(b));
    const missing = WORLD_ORGS.filter(o => !held.includes(o));
    return held.length >= 1 && missing.length >= 1;
  }

  _makeUnificationOffer() {
    const p  = this.player;
    const wc = p.weightClass;
    const myWorldBelts = (p.belts || []).filter(b => WORLD_ORGS.includes(b));
    for (const org of WORLD_ORGS) {
      if (myWorldBelts.includes(org)) continue;
      const holder = this.getTitleHolder(wc, org);
      if (holder && !holder.isInjured && holder.id !== p.id) {
        const offer    = this._makeOffer(holder, org);
        offer.isUnification = true;
        offer.myBelt        = myWorldBelts[0];
        offer.rounds        = 12;
        return offer;
      }
    }
    return null;
  }

  _makeOffer(opp, forceBelt = null, vacant = false) {
    // World belts only via explicit forceBelt (eligibleBeltTier / unification path).
    // Territorial belts auto-attach from pool, EXCEPT continental belts from other continents.
    const playerCont = NAMES[this.player.nationality]?.continent;
    const titleBelt = forceBelt !== null
      ? forceBelt
      : (opp.topBelt && !WORLD_ORGS.includes(opp.topBelt) &&
         !(opp.topBelt.startsWith('continental:') && opp.topBelt !== `continental:${playerCont}`)
         ? opp.topBelt : null);
    const isTitle   = !!titleBelt;
    const beltTier  = titleBelt ? getBeltInfo(titleBelt).tier : 0;

    const promoter = this.getActivePromoter() || pick(PROMOTERS);
    const offer = {
      id:        generateId(),
      opponent:  opp,
      rounds:    beltTier >= 4 ? 12 : beltTier === 3 ? 10 : beltTier === 2 ? 8 : beltTier === 1 ? 6 :
                 this.player.wins < 3 ? 4 : this.player.wins < 8 ? 6 : this.player.wins < 16 ? 8 : 10,
      purse:     this._calculatePurse(opp, titleBelt),
      risk:      this._calculateRisk(opp),
      rankingImpact: this._rankingImpact(opp),
      isTitle,
      titleBelt,
      beltDisplayName: titleBelt ? getBeltDisplayName(titleBelt, { year: this.year, weightClass: this.player.weightClass }) : null,
      vacant,
      promoter,
      weeksToFight: rand(4, 10),
    };
    offer.event = this._buildFightEvent(offer);
    return offer;
  }

  _eventScope(fight) {
    const tier = fight?.titleBelt ? getBeltInfo(fight.titleBelt).tier : 0;
    if (tier >= 5) return 'world';
    if (tier === 4) return 'continental';
    if (tier === 3) return 'national';
    if (tier === 2) return 'regional';
    if (tier === 1) return 'local';
    if (this.player.wins >= 32 || this.player.popularity >= 82) return 'world';
    if (this.player.wins >= 20 || this.player.popularity >= 66) return 'continental';
    if (this.player.wins >= 11 || this.player.popularity >= 48) return 'national';
    if (this.player.wins >= 4  || this.player.popularity >= 28) return 'regional';
    return 'local';
  }

  _buildFightEvent(fight) {
    const p = this.player;
    const opp = fight.opponent;
    const scope = this._eventScope(fight);
    const avgPop = ((p.popularity || 0) + (opp.popularity || 0)) / 2;
    const relevantReach = scope === 'world' || scope === 'continental'
      ? p.fanReach?.international || 0
      : scope === 'national'
        ? p.fanReach?.national || 0
        : p.fanReach?.local || 0;
    const rivalry = fight.isRivalry ? (fight.rivalIntensity || 1) * 5 : 0;
    const titleBoost = fight.titleBelt ? getBeltInfo(fight.titleBelt).tier * 6 : 0;
    const promoterBoost = (fight.promoter?.prestige || 40) * 0.18;
    const marketability = getFightMarketability(p, opp, {
      rivalryIntensity: fight.rivalIntensity || 0,
      titleTier: fight.titleBelt ? getBeltInfo(fight.titleBelt).tier : 0,
    });
    const demand = avgPop * 0.38 + relevantReach * 0.20 + rivalry + titleBoost +
      promoterBoost + marketability.score * 0.16;
    const level = demand >= 100 ? 4 : demand >= 76 ? 3 : demand >= 50 ? 2 : 1;
    const arena = getEventArena(scope, level);

    // Mando de campo: local/regional/nacional → quase sempre no país do jogador.
    // Continental → pode ser qualquer país do continente.
    // Mundial → sede neutra (ou país do campeão) só quando o jogador é top 30.
    const worldRank = p.ranking || 99;
    const allowForeign = scope === 'world'
      ? worldRank <= 30
      : scope === 'continental'
        ? worldRank <= 50
        : false; // local/regional/nacional → sempre no próprio país

    let homeSide, hostNation;
    if (!allowForeign || p.nationality === opp.nationality) {
      // Mesma nação ou início de carreira: luta no país do jogador
      homeSide   = 'player';
      hostNation = p.nationality;
    } else {
      const homeRoll = Math.random();
      // Continental: 65% no país do jogador, 25% no do adversário, 10% neutro (mesmo continente)
      // Mundial: 50% no país do jogador, 30% no do adversário, 20% sede neutra
      const playerProb = scope === 'world' ? 0.50 : 0.65;
      const oppProb    = scope === 'world' ? 0.80 : 0.90;
      if (homeRoll < playerProb) {
        homeSide   = 'player';
        hostNation = p.nationality;
      } else if (homeRoll < oppProb) {
        homeSide   = 'opponent';
        hostNation = opp.nationality;
      } else {
        homeSide = 'neutral';
        // Sede neutra = outro país do mesmo continente do jogador
        const cont = NAMES[p.nationality]?.continent || 'americas';
        const neutralOptions = NATIONALITIES.filter(n => NAMES[n]?.continent === cont && n !== p.nationality && n !== opp.nationality);
        hostNation = neutralOptions.length ? pick(neutralOptions) : p.nationality;
      }
    }
    const hostCity = pick(GYMS.filter(g => g.country === hostNation))?.city || NAMES[hostNation]?.nation || 'Cidade-sede';
    const homeDemand = homeSide === 'player' ? 0.12 : homeSide === 'opponent' ? -0.03 : 0;
    const fillRate = clamp(0.34 + demand / 150 + homeDemand + randFloat(-0.05, 0.06), 0.22, 1);
    const attendance = Math.max(80, Math.min(arena.capacity, Math.round(arena.capacity * fillRate)));
    const ticketPrice = Math.round(arena.ticket * (0.85 + avgPop / 180));
    const gate = attendance * ticketPrice;
    const gateShareRate = fight.titleBelt
      ? getBeltInfo(fight.titleBelt).tier >= 5 ? 0.08 : 0.05
      : p.popularity >= 60 ? 0.04 : 0.02;
    const gateShare = Math.round(gate * gateShareRate);
    const billing = fight.titleBelt && getBeltInfo(fight.titleBelt).tier >= 4
      ? 'main_event'
      : scope === 'local' && p.wins < 3 ? 'undercard'
      : demand >= 55 ? 'main_event' : 'co_main';

    return {
      scope,
      arena,
      attendance,
      fillRate,
      ticketPrice,
      gate,
      gateShare,
      gateShareRate,
      hostNation,
      hostCity,
      homeSide,
      billing,
      marketability,
      card: this._generateEventCard(fight, billing, scope),
    };
  }

  // Manager-mode version of _buildFightEvent — uses fighter/opponent/importance instead of this.player
  _buildManagerFightEvent(fighter, opponent, importance, academy) {
    const scopeMap = { local: 'local', regional: 'regional', nacional: 'national', continental: 'continental', mundial: 'world' };
    const scope = scopeMap[importance] || 'local';

    const avgPop = ((fighter.popularity || 0) + (opponent.popularity || 0)) / 2;
    const repBoost = (academy?.reputation || 0) * 0.25;
    const importanceBoost = { local: 0, regional: 10, nacional: 25, continental: 45, mundial: 75 }[importance] || 0;
    const demand = avgPop * 0.4 + repBoost + importanceBoost;

    const level = demand >= 100 ? 4 : demand >= 70 ? 3 : demand >= 40 ? 2 : 1;
    const arena = getEventArena(scope, level);

    // Host nation: use academy country for local/regional/nacional, broader for continental/mundial
    let hostNation = academy?.country || fighter.nationality;
    let homeSide = 'neutral';
    if (scope === 'world' || scope === 'continental') {
      const roll = Math.random();
      if (roll < 0.55) { hostNation = fighter.nationality; homeSide = 'player'; }
      else if (roll < 0.80) { hostNation = opponent.nationality; homeSide = 'opponent'; }
      else {
        const cont = NAMES[fighter.nationality]?.continent || 'americas';
        const neutralOptions = NATIONALITIES.filter(n => NAMES[n]?.continent === cont && n !== fighter.nationality && n !== opponent.nationality);
        hostNation = neutralOptions.length ? pick(neutralOptions) : fighter.nationality;
        homeSide = 'neutral';
      }
    } else {
      homeSide = 'player';
    }

    const hostCity = pick(GYMS.filter(g => g.country === hostNation))?.city || NAMES[hostNation]?.nation || 'Cidade-sede';
    const homeDemand = homeSide === 'player' ? 0.12 : homeSide === 'opponent' ? -0.03 : 0;
    const fillRate = clamp(0.30 + demand / 160 + homeDemand + randFloat(-0.05, 0.06), 0.20, 1.0);
    const attendance = Math.max(60, Math.min(arena.capacity, Math.round(arena.capacity * fillRate)));
    const ticketPrice = Math.round(arena.ticket * (0.85 + avgPop / 180));
    const gate = attendance * ticketPrice;
    const billing = scope === 'world' || scope === 'continental' ? 'main_event' : demand >= 50 ? 'co_main' : 'undercard';

    // Manager promoter: pick based on academy reputation
    const repIdx = Math.min(Math.floor((academy?.reputation || 0) / 25), PROMOTERS.length - 1);
    const promoter = PROMOTERS[repIdx] || PROMOTERS[0];

    return {
      scope, arena, attendance, fillRate, ticketPrice, gate,
      hostNation, hostCity, homeSide, billing, promoter,
      excitement: 35,
    };
  }

  _generateEventCard(fight, billing, scope) {
    const pool = this.allFighters
      .filter(f => !f.retiredAt && !f.isInjured && f.id !== fight.opponent.id && f.id !== this.player.id);
    const poolsByWeight = new Map();
    for (const fighter of pool) {
      if (!poolsByWeight.has(fighter.weightClass)) poolsByWeight.set(fighter.weightClass, []);
      poolsByWeight.get(fighter.weightClass).push(fighter);
    }
    const boutCount = scope === 'world' ? 8 : scope === 'continental' ? 6 : scope === 'national' ? 5 : scope === 'regional' ? 3 : rand(1, 2);
    const bouts = [];
    const used = new Set();
    const usedWeights = new Set([this.player.weightClass]);
    while (bouts.length < boutCount - 1) {
      const availableWeights = [...poolsByWeight.entries()]
        .filter(([, fighters]) => fighters.filter(f => !used.has(f.id)).length >= 2)
        .map(([weightClass]) => weightClass);
      const unusedWeights = availableWeights.filter(weightClass => !usedWeights.has(weightClass));
      const eligibleWeights = unusedWeights.length ? unusedWeights : availableWeights;
      if (!eligibleWeights.length) break;
      const weightClass = pick(eligibleWeights);
      const candidates = poolsByWeight.get(weightClass).filter(f => !used.has(f.id));
      const first = pick(candidates);
      const second = pick(candidates.filter(f => f.id !== first.id));
      used.add(first.id);
      used.add(second.id);
      bouts.push({
        red: first.name,
        blue: second.name,
        weightClass: first.weightClassData?.name || first.weightClass,
        billing: 'undercard',
      });
      usedWeights.add(weightClass);
    }
    const playerBout = {
      red: this.player.name,
      blue: fight.opponent.name,
      weightClass: this.player.weightClassData?.name || this.player.weightClass,
      billing,
      playerBout: true,
    };
    if (billing === 'main_event') bouts.push(playerBout);
    else if (billing === 'co_main') bouts.splice(Math.max(0, bouts.length - 1), 0, playerBout);
    else bouts.unshift(playerBout);
    if (bouts.length) bouts[bouts.length - 1].billing = 'main_event';
    if (bouts.length > 1) bouts[bouts.length - 2].billing = bouts[bouts.length - 2].playerBout ? billing : 'co_main';
    return bouts;
  }

  getHomeAdvantage(fight) {
    if (!fight?.event) return 0;
    if (fight.event.homeSide === 'player') return 6;
    if (fight.event.homeSide === 'opponent') return -4;
    return 0;
  }

  // Escada territorial: títulos do PRÓPRIO país do jogador, depois do
  // continente, depois mundiais. Títulos sem dono geram luta por cinturão vago.
  _eligibleBeltTier() {
    const p    = this.player;
    const wc   = p.weightClass;
    const rank = p.ranking || 99;
    const wins = p.wins;
    const nat  = p.nationality;
    const cont = NAMES[nat]?.continent || 'americas';
    const has        = b  => (p.belts || []).includes(b);
    const hasTrophy  = t  => (p.trophies || []).some(tr => tr.tier === t && tr.scope === nat);

    // Escada progressiva: cada tier exige ter conquistado o anterior
    // World: 20+ vitórias, top 6, precisa ter cinturão continental
    if (wins >= 20 && rank <= 6 && has(`continental:${cont}`)) {
      const org = WORLD_ORGS.find(o => !has(o) && this.getTitleHolder(wc, o));
      if (org) return org;
    }
    // Continental: 14+ vitórias, top 10, precisa ter troféu nacional
    if (wins >= 14 && rank <= 10 && hasTrophy('national') && !has(`continental:${cont}`))
      return `continental:${cont}`;
    // Nacional: 8+ vitórias, precisa ter troféu regional
    if (wins >= 8 && hasTrophy('regional') && !hasTrophy('national'))
      return `national:${nat}`;
    // Regional: 4+ vitórias, precisa ter troféu local
    if (wins >= 4 && hasTrophy('local') && !hasTrophy('regional'))
      return `regional:${nat}`;
    // Local: 2+ vitórias (troféu não-único, pode vencer múltiplas enquanto não tiver regional+)
    if (wins >= 2 && !hasTrophy('regional') && !hasTrophy('national') && !has(`continental:${cont}`))
      return `local:${nat}`;
    return null;
  }

  _eligibleRecurringTrophyTier(primaryBelt = null) {
    const p = this.player;
    if (!p || p.wins < 2) return null;

    const nat = p.nationality;
    const trophies = p.trophies || [];
    const hasTier = tier => trophies.some(t => t.tier === tier && t.scope === nat);
    const eligible = [`local:${nat}`];

    if (p.wins >= 4 && hasTier('local')) eligible.push(`regional:${nat}`);
    if (p.wins >= 8 && hasTier('regional')) eligible.push(`national:${nat}`);

    const alternatives = eligible.filter(key => key !== primaryBelt);
    if (!alternatives.length) return null;

    // Alterna os circuitos ao longo da temporada em vez de prender a carreira
    // para sempre ao nível mais alto já alcançado.
    const seasonIndex = Math.floor((this.week - 1) / 4) + this.year;
    return alternatives[seasonIndex % alternatives.length];
  }

  // Para títulos vagos: encontra (ou gera) um adversário do mesmo
  // país/continente para disputar o cinturão
  _findScopedOpponent(beltKey, excludeOpponentIds = []) {
    const info = getBeltInfo(beltKey);
    const wc   = this.player.weightClass;
    const pool = (this.rankings[wc] || []).filter(f =>
      f.id !== this.player.id && !f.isInjured && !f.retiredAt &&
      !excludeOpponentIds.includes(f.id) &&
      (info.scope === 'continent'
        ? NAMES[f.nationality]?.continent === info.scopeKey
        : f.nationality === info.scopeKey)
    );

    if (pool.length > 0) {
      // o mais próximo do nível do jogador
      pool.sort((a, b) =>
        Math.abs(a.overall - this.player.overall) - Math.abs(b.overall - this.player.overall));
      return pool[0];
    }

    // Não existe conterrâneo na categoria: gera um lutador doméstico
    const natKey = info.scope === 'continent'
      ? pick(NATIONALITIES.filter(n => NAMES[n].continent === info.scopeKey)) || this.player.nationality
      : info.scopeKey;

    const domestic = generateFighter({
      nationality: natKey,
      weightClass: wc,
      level: clamp(this.player.overall + rand(-8, 4), 35, 90),
      wins: rand(2, 12),
      losses: rand(0, 5),
    });
    domestic.promoter = this._assignNPCPromoter(domestic);
    this.allFighters.push(domestic);
    this.rebuildRankings();
    return domestic;
  }

  _spawnDomesticOpponent(natKey, wc) {
    const level = clamp(this.player.overall + rand(-10, 6), 35, 90);
    const f = generateFighter({
      nationality: natKey,
      weightClass: wc,
      level,
      wins:   rand(0, Math.max(2, this.player.wins + 3)),
      losses: rand(0, 5),
    });
    f.promoter = this._assignNPCPromoter(f);
    this.allFighters.push(f);
    return f;
  }

  _getMatchmakingPool(excludeOpponentIds = [], priorityIds = [], orgPool = []) {
    const player = this.player;
    const wc     = player.weightClass;
    const wins   = player.wins;
    const nat    = player.nationality;
    const cont   = NAMES[nat]?.continent || 'americas';

    // Escada geográfica: estreante luta com conterrâneos, depois o continente,
    // e só com experiência enfrenta o mundo todo.
    const scope = wins < 4 ? 'country' : wins < 10 ? 'continent' : 'world';
    const inScope = (f) => scope === 'country'
      ? f.nationality === nat
      : scope === 'continent'
      ? NAMES[f.nationality]?.continent === cont
      : true;

    // Garante adversários suficientes no escopo, gerando domésticos se faltar
    if (scope !== 'world') {
      let available = this.allFighters.filter(f =>
        f.weightClass === wc && !f.isInjured && !f.retiredAt && f.id !== player.id && inScope(f));
      let spawned = false;
      let guard = 0;
      while (available.length < 5 && guard++ < 10) {
        const natKey = scope === 'country'
          ? nat
          : (pick(NATIONALITIES.filter(n => NAMES[n].continent === cont)) || nat);
        available.push(this._spawnDomesticOpponent(natKey, wc));
        spawned = true;
      }
      let freshGuard = 0;
      while (excludeOpponentIds.length > 0 &&
             available.filter(f => !excludeOpponentIds.includes(f.id)).length < 4 &&
             freshGuard++ < 10) {
        const natKey = scope === 'country'
          ? nat
          : (pick(NATIONALITIES.filter(n => NAMES[n].continent === cont)) || nat);
        available.push(this._spawnDomesticOpponent(natKey, wc));
        spawned = true;
      }
      if (spawned) this.rebuildRankings();
    }

    const rank   = player.ranking || 99;
    let pool = this.rankings[wc]
      ? this.rankings[wc].filter(f => f.id !== player.id && !f.isInjured && !f.retiredAt && inScope(f))
      : [];
    const freshPool = pool.filter(f => !excludeOpponentIds.includes(f.id));
    if (freshPool.length >= 3) pool = freshPool;

    // Safe = ranked WORSE than player (higher number = lower ranked)
    const safe  = pool.filter(f => (f.ranking || 99) > rank);
    // Close = within 4 spots of player
    const close = pool.filter(f => Math.abs((f.ranking || 99) - rank) <= 4 && (f.ranking||99) !== rank);
    // Risky = better than player but reachable (not champion unless player is top 5 with 8+ wins)
    const risky = pool.filter(f =>
      (f.ranking || 99) < rank &&
      !f.isChampion &&
      (f.ranking || 99) >= Math.max(1, rank - 10)
    );
    const seen = new Set();
    const dedup = (arr) => arr.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });

    const shuffle = arr => arr
      .map(value => ({ value, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .map(item => item.value);

    // Rivais têm prioridade no pool (entram no início da lista)
    const rivals = pool.filter(f => priorityIds.includes(f.id));

    // Org-biased: com contrato exclusivo, ~70% (3/4 slots) vem do ranking da org
    const freshOrg = orgPool.filter(f => !excludeOpponentIds.includes(f.id));
    const useOrgBias = freshOrg.length >= 2;
    const candidates = useOrgBias
      ? dedup([
          ...rivals.slice(0, 2),
          ...shuffle(freshOrg.slice(0, 10)).slice(0, 3),  // 70% — org
          ...shuffle(safe.slice(0, 8)).slice(0, 1),       // 30% — geral
        ])
      : dedup([
          ...rivals.slice(0, 2),
          ...shuffle(safe.slice(0, 8)).slice(0, 2),
          ...shuffle(close.slice(0, 8)).slice(0, 1),
          ...shuffle(risky.slice(0, 8)).slice(0, 1),
        ]);

    if (candidates.length >= 4) return candidates.slice(0, 4);

    // Fallback: opponents closest in ranking to player
    return pool
      .sort((a, b) => Math.abs((a.ranking||99) - rank) - Math.abs((b.ranking||99) - rank))
      .slice(0, 8)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
  }

  _calculatePurse(opp, titleBelt = null) {
    const base = 2000;
    const rankBonus = Math.max(0, 20 - (opp.ranking || 20)) * 500;
    const titleBonus = titleBelt ? getBeltInfo(titleBelt).bonus : 0;
    const playerBonus = this.player.popularity * 200;
    const total = base + rankBonus + titleBonus + playerBonus + rand(0, 5000);
    // Trait nacional pode aumentar as bolsas (US, GB)
    const contractMult = this.player.contract?.fightsRemaining > 0
      ? this.player.contract.purseMultiplier
      : 1;
    return Math.round(total * (this.player.purseMult || 1) * contractMult);
  }

  _calculateRisk(opp) {
    // 1-5 stars
    const playerOvr = this.player.overall;
    const oppOvr    = opp.overall;
    const diff      = oppOvr - playerOvr;

    if (diff > 15)  return 5;
    if (diff > 8)   return 4;
    if (diff > 2)   return 3;
    if (diff > -5)  return 2;
    return 1;
  }

  _rankingImpact(opp) {
    const rank = opp.ranking || 99;
    if (opp.isChampion) return '🏆 Disputa pelo cinturão!';
    if (rank <= 3)      return '⬆️ Top 3 – impulso massivo';
    if (rank <= 10)     return '⬆️ Top 10 – grande salto';
    if (rank <= 15)     return '↗️ Entrada no top 15';
    return '→ Manutenção';
  }

  // Time progression
  advanceWeeks(n = 1, options = {}) {
    this.week += n;
    while (this.week > 52) {
      this.week -= 52;
      this.year++;
      this._endOfYear();
    }

    this._payStaff(n);
    this._tickNpcConditioning(n);
    this._tickWorld(n);
    this._recoverInjuries(n);
    if (this.player && !this.player.retiredAt) {
      this._advanceWeightTransition(n);
      const losses = options.trained ? [] : this.player.applyCareerWear(n);
      if (options.trained) this.player.markTraining();
      if (losses.length) {
        const totalLost = losses.reduce((sum, loss) => sum + (loss.amount || 1), 0);
        this.addNews({
          headline: nl(
            `${this.player.name} sente os efeitos da inatividade e perde ${totalLost} ponto(s) de atributos.`,
            `${this.player.name} feels the effects of inactivity and loses ${totalLost} attribute point(s).`
          ),
          type: 'career',
          fighters: [this.player],
        });
      }
    }
    // Provocação de rival a cada ~8 semanas se tiver rival intenso
    if (this.week % 8 === 0 && Math.random() < 0.55) this.generateRivalTaunt();

    for (const challenge of this.incomingChallenges) challenge.expiresIn -= n;
    const expired = this.incomingChallenges.filter(c => c.expiresIn <= 0);
    this.incomingChallenges = this.incomingChallenges.filter(c => c.expiresIn > 0);
    for (const challenge of expired) {
      this.addNews({
        headline: nl(`O desafio de ${challenge.opponent.name} a ${this.player.name} expirou sem resposta.`, `${challenge.opponent.name}'s challenge to ${this.player.name} expired without a response.`),
        type: 'challenge',
        fighters: [this.player, challenge.opponent],
      });
    }
    this.generateIncomingChallenge();
    this._generateWeeklyNews();
    this._generateCareerNarrative();
    this._maybeCreateMediaCrisis();
    if (!this.player?.contract?.fightsRemaining && this.contractOffers.length === 0 && Math.random() < 0.25) {
      this.generateContractOffers();
    }
    if (!this.activeTournament && this.tournamentOffers.length === 0 && !this.nextFight && Math.random() < 0.12) {
      this.generateTournamentOffer();
    }
    // Expire old tournament offers
    this.tournamentOffers = this.tournamentOffers.filter(o => o.expiresWeek >= this.week);
  }

  _endOfYear() {
    // Envelhece todos
    for (const f of this.allFighters) f.birthday();
    if (this.player) this.player.birthday();

    // Ganhos de treino para NPCs jovens
    for (const f of this.allFighters) {
      if (f.retiredAt || f.age > 30) continue;
      const growthAttrs = ['speed','reflexes','stamina','strength','precision','ringIQ'];
      const gains = f.age < 24 ? 2 : f.age < 27 ? 1 : 0;
      if (gains > 0) {
        for (let i = 0; i < gains; i++) {
          const attr = pick(growthAttrs);
          const cap  = Math.min(f.potential || 85, 95);
          if (f[attr] < cap) f[attr] = Math.min(cap, f[attr] + rand(1, 2));
        }
      }
    }

    // Aposentadoria NPC
    for (const f of this.allFighters) {
      if (f.retiredAt) continue;
      const ageRisk  = f.age > 38 ? 0.30 : f.age > 35 ? 0.08 : 0;
      const wearRisk = (f.careerWear || 0) > 70 ? 0.15 : 0;
      if (Math.random() < ageRisk + wearRisk) {
        this._vacateFighterBelts(f);
        f.retiredAt = `${this.year}`;
        this.addNews({
          headline: nl(`${f.name} anuncia aposentadoria do boxe profissional.`, `${f.name} announces retirement from professional boxing.`),
          type: 'retirement', fighters: [f],
        });
      }
    }

    // Prospects chegam ao ranking
    // Mantém ~16-20 ativos por categoria de peso
    for (const wc of WEIGHT_CLASSES) {
      const active = this.allFighters.filter(f => !f.retiredAt && f.weightClass === wc.id).length;
      const target = 18;
      const toGenerate = Math.max(0, target - active);
      for (let i = 0; i < Math.min(toGenerate, 3); i++) {
        const nat = pick(NATIONALITIES);
        const prospect = generateFighter({
          weightClass: wc.id,
          nationality: nat,
          age:         rand(18, 22),
          overall:     rand(42, 58),
          wins: 0, losses: 0, draws: 0,
        });
        prospect.promoter = this._assignNPCPromoter(prospect);
        this.allFighters.push(prospect);
        if (Math.random() < 0.25) {
          this.addNews({
            headline: nl(`${prospect.name} estreia no boxe profissional na categoria ${wc.name}.`, `${prospect.name} makes their professional boxing debut in the ${wc.name} division.`),
            type: 'prospect', fighters: [prospect],
          });
        }
      }
    }

    this.rebuildRankings();
  }

  _tickNpcConditioning(weeks) {
    const academyRoster = new Set(this.academy?.rosterIds || []);
    for (const fighter of this.allFighters) {
      if (fighter.retiredAt || fighter.isInjured || academyRoster.has(fighter.id)) continue;
      const yearsPastPeak = Math.max(0, fighter.age - fighter.peakAge);
      const disciplineChance = clamp((fighter.discipline || 50) / 120, 0.25, 0.82);
      const veteranPenalty = Math.min(0.30, yearsPastPeak * 0.025);
      const activeTrainingChance = disciplineChance - veteranPenalty;

      if (Math.random() < activeTrainingChance) {
        fighter.markTraining();
      } else {
        fighter.applyCareerWear(weeks);
      }
    }
  }

  // Transfere cinturões de um lutador para o próximo na fila
  _vacateFighterBelts(f) {
    if (!f.belts?.length) return;
    const wcPool = (this.rankings[f.weightClass] || []).filter(x => !x.retiredAt && x.id !== f.id);
    for (const belt of f.belts) {
      const info = getBeltInfo(belt);
      const heir = wcPool.find(x => {
        if ((x.belts || []).includes(belt)) return false;
        if (info.scope === 'country')   return x.nationality === info.scopeKey;
        if (info.scope === 'continent') return NAMES[x.nationality]?.continent === info.scopeKey;
        return true;
      });
      if (heir) {
        if (!heir.belts) heir.belts = [];
        heir.belts.push(belt);
        if (info.tier >= 4) {
          this.addNews({
            headline: nl(`${heir.name} é declarado novo dono do ${getBeltDisplayName(belt, { weightClass: heir.weightClass })} após aposentadoria de ${f.name}.`, `${heir.name} is declared the new ${getBeltDisplayName(belt, { weightClass: heir.weightClass })} holder after ${f.name}'s retirement.`),
            type: 'title_change', fighters: [heir],
          });
        }
      }
    }
    f.belts = [];
  }

  // Aposentadoria do jogador
  retirePlayer(reason = 'voluntary') {
    const p = this.player;
    if (!p || p.retiredAt) return { ok: false };

    for (const belt of p.belts || []) this._closeTitleReign(p, belt, 'retirement');
    this._vacateFighterBelts(p);
    p.retiredAt        = `${this.year}`;
    p.retirementReason = reason;
    p.contract         = null;
    this.nextFight     = null;
    this.availableFights = [];

    const headlines = {
      voluntary: nl(`${p.name} anuncia aposentadoria do boxe profissional.`, `${p.name} announces retirement from professional boxing.`),
      medical:   nl(`${p.name} é forçado a se aposentar por recomendação médica após sequência de nocautes.`, `${p.name} is forced to retire on medical advice after a series of knockouts.`),
      age:       nl(`${p.name} se aposenta aos ${p.age} anos após longa carreira no boxe.`, `${p.name} retires at age ${p.age} after a long boxing career.`),
      wear:      nl(`${p.name} encerra a carreira por desgaste acumulado.`, `${p.name} ends their career due to accumulated wear.`),
    };
    this.addNews({
      headline: headlines[reason] || headlines.voluntary,
      type: 'retirement', fighters: [p],
    });
    this._checkHallOfFameInduction(p);
    this.save(this.currentSlot || 1);
    return { ok: true, reason };
  }

  _checkHallOfFameInduction(fighter) {
    if (!fighter || !fighter.retiredAt) return;
    const archivedDef = Object.values(fighter.divisionDefenses || {}).reduce((t, d) => t + Object.values(d || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef    = Object.values(fighter.beltDefenses  || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const worldTitles = (fighter.totalTitleWins || 0);
    const divs        = new Set((fighter.worldTitleHistory || []).map(e => e.weightClass)).size;
    const koPct       = fighter.koPct || 0;
    // Hall da Fama: pelo menos 1 título mundial + 5 defesas, ou múltiplas divisões, ou longa carreira com títulos
    const eligible = worldTitles >= 1 && (totalDef >= 5 || divs >= 2 || (fighter.wins || 0) >= 35);
    if (!eligible) return;
    const already = (this.hallOfFame || []).some(e => e.id === fighter.id);
    if (already) return;
    const goatScore = this._calcGoatScore(fighter);
    this.hallOfFame = this.hallOfFame || [];
    this.hallOfFame.push({
      id:           fighter.id,
      name:         fighter.name,
      nationality:  fighter.nationality,
      flag:         (NAMES[fighter.nationality] || {}).flag || '🏴',
      era:          `${fighter.careerStartYear || 2024}–${fighter.retiredAt}`,
      record:       fighter.record,
      wins:         fighter.wins,
      losses:       fighter.losses,
      draws:        fighter.draws || 0,
      kos:          (fighter.kos || 0) + (fighter.tkos || 0),
      koPct,
      titleDefs:    totalDef,
      divisions:    divs,
      weightClass:  fighter.weightClass,
      belts:        [...new Set([...(fighter.titlesWon || []), ...(fighter.belts || [])]).values()].filter(b => WORLD_ORGS.includes(b)),
      style:        fighter.styleId,
      bio:          `${fighter.name} se aposentou em ${fighter.retiredAt} com um cartel de ${fighter.record} e ${totalDef} defesas de título.`,
      goatScore,
      inducted:     true,
      inductedYear: fighter.retiredAt,
      isPlayer:     fighter.id === this.player?.id,
      highlights:   this._buildLegendHighlights(fighter, totalDef, divs),
    });
  }

  _calcGoatScore(p) {
    const archivedDef = Object.values(p.divisionDefenses || {}).reduce((t, d) => t + Object.values(d || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef    = Object.values(p.beltDefenses || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const divs        = new Set((p.worldTitleHistory || []).map(e => e.weightClass)).size;
    const notableWins = (p.fightHistory || []).filter(h => h.result === 'W' && h.opponentRanking && h.opponentRanking <= 5).length;
    const eventRecords = p.eventRecords || {};
    return (
      (p.wins || 0) * 3 +
      ((p.kos || 0) + (p.tkos || 0)) * 2 +
      (p.totalTitleWins || 0) * 50 +
      totalDef * 20 +
      (p.superBelts || []).length * 150 +
      (p.unificationWins || 0) * 60 +
      Math.max(0, divs - 1) * 120 +
      (eventRecords.sellouts || 0) * 12 +
      (eventRecords.mainEvents || 0) * 5 +
      Math.floor((eventRecords.maxAttendance || 0) / 10000) * 8 +
      notableWins * 25
    );
  }

  _buildLegendHighlights(fighter, totalDef, divs) {
    const h = [];
    if ((fighter.totalTitleWins || 0) >= 1) h.push(`${fighter.totalTitleWins} título${fighter.totalTitleWins > 1 ? 's' : ''} mundial${fighter.totalTitleWins > 1 ? 'is' : ''}`);
    if (totalDef >= 5) h.push(`${totalDef} defesas de título mundial`);
    if (divs >= 2) h.push(`Campeão em ${divs} divisões`);
    if (fighter.losses === 0) h.push('Carreira invicta');
    if ((fighter.unificationWins || 0) >= 3) h.push('Campeão Indiscutível');
    if ((fighter.superBelts || []).length >= 1) h.push('Super-Cinturão conquistado');
    if ((fighter.wins || 0) >= 40) h.push(`${fighter.wins} vitórias profissionais`);
    return h.slice(0, 3);
  }

  // Retorna motivo de aposentadoria forçada ou null
  checkForcedRetirement() {
    const p = this.player;
    if (!p || p.retiredAt) return null;
    if (p.age >= 43) return 'age';
    if ((p.careerWear || 0) >= 88 && p.age >= 35) return 'wear';
    // 3 derrotas consecutivas por KO/TKO
    const last3 = (p.fightHistory || []).slice(0, 3);
    if (last3.length === 3 && last3.every(h => h.result === 'L' && (h.method === 'KO' || h.method === 'TKO'))) {
      return 'medical';
    }
    return null;
  }

  _tickWorld(weeks) {
    // Simulate some AI vs AI fights to keep world alive
    this.worldSimFights = [];

    for (const wc of WEIGHT_CLASSES) {
      const fighters = (this.rankings[wc.id] || [])
        .filter(f => !f.isInjured && !f.retiredAt && f.id !== (this.player?.id));

      // 1-2 fights per weight class per advance
      const numFights = rand(0, 2);
      for (let i = 0; i < numFights && fighters.length >= 2; i++) {
        const rivalryMatch = this._pickNpcRivalryMatch(wc.id, fighters);
        const idxA = rand(0, Math.min(8, fighters.length - 1));
        let idxB   = rand(0, Math.min(8, fighters.length - 1));
        if (idxB === idxA) idxB = (idxA + 1) % fighters.length;

        const fa = rivalryMatch?.fa || fighters[idxA];
        const fb = rivalryMatch?.fb || fighters[idxB];
        if (!fa || !fb || fa.id === fb.id) continue;

        const beltsBeforeA = [...(fa.belts || [])];
        const beltsBeforeB = [...(fb.belts || [])];

        const contestedBelts = this._getAiContestedBelts(fa, fb);
        const sim = new FightSimulation(fa, fb, {
          rounds: contestedBelts.length > 0 ? 12 : 10,
          strategy1: chooseNpcStrategy(fa, fb),
          strategy2: chooseNpcStrategy(fb, fa),
          isTitleFight: contestedBelts.length > 0,
          contestedBelts,
        });
        sim.simulate();
        sim.applyResult();
        fa.markTraining();
        fb.markTraining();

        const r = sim.finalResult;
        if (r && !r.isDraw && !r.isNoContest) {
          this.worldSimFights.push({ fa, fb, result: r });
          this.addNews({
            headline: this._fightNewsHeadline(r),
            type: 'fight',
            fighters: [fa, fb],
          });
          this._updateNpcRivalry(fa, fb, r, contestedBelts);

          // Title changed hands in the AI world? (only newsworthy for continental+)
          const loserBeltsBefore = r.loserFighter === fa ? beltsBeforeA : beltsBeforeB;
          const transferredBelts = loserBeltsBefore.filter(b =>
            contestedBelts.includes(b) && (r.winnerFighter.belts || []).includes(b)
          );
          if (r.loserFighter && transferredBelts.length > 0) {
            const big = transferredBelts.find(b => getBeltInfo(b).tier >= 4);
            if (big) {
              this.addNews({
                headline: nl(`🏆 ${r.winnerFighter.name} conquista o ${getBeltDisplayName(big, { year: this.year, weightClass: r.winnerFighter.weightClass })} ao derrotar ${r.loserFighter.name}!`, `🏆 ${r.winnerFighter.name} captures the ${getBeltDisplayName(big, { year: this.year, weightClass: r.winnerFighter.weightClass })} by defeating ${r.loserFighter.name}!`),
                type: 'title_change', fighters: [r.winnerFighter],
              });
            }
          }
        }
      }
    }

    this.rebuildRankings();
    this._tickNpcRivalryStories(weeks);
  }

  _pickNpcRivalryMatch(weightClass, fighters) {
    if (Math.random() >= 0.35) return null;
    const fighterIds = new Set(fighters.map(f => f.id));
    const candidates = this.npcRivalries.filter(rivalry =>
      rivalry.weightClass === weightClass &&
      rivalry.intensity >= 3 &&
      fighterIds.has(rivalry.fighterAId) &&
      fighterIds.has(rivalry.fighterBId)
    );
    if (!candidates.length) return null;
    const rivalry = pick(candidates);
    return {
      fa: fighters.find(f => f.id === rivalry.fighterAId),
      fb: fighters.find(f => f.id === rivalry.fighterBId),
      rivalry,
    };
  }

  _npcRivalryKey(aId, bId) {
    return [aId, bId].sort((a, b) => a - b).join(':');
  }

  _updateNpcRivalry(fa, fb, result, contestedBelts = []) {
    if (!fa || !fb || !result || result.isNoContest) return;
    const key = this._npcRivalryKey(fa.id, fb.id);
    let rivalry = this.npcRivalries.find(item => item.key === key);
    const closeDecision = isDecisionResult(result.method) &&
      (result.isControversial || result.method === 'Decisão Dividida' || result.method === 'Empate');
    const knockout = isKnockoutResult(result.method);
    const rematch = rivalry?.fights > 0;
    let intensity = closeDecision ? 2 : contestedBelts.length ? 2 : knockout ? 1 : 0;
    if (rematch) intensity++;
    if (!intensity) return;

    if (!rivalry) {
      rivalry = {
        key,
        fighterAId: fa.id,
        fighterBId: fb.id,
        fighterAName: fa.name,
        fighterBName: fb.name,
        weightClass: fa.weightClass,
        intensity: 0,
        fights: 0,
        winsA: 0,
        winsB: 0,
        draws: 0,
        lastWeek: this.week,
        lastYear: this.year,
      };
      this.npcRivalries.push(rivalry);
    }
    rivalry.intensity = Math.min(5, rivalry.intensity + intensity);
    rivalry.fights++;
    if (result.isDraw) rivalry.draws++;
    else if (result.winnerFighter?.id === rivalry.fighterAId) rivalry.winsA++;
    else if (result.winnerFighter?.id === rivalry.fighterBId) rivalry.winsB++;
    rivalry.lastWeek = this.week;
    rivalry.lastYear = this.year;

    if (rivalry.intensity >= 3) {
      this.addNews({
        headline: nl(
          `A rivalidade entre ${fa.name} e ${fb.name} esquenta após novo capítulo no ringue.`,
          `The rivalry between ${fa.name} and ${fb.name} heats up after another chapter in the ring.`
        ),
        type: 'npc_rivalry',
        fighters: [fa, fb],
      });
    }
    if (this.npcRivalries.length > 250) {
      this.npcRivalries.sort((a, b) => b.intensity - a.intensity || b.lastYear - a.lastYear);
      this.npcRivalries.length = 250;
    }
  }

  _tickNpcRivalryStories(weeks = 1) {
    const active = this.npcRivalries.filter(rivalry => rivalry.intensity >= 2);
    if (!active.length || Math.random() >= Math.min(0.45, weeks * 0.08)) return;
    const rivalry = pick(active);
    const fa = this.allFighters.find(f => f.id === rivalry.fighterAId);
    const fb = this.allFighters.find(f => f.id === rivalry.fighterBId);
    if (!fa || !fb || fa.retiredAt || fb.retiredAt) return;
    const speaker = Math.random() < 0.5 ? fa : fb;
    const target = speaker.id === fa.id ? fb : fa;
    const taunts = [
      `${speaker.name}: "${target.name} sabe que nossa história ainda não terminou."`,
      `${speaker.name} pede revanche contra ${target.name} após nova troca de provocações.`,
      `Promotores estudam novo encontro entre ${speaker.name} e ${target.name}.`,
      `${target.name} responde às provocações de ${speaker.name}: "Resolvo isso no ringue."`,
    ];
    this.addNews({ headline: pick(taunts), type: 'npc_rivalry', fighters: [speaker, target] });
    rivalry.intensity = Math.min(5, rivalry.intensity + 1);
  }

  _getAiContestedBelts(fa, fb) {
    const holders = [
      { holder: fa, challenger: fb },
      { holder: fb, challenger: fa },
    ];

    for (const { holder, challenger } of holders) {
      if (!(holder.belts || []).length || Math.random() >= 0.3) continue;
      const challengerContinent = NAMES[challenger.nationality]?.continent;
      const belt = holder.belts.find(b => {
        const info = getBeltInfo(b);
        if (!info.scope) return true;
        if (info.scope === 'continent') return challengerContinent === info.scopeKey;
        if (info.scope === 'country') return challenger.nationality === info.scopeKey;
        return false;
      });
      if (belt) return [belt];
    }
    return [];
  }

  _fightNewsHeadline(result) {
    const w = result.winnerFighter;
    const l = result.loserFighter;
    if (result.isNoContest) return 'Luta termina sem resultado oficial após incidente acidental.';
    if (!w || !l) return result.method === 'Empate Técnico'
      ? 'Interrupção leva a luta a um empate técnico.'
      : 'Luta termina em empate.';
    if (result.method === 'Desqualificação (DQ)')
      return `${w.name} vence ${l.name} por desqualificação no ${result.round}º round.`;
    if (result.method === 'Interrupção Médica')
      return `${w.name} vence ${l.name} após interrupção médica no ${result.round}º round.`;
    if (result.method === 'Abandono (RTD)')
      return `${w.name} vence após o corner de ${l.name} interromper a luta no ${result.round}º round.`;
    if (result.method === 'Decisão Técnica')
      return `${w.name} supera ${l.name} por decisão técnica após interrupção acidental.`;
    const templates = isDecisionResult(result.method)
      ? getNewsTemplates().win_decision
      : result.method === 'KO'
      ? getNewsTemplates().win_ko
      : getNewsTemplates().win_tko;
    return pick(templates)
      .replace('{winner}', w.name)
      .replace('{loser}', l.name)
      .replace('{round}', result.round)
      .replace('{rounds}', result.round);
  }

  _recoverInjuries(weeks) {
    for (const f of this.allFighters) {
      if (f.isInjured) recoverFighter(f, weeks);
    }
    if (this.player?.isInjured) {
      // Nutritionist speeds up the player's recovery
      const boost = 1 + this.staffBonus('nutritionist');
      recoverFighter(this.player, Math.ceil(weeks * boost));
    }
  }

  // News
  _beltScope(beltKey) {
    if (!beltKey) return 'world';
    if (WORLD_ORGS.includes(beltKey)) return 'world';
    const tier = getBeltInfo(beltKey).tier || 1;
    if (tier >= 5) return 'world';
    if (tier === 4) return 'continental';
    if (tier === 3) return 'national';
    if (tier === 2) return 'regional';
    return 'local';
  }

  addNews(item) {
    this.news.unshift({
      ...item,
      scope: item.scope || 'world',
      outlet: item.outlet || null,
      date: this.dateString,
      id:   generateId(),
    });
    if (this.news.length > 500) this.news.pop();
  }

  _mediaFill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  _randomMediaNews(scope = 'world') {
    const bank = MEDIA_NEWS_BANK;
    const fighter = pick(this.allFighters.filter(f => !f.retiredAt)) || this.player;
    const wc = WEIGHT_CLASSES.find(w => w.id === fighter?.weightClass) || pick(WEIGHT_CLASSES);
    const outlet = pick(bank.outlets[scope] || bank.outlets.world);
    return {
      headline: this._mediaFill(
        `${pick(bank.leads)} ${pick(bank.subjects)} ${pick(bank.endings)}`,
        {
          outlet,
          player: this.player?.name || 'o atleta',
          fighter: fighter?.name || 'um novo prospecto',
          weightClass: wc?.name || 'divisão',
        }
      ),
      type: 'media',
      scope,
      outlet,
    };
  }

  addTitleMediaCoverage(fighter, beltKey, titleName) {
    const scope = this._beltScope(beltKey);
    const outlet = pick(MEDIA_NEWS_BANK.outlets[scope] || MEDIA_NEWS_BANK.outlets.world);
    const headline = this._mediaFill(pick(MEDIA_NEWS_BANK.titleCoverage[scope]), {
      outlet,
      player: fighter.name,
      title: titleName,
    });
    this.addNews({ headline, type: 'title_coverage', scope, outlet, fighters: [fighter] });
  }

  _generateInitialNews() {
    this.addNews({ headline: nl('Temporada de boxe se inicia com novos desafios.', 'Boxing season begins with new challenges.'), type: 'general' });
    this.addNews({ headline: nl(`Rankings atualizados em todas as categorias.`, `Rankings updated in all divisions.`), type: 'rankings' });
  }

  _generateWeeklyNews() {
    const scopes = ['local', 'regional', 'national', 'continental', 'world'];
    const amount = rand(2, 4);
    for (let i = 0; i < amount; i++) this.addNews(this._randomMediaNews(pick(scopes)));
    if (Math.random() < 0.3) {
      const wc     = pick(WEIGHT_CLASSES);
      const champs = this.getWorldChampions(wc.id);
      if (champs.length > 0) {
        const c = pick(champs);
        const templates = [
          `${c.fighter.name} anuncia próxima defesa do cinturão ${c.org} dos ${wc.name}.`,
          `Campeão ${c.org} dos ${wc.name}, ${c.fighter.name} rejeitou proposta de desafio.`,
          `Quem irá desafiar ${c.fighter.name} pelo cinturão ${c.org} dos ${wc.name}?`,
          `Fãs pedem unificação dos cinturões dos ${wc.name}.`,
        ];
        this.addNews({ headline: pick(templates), type: 'title', fighters: [c.fighter] });
      }
    }
    if (Math.random() < 0.2) {
      const f = pick(this.allFighters.filter(x => !x.retiredAt));
      const inj = pick(getNewsTemplates().injury);
      this.addNews({ headline: inj.replace('{fighter}', f.name), type: 'injury', fighters: [f] });
      f.isInjured   = true;
      f.injuryWeeks = rand(2, 8);
    }
  }

  // Fight processing
  processFightResult(sim) {
    const r = sim.finalResult;
    this.lastFightResult = sim.getSummary();
    const beltsBefore = [...(this.player.belts || [])];
    sim.applyResult();

    const fight = this.nextFight;
    if (fight?.event) this._processFightEvent(fight, r);

    // Belt / Trophy transfer: only the specific contested title changes hands
    if (fight?.titleBelt && r && !r.isDraw && !r.isNoContest) {
      const tb      = fight.titleBelt;
      const winner  = r.winnerFighter;
      const loser   = r.loserFighter;
      const isTroph = tb.startsWith('local:') || tb.startsWith('regional:') || tb.startsWith('national:');

      if (isTroph) {
        // Trophies are non-unique: winner earns a new trophy entry (only track for player)
        if (winner.isPlayer) {
          if (!winner.trophies) winner.trophies = [];
          const [tier, scope] = tb.split(':');
          const dn = getBeltDisplayName(tb, { year: this.year, weightClass: winner.weightClass });
          winner.trophies.push({ tier, scope, name: dn, year: this.year, weightClass: winner.weightClass });
          const beltInfo = getBeltInfo(tb);
          this.addNews({
            headline: nl(`${beltInfo.icon} ${winner.name} conquista o ${dn}!`, `${beltInfo.icon} ${winner.name} captures the ${dn}!`),
            type: 'title_change', fighters: [winner],
            scope: tier,
          });
          this.addTitleMediaCoverage(winner, tb, dn);
        }
      } else {
        // Continental / World: unique belts transfer normally
        if (!winner.belts) winner.belts = [];
        if (fight.vacant) {
          if (!winner.belts.includes(tb)) winner.belts.push(tb);
        } else if ((loser.belts || []).includes(tb)) {
          loser.belts = loser.belts.filter(b => b !== tb);
          if (!winner.belts.includes(tb)) winner.belts.push(tb);
        }
      }
    }

    // Unification loss: player also loses their own world belt
    if (fight?.isUnification && fight.myBelt && r && !r.isDraw && !r.isNoContest && r.loserFighter?.id === this.player.id) {
      const mb       = fight.myBelt;
      const opponent = r.winnerFighter;
      if ((this.player.belts || []).includes(mb)) {
        this.player.belts = this.player.belts.filter(b => b !== mb);
        if (!opponent.belts) opponent.belts = [];
        if (!opponent.belts.includes(mb)) opponent.belts.push(mb);
        this.addNews({
          headline: nl(`${this.player.name} perde também o ${getBeltDisplayName(mb, { weightClass: this.player.weightClass })} após derrota em unificação!`, `${this.player.name} also loses the ${getBeltDisplayName(mb, { weightClass: this.player.weightClass })} following unification defeat!`),
          type: 'title_change', fighters: [this.player],
        });
      }
    }

    // Continental and world title reign tracking
    if (fight?.titleBelt && r && !r.isDraw && !r.isNoContest && r.winnerFighter?.id === this.player.id) {
      const tb = fight.titleBelt;
      const titleTier = getBeltInfo(tb).tier;
      if (titleTier >= 4) {
        if (!beltsBefore.includes(tb)) {
          this._startTitleReign(this.player, tb);
        } else {
          this.player.beltDefenses = this.player.beltDefenses || {};
          this.player.beltDefenses[tb] = (this.player.beltDefenses[tb] || 0) + 1;
          const activeReign = [...(this.player.titleReigns || [])].reverse().find(reign =>
            reign.belt === tb && reign.weightClass === this.player.weightClass && !reign.endYear
          );
          if (activeReign) activeReign.defenses = this.player.beltDefenses[tb];
        }
      }
      if (WORLD_ORGS.includes(tb)) {
        if (!beltsBefore.includes(tb)) {
          // Won a NEW world title
          this.player.totalTitleWins = (this.player.totalTitleWins || 0) + 1;
          this.player.worldTitleHistory = this.player.worldTitleHistory || [];
          if (!this.player.worldTitleHistory.some(entry =>
            entry.belt === tb && entry.weightClass === this.player.weightClass
          )) {
            this.player.worldTitleHistory.push({
              belt: tb,
              weightClass: this.player.weightClass,
              year: this.year,
              week: this.week,
            });
            const divisions = new Set(this.player.worldTitleHistory.map(entry => entry.weightClass));
            if (divisions.size >= 2) {
              const bonus = divisions.size === 2 ? 8 : 5;
              this.player.popularity = clamp(this.player.popularity + bonus, 0, 100);
              this.player.reputation = clamp(this.player.reputation + bonus, 0, 100);
              this.addNews({
                headline: nl(`HISTÓRICO! ${this.player.name} se torna campeão mundial em ${divisions.size} divisões.`, `HISTORIC! ${this.player.name} becomes world champion in ${divisions.size} divisions.`),
                type: 'title_change',
                scope: 'world',
                fighters: [this.player],
              });
            }
          }
          if (fight.isUnification) {
            this.player.unificationWins = (this.player.unificationWins || 0) + 1;
          }
        } else {
          const defs = this.player.beltDefenses[tb];
          if (defs === 10 && !(this.player.superBelts || []).includes(tb)) {
            this.player.superBelts = this.player.superBelts || [];
            this.player.superBelts.push(tb);
            this.addNews({
              headline: nl(`🌟 LENDA! ${this.player.name} completa 10 defesas do ${getBeltDisplayName(tb, { weightClass: this.player.weightClass })} e recebe o Super-Cinturão!`, `🌟 LEGEND! ${this.player.name} completes 10 defenses of the ${getBeltDisplayName(tb, { weightClass: this.player.weightClass })} and receives the Super Belt!`),
              type: 'title_change', fighters: [this.player],
            });
          }
        }
      }
    }

    // Purse and contractual bonuses.
    if (fight) {
      this.lastFightPayout = this.calculateFightPayout(fight, r);
      this.player.money += this.lastFightPayout;
      this._progressContractAfterFight(r);
    }

    if (r?.isNoContest) {
      this.addNews({
        headline: nl(`A luta entre ${this.player.name} e ${fight?.opponent?.name || 'o adversário'} termina em No Contest.`, `The fight between ${this.player.name} and ${fight?.opponent?.name || 'the opponent'} ends in No Contest.`),
        type: 'player_fight',
        fighters: [this.player, fight?.opponent],
      });
    } else if (r && !r.isDraw && r.winnerFighter?.isPlayer) {
      this.addNews({
        headline: this._fightNewsHeadline(r),
        type: 'player_fight',
        fighters: [this.player, fight?.opponent],
      });
    } else if (r && !r.isDraw && r.loserFighter?.isPlayer) {
      this.addNews({
        headline: nl(`DERROTA! ${this.player.name} perde para ${r.winnerFighter.name}.`, `DEFEAT! ${this.player.name} loses to ${r.winnerFighter.name}.`),
        type: 'player_fight',
        fighters: [this.player, r.winnerFighter],
      });
    } else {
      this.addNews({ headline: nl(`Luta de ${this.player.name} termina em ${r?.method || 'empate'}.`, `${this.player.name}'s fight ends in ${r?.method || 'a draw'}.`), type: 'player_fight' });
    }

    // Belts gained or lost
    const beltsNow = this.player.belts || [];
    const gained   = beltsNow.filter(b => !beltsBefore.includes(b));
    const lost     = beltsBefore.filter(b => !beltsNow.includes(b));

    for (const b of gained) {
      this.player.titlesWon = this.player.titlesWon || [];
      if (!this.player.titlesWon.includes(b)) this.player.titlesWon.push(b);
      const beltInfo = getBeltInfo(b);
      const isWorld  = WORLD_ORGS.includes(b);
      const beltDN2  = getBeltDisplayName(b, { year: this.year, weightClass: this.player.weightClass });
      this.addNews({
        headline: isWorld
          ? nl(`🏆 ${this.player.name} É O NOVO CAMPEÃO MUNDIAL ${b} dos ${this.player.weightClassData?.name || ''}!`, `🏆 ${this.player.name} IS THE NEW WORLD CHAMPION ${b} at ${this.player.weightClassData?.name || ''}!`)
          : nl(`${beltInfo.icon} ${this.player.name} conquista o ${beltDN2}!`, `${beltInfo.icon} ${this.player.name} captures the ${beltDN2}!`),
        type: 'title_change', fighters: [this.player],
        scope: this._beltScope(b),
      });
      this.addTitleMediaCoverage(this.player, b, beltDN2);
    }
    for (const b of lost) {
      this._closeTitleReign(this.player, b, 'lost', r?.winnerFighter);
      this.addNews({
        headline: nl(`${this.player.name} perde o ${getBeltDisplayName(b, { year: this.year, weightClass: this.player.weightClass })} para ${r?.winnerFighter?.name || 'o adversário'}.`, `${this.player.name} loses the ${getBeltDisplayName(b, { year: this.year, weightClass: this.player.weightClass })} to ${r?.winnerFighter?.name || 'the opponent'}.`),
        type: 'title_change', fighters: [this.player],
        scope: this._beltScope(b),
      });
    }

    // Restaurar atributos temporários de sparring
    if (fight?._sparringRestore) {
      for (const [attr, val] of Object.entries(fight._sparringRestore)) {
        this.player[attr] = val;
      }
    }

    this._earnNickname(r);
    if (r && fight) this._updateRivalry(fight.opponent, r, fight);
    if (r && this.player.divisionRankingPenalty > 0) {
      const won = !r.isDraw && !r.isNoContest && r.winnerFighter?.id === this.player.id;
      this.player.divisionRankingPenalty = Math.max(0, this.player.divisionRankingPenalty - (won ? 12 : 6));
    }

    // Tournament result processing (before clearing nextFight)
    if (fight?.isTournament && this.activeTournament) {
      const tournResult = this._processTournamentResult(r);
      this.lastFightResult = this.lastFightResult || {};
      this.lastFightResult._tournamentResult = tournResult;
      // If tournament advanced, nextFight was already set by _scheduleTournamentFight
      // Don't clear it in that case
      if (tournResult?.type === 'tournament-advance') {
        this.availableFights = [];
        this.rebuildRankings();
        return;
      }
    }

    this.nextFight       = null;
    this.availableFights = [];
    this.rebuildRankings();
  }

  calculateFightPayout(fight, result) {
    if (!fight) return 0;
    const contract = this.player?.contract?.fightsRemaining > 0 ? this.player.contract : null;
    const won = result && !result.isDraw && !result.isNoContest && result.winnerFighter?.id === this.player.id;
    const byKnockout = won && isKnockoutResult(result.method);
    let multiplier = 1;
    if (won) multiplier += contract ? contract.winBonus : 0.25;
    if (byKnockout && contract) multiplier += contract.knockoutBonus;
    return Math.round(fight.purse * multiplier) + (fight.event?.gateShare || 0);
  }

  _processFightEvent(fight, result) {
    const event = fight.event;
    const p = this.player;
    const record = p.eventRecords || (p.eventRecords = { maxAttendance: 0, maxGate: 0, sellouts: 0, mainEvents: 0 });
    const soldOut = event.attendance >= event.arena.capacity;
    record.maxAttendance = Math.max(record.maxAttendance || 0, event.attendance);
    record.maxGate = Math.max(record.maxGate || 0, event.gate);
    if (soldOut) record.sellouts = (record.sellouts || 0) + 1;
    if (event.billing === 'main_event') record.mainEvents = (record.mainEvents || 0) + 1;

    const entry = {
      year: this.year,
      week: this.week,
      opponent: fight.opponent.name,
      arena: event.arena.name,
      scope: event.scope,
      level: event.arena.level,
      globalLevel: event.arena.globalLevel,
      attendance: event.attendance,
      capacity: event.arena.capacity,
      gate: event.gate,
      gateShare: event.gateShare,
      billing: event.billing,
      hostNation: event.hostNation,
      homeSide: event.homeSide,
      excitement: event.excitement || 40,
    };
    p.eventHistory.unshift(entry);
    if (p.eventHistory.length > 100) p.eventHistory.pop();

    const latestFight = p.fightHistory?.[0];
    if (latestFight) latestFight.event = entry;

    const won = result && !result.isDraw && !result.isNoContest && result.winnerFighter?.id === p.id;
    const reachGain = won ? 4 : 1;
    p.fanReach.local = clamp((p.fanReach.local || 0) + reachGain + (event.homeSide === 'player' ? 2 : 0), 0, 100);
    if (['national', 'continental', 'world'].includes(event.scope)) {
      p.fanReach.national = clamp((p.fanReach.national || 0) + reachGain, 0, 100);
    }
    if (['continental', 'world'].includes(event.scope)) {
      p.fanReach.international = clamp((p.fanReach.international || 0) + Math.max(1, reachGain - 1), 0, 100);
    }

    const scopeLabel = event.scope === 'world' ? 'mundial' : event.scope === 'continental' ? 'continental'
      : event.scope === 'national' ? 'nacional' : event.scope === 'regional' ? 'regional' : 'local';
    this.addNews({
      headline: soldOut
        ? nl(`INGRESSOS ESGOTADOS! ${event.arena.name} recebe ${event.attendance.toLocaleString('pt-BR')} torcedores para ${p.name} contra ${fight.opponent.name}.`, `SOLD OUT! ${event.arena.name} hosts ${event.attendance.toLocaleString('en-US')} fans for ${p.name} vs ${fight.opponent.name}.`)
        : nl(`${event.arena.name} recebe ${event.attendance.toLocaleString('pt-BR')} torcedores em evento ${scopeLabel}.`, `${event.arena.name} hosts ${event.attendance.toLocaleString('en-US')} fans at a ${scopeLabel} event.`),
      type: 'event',
      scope: event.scope,
      fighters: [p, fight.opponent],
    });
    if ((event.excitement || 40) >= 75) {
      this.addNews({ headline: nl(`A luta de ${p.name} é celebrada como o grande espetáculo da noite.`, `${p.name}'s fight is celebrated as the standout spectacle of the night.`), type: 'event_reaction', scope: event.scope, fighters: [p] });
      p.popularity = clamp(p.popularity + 3, 0, 100);
    } else if ((event.excitement || 40) <= 28) {
      this.addNews({ headline: `Parte do público vaia a falta de ação na luta de ${p.name}.`, type: 'event_reaction', scope: event.scope, fighters: [p] });
      p.popularity = clamp(p.popularity - 2, 0, 100);
    }
  }

  _progressContractAfterFight(result) {
    const contract = this.player?.contract;
    if (!contract || contract.fightsRemaining <= 0) return;
    contract.fightsRemaining--;
    if (contract.fightsRemaining <= 0) {
      const missedMedia = Math.max(0, (contract.mediaObligations || 0) - (contract.mediaCompleted || 0));
      if (missedMedia > 0) {
        const penalty = missedMedia * 4;
        this.player.reputation = clamp(this.player.reputation - penalty, 0, 100);
        this.addNews({
          headline: `${this.player.name} encerra o contrato sem cumprir ${missedMedia} obrigação(ões) de mídia e perde prestígio com promotores.`,
          type: 'contract',
          fighters: [this.player],
        });
      }
      this.addNews({
        headline: `O contrato de ${this.player.name} com a ${contract.promoterName} chegou ao fim.`,
        type: 'contract',
        fighters: [this.player],
      });
      this.player.contract = null;
      this.contractOffers = [];
    }
  }

  // Apelido dinâmico: se o jogador não escolheu um apelido, a imprensa
  // passa a chamá-lo por algo que reflete seu jeito de lutar.
  _earnNickname(result) {
    const p = this.player;
    if (!p || p.nicknameLocked) return;

    const total = p.wins + p.losses + p.draws;
    if (total < 3) return; // precisa de algum cartel para ganhar fama

    const koPct      = p.koPct;                       // % de vitórias por KO/TKO
    const undefeated = p.losses === 0 && p.wins >= 4;
    const syn        = getSynergy(p.styleId, p.personalityId);
    const wonByKO    = result && !result.isDraw && !result.isNoContest &&
                       result.winnerFighter?.isPlayer && isKnockoutResult(result.method);

    let candidates = [];
    if (undefeated && p.wins >= 6)                    candidates.push('O Invicto');
    if (koPct >= 65 && p.wins >= 4)                   candidates.push('O Nocauteador', 'Punho de Ferro', 'Dinamite');
    if (p.personalityId === 'volatile')               candidates.push('Dinamite', 'Trovão', 'Pólvora');
    if (p.personalityId === 'arrogant' && p.popularity > 45) candidates.push('O Showman', 'O Rei');
    if (p.personalityId === 'hungry')                 candidates.push('O Faminto', 'O Implacável');
    if (p.personalityId === 'veteran')                candidates.push('A Raposa', 'O Mestre');
    if (p.styleId === 'pressure')                     candidates.push('O Furacão', 'Tempestade');
    if (p.styleId === 'counterpuncher')               candidates.push('A Cobra', 'Sangue Frio');
    if (p.styleId === 'technical')                     candidates.push('O Professor', 'O Cirurgião');
    if (p.styleId === 'outboxer')                     candidates.push('O Fantasma', 'O Relojoeiro');
    if (p.styleId === 'swarmer')                      candidates.push('O Enxame', 'Metralhadora');
    if (syn)                                          candidates.push(syn.label);

    if (candidates.length === 0) return;

    // Só concede/atualiza quando há um marco: 1º apelido aos 3 cartéis,
    // e tem chance de "evoluir" em vitórias importantes (KO ou título).
    const milestone = !p.nickname || wonByKO || (this.nextFight?.titleBelt);
    if (!milestone) return;
    if (p.nickname && Math.random() > 0.4) return; // nem todo marco troca o apelido

    const nick = pick(candidates.filter(n => n !== p.nickname)) || candidates[0];
    if (nick && nick !== p.nickname) {
      const fresh = !p.nickname;
      p.nickname = nick;
      this.addNews({
        headline: fresh
          ? `A imprensa começa a chamar ${p.name} de "${nick}"!`
          : `Após a atuação, ${p.name} agora é conhecido como "${nick}".`,
        type: 'general', fighters: [p],
      });
    }
  }

  // Rivalidades
  _updateRivalry(opponent, fightResult, fight) {
    if (!opponent || !fightResult) return;
    if (fightResult.isNoContest) return;
    const isWin  = !fightResult.isDraw && fightResult.winnerFighter?.id === this.player.id;
    const isKO   = isKnockoutResult(fightResult.method);
    const isTitle = !!fight?.titleBelt;
    const rank   = opponent.ranking || 99;

    // Determina se cria/intensifica rivalidade
    let deltaIntensity = 0;
    let reason = '';
    if (!isWin && isKO) { deltaIntensity = 3; reason = `KO por ${opponent.name}`; }
    else if (!isWin && isTitle) { deltaIntensity = 2; reason = `Perdeu título para ${opponent.name}`; }
    else if (!isWin) { deltaIntensity = 1; reason = `Derrota para ${opponent.name}`; }
    else if (isWin && isKO && rank <= 10) { deltaIntensity = 2; reason = `KO em ${opponent.name}`; }
    else if (isWin && isTitle) { deltaIntensity = 1; reason = `Venceu título contra ${opponent.name}`; }

    if (deltaIntensity === 0) return;

    const existing = this.rivals.find(r => r.fighterId === opponent.id);
    if (existing) {
      existing.intensity = Math.min(5, existing.intensity + deltaIntensity);
      if (isWin) existing.wins++; else existing.losses++;
      existing.week = this.week; existing.year = this.year;
    } else {
      this.rivals.push({
        fighterId: opponent.id,
        name:      opponent.name,
        nationality: opponent.nationality,
        intensity: Math.min(5, deltaIntensity),
        reason,
        wins:   isWin ? 1 : 0,
        losses: isWin ? 0 : 1,
        week:   this.week,
        year:   this.year,
      });
    }
  }

  getRival(fighterId) {
    return this.rivals.find(r => r.fighterId === fighterId) || null;
  }

  // Aplica os efeitos de uma resposta de entrevista
  applyInterviewAnswer(questionId, answerId, rivalFighterId = null) {
    const q = [...INTERVIEW_QUESTIONS, ...PRE_FIGHT_QUESTIONS].find(q => q.id === questionId);
    if (!q) return null;
    const a = q.answers.find(a => a.id === answerId);
    if (!a) return null;

    const p = this.player;
    p.popularity  = clamp((p.popularity  || 50) + (a.effects.popularity  || 0), 0, 100);
    p.reputation  = clamp((p.reputation  || 50) + (a.effects.reputation  || 0), 0, 100);

    // Intensificar rivalidade se resposta agressiva e há um rival em contexto
    if (a.effects.rivalIntensity && rivalFighterId) {
      const rival = this.rivals.find(r => r.fighterId === rivalFighterId);
      if (rival) rival.intensity = Math.min(5, rival.intensity + a.effects.rivalIntensity);
    }

    const opponent = rivalFighterId
      ? this._everyFighter().find(f => f.id === rivalFighterId)
      : null;
    this.mediaHistory.unshift({
      questionId,
      answerId,
      tone: a.tone,
      text: a.text,
      opponentId: rivalFighterId,
      week: this.week,
      year: this.year,
    });
    if (this.mediaHistory.length > 100) this.mediaHistory.pop();
    this._completeMediaObligation();

    this.addNews({
      headline: `${this.player.name}: "${a.text}"`,
      type: 'interview',
      scope: this.player.isChampion ? 'world' : 'national',
      fighters: [this.player],
    });

    let opponentResponse = null;
    let socialReaction = null;
    if (opponent) {
      opponentResponse = this._mediaTemplate(
        pick(OPPONENT_MEDIA_RESPONSES[a.tone] || OPPONENT_MEDIA_RESPONSES.diplomatic),
        { player: p.name, opponent: opponent.name }
      );
      socialReaction = this._mediaTemplate(
        pick(SOCIAL_DECLARATION_REACTIONS[a.tone] || SOCIAL_DECLARATION_REACTIONS.diplomatic),
        { player: p.name, opponent: opponent.name }
      );
      this.addNews({ headline: opponentResponse, type: 'opponent_response', scope: p.isChampion ? 'world' : 'national', fighters: [opponent, p] });
      this.addNews({ headline: socialReaction, type: 'social_reaction', scope: p.isChampion ? 'world' : 'national', fighters: [p, opponent] });
      if (a.tone === 'aggressive') this._ensureRivalry(opponent, 1, 'Provocação pública');
    }

    return { ...a, opponentResponse, socialReaction };
  }

  getUsedInterviewQuestionIds(limit = 12) {
    return this.mediaHistory.slice(0, limit).map(item => item.questionId).filter(Boolean);
  }

  applyFaceOffChoice(choiceId, opponentId) {
    const choice = FACE_OFF_CHOICES.find(item => item.id === choiceId);
    const opponent = this._everyFighter().find(f => f.id === opponentId);
    if (!choice || !opponent) return null;
    this.player.popularity = clamp(this.player.popularity + choice.popularity, 0, 100);
    this.player.reputation = clamp(this.player.reputation + choice.reputation, 0, 100);
    if (choice.rivalry) this._ensureRivalry(opponent, choice.rivalry, 'Encarada promocional');
    const headline = this._mediaTemplate(choice.text, { player: this.player.name, opponent: opponent.name });
    this.mediaHistory.unshift({ type: 'faceoff', choiceId, tone: choice.tone, opponentId, week: this.week, year: this.year });
    this._completeMediaObligation();
    this.addNews({ headline, type: 'faceoff', scope: this.player.isChampion ? 'world' : 'national', fighters: [this.player, opponent] });
    return choice;
  }

  resolveMediaCrisis(responseId) {
    if (!this.mediaCrisis) return null;
    // Find response in crisis-specific list first, fall back to global list
    const template = MEDIA_CRISES.find(c => c.id === this.mediaCrisis.crisisType);
    const responses = template?.responses || MEDIA_CRISIS_RESPONSES;
    const response = responses.find(r => r.id === responseId);
    if (!response) return null;

    // Base effects
    let popDelta = response.popularity;
    let repDelta  = response.reputation;

    // Apply personality bonus/penalty
    const pid = this.player.personalityId;
    const bonus = response.personalityBonus?.[pid];
    if (bonus) {
      popDelta += bonus.popularity || 0;
      repDelta  += bonus.reputation  || 0;
    }

    this.player.popularity = clamp(this.player.popularity + popDelta, 0, 100);
    this.player.reputation = clamp(this.player.reputation + repDelta,  0, 100);
    this.addNews({
      headline: this._mediaTemplate(response.text, { player: this.player.name }),
      type: 'media_crisis',
      scope: this.mediaCrisis.scope,
      fighters: [this.player],
    });
    this.mediaHistory.unshift({ type: 'crisis_response', responseId, crisisType: this.mediaCrisis.crisisType, week: this.week, year: this.year });
    const resolved = this.mediaCrisis;
    this.mediaCrisis = null;
    return { response, crisis: resolved, popDelta, repDelta };
  }

  _mediaTemplate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  _completeMediaObligation() {
    const contract = this.player?.contract;
    if (!contract || contract.fightsRemaining <= 0) return;
    contract.mediaCompleted = Math.min(
      contract.mediaObligations || 0,
      (contract.mediaCompleted || 0) + 1
    );
  }

  _ensureRivalry(opponent, intensity = 1, reason = 'Provocação pública') {
    let rival = this.rivals.find(r => r.fighterId === opponent.id);
    if (!rival) {
      rival = {
        fighterId: opponent.id, name: opponent.name, nationality: opponent.nationality,
        intensity: 0, reason, wins: 0, losses: 0, week: this.week, year: this.year,
      };
      this.rivals.push(rival);
    }
    rival.intensity = Math.min(5, rival.intensity + intensity);
    rival.reason = reason;
    rival.week = this.week;
    rival.year = this.year;
  }

  _maybeCreateMediaCrisis() {
    if (this.mediaCrisis || !this.player || this.mediaHistory.length < 2) return;
    const p = this.player;
    const recent = this.mediaHistory.slice(0, 8);
    const aggressive = recent.filter(item => item.tone === 'aggressive').length;
    const lastFight = p.fightHistory?.[0];
    const lastResult = lastFight?.result;
    const lastMethod = lastFight?.method || '';

    // Build weighted candidate list based on game state
    const candidates = [];
    const add = (id, w) => candidates.push(...Array(w).fill(id));

    // Aggressive tones → trash_talk (most common trigger)
    if (aggressive >= 3) add('trash_talk', 5);
    if (aggressive >= 2) add('trash_talk', 2);

    // Volatile / charismatic → nightlife, social_media
    if (p.personalityId === 'volatile')    { add('nightlife', 3); add('gym_brawl', 3); add('social_media_outburst', 2); }
    if (p.personalityId === 'arrogant')    { add('promoter_dispute', 3); add('rival_disrespect', 2); add('social_media_outburst', 2); }
    if (p.personalityId === 'charismatic') { add('social_media_outburst', 3); add('nightlife', 2); }

    // Recent loss by decision → referee_confrontation
    if (lastResult === 'L' && isDecisionResult(lastMethod)) add('referee_confrontation', 4);

    // Recent KO win → rival_disrespect
    if (lastResult === 'W' && isKnockoutResult(lastMethod)) add('rival_disrespect', 3);

    // Win streak 5+ → doping_rumor
    const streak = p.fightHistory?.slice(0, 5).filter(h => h.result === 'W').length || 0;
    if (streak >= 5) add('doping_rumor', 4);

    // Low discipline (approximated by weeksSinceTraining) → no_show_training
    if ((p.weeksSinceTraining || 0) >= 4) add('no_show_training', 3);

    // Age or loss streak → retirement_rumor
    if (p.age >= 34 || (p.fightHistory?.slice(0,3).filter(h=>h.result==='L').length >= 2)) add('retirement_rumor', 3);

    // High popularity → social_media more likely
    if (p.popularity >= 60) add('social_media_outburst', 2);

    // Recent injury recovered → injury_hiding
    if (p.fightHistory?.slice(0,2).some(h => h.result === 'W') && (p.careerWear || 0) >= 20) add('injury_hiding', 2);

    // Career wear + volatile → gym_brawl / sparring_injury_accusation
    if ((p.careerWear || 0) >= 30 && p.personalityId === 'volatile') { add('gym_brawl', 2); add('sparring_injury_accusation', 2); }
    if (p.personalityId === 'volatile') add('sparring_injury_accusation', 1);

    // Missed press conference triggers → arrogant / volatile
    if (p.personalityId === 'arrogant' || p.personalityId === 'volatile') add('press_conference_no_show', 2);

    // High earnings → tax trouble, sponsor drama
    if ((p.money || 0) >= 50000 || p.popularity >= 55) add('tax_trouble', 2);
    if (p.popularity >= 50) add('sponsor_dropped', 2);

    // Coach split: any personality, more likely after a loss or volatile
    if (lastResult === 'L') add('coach_public_split', 2);
    if (p.personalityId === 'volatile') add('coach_public_split', 1);
    add('coach_public_split', 1);

    // Family drama: any personality
    add('family_drama', 1);
    if (p.personalityId === 'charismatic' || p.personalityId === 'arrogant') add('family_drama', 1);

    // Gambling: money troubles or loss streak
    if ((p.money || 0) < 5000 || p.fightHistory?.slice(0,3).filter(h=>h.result==='L').length >= 2) add('gambling_rumor', 2);
    add('gambling_rumor', 1);

    // Contractual holdout: active contract nearing end or no contract
    if (!p.contract || (p.contract?.fightsRemaining <= 1)) add('contractual_holdout', 2);
    if (p.personalityId === 'arrogant') add('contractual_holdout', 2);

    // Cultural controversy: high popularity + aggressive history
    if (p.popularity >= 60 && aggressive >= 1) add('cultural_controversy', 2);
    if (p.popularity >= 40) add('cultural_controversy', 1);

    // Low reputation always adds baseline chance for trash_talk
    if (p.reputation < 30) add('trash_talk', 2);

    // Base chance of any crisis
    const baseChance = aggressive >= 3 ? 0.12 : candidates.length > 3 ? 0.06 : 0.02;
    if (Math.random() >= baseChance) return;

    if (!candidates.length) candidates.push('trash_talk');
    const crisisId = candidates[Math.floor(Math.random() * candidates.length)];
    const template = MEDIA_CRISES.find(c => c.id === crisisId) || MEDIA_CRISES[0];
    const headline = pick(template.headlines).replace('{player}', p.name);

    this.mediaCrisis = {
      id: generateId(),
      crisisType: crisisId,
      scope: p.isChampion ? 'world' : 'national',
      headline,
      week: this.week,
      year: this.year,
    };
    p.reputation = clamp(p.reputation - 3, 0, 100);
    this.addNews({ headline, type: 'media_crisis', scope: this.mediaCrisis.scope, fighters: [p] });
  }

  _generateCareerNarrative() {
    if (!this.player || Math.random() >= 0.25) return;
    const p = this.player;
    const history = p.fightHistory || [];
    const recent = history.slice(0, 4);
    let headline = null;
    if (p.losses === 0 && p.wins >= 6) headline = `A invencibilidade de ${p.name} aumenta a pressão por adversários de elite.`;
    else if (recent.length >= 3 && recent.slice(0, 3).every(h => h.result === 'W')) headline = `${p.name} embala três vitórias e volta a ganhar força no cenário.`;
    else if (recent.length >= 3 && recent.slice(0, 3).filter(h => h.result === 'L').length >= 2) headline = `Analistas questionam se ${p.name} conseguirá interromper a fase negativa.`;
    else if (recent[0]?.result === 'W' && recent[1]?.result === 'L') headline = `${p.name} inicia reconstrução após responder à derrota com vitória.`;
    else if (p.age >= 35) headline = `A idade transforma cada próxima luta de ${p.name} em capítulo decisivo da carreira.`;
    if (headline) this.addNews({ headline, type: 'career_narrative', scope: p.isChampion ? 'world' : 'national', fighters: [p] });
  }

  // Gera provocação de rival para o feed de notícias (chamado periodicamente)
  generateRivalTaunt() {
    if (!this.rivals.length) return;
    const hotRivals = this.rivals.filter(r => r.intensity >= 2);
    if (!hotRivals.length) return;
    const rival = pick(hotRivals);
    const taunts = [
      `${rival.name} manda recado: "Espero que ${this.player.name} não tenha esquecido o que aconteceu."`,
      `${rival.name}: "Quando quiserem fazer a revanche, estou aqui. Não vai mudar nada."`,
      `${rival.name} cita ${this.player.name} em entrevista: "Esse nome ainda está na minha lista."`,
      `Assessoria de ${rival.name} confirma interesse em revanche contra ${this.player.name}.`,
      `${rival.name}: "Prefiro não falar sobre ${this.player.name}. Os resultados já falam por si."`,
    ];
    this.addNews({ headline: pick(taunts), type: 'rivalry', fighters: [] });
  }

  // Save / Load
  _npcJSON(f) {
    // NPCs don't need fightHistory (uses ~80% of save space with 4800 fighters)
    const j = f.toJSON();
    delete j.fightHistory;
    delete j._modifiersApplied;
    delete j.purseMult;
    delete j.nicknameLocked;
    return j;
  }

  // Tournament
  generateTournamentOffer() {
    const p = this.player;
    if (!p || p.retiredAt || p.isInjured || this.nextFight || this.activeTournament) return null;
    if (this.tournamentOffers.length >= 1) return null;

    const rank = this.getPlayerRanking();
    // Only offer tournaments when player is unranked or ranked below top 10
    if (rank && rank <= 10) return null;

    const wins = p.wins || 0;
    // Require at least 2 wins
    if (wins < 2) return null;

    const tier  = (rank && rank <= 20) ? 'regional' : 'local';
    const names = tier === 'regional'
      ? ['Torneio Regional', 'Copa Regional', 'Grand Prix Regional']
      : ['Torneio Local', 'Copa Local', 'Circuito Amador'];
    const name  = names[Math.floor(Math.random() * names.length)];

    const size  = tier === 'regional' ? 8 : 4; // 8-man or 4-man bracket
    const rounds = size === 8
      ? ['Quartas de Final', 'Semifinal', 'Final']
      : ['Semifinal', 'Final'];

    const pursePerFight = tier === 'regional'
      ? 2000 + Math.floor(Math.random() * 3000)
      : 500  + Math.floor(Math.random() * 1500);

    const offer = {
      id: 'tourn_' + Date.now(),
      name,
      tier,
      weightClass: p.weightClass,
      size,
      rounds,
      pursePerFight,
      winnerPrize: pursePerFight * size,
      expiresWeek: this.week + 3,
    };

    this.tournamentOffers.push(offer);
    return offer;
  }

  acceptTournament(offerId) {
    const offer = this.tournamentOffers.find(o => o.id === offerId);
    if (!offer || this.activeTournament || this.nextFight) return false;

    this.tournamentOffers = [];

    // Build bracket
    const p = this.player;
    const wc = p.weightClass;
    const pool = this.allFighters
      .filter(f => !f.retiredAt && f.weightClass === wc && f.id !== p.id)
      .sort((a, b) => Math.abs(a.overall - p.overall) - Math.abs(b.overall - p.overall))
      .slice(0, offer.size - 1 + 4); // take a pool, then pick

    // Pick opponents randomly from pool
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, offer.size - 1);
    const mini = (f) => ({ id: f.id, name: f.name, overall: f.overall, record: { wins: f.wins || 0, losses: f.losses || 0 } });

    // Build bracket slots: player at slot 0, others fill remaining
    const allSlots = [mini(p), ...shuffled.map(mini)];

    // Create matchups for first round
    const firstRound = [];
    for (let i = 0; i < allSlots.length; i += 2) {
      firstRound.push({ a: allSlots[i], b: allSlots[i + 1], winnerId: null });
    }

    // Full bracket: array of rounds, each round is array of matchups
    const bracket = [firstRound];
    // Pre-fill subsequent rounds with nulls
    for (let r = 1; r < offer.rounds.length; r++) {
      const prevSize = firstRound.length / Math.pow(2, r - 1);
      const roundSize = Math.max(1, Math.floor(prevSize / 2));
      bracket.push(Array.from({ length: roundSize }, () => ({ a: null, b: null, winnerId: null })));
    }

    const playerMatchupIdx = 0; // player is always in matchup 0

    this.activeTournament = {
      id: offer.id,
      name: offer.name,
      tier: offer.tier,
      rounds: offer.rounds,
      currentRound: 0,
      pursePerFight: offer.pursePerFight,
      winnerPrize: offer.winnerPrize,
      bracket,
      playerMatchupIdx,
    };

    // Schedule the first fight
    this._scheduleTournamentFight();
    this.addNews({
      headline: nl(
        `${p.name} confirma presença no ${offer.name}!`,
        `${p.name} confirms entry into the ${offer.name}!`
      ),
      type: 'career', fighters: [p],
    });
    this.save();
    return true;
  }

  declineTournament(offerId) {
    this.tournamentOffers = this.tournamentOffers.filter(o => o.id !== offerId);
  }

  _scheduleTournamentFight() {
    const t = this.activeTournament;
    if (!t) return;

    const round = t.bracket[t.currentRound];
    const matchup = round[t.playerMatchupIdx];
    const opponent = matchup.a?.id === this.player.id ? matchup.b : matchup.a;

    if (!opponent) return;

    // Build the opponent as a Fighter-like object (find from allFighters or use mini)
    const opponentFull = this.allFighters.find(f => f.id === opponent.id) || null;
    if (!opponentFull) return;

    const roundName = t.rounds[t.currentRound];
    this.nextFight = {
      id: 'fight_tourn_' + Date.now(),
      opponent: opponentFull,
      rounds: 6,
      weightClass: this.player.weightClass,
      titleBelt: null,
      isTournament: true,
      tournamentId: t.id,
      tournamentRound: roundName,
      purse: t.pursePerFight,
      date: `Semana ${this.week + 1}`,
      promoter: { name: t.name },
      event: null,
    };
  }

  _processTournamentResult(r) {
    const t = this.activeTournament;
    if (!t) return null;

    const playerWon = !r.isDraw && !r.isNoContest && r.winnerFighter?.id === this.player.id;
    const currentRoundMatchups = t.bracket[t.currentRound];

    // Mark player's matchup result
    const playerMatchup = currentRoundMatchups[t.playerMatchupIdx];
    playerMatchup.winnerId = playerWon ? this.player.id : (playerMatchup.a?.id === this.player.id ? playerMatchup.b?.id : playerMatchup.a?.id);

    if (!playerWon) {
      // Eliminated
      this.activeTournament = null;
      return { type: 'tournament-eliminated', name: t.name, round: t.rounds[t.currentRound] };
    }

    // Simulate other matchups in this round
    for (let i = 0; i < currentRoundMatchups.length; i++) {
      if (i === t.playerMatchupIdx) continue;
      const m = currentRoundMatchups[i];
      if (!m.a || !m.b) continue;
      const aOvr = (this.allFighters.find(f => f.id === m.a.id)?.overall || m.a.overall || 60);
      const bOvr = (this.allFighters.find(f => f.id === m.b.id)?.overall || m.b.overall || 60);
      const aChance = aOvr / (aOvr + bOvr) + (Math.random() - 0.5) * 0.3;
      m.winnerId = aChance >= 0.5 ? m.a.id : m.b.id;
    }

    // Check if this was the final
    const isFinal = t.currentRound === t.rounds.length - 1;
    if (isFinal) {
      // Player won the tournament!
      const p = this.player;
      p.money = (p.money || 0) + t.winnerPrize;
      if (!p.trophies) p.trophies = [];
      p.trophies.push({
        tier: t.tier, scope: t.tier,
        name: t.name,
        year: this.year,
        weightClass: t.weightClass,
        isTournament: true,
      });
      p.popularity = Math.min(100, (p.popularity || 0) + (t.tier === 'regional' ? 8 : 4));
      this.addNews({
        headline: nl(`🏆 ${p.name} vence o ${t.name} e conquista o título!`, `🏆 ${p.name} wins the ${t.name} and claims the title!`),
        type: 'title_change', fighters: [p],
      });
      const completedName = t.name;
      this.activeTournament = null;
      return { type: 'tournament-win', name: completedName, prize: t.winnerPrize };
    }

    // Advance to next round: build next round matchups from winners
    const nextRoundIdx = t.currentRound + 1;
    const winners = currentRoundMatchups.map(m => {
      const winId = m.winnerId;
      const winner = m.a?.id === winId ? m.a : m.b;
      return winner;
    });

    const nextRound = t.bracket[nextRoundIdx];
    let newPlayerMatchupIdx = 0;
    for (let i = 0; i < winners.length; i += 2) {
      const matchupIdx = Math.floor(i / 2);
      nextRound[matchupIdx].a = winners[i];
      nextRound[matchupIdx].b = winners[i + 1];
      // Track which matchup the player is in
      if (winners[i]?.id === this.player.id || winners[i + 1]?.id === this.player.id) {
        newPlayerMatchupIdx = matchupIdx;
      }
    }

    t.currentRound = nextRoundIdx;
    t.playerMatchupIdx = newPlayerMatchupIdx;

    this._scheduleTournamentFight();
    return { type: 'tournament-advance', name: t.name, round: t.rounds[nextRoundIdx] };
  }

  save(slot) {
    slot = slot || this.currentSlot || 1;
    const data = {
      saveVersion: 4,
      gameMode:    this.gameMode,
      academy:     this.academy,
      academyRecruitCandidates: this.academyRecruitCandidates,
      player:      this.player?.toJSON(),
      week:        this.week,
      year:        this.year,
      news:        this.news.slice(0, 500),
      staff:       this.staff,
      rivals:          this.rivals,
      npcRivalries:     this.npcRivalries,
      mediaCooldowns:  this.mediaCooldowns,
      mediaHistory:    this.mediaHistory,
      mediaCrisis:     this.mediaCrisis,
      allFighters: this.allFighters.map(f => this._npcJSON(f)),
      availableFights: this.availableFights.map(f => this._serializeFight(f)),
      contractOffers: this.contractOffers,
      tournamentOffers:  this.tournamentOffers,
      activeTournament:  this.activeTournament,
      incomingChallenges: this.incomingChallenges.map(f => this._serializeFight(f)),
      nextFight: this._serializeFight(this.nextFight),
      trainingState: this.trainingState,
      lastFightResult: this._serializeFightSummary(this.lastFightResult),
      lastFightPayout: this.lastFightPayout,
    };
    const json = JSON.stringify(data);

    if (window.ringueFS) {
      // Electron: salva em arquivo no disco
      const ok = window.ringueFS.save(slot, json);
      if (!ok) console.error('[save] falha ao salvar arquivo via Electron');
    } else {
      // Browser: localStorage com fallback
      const compactForBrowser = () => {
        const protectedIds = new Set([
          ...(data.academy?.rosterIds || []),
          ...(data.academyRecruitCandidates || []),
          data.nextFight?.opponentId,
          ...(data.availableFights || []).map(f => f?.opponentId),
          ...(data.incomingChallenges || []).map(f => f?.opponentId),
        ].filter(Boolean));
        return {
          ...data,
          allFighters: data.allFighters.filter(f =>
            protectedIds.has(f.id) || f.belts?.length > 0 || (f.ranking !== null && f.ranking <= 40)
          ),
          news: data.news.slice(0, 120),
        };
      };
      try {
        const browserData = json.length > 4_500_000 ? JSON.stringify(compactForBrowser()) : json;
        localStorage.setItem(`ringue_save_${slot}`, browserData);
      } catch (e) {
        console.warn('[save] usando save compacto no navegador:', e);
        try {
          localStorage.setItem(`ringue_save_${slot}`, JSON.stringify(compactForBrowser()));
        } catch (e2) {
          alert('Erro ao salvar: espaço esgotado. Use o app desktop para salvar sem limites.');
        }
      }
    }
    this.currentSlot = slot;
  }

  load(slot) {
    slot = slot || 1;
    let raw;

    if (window.ringueFS) {
      // Electron: lê do arquivo
      raw = window.ringueFS.load(slot);
    } else {
      // Browser: localStorage com migração de save legado
      if (!localStorage.getItem('ringue_save_1') && localStorage.getItem('ringue_save')) {
        localStorage.setItem('ringue_save_1', localStorage.getItem('ringue_save'));
      }
      raw = localStorage.getItem(`ringue_save_${slot}`);
    }

    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      this.gameMode = data.gameMode || 'athlete';
      this.academy = data.academy || null;
      this.academyRecruitCandidates = data.academyRecruitCandidates || [];
      this.week   = data.week  || 1;
      this.year   = data.year  || 2024;
      this.news   = data.news  || [];
      this.staff  = data.staff || {};
      this.rivals          = data.rivals          || [];
      this.npcRivalries     = data.npcRivalries     || [];
      this.mediaCooldowns  = data.mediaCooldowns  || {};
      this.mediaHistory    = data.mediaHistory    || [];
      this.mediaCrisis     = data.mediaCrisis     || null;
      this.trainingState = data.trainingState || null;
      this.lastFightResult = data.lastFightResult || null;
      this.lastFightPayout = data.lastFightPayout || 0;
      this.contractOffers = data.contractOffers || [];
      this.tournamentOffers = data.tournamentOffers || [];
      this.activeTournament = data.activeTournament || null;

      this.allFighters = (data.allFighters || []).map(d => Fighter.fromJSON(d));
      this.player      = data.player ? Fighter.fromJSON(data.player) : null;
      if (this.player) {
        for (const belt of this.player.belts || []) this._startTitleReign(this.player, belt);
      }

      if (this.player) this.allFighters = this.allFighters.filter(f => f.id !== this.player.id);

      ensureIdCounterAbove([
        this.player?.id,
        ...this.allFighters.map(f => f.id),
        ...(data.availableFights || []).map(f => f?.id),
        ...(data.contractOffers || []).map(o => o?.id),
        ...(data.incomingChallenges || []).map(c => c?.id),
        data.nextFight?.id,
        ...this.news.map(n => n?.id),
      ]);

      this.availableFights = (data.availableFights || [])
        .map(f => this._restoreFight(f))
        .filter(Boolean);
      this.nextFight = this._restoreFight(data.nextFight);
      this.incomingChallenges = (data.incomingChallenges || [])
        .map(c => this._restoreFight(c))
        .filter(Boolean);
      this.worldSimFights = [];

      this.currentSlot = slot;
      this.rebuildRankings();
      if (!this.nextFight && this.availableFights.length === 0 && this.player && !this.player.isInjured) {
        this.generateAvailableFights();
      }
      return true;
    } catch (e) {
      console.error('Erro ao carregar save:', e);
      return false;
    }
  }

  _serializeFight(fight) {
    if (!fight) return null;
    return {
      ...fight,
      opponentId: fight.opponent?.id ?? fight.opponentId ?? null,
      opponent: undefined,
      promoterId: fight.promoter?.id ?? fight.promoterId ?? null,
      promoter: undefined,
    };
  }

  _restoreFight(data) {
    if (!data) return null;
    const opponentId = data.opponentId ?? data.opponent?.id;
    const opponent = this._everyFighter().find(f => f.id === opponentId);
    if (!opponent) return null;
    const promoterId = data.promoterId ?? data.promoter?.id;
    return {
      ...data,
      opponent,
      promoter: PROMOTERS.find(p => p.id === promoterId) || data.promoter || PROMOTERS[0],
    };
  }

  _serializeFightSummary(summary) {
    if (!summary) return null;
    const cloneFighter = f => f ? {
      id: f.id,
      name: f.name,
      isPlayer: !!f.isPlayer,
    } : null;
    return {
      ...summary,
      result: summary.result ? {
        ...summary.result,
        winnerFighter: cloneFighter(summary.result.winnerFighter),
        loserFighter: cloneFighter(summary.result.loserFighter),
      } : null,
    };
  }

  hasSave(slot) {
    if (window.ringueFS) {
      const files = window.ringueFS.listSaves();
      if (slot !== undefined) return files.includes(`save_${slot}.json`);
      return [1, 2, 3].some(s => files.includes(`save_${s}.json`));
    }
    if (slot !== undefined) return !!localStorage.getItem(`ringue_save_${slot}`);
    return [1, 2, 3].some(s => !!localStorage.getItem(`ringue_save_${s}`))
        || !!localStorage.getItem('ringue_save');
  }

  deleteSave(slot) {
    slot = slot || this.currentSlot || 1;
    if (window.ringueFS) {
      window.ringueFS.deleteSave(slot);
      return;
    }
    localStorage.removeItem(`ringue_save_${slot}`);
    if (slot === 1) localStorage.removeItem('ringue_save');
  }

  getSaveSlots() {
    return [1, 2, 3].map(slot => {
      let raw;
      if (window.ringueFS) {
        raw = window.ringueFS.load(slot);
      } else {
        if (!localStorage.getItem('ringue_save_1') && localStorage.getItem('ringue_save')) {
          localStorage.setItem('ringue_save_1', localStorage.getItem('ringue_save'));
        }
        raw = localStorage.getItem(`ringue_save_${slot}`);
      }
      if (!raw) return { slot, empty: true };
      try {
        const d = JSON.parse(raw);
        return {
          slot, empty: false,
          gameMode: d.gameMode || 'athlete',
          name:     d.gameMode === 'academy' ? (d.academy?.name || 'Academia') : (d.player?.name || '???'),
          nickname: d.player?.nickname || '',
          record:   d.gameMode === 'academy'
            ? `${d.academy?.rosterIds?.length || 0} atletas · Rep. ${d.academy?.reputation || 0}`
            : `${d.player?.wins || 0}V-${d.player?.losses || 0}D`,
          nat:      d.gameMode === 'academy' ? (d.academy?.country || '') : (d.player?.nationality || ''),
          wc:       d.gameMode === 'academy' ? 'Modo Academia' : (d.player?.weightClass || ''),
          year:     d.year || 2024,
          week:     d.week || 1,
        };
      } catch { return { slot, empty: true }; }
    });
  }
}
