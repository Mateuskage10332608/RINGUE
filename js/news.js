// ============================================================
// news.js - Geracao contextual de noticias, redes e analistas
// ============================================================

class NewsGenerator {
  constructor(gameState) {
    this.gs = gameState;
  }

  generateFightNews(sim, fight) {
    const result = sim.finalResult;
    const player = this.gs.player;
    const opponent = fight?.opponent;
    const news = [];

    if (!result || !player || !opponent) return news;

    const context = this._buildMediaContext({ fight, result });
    const playerWon = context.won;
    const isUpset = playerWon && opponent.overall > player.overall + 5;

    if (isUpset) {
      news.push({
        headline: pick(getNewsTemplates().upset)
          .replace('{winner}', player.name)
          .replace('{loser}', opponent.name),
        type: 'upset',
      });
    }

    const role = this._random(['formerChampion', 'technical', 'entertainer']);
    const analystKey = this._analystKey(role, context, 'post_fight');
    news.push({
      headline: this._fill(this._pickAnalyst(role, analystKey), context),
      type: 'analyst',
    });

    if (context.controversial && !context.draw) {
      news.push({
        headline: pick(getNewsTemplates().controversy)
          .replace('{a}', player.name)
          .replace('{b}', opponent.name),
        type: 'controversy',
      });
    }

    if (context.rank !== 'N/R' && context.rank <= 15) {
      const champions = this.gs.getWorldChampions(player.weightClass);
      news.push({
        headline: pick(getNewsTemplates().ranking)
          .replace('{fighter}', player.name)
          .replace('{weightClass}', player.weightClassData?.name || '')
          .replace('{rank}', context.rank)
          .replace('{champ}', champions[0]?.fighter?.name || 'o campeão'),
        type: 'ranking',
      });
    }

    return news;
  }

  getFanComments(count = 5, options = {}) {
    const context = this._buildMediaContext(options);
    const templates = this._fanTemplatePool(context);

    return this._sampleUnique(templates, count).map(template => ({
      text: this._fill(template, context),
      user: `@${this._random(getMediaDatabase().fanUsers)}${this._randInt(10, 999)}`,
      likes: this._engagement(context),
      time: `${this._randInt(1, 59)}${typeof I18n !== 'undefined' && I18n.getLang() === 'en' ? 'min ago' : 'min atrás'}`,
    }));
  }

  generateShowSegment(topic = 'post_fight', options = {}) {
    const context = this._buildMediaContext(options);
    const hosts = [
      { name: 'Maurício Prado', role: 'Apresentador', emoji: '🎤', mediaRole: 'anchor' },
      { name: 'Defensor Lima', role: 'Ex-Campeão', emoji: '🥊', mediaRole: 'formerChampion' },
      { name: 'Ana Técnica', role: 'Analista', emoji: '📊', mediaRole: 'technical' },
      { name: 'Zé Comentarista', role: 'Entretenimento', emoji: '🎙️', mediaRole: 'entertainer' },
    ];

    const lines = hosts.map(host => {
      const key = this._analystKey(host.mediaRole, context, topic);
      return {
        host,
        text: this._fill(this._pickAnalyst(host.mediaRole, key), context),
      };
    });

    const segmentNames = {
      post_fight: 'Análise Pós-Luta',
      ranking: 'Ranking da Semana',
      preview: 'Preview da Luta',
    };

    return {
      title: '🎙️ No Centro do Ringue',
      segment: segmentNames[topic] || 'Debate da Semana',
      lines,
    };
  }

  getDatabaseStats() {
    return {
      fanComments: this._countStrings(getMediaDatabase().fans),
      analystComments: this._countStrings(getMediaDatabase().analysts),
      users: getMediaDatabase().fanUsers.length,
    };
  }

  _buildMediaContext(options = {}) {
    const player = this.gs.player || {};
    const storedResult = this.gs.lastFightResult?.result;
    const rawResult = options.result || storedResult || null;
    const result = rawResult?.result || rawResult;
    const fight = options.fight || this.gs.nextFight || null;
    const playerWon = Boolean(
      result &&
      !result.isDraw &&
      !result.isNoContest &&
      (result.winnerFighter?.isPlayer || result.winnerFighter?.id === player.id)
    );
    const playerLost = Boolean(result && !result.isDraw && !result.isNoContest && !playerWon);
    const opponent = fight?.opponent ||
      (playerWon ? result?.loserFighter : result?.winnerFighter) ||
      {};
    const style = player.style;
    const opponentStyle = FIGHTING_STYLES.find(item => item.id === (opponent.styleId || opponent.style));
    const history = player.fightHistory || [];
    const previousFight = history[1];
    const rank = this.gs.getPlayerRanking?.() || player.ranking || 'N/R';
    const method = result?.method || '';

    return {
      player: player.name || 'O atleta',
      nickname: player.nickname || 'Sem Apelido',
      opponent: opponent.name || 'o próximo adversário',
      rank,
      opponentRank: opponent.ranking || 'N/R',
      style: style?.name || player.style || 'versátil',
      opponentStyle: opponentStyle?.name || opponent.style || 'desconhecido',
      wins: player.wins || 0,
      losses: player.losses || 0,
      draws: player.draws || 0,
      knockouts: (player.kos || 0) + (player.tkos || 0),
      age: player.age || 18,
      method: method || 'resultado',
      round: result?.round || '-',
      purse: fight?.purse || 0,
      promoter: player.contract?.promoterName || 'sua equipe',
      won: playerWon,
      lost: playerLost,
      draw: Boolean(result?.isDraw),
      noContest: Boolean(result?.isNoContest),
      knockout: isKnockoutResult(method),
      decision: isDecisionResult(method),
      controversial: Boolean(result?.isControversial),
      champion: Boolean(player.isChampion),
      titleWon: Boolean(playerWon && fight?.titleBelt),
      undefeated: (player.losses || 0) === 0 && (player.wins || 0) >= 5,
      prospect: (player.wins || 0) < 8 && (player.age || 18) <= 27,
      veteran: (player.age || 18) >= 34,
      comeback: playerWon && previousFight?.result === 'L',
      easyOpponent: Boolean(fight && (fight.risk || 0) <= 1),
      riskyFight: Boolean(fight && (fight.risk || 0) >= 4),
      rankingRise: rank !== 'N/R' && rank <= 15,
      contract: Boolean(player.contract?.fightsRemaining > 0),
      preview: !result && Boolean(fight),
    };
  }

  _fanTemplatePool(context) {
    const fans = getMediaDatabase().fans;
    const pools = [fans.general];

    if (context.preview) pools.push(fans.preview);
    if (context.won) pools.push(fans.win);
    if (context.lost) pools.push(fans.loss);
    if (context.draw) pools.push(fans.draw);
    if (context.knockout) pools.push(fans.knockout);
    if (context.won && context.decision) pools.push(fans.decisionWin);
    if (context.controversial) pools.push(fans.controversial);
    if (context.champion) pools.push(fans.champion);
    if (context.titleWon) pools.push(fans.titleWon);
    if (context.undefeated) pools.push(fans.undefeated);
    if (context.prospect) pools.push(fans.prospect);
    if (context.veteran) pools.push(fans.veteran);
    if (context.comeback) pools.push(fans.comeback);
    if (context.easyOpponent) pools.push(fans.easyOpponent);
    if (context.riskyFight) pools.push(fans.riskyFight);
    if (context.rankingRise) pools.push(fans.rankingRise);
    if (context.contract) pools.push(fans.contract);
    if (fans.styles[playerStyleKey(this.gs.player)]?.length) {
      pools.push(fans.styles[playerStyleKey(this.gs.player)]);
    }

    return [...new Set(pools.flat())];
  }

  _analystKey(role, context, topic) {
    if (topic === 'preview') return 'preview';
    if (topic === 'ranking') {
      if (role === 'technical' || role === 'entertainer') return 'ranking';
      if (role === 'formerChampion' && context.champion) return 'champion';
      return role === 'anchor' ? 'general' : 'preview';
    }

    if (role === 'anchor') {
      if (context.lost) return 'loss';
      if (context.won) return 'win';
      return 'general';
    }

    if (context.controversial && role === 'entertainer') return 'controversial';
    if (context.knockout) return 'knockout';
    if (context.won && context.decision) return 'decisionWin';
    if (context.lost) return 'loss';
    if (context.draw && role === 'formerChampion') return 'draw';
    if (role === 'technical') return 'style';
    return 'preview';
  }

  _pickAnalyst(role, key) {
    const rolePool = getMediaDatabase().analysts[role] || getMediaDatabase().analysts.anchor;
    const pool = rolePool[key] || rolePool.general || rolePool.preview || rolePool.closing;
    return this._random(pool);
  }

  _fill(template, context) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
      const value = context[key];
      if (key === 'purse') return formatCurrency(Number(value || 0));
      return value === undefined || value === null ? '' : String(value);
    });
  }

  _sampleUnique(items, count) {
    const shuffled = [...new Set(items)];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this._randInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  _engagement(context) {
    let max = 550;
    if (context.rankingRise) max += 350;
    if (context.knockout || context.controversial || context.titleWon) max += 700;
    return this._randInt(5, max);
  }

  _countStrings(value) {
    if (Array.isArray(value)) return value.filter(item => typeof item === 'string').length;
    if (!value || typeof value !== 'object') return 0;
    return Object.values(value).reduce((total, item) => total + this._countStrings(item), 0);
  }

  _random(items) {
    if (!items?.length) return '';
    return items[Math.floor(Math.random() * items.length)];
  }

  _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

function playerStyleKey(player) {
  return player?.styleId || '';
}
