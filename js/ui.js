class UI {
  constructor(gs) {
    this.gs          = gs;
    this.newsGen     = new NewsGenerator(gs);
    this.currentScreen = null;
    this.fightPlayer = null; // active fight simulation player
    this._pendingFight = null;
    this._pendingStrategy = 'adapt';
    this._trainFocuses   = [];
    this._attrPoints     = {};
    this._remainingPts   = 20;
    this.root = document.getElementById('app');
  }

  show(screenId, data = {}) {
    if (screenId === 'careerHub' && this.gs.player?.retiredAt) {
      screenId = 'retirement';
      data = {
        reason: this.gs.player.retirementReason || 'voluntary',
        forced: this.gs.player.retirementReason && this.gs.player.retirementReason !== 'voluntary',
      };
    }
    if (this.fightAnim)  { this.fightAnim.stop(); this.fightAnim = null; }
    if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
    this.currentScreen = screenId;
    this.root.innerHTML = '';
    const fn = this[`_render_${screenId}`];
    if (fn) fn.call(this, data);
    else this.root.innerHTML = `<p style="color:#e63946">Screen '${screenId}' not found.</p>`;
    I18n.applyLang();
    window.scrollTo(0, 0);
  }
  // MAIN MENU
  _render_mainMenu() {
    const slots  = this.gs.getSaveSlots();
    const flag   = (nat) => NAMES[nat]?.flag || '';
    const wcName = (wc)  => WEIGHT_CLASSES.find(w => w.id === wc)?.name || wc;

    this.root.innerHTML = `
      <div class="main-menu">
        <div class="lang-toggle">
          <button class="lang-btn ${I18n.getLang() === 'pt' ? 'active' : ''}" data-lang="pt">🇧🇷 PT</button>
          <button class="lang-btn ${I18n.getLang() === 'en' ? 'active' : ''}" data-lang="en">🇺🇸 EN</button>
        </div>
        <div class="logo-block">
          <div class="logo-title">RINGUE</div>
          <div class="logo-sub">Simulador de Boxe Gerencial</div>
        </div>
        <div class="save-slots">
          ${slots.map(s => `
            <div class="save-slot ${s.empty ? 'slot-empty' : 'slot-used'}" id="slot-${s.slot}">
              <div class="slot-num">SLOT ${s.slot}</div>
              ${s.empty ? `
                <div class="slot-content">
                  <div class="slot-empty-label">Vazio</div>
                  <div class="slot-action">Novo Jogo →</div>
                </div>
              ` : `
                <div class="slot-content">
                  <div class="slot-fighter">${s.name}${s.nickname ? ` <span class="muted">"${s.nickname}"</span>` : ''}</div>
                  <div class="slot-record">${flag(s.nat)} ${s.gameMode === 'academy' ? s.wc : wcName(s.wc)} · ${s.record}</div>
                  <div class="slot-date">${s.year} · Sem. ${s.week}</div>
                </div>
                <button class="slot-delete" data-slot="${s.slot}" title="Apagar">🗑️</button>
              `}
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost" id="btn-about">Sobre o Jogo</button>
      </div>
    `;

    slots.forEach(s => {
      const el = document.getElementById(`slot-${s.slot}`);
      if (!el) return;
      el.onclick = (e) => {
        if (e.target.closest('.slot-delete')) return;
        if (s.empty) {
          this.gs.currentSlot = s.slot;
          this.show('modeSelect');
        } else {
          if (this.gs.load(s.slot)) this.show(this.gs.gameMode === 'academy' ? 'academyHub' : 'careerHub');
        }
      };
    });

    document.querySelectorAll('.slot-delete').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const slot = parseInt(btn.dataset.slot);
        if (confirm(`Apagar save do Slot ${slot}?`)) {
          this.gs.deleteSave(slot);
          this.show('mainMenu');
        }
      };
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.onclick = () => {
        I18n.setLang(btn.dataset.lang);
        this.show('mainMenu');
      };
    });
    document.getElementById('btn-about').onclick = () => this._showAbout();
  }

  _showAbout() {
    this._modal(`
      <h2>Sobre o RINGUE 🥊</h2>
      <p>Simulador de boxe gerencial inspirado em Football Manager, LEATHER e Boxing Manager.</p>
      <p>Construa um atleta do zero, suba nos rankings, conquiste cinturões mundiais e deixe um legado — ou gerencie uma academia e revele a próxima geração de campeões.</p>
      <ul style="margin:12px 0 0 1.2em; line-height:1.9; font-size:.9em">
        <li>4 organizações mundiais com rankings próprios (WBC · WBA · IBF · WBO)</li>
        <li>53 promotoras com afiliação por federação e matchmaking por contrato</li>
        <li>Sistema GOAT com checklist de 10 critérios + Hall da Fama</li>
        <li>~4.800 lutadores NPC em 12 categorias de peso</li>
        <li>Transição Atleta → Academia com bônus de legado</li>
      </ul>
      <p style="color:#888; font-size:.82em; margin-top:16px">
        RINGUE v1.0.0 — Primeiro lançamento público 🎉<br>
        Modo Atleta completo · Modo Academia completo · Modo Federação em breve<br>
        <a href="https://github.com/Mateuskage10332608/RINGUE" style="color:#4a9eff">github.com/Mateuskage10332608/RINGUE</a>
      </p>
    `);
  }
  // MODE SELECT
  _render_modeSelect() {
    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Escolha o Modo de Jogo</h1>
        <div class="mode-grid">
          ${this._modeCard('athlete', '🥊', 'Carreira de Atleta', 'Controle a carreira de um boxeador desde o início até a glória ou decadência.', false)}
          ${this._modeCard('academy', '🏋️', 'Manager de Academia', 'Gerencie uma academia, forme campeões e construa uma dinastia.', false)}
          ${this._modeCard('federation', '🏛️', 'Dono de Federação', 'Administre uma federação, controle rankings, cinturões e o futuro do esporte.', true)}
        </div>
        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;
    document.getElementById('btn-back').onclick = () => this.show('mainMenu');
    document.getElementById('mode-athlete').onclick = () => this.show('createAthlete');
    document.getElementById('mode-academy').onclick = () => this.show('createAcademy');
  }

  _modeCard(id, emoji, title, desc, locked) {
    return `
      <div class="mode-card ${locked ? 'locked' : 'available'}" id="mode-${id}">
        <div class="mode-emoji">${emoji}</div>
        <h3>${title}</h3>
        <p>${desc}</p>
        ${locked ? '<span class="badge-locked">Em breve</span>' : '<span class="badge-available">Disponível</span>'}
      </div>
    `;
  }
  // CREATE ATHLETE
  _render_createAthlete() {
    this._remainingPts = 20;
    this._attrPoints   = {};

    const wcOptions    = WEIGHT_CLASSES.map(w =>
      `<option value="${w.id}">${t(w.name)} (${t('até')} ${w.limit} lbs)</option>`).join('');
    const styleOptions = FIGHTING_STYLES.map(s =>
      `<option value="${s.id}">${t(s.name)} — ${t(s.desc)}</option>`).join('');
    const natOptions = Object.entries(CONTINENTS).map(([ck, cv]) =>
      `<optgroup label="${cv.icon} ${t(cv.name)}">` +
      Object.entries(NAMES).filter(([, v]) => v.continent === ck)
        .map(([k, v]) => `<option value="${k}" ${k === 'BR' ? 'selected' : ''}>${v.flag} ${t(v.nation)}</option>`).join('') +
      `</optgroup>`).join('');
    const persOptions  = PERSONALITIES.map(p =>
      `<option value="${p.id}">${t(p.name)}</option>`).join('');

    const physAttrs  = ['strength','speed','stamina','chin','reflexes'];
    const techAttrs  = ['jab','straight','cross','uppercut','defense','footwork','combinations','precision','ringIQ'];
    const mentAttrs  = ['courage','composure','resilience'];

    const TOOLTIPS = {
      strength:'Poder dos golpes. Aumenta dano por soco e chance de nocaute.',
      speed:'Velocidade de mãos e pés. Melhora precisão e frequência de golpes.',
      stamina:'Resistência física. Mantém performance por mais rounds.',
      chin:'Resistência a dano. Reduz chance de knockdown e nocaute.',
      reflexes:'Reação a golpes. Aumenta capacidade de esquiva.',
      jab:'Qualidade do jab. Golpe de alcance e controle de distância.',
      straight:'Potência do direto. Golpe reto mais poderoso.',
      cross:'Potência do cruzado. Gancho direto de trás, um dos golpes mais nocauteadores.',
      uppercut:'Potência do uppercut. Golpe de baixo para cima, eficaz em clinch e contra guardas altas.',
      defense:'Eficiência defensiva. Reduz dano recebido.',
      footwork:'Mobilidade no ringue. Ajuda a manter ou fechar distância.',
      combinations:'Fluência em combinações. Aumenta volume de golpes.',
      precision:'Acuidade dos golpes. Reduz erros e aumenta dano por acerto.',
      ringIQ:'Inteligência tática. Melhora decisões e leitura do adversário.',
      courage:'Coragem sob pressão. Reduz queda de performance ao ser castigado.',
      composure:'Equilíbrio emocional. Mantém estratégia em situações difíceis.',
      resilience:'Capacidade de recuperação. Melhora recuperação entre rounds.',
    };

    const PRESETS = [
      { id:'slugger',  name:'💥 Slugger',  pts:{ strength:8, chin:5, stamina:4, courage:3 } },
      { id:'outboxer', name:'🎯 Out-Boxer', pts:{ speed:7, jab:6, footwork:4, reflexes:3 } },
      { id:'technical',name:'🧠 Técnico',  pts:{ ringIQ:7, defense:5, precision:5, composure:3 } },
      { id:'pressure', name:'💣 Pressure', pts:{ stamina:7, combinations:6, strength:4, courage:3 } },
      { id:'counter',  name:'⚡ Counter',  pts:{ reflexes:7, ringIQ:5, composure:5, defense:3 } },
    ];

    const renderAttrRow = (attr, label) => `
      <div class="attr-row" id="attr-row-${attr}">
        <span class="attr-label">${label} <span class="attr-help" title="${TOOLTIPS[attr] || ''}">?</span></span>
        <div class="attr-controls">
          <button class="attr-btn minus" data-attr="${attr}">−</button>
          <span class="attr-val" id="attr-val-${attr}">55</span>
          <button class="attr-btn plus"  data-attr="${attr}">+</button>
        </div>
        <div class="attr-bar"><div class="attr-bar-fill" id="abar-${attr}" style="width:55%"></div></div>
      </div>
    `;

    this.root.innerHTML = `
      <div class="screen screen-create">
        <h1 class="screen-title">Criar Atleta</h1>
        <div class="create-grid">
          <!-- Left: Identity -->
          <div class="create-section">
            <h3>Identidade</h3>
            <label>Nome</label>
            <input id="c-name" class="input" type="text" placeholder="Nome do boxeador" maxlength="30">
            <label>Apelido (opcional)</label>
            <input id="c-nick" class="input" type="text" placeholder="O Demolidor..." maxlength="20">
            <label>Idade</label>
            <input id="c-age" class="input" type="number" min="18" max="30" value="22">
            <label>Nacionalidade</label>
            <select id="c-nat" class="select">${natOptions}</select>
            <div id="trait-panel" class="trait-panel"></div>
            <label>Categoria de Peso</label>
            <select id="c-wc" class="select">${wcOptions}</select>
            <label>Estilo de Luta</label>
            <select id="c-style" class="select">${styleOptions}</select>
            <label>Personalidade</label>
            <select id="c-pers" class="select">${persOptions}</select>
          </div>

          <!-- Right: Attributes -->
          <div class="create-section">
            <h3>Atributos <span id="pts-remaining" class="pts-badge">20 pts restantes</span></h3>
            <p class="attr-note">Base: 55. Distribua 20 pontos ou use um preset abaixo.</p>
            <div class="preset-strip">
              ${PRESETS.map(pr => `<button class="preset-btn" data-preset="${pr.id}">${pr.name}</button>`).join('')}
            </div>

            <div class="attr-group">
              <div class="attr-group-title">⚡ Físico</div>
              ${physAttrs.map(a => renderAttrRow(a, {
                strength:'Força', speed:'Velocidade', stamina:'Resistência',
                chin:'Queixo', reflexes:'Reflexos'}[a])).join('')}
            </div>
            <div class="attr-group">
              <div class="attr-group-title">🥊 Técnico</div>
              ${techAttrs.map(a => renderAttrRow(a, {
                jab:'Jab', straight:'Direto', cross:'Cruzado', uppercut:'Uppercut',
                defense:'Defesa', footwork:'Jogo de Pés', combinations:'Combinações',
                precision:'Precisão', ringIQ:'Ring IQ'}[a])).join('')}
            </div>
            <div class="attr-group">
              <div class="attr-group-title">🧠 Mental</div>
              ${mentAttrs.map(a => renderAttrRow(a, {
                courage:'Coragem', composure:'Equilíbrio', resilience:'Resiliência'}[a])).join('')}
            </div>
          </div>
        </div>

        <div class="create-footer">
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
          <button class="btn btn-primary btn-lg" id="btn-create">Começar Carreira →</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('modeSelect');

    // Trait panel: updates when nationality changes
    const renderTrait = (natKey) => {
      const nat   = NAMES[natKey];
      const trait = nat?.trait;
      const panel = document.getElementById('trait-panel');
      if (!trait) { panel.innerHTML = ''; return; }

      const fmtAttr = ([a, v]) =>
        `<span class="trait-mod ${v > 0 ? 'plus' : 'minus'}">${v > 0 ? '+' : ''}${v} ${t(ATTR_LABELS[a] || a)}</span>`;
      const specials = [];
      if (trait.special?.purseMult) specials.push(`💰 Bolsas +${Math.round((trait.special.purseMult - 1) * 100)}%`);

      panel.innerHTML = `
        <div class="trait-name">⭐ ${t(trait.name)}</div>
        <div class="trait-desc">${t(trait.desc)}</div>
        <div class="trait-mods">
          ${Object.entries(trait.plus || {}).map(fmtAttr).join('')}
          ${Object.entries(trait.minus || {}).map(fmtAttr).join('')}
          ${specials.map(s => `<span class="trait-mod plus">${s}</span>`).join('')}
        </div>
      `;
    };
    renderTrait('BR');
    document.getElementById('c-nat').onchange = (e) => renderTrait(e.target.value);

    // Attribute point allocation
    document.querySelectorAll('.attr-btn').forEach(btn => {
      btn.onclick = () => {
        const attr  = btn.dataset.attr;
        const delta = btn.classList.contains('plus') ? 1 : -1;
        const curr  = this._attrPoints[attr] || 0;

        if (delta > 0 && this._remainingPts <= 0) return;
        if (delta < 0 && curr <= 0) return;

        this._attrPoints[attr] = curr + delta;
        this._remainingPts -= delta;

        const val = 55 + this._attrPoints[attr];
        document.getElementById(`attr-val-${attr}`).textContent = val;
        document.getElementById(`abar-${attr}`).style.width = val + '%';
        document.getElementById('pts-remaining').textContent = `${this._remainingPts} ${t('pts restantes')}`;
      };
    });

    // Style presets: reset points and apply preset distribution
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.onclick = () => {
        const preset = PRESETS.find(pr => pr.id === btn.dataset.preset);
        if (!preset) return;
        // Reset all points
        this._attrPoints = {};
        this._remainingPts = 20;
        const allAttrs = [...physAttrs, ...techAttrs, ...mentAttrs];
        allAttrs.forEach(a => {
          document.getElementById(`attr-val-${a}`).textContent = 55;
          document.getElementById(`abar-${a}`).style.width = '55%';
        });
        // Apply preset
        for (const [a, pts] of Object.entries(preset.pts)) {
          this._attrPoints[a] = pts;
          this._remainingPts -= pts;
          document.getElementById(`attr-val-${a}`).textContent = 55 + pts;
          document.getElementById(`abar-${a}`).style.width = (55 + pts) + '%';
        }
        document.getElementById('pts-remaining').textContent = `${this._remainingPts} ${t('pts restantes')}`;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    document.getElementById('btn-create').onclick = () => {
      const name = document.getElementById('c-name').value.trim();
      if (!name) { alert('Digite o nome do boxeador!'); return; }

      const fighter = createPlayerFighter({
        name,
        nickname:    document.getElementById('c-nick').value.trim(),
        age:         parseInt(document.getElementById('c-age').value),
        nationality: document.getElementById('c-nat').value,
        weightClass: document.getElementById('c-wc').value,
        style:       document.getElementById('c-style').value,
        personality: document.getElementById('c-pers').value,
        attributePoints: this._attrPoints,
      });

      this.gs.player = fighter;
      this.gs.gameMode = 'athlete';
      this.gs.generateWorld();
      this.gs.generateAvailableFights();
      this.gs.save();
      this.show('careerHub');
    };
  }
  // CAREER HUB
  _academyCountryOptions() {
    return Object.entries(CONTINENTS).map(([key, continent]) =>
      `<optgroup label="${continent.icon} ${continent.name}">` +
      Object.entries(NAMES).filter(([, data]) => data.continent === key)
        .map(([code, data]) => `<option value="${code}" ${code === 'BR' ? 'selected' : ''}>${data.flag} ${data.nation}</option>`).join('') +
      `</optgroup>`
    ).join('');
  }

  _render_createAcademy({ fromRetirement = false } = {}) {
    const founder = fromRetirement ? this.gs.player : null;
    const projection = founder ? this.gs.getAcademyFounderProjection(founder) : null;

    const nameSuggestions = projection?.nameSuggestions || [];
    const staffToCarry    = projection?.staffToCarry    || [];
    const prePurchased    = projection?.builderPrePurchased || [];

    const suggestionsHTML = nameSuggestions.length ? `
      <div class="founder-name-suggestions">
        <span class="founder-suggestions-label">Sugestões baseadas no seu legado:</span>
        <div class="founder-suggestions-chips">
          ${nameSuggestions.map(s => `<button class="founder-name-chip" data-name="${s}">${s}</button>`).join('')}
        </div>
      </div>` : '';

    const staffHTML = staffToCarry.length ? `
      <div class="founder-staff-carry">
        <div class="founder-staff-head">👥 Equipe que vem com você</div>
        <div class="founder-staff-list">
          ${staffToCarry.map(s => `
            <div class="founder-staff-row">
              <span>${s.icon} ${s.name}</span>
              <span class="founder-staff-salary">${formatCurrency(s.salary)}/sem.</span>
            </div>`).join('')}
        </div>
        <small class="founder-staff-note">Esses membros já estarão contratados na academia desde o dia 1.</small>
      </div>` : '';

    const builderPreviewHTML = prePurchased.length ? `
      <div class="founder-builder-preview">
        <div class="founder-staff-head">🏗️ Academia já no nível ${projection.level}</div>
        <small>${prePurchased.length} itens desbloqueados pelo seu legado — ${
          projection.level >= 3 ? 'Níveis 1 e 2 completos' : 'Nível 1 completo'
        }. Você começa com uma estrutura já estabelecida.</small>
      </div>` : '';

    const founderItemsHTML = (projection?.founderItems || []).length ? `
      <div class="founder-staff-carry" style="margin-top:14px">
        <div class="founder-staff-head">✦ Peças exclusivas do legado</div>
        <div class="founder-staff-list">
          ${projection.founderItems.map(item => `
            <div class="founder-staff-row">
              <span>${item.icon} ${item.name}</span>
              <span style="font-size:.7rem;color:#6a7a75">${item.condition}</span>
            </div>`).join('')}
        </div>
        <small class="founder-staff-note">Estarão visíveis na aba Academia desde o dia 1.</small>
      </div>` : '';

    const defaultName = nameSuggestions[0] || '';

    this.root.innerHTML = `
      <div class="academy-shell academy-create">
        <header class="academy-create-head">
          <span class="academy-kicker">${founder ? 'SEGUNDO ATO' : 'NOVO PROJETO'}</span>
          <h1>${founder ? `${founder.displayName || founder.name}, agora do lado de fora do ringue` : 'Abra as portas da sua academia'}</h1>
          <p>${founder ? 'Sua carreira define os recursos, o prestígio e a capacidade de atrair talentos no início.' :
            'Escolha a cultura do centro de treinamento. Ela orientará evolução, contratações e identidade esportiva.'}</p>
        </header>
        <div class="academy-create-grid">
          <section class="academy-paper">
            <label>Nome da academia</label>
            <input class="academy-input" id="academy-name" maxlength="36" placeholder="Ex.: Academia Nobre Arte" value="${defaultName}">
            ${suggestionsHTML}
            <label>País</label><select class="academy-input" id="academy-country">${this._academyCountryOptions()}</select>
            <label>Cidade</label><input class="academy-input" id="academy-city" maxlength="30" placeholder="Ex.: São Paulo">

            <div class="academy-starting-note">
              <strong>Capital inicial: ${formatCurrency(projection?.money || 120000)}</strong>
              <span>${projection?.maxRoster || 6} vagas · nível ${projection?.level || 1} · reputação ${projection?.reputation || 12}</span>
            </div>

            ${projection ? `<div class="academy-founder-preview">
              <span>${projection.label}</span><strong>${founder.record}</strong>
              <small>${projection.worldTitles} mundial(is) · ${projection.continentalTitles} continental(is) · ${projection.defenses} defesas</small>
              <p>${projection.careerScore < 60
                ? 'A carreira não abriu muitas portas: o começo será mais difícil que o de um manager independente.'
                : 'Seu nome atrai investimento, atletas e uma rede de observação mais preparada.'}</p>
            </div>` : ''}

            ${staffHTML}
            ${builderPreviewHTML}
            ${founderItemsHTML}
          </section>

          <section>
            <h2 class="academy-section-title">Filosofia de trabalho</h2>
            <div class="academy-philosophy-grid">
              ${ACADEMY_PHILOSOPHIES.map((item, index) => `
                <button class="academy-philosophy ${index === 0 ? 'selected' : ''}" data-philosophy="${item.id}">
                  <span>${item.icon}</span><strong>${item.name}</strong><small>${item.desc}</small>
                </button>`).join('')}
            </div>
          </section>
        </div>
        <footer class="academy-create-footer">
          <button class="academy-btn academy-btn-quiet" id="academy-back">Voltar</button>
          <button class="academy-btn academy-btn-primary" id="academy-create-btn">Fundar academia</button>
        </footer>
      </div>`;

    let philosophy = 'technical';
    document.querySelectorAll('.academy-philosophy').forEach(btn => {
      btn.onclick = () => {
        philosophy = btn.dataset.philosophy;
        document.querySelectorAll('.academy-philosophy').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });

    // Name suggestion chips
    document.querySelectorAll('.founder-name-chip').forEach(chip => {
      chip.onclick = () => {
        document.getElementById('academy-name').value = chip.dataset.name;
        document.querySelectorAll('.founder-name-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      };
    });

    document.getElementById('academy-back').onclick = () => this.show(fromRetirement ? 'retirement' : 'modeSelect');
    document.getElementById('academy-create-btn').onclick = () => {
      const name = document.getElementById('academy-name').value.trim();
      if (!name) return this._toast('Dê um nome à academia.');
      this.gs.createAcademy({ name, country: document.getElementById('academy-country').value,
        city: document.getElementById('academy-city').value, philosophy, founder });
      this.gs.save();
      this.show('academyHub');
    };
  }

  _academyNav(active) {
    const a = this.gs.academy;
    const roster = this.gs.getAcademyRoster();
    const scheduled = (a.scheduledFights || []).length;
    return `<aside class="academy-nav">
      <div class="academy-brand">
        <span class="academy-brand-tag">RINGUE · ACADEMIA</span>
        <strong>${a.name}</strong>
        <small>${NAMES[a.country]?.flag || ''} ${a.city || NAMES[a.country]?.nation || ''} · Nível ${a.level}</small>
      </div>
      <nav class="academy-nav-links">
        <button class="${active === 'hub' ? 'active' : ''}" data-academy-nav="academyHub">
          <span class="nav-icon">📋</span> Prancheta
        </button>
        <button class="${active === 'roster' ? 'active' : ''}" data-academy-nav="academyRoster">
          <span class="nav-icon">👥</span> Elenco
          ${roster.length ? `<span class="nav-badge">${roster.length}</span>` : ''}
        </button>
        <button class="${active === 'recruit' ? 'active' : ''}" data-academy-nav="academyRecruitment">
          <span class="nav-icon">🔍</span> Recrutamento
        </button>
        ${scheduled ? `<button class="${active === 'fights' ? 'active' : ''}" data-academy-nav="academyFights">
          <span class="nav-icon">🥊</span> Lutas
          <span class="nav-badge nav-badge-fight">${scheduled}</span>
        </button>` : `<button class="${active === 'fights' ? 'active' : ''}" data-academy-nav="academyFights">
          <span class="nav-icon">🥊</span> Lutas
        </button>`}
        <button class="${active === 'management' ? 'active' : ''}" data-academy-nav="academyManagement">
          <span class="nav-icon">📊</span> Gestão
        </button>
        <button class="${active === 'sponsors' ? 'active' : ''}" data-academy-nav="academySponsors">
          <span class="nav-icon">💼</span> Patrocinadores
          ${(a.sponsorOffers || []).length ? `<span class="nav-badge nav-badge-fight">${a.sponsorOffers.length}</span>` : ''}
        </button>
        <button class="${active === 'academyBuilder' ? 'active' : ''}" data-academy-nav="academyBuilder">
          <span class="nav-icon">🏗️</span> Academia
        </button>
      </nav>
      <div class="academy-nav-footer">
        <div class="academy-nav-caixa">💰 ${formatCurrency(a.money)}</div>
        <button data-academy-action="save" class="academy-nav-save">Salvar</button>
        <button data-academy-nav="mainMenu" class="academy-nav-exit">Sair</button>
      </div>
    </aside>`;
  }

  _bindAcademyNav() {
    document.querySelectorAll('[data-academy-nav]').forEach(button => button.onclick = () => this.show(button.dataset.academyNav));
    const save = document.querySelector('[data-academy-action="save"]');
    if (save) save.onclick = () => { this.gs.save(); this._toast('Academia salva.'); };
  }

  _academyFighterCard_unused(fighter, recruitment = false) {
    const report = this.gs.getAcademyScoutingReport(fighter);
    return `<article class="academy-fighter-card">
      <div class="academy-fighter-top"><span class="academy-flag">${fighter.nationalityData?.flag || ''}</span>
        <div><h3>${fighter.name}</h3><p>${fighter.age} anos · ${fighter.weightClassData?.name}</p></div>
        <strong class="academy-ovr">${fighter.overall}<small>OVR</small></strong></div>
      <div class="academy-tags"><span>${report.style}</span><span>${report.personality}</span><span>Potencial ${report.potential}</span></div>
      <dl class="academy-scout-lines"><div><dt>Traço</dt><dd>${report.trait}</dd></div><div><dt>Leitura</dt><dd>${report.synergy}</dd></div><div><dt>Cartel</dt><dd>${fighter.record}</dd></div></dl>
      <div class="academy-card-actions"><button class="academy-btn academy-btn-quiet" data-fighter-view="${fighter.id}">Relatório</button>
        ${recruitment ? `<button class="academy-btn academy-btn-primary" data-fighter-sign="${fighter.id}">Assinar ${formatCurrency(report.signingCost)}</button>` : `<span>${formatCurrency(report.wage)}/sem.</span>`}</div>
    </article>`;
  }

  _render_academyRecruitment() {
    const candidates = this.gs.getAcademyCandidates();
    const roster     = this.gs.getAcademyRoster();
    const academy    = this.gs.academy;
    const vagas      = academy.maxRoster - roster.length;

    const dossiers = candidates.map(f => {
      const report = this.gs.getAcademyScoutingReport(f);
      const riskColor = f.age <= 20 ? '#176b5b' : f.age <= 24 ? '#2e6472' : '#8b6914';
      return `<article class="recruit-dossier">
        <div class="dossier-header">
          <div class="dossier-flag">${f.nationalityData?.flag || ''}</div>
          <div class="dossier-id">
            <strong class="dossier-name">${f.name}</strong>
            <span class="dossier-sub">${f.age} anos · ${f.weightClassData?.name} · ${f.record}</span>
          </div>
          <div class="dossier-ovr">${f.overall}<small>OVR</small></div>
        </div>
        <div class="dossier-tags">
          <span class="dossier-tag" style="border-color:${riskColor}; color:${riskColor}">${report.style}</span>
          <span class="dossier-tag">${report.personality}</span>
          <span class="dossier-tag dossier-tag-pot">🎯 ${report.potential}</span>
        </div>
        <dl class="dossier-lines">
          <div><dt>Traço</dt><dd>${report.trait}</dd></div>
          <div><dt>Sinergia</dt><dd>${report.synergy}</dd></div>
          <div><dt>Assinar</dt><dd><strong>${formatCurrency(report.signingCost)}</strong></dd></div>
          <div><dt>Salário</dt><dd>${formatCurrency(report.wage)}/sem.</dd></div>
        </dl>
        <div class="dossier-actions">
          <button class="academy-btn academy-btn-quiet dossier-btn-view" data-fighter-view="${f.id}">Ver dossiê</button>
          <button class="academy-btn academy-btn-primary dossier-btn-sign" data-fighter-sign="${f.id}" ${vagas <= 0 ? 'disabled title="Elenco cheio"' : ''}>
            Contratar
          </button>
        </div>
      </article>`;
    }).join('');

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('recruit')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">🔍 DEPARTAMENTO DE SCOUTING</div>
            <h1 class="ah-title">Observação de Prospectos</h1>
            <p class="ah-subtitle">Potencial é estimado. Personalidade e sinergia também definem carreiras.</p>
          </div>
          <div class="recruit-head-stats">
            <div class="recruit-stat"><strong>${roster.length}/${academy.maxRoster}</strong><span>vagas</span></div>
            <div class="recruit-stat"><strong>${formatCurrency(academy.money)}</strong><span>caixa</span></div>
          </div>
        </div>

        <div class="recruit-toolbar">
          <span class="recruit-count">${candidates.length} prospecto${candidates.length !== 1 ? 's' : ''} em observação</span>
          <button class="academy-btn academy-btn-quiet" id="academy-refresh">
            🔄 Nova rodada · ${formatCurrency(1500)}
          </button>
        </div>

        <div class="recruit-grid">
          ${candidates.length
            ? dossiers
            : `<div class="recruit-empty">
                <p>📂 Nenhum prospecto em observação.</p>
                <p>Clique em <strong>Nova rodada</strong> para enviar olheiros ao mercado.</p>
              </div>`}
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.getElementById('academy-refresh').onclick = () => {
      const result = this.gs.refreshAcademyCandidates();
      if (!result.success) return this._toast(result.reason);
      this.gs.save();
      this.show('academyRecruitment');
    };
    document.querySelectorAll('.dossier-btn-sign').forEach(btn => btn.onclick = () => {
      const result = this.gs.signAcademyFighter(Number(btn.dataset.fighterSign));
      if (!result.success) return this._toast(result.reason);
      this.gs.save();
      this.show('academyRecruitment');
    });
    document.querySelectorAll('.dossier-btn-view').forEach(btn => btn.onclick = () =>
      this.show('academyFighter', { fighterId: Number(btn.dataset.fighterView), from: 'academyRecruitment' }));
  }

  _render_academyHub() {
    const academy   = this.gs.academy;
    const roster    = this.gs.getAcademyRoster();
    const budget    = this.gs.academyWeeklyBudget();
    const reports   = academy.weeklyReports   || [];
    const fightRes  = academy.lastFightResults || [];
    const sched     = academy.scheduledFights  || [];
    const scheduled = sched.map(s => {
      const f = this.gs.allFighters.find(x => x.id === s.fighterId);
      const o = this.gs.allFighters.find(x => x.id === s.opponentId);
      return { fighter: f, opponent: o, ...s };
    }).filter(s => s.fighter && s.opponent);

    const rosterRows = roster.map(fighter => {
      const focus      = TRAINING_FOCUSES.find(f => f.id === academy.trainingPlan[fighter.id]);
      const schedEntry = sched.find(s => s.fighterId === fighter.id);
      const hasFight   = !!schedEntry;
      const opp        = schedEntry ? this.gs.allFighters.find(f => f.id === schedEntry.opponentId) : null;
      const weeksLeft  = schedEntry ? Math.max(0, schedEntry.week - this.gs.week) : 0;
      const impColors  = { local:'#5a8a70', regional:'#6a7db8', nacional:'#a86a20', continental:'#8a4ab0', mundial:'#c0392b' };
      const impColor   = impColors[schedEntry?.importance] || '#5a8a70';
      const rep = reports.find(r => r.fighterId === fighter.id);

      const statusCell = hasFight
        ? `<div class="ah-fight-status">
             <span class="ah-tag ah-tag-fight" style="background:${impColor}22;color:${impColor};border-color:${impColor}44">
               🥊 ${schedEntry.importance.charAt(0).toUpperCase() + schedEntry.importance.slice(1)}
             </span>
             <span class="ah-fight-countdown">${weeksLeft === 0 ? '⚡ Esta semana!' : `${weeksLeft} sem.`}</span>
             ${opp ? `<span class="ah-fight-vs">vs ${opp.name.split(' ')[0]}</span>` : ''}
           </div>`
        : `<span class="ah-tag ah-tag-free">Livre</span>`;

      const lastWeek = rep
        ? (rep.injury ? `⚠️ ${rep.injury.desc}` : rep.improvements?.length ? rep.improvements.map(i => `+${i.gain} ${i.label}`).join(' ') : '—')
        : '—';

      return `<tr class="ah-roster-row" data-fighter-view="${fighter.id}">
        <td><span class="ah-flag">${fighter.nationalityData?.flag || ''}</span> <strong>${fighter.name}</strong></td>
        <td><span class="ah-tag">${fighter.weightClassData?.name}</span></td>
        <td>${fighter.record}</td>
        <td><span class="ah-tag ah-tag-ovr">${fighter.overall}</span></td>
        <td>${focus?.name || '—'}</td>
        <td>${statusCell}</td>
        <td class="ah-last-week">${lastWeek}</td>
      </tr>`;
    }).join('');

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('hub')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">📅 Semana ${this.gs.week} · ${this.gs.year}</div>
            <h1 class="ah-title">Prancheta do Treinador</h1>
          </div>
          <button class="academy-btn academy-btn-primary ah-advance-btn" id="academy-advance">
            ▶ Avançar semana
          </button>
        </div>

        <div class="ah-kpis">
          <div class="ah-kpi ${budget.net < 0 ? 'ah-kpi-warn' : ''}">
            <span>CAIXA</span><strong>${formatCurrency(academy.money)}</strong>
            <small>${budget.net >= 0 ? '+' : ''}${formatCurrency(budget.net)}/sem.</small>
          </div>
          <div class="ah-kpi">
            <span>REPUTAÇÃO</span><strong>${academy.reputation}</strong>
            <small>nível ${academy.level} · ${academy.maxRoster} vagas</small>
          </div>
          <div class="ah-kpi">
            <span>ELENCO</span><strong>${roster.length}/${academy.maxRoster}</strong>
            <small>${roster.filter(f => f.age <= 23).length} jovens · ${scheduled.length} luta${scheduled.length !== 1 ? 's' : ''} agend.</small>
          </div>
          <div class="ah-kpi">
            <span>RESULTADO SEMANAL</span>
            <strong>${fightRes.length ? `${fightRes.filter(r => r.won).length}V ${fightRes.filter(r => !r.won).length}D` : '—'}</strong>
            <small>${fightRes.length ? fightRes.map(r => `${r.won ? '✅' : '❌'} ${r.name}`).join(' · ') : 'Sem lutas esta semana'}</small>
          </div>
        </div>

        <div class="ah-layout">
          <section class="ah-panel ah-panel-wide">
            <div class="ah-panel-head">
              <div>
                <span class="ah-label">PLANEJAMENTO SEMANAL</span>
                <h2>Elenco de competição</h2>
              </div>
              <button class="academy-btn academy-btn-quiet" data-academy-nav="academyRoster">Gerenciar →</button>
            </div>
            ${roster.length ? `
            <table class="ah-table">
              <thead><tr><th>Atleta</th><th>Divisão</th><th>Cartel</th><th>OVR</th><th>Foco</th><th>Status</th><th>Última semana</th></tr></thead>
              <tbody>${rosterRows}</tbody>
            </table>` : `<div class="academy-empty">Nenhum atleta contratado. <button class="ah-link" data-academy-nav="academyRecruitment">Ir ao recrutamento →</button></div>`}
          </section>

          <aside class="ah-side">
            <div class="ah-panel ah-finance">
              <div class="ah-panel-head"><span class="ah-label">FINANÇAS</span><h2>Fluxo semanal</h2></div>
              <div class="ah-finance-row"><span>Mensalidades</span><strong class="pos">+${formatCurrency(budget.memberships)}</strong></div>
              <div class="ah-finance-row"><span>Patrocínios</span><strong class="pos">+${formatCurrency(budget.sponsors)}</strong></div>
              <div class="ah-finance-row"><span>Salários</span><strong class="neg">−${formatCurrency(budget.wages)}</strong></div>
              <div class="ah-finance-row"><span>Manutenção</span><strong class="neg">−${formatCurrency(budget.maintenance)}</strong></div>
              <div class="ah-finance-total">
                <span>Saldo</span>
                <strong class="${budget.net >= 0 ? 'pos' : 'neg'}">${budget.net >= 0 ? '+' : ''}${formatCurrency(budget.net)}</strong>
              </div>
            </div>

            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">MUNDO DO BOXE</span><h2>Notícias</h2></div>
              ${this.gs.news.slice(0, 5).map(item =>
                `<div class="ah-news-row"><small>${item.date}</small><span>${item.headline}</span></div>`
              ).join('')}
            </div>
          </aside>
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.querySelectorAll('[data-fighter-view]').forEach(row =>
      row.onclick = () => this.show('academyFighter', { fighterId: Number(row.dataset.fighterView), from: 'academyHub' }));
    document.getElementById('academy-advance').onclick = () => {
      const res = this.gs.advanceAcademyWeek();
      this.gs.save();
      if (res.pendingFights?.length) {
        this.show('academyFightWatch', { pending: res.pendingFights, idx: 0 });
      } else {
        this.show('academyHub');
      }
    };
  }

  _render_academyRoster() {
    const roster  = this.gs.getAcademyRoster();
    const academy = this.gs.academy;
    const sched   = academy.scheduledFights || [];

    const rows = roster.map(fighter => {
      const focus      = academy.trainingPlan[fighter.id];
      const schedEntry = sched.find(s => s.fighterId === fighter.id);
      const hasFight   = !!schedEntry;
      const opp        = schedEntry ? this.gs.allFighters.find(f => f.id === schedEntry.opponentId) : null;
      const weeksLeft  = schedEntry ? Math.max(0, schedEntry.week - this.gs.week) : 0;
      const campDone   = schedEntry?.campWeeksDone || 0;
      const campTotal  = schedEntry?.weeksOut || 1;
      const campPct    = Math.round(campDone / campTotal * 100);
      const importanceLabel = { local:'Local', regional:'Regional', nacional:'Nacional', continental:'Continental', mundial:'Mundial' };

      const fightBlock = hasFight ? `
        <div class="camp-block">
          <div class="camp-header">
            <span class="camp-importance camp-${schedEntry.importance}">🥊 ${importanceLabel[schedEntry.importance] || ''}</span>
            <span class="camp-opponent">vs ${opp?.name || '?'}</span>
            <button class="roster-cancel-fight" data-cancel="${fighter.id}" title="Cancelar luta">✕</button>
          </div>
          <div class="camp-countdown">${weeksLeft === 0 ? '⚡ DIA DA LUTA' : `${weeksLeft} semana${weeksLeft !== 1 ? 's' : ''} restante${weeksLeft !== 1 ? 's' : ''}`}</div>
          <div class="camp-progress-row">
            <span>Fight Camp</span>
            <div class="camp-track"><div class="camp-fill" style="width:${campPct}%"></div></div>
            <span>${campDone}/${campTotal} sem.</span>
          </div>
          <div class="roster-card-field" style="margin-top:8px">
            <label>Foco do camp</label>
            <select class="camp-focus-select" data-camp-fighter="${fighter.id}">
              ${TRAINING_FOCUSES.filter(f => f.attrs.length).map(f =>
                `<option value="${f.id}" ${(schedEntry.campFocus || focus) === f.id ? 'selected' : ''}>${f.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>` : `<button class="academy-btn academy-btn-quiet roster-book-btn" data-book="${fighter.id}">+ Agendar luta</button>`;

      return `<div class="roster-card ${hasFight ? 'roster-card-incamp' : ''}">
        <div class="roster-card-top">
          <button class="roster-card-name" data-fighter-view="${fighter.id}">
            <span class="roster-card-flag">${fighter.nationalityData?.flag || ''}</span>
            <div>
              <strong>${fighter.name}</strong>
              <small>${fighter.age} anos · ${fighter.weightClassData?.name} · ${fighter.record}</small>
            </div>
          </button>
          <div class="roster-card-ovr">${fighter.overall}<small>OVR</small></div>
        </div>
        <div class="roster-card-body">
          ${!hasFight ? `<div class="roster-card-field">
            <label>Foco de treino</label>
            <select class="roster-focus-select" data-focus-fighter="${fighter.id}">
              ${TRAINING_FOCUSES.filter(f => f.attrs.length).map(f =>
                `<option value="${f.id}" ${focus === f.id ? 'selected' : ''}>${f.name}</option>`
              ).join('')}
            </select>
          </div>` : ''}
          <div class="roster-card-field">
            <label>${hasFight ? 'Fight Camp' : 'Próxima luta'}</label>
            ${fightBlock}
          </div>
          <div class="roster-card-field">
            <label>Forma</label>
            <span class="ah-tag">${fighter.conditioningStatus}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('roster')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">👥 COMISSÃO TÉCNICA</div>
            <h1 class="ah-title">Elenco de Competição</h1>
            <p class="ah-subtitle">Defina o foco de treino e agende as lutas de cada atleta.</p>
          </div>
          <button class="academy-btn academy-btn-primary" data-academy-nav="academyRecruitment">
            + Recrutar atleta
          </button>
        </div>
        ${roster.length
          ? `<div class="roster-grid">${rows}</div>`
          : `<div class="recruit-empty">
              <p>📋 Elenco vazio.</p>
              <p>Vá ao <strong>Recrutamento</strong> para contratar seus primeiros atletas.</p>
              <button class="academy-btn academy-btn-primary" data-academy-nav="academyRecruitment" style="margin-top:14px">Ir ao recrutamento →</button>
            </div>`}
      </main>
    </div>`;

    this._bindAcademyNav();
    document.querySelectorAll('.roster-focus-select').forEach(sel => sel.onchange = () => {
      this.gs.setAcademyTrainingFocus(Number(sel.dataset.focusFighter), sel.value);
      this.gs.save();
    });
    document.querySelectorAll('.roster-card-name').forEach(btn => btn.onclick = () =>
      this.show('academyFighter', { fighterId: Number(btn.dataset.fighterView), from: 'academyRoster' }));
    document.querySelectorAll('.roster-book-btn').forEach(btn => btn.onclick = () =>
      this.show('academyFightBook', { fighterId: Number(btn.dataset.book) }));
    document.querySelectorAll('.roster-cancel-fight').forEach(btn => btn.onclick = () => {
      this.gs.cancelAcademyFight(Number(btn.dataset.cancel));
      this.gs.save();
      this.show('academyRoster');
    });
    document.querySelectorAll('.camp-focus-select').forEach(sel => sel.onchange = () => {
      this.gs.setAcademyCampFocus(Number(sel.dataset.campFighter), sel.value);
      this.gs.save();
    });
  }

  _render_academyFights() {
    const academy = this.gs.academy;
    const sched   = (academy.scheduledFights || []).map(s => {
      const f = this.gs.allFighters.find(x => x.id === s.fighterId);
      const o = this.gs.allFighters.find(x => x.id === s.opponentId);
      return { ...s, fighter: f, opponent: o };
    }).filter(s => s.fighter && s.opponent);
    const past = (academy.lastFightResults || []);

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('fights')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">🥊 CALENDÁRIO DE LUTAS</div>
            <h1 class="ah-title">Agenda de Combates</h1>
          </div>
        </div>
        <div class="ah-layout">
          <section class="ah-panel ah-panel-wide">
            <div class="ah-panel-head"><span class="ah-label">PRÓXIMAS LUTAS</span><h2>Confirmadas para avançar</h2></div>
            ${sched.length ? sched.map(s => `
              <div class="fight-schedule-row">
                <div class="fsr-info">
                  <strong>${s.fighter.name}</strong> <span class="ah-tag ah-tag-ovr">${s.fighter.overall}</span>
                  <span class="fsr-vs">vs</span>
                  <strong>${s.opponent.name}</strong> <span class="ah-tag">${s.opponent.overall}</span>
                </div>
                <div class="fsr-meta">
                  <span>${s.fighter.weightClassData?.name}</span>
                  <button class="academy-btn academy-btn-quiet fsr-cancel" data-cancel="${s.fighterId}">Cancelar</button>
                </div>
              </div>`).join('')
            : '<div class="academy-empty">Nenhuma luta agendada. Vá ao Elenco para agendar.</div>'}
          </section>
          <aside class="ah-side">
            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">ÚLTIMA SEMANA</span><h2>Resultados</h2></div>
              ${past.length ? past.map(r => `
                <div class="ah-news-row">
                  <strong>${r.won ? '✅' : '❌'} ${r.name}</strong>
                  <span>${r.won ? 'Venceu' : 'Perdeu para'} ${r.opponent} · ${r.method} R${r.round}</span>
                </div>`).join('')
              : '<div class="academy-empty">Sem resultados esta semana.</div>'}
            </div>
          </aside>
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.querySelectorAll('.fsr-cancel').forEach(btn => btn.onclick = () => {
      this.gs.cancelAcademyFight(Number(btn.dataset.cancel));
      this.gs.save();
      this.show('academyFights');
    });
  }

  _render_academyFightBook({ fighterId }) {
    const fighter = this.gs.allFighters.find(f => f.id === fighterId);
    if (!fighter) return this.show('academyRoster');
    const options = this.gs.getAcademyFightOptions(fighterId);

    const riskLabel = r => ['🟢 Fácil', '🟡 Justo', '🟠 Arriscado', '🔴 Perigoso'][r] || '🟡 Justo';

    const rows = options.map(({ opponent: opp, risk, purse, beltStakes, oppOrgRanks, fighterOrgRanks }) => {
      const oppWorldBelts = (opp.belts || []).filter(b => WORLD_ORGS.includes(b));
      const isTitle = oppWorldBelts.length > 0;
      const isUnif  = (beltStakes || []).length > 1;
      const orgBadges = Object.entries(oppOrgRanks || {}).map(([org, rank]) => {
        const bi = getBeltInfo(org);
        return `<span class="org-rank-badge" style="border-color:${bi.color}; color:${bi.color}">${bi.icon} ${org} ${rank === 'C' ? '👑' : `#${rank}`}</span>`;
      }).join('');
      const beltChips = (beltStakes || []).map(org => {
        const bi = getBeltInfo(org);
        return `<span class="belt-chip" style="border-color:${bi.color}; font-size:.7rem">${bi.icon} ${bi.name}</span>`;
      }).join('');
      return `
        <div class="fbook-row ${isTitle ? 'fbook-title-fight' : ''} ${isUnif ? 'fbook-unification' : ''}">
          ${isUnif ? `<div class="fbook-unif-banner">👑 LUTA DE UNIFICAÇÃO — ${(beltStakes||[]).join(' + ')}</div>` : isTitle ? `<div class="fbook-title-banner">🏆 DISPUTA DE TÍTULO MUNDIAL</div>` : ''}
          <div class="fbook-opponent">
            <span class="ah-flag">${opp.nationalityData?.flag || ''}</span>
            <div>
              <strong>${opp.name}</strong>
              <small>${opp.age} anos · ${opp.record} · #${opp.ranking || '?'} ranking</small>
              ${orgBadges ? `<div class="org-rank-badges" style="margin-top:3px">${orgBadges}</div>` : ''}
              ${beltChips ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${beltChips}</div>` : ''}
            </div>
          </div>
          <div class="fbook-meta">
            <span class="ah-tag ah-tag-ovr">${opp.overall} OVR</span>
            <span class="fbook-risk">${riskLabel(risk)}</span>
            <span class="fbook-purse">${formatCurrency(purse)}</span>
            <button class="academy-btn academy-btn-primary fbook-confirm" data-opponent="${opp.id}">Agendar</button>
          </div>
        </div>`;
    }).join('');

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('roster')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">🥊 AGENDAMENTO DE LUTA</div>
            <h1 class="ah-title">${fighter.name}</h1>
            <p class="ah-subtitle">${fighter.age} anos · ${fighter.record} · ${fighter.weightClassData?.name} · OVR ${fighter.overall}</p>
          </div>
          <button class="academy-btn academy-btn-quiet" id="fbook-back">← Voltar</button>
        </div>
        <section class="ah-panel">
          <div class="ah-panel-head">
            <span class="ah-label">ADVERSÁRIOS DISPONÍVEIS</span>
            <h2>Escolha o adversário</h2>
          </div>
          ${options.length ? `<div class="fbook-list">${rows}</div>`
            : '<div class="academy-empty">Nenhum adversário compatível encontrado. Avance semanas.</div>'}
        </section>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.getElementById('fbook-back').onclick = () => this.show('academyRoster');
    document.querySelectorAll('.fbook-confirm').forEach(btn => btn.onclick = () => {
      const result = this.gs.bookAcademyFight(fighterId, Number(btn.dataset.opponent));
      if (!result.success) return this._toast(result.reason);
      this.gs.save();
      const importanceLabel = { local:'local', regional:'regional', nacional:'nacional', continental:'continental', mundial:'mundial' };
      this._toast(`✅ Luta ${importanceLabel[result.importance] || ''} agendada — em ${result.weeksOut} semana${result.weeksOut !== 1 ? 's' : ''}`);
      this.show('academyRoster');
    });
  }

  _render_academyFighter({ fighterId, from = 'academyRoster' }) {
    const fighter  = this.gs.allFighters.find(f => f.id === fighterId);
    if (!fighter) return this.show(from);
    const report   = this.gs.getAcademyScoutingReport(fighter);
    const belongs  = this.gs.academy?.rosterIds.includes(fighter.id);
    const sched    = (this.gs.academy?.scheduledFights || []).find(s => s.fighterId === fighterId);
    const schedOpp = sched ? this.gs.allFighters.find(f => f.id === sched.opponentId) : null;
    const attrs    = [
      ['Força',      fighter.strength],  ['Velocidade', fighter.speed],
      ['Resistência',fighter.stamina],   ['Queixo',     fighter.chin],
      ['Reflexos',   fighter.reflexes],
      ['Jab',        fighter.jab],       ['Direto',     fighter.straight],
      ['Cruzado',    fighter.cross],     ['Uppercut',   fighter.uppercut],
      ['Defesa',     fighter.defense],   ['Jogo de Pés',fighter.footwork],
      ['Combinações',fighter.combinations],['Precisão', fighter.precision],
      ['Ring IQ',    fighter.ringIQ],    ['Soco no Corpo', fighter.bodyPunch],
      ['Coragem',    fighter.courage],   ['Equilíbrio', fighter.composure],
      ['Resiliência',fighter.resilience],
    ];
    const history = (fighter.fightHistory || []).slice(0, 5);

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav(belongs ? 'roster' : 'recruit')}
      <main class="academy-main">
        <button class="ah-back-btn" id="academy-fighter-back">← Voltar</button>

        <div class="fighter-profile-header">
          <div class="fph-flag">${fighter.nationalityData?.flag || ''}</div>
          <div class="fph-info">
            <span class="ah-label">${fighter.weightClassData?.name} · ${fighter.nationalityData?.nation || ''}</span>
            <h1>${fighter.displayName}</h1>
            <p>${fighter.age} anos · ${fighter.record} · ${report.style} · ${report.personality}</p>
          </div>
          <div class="fph-ovr">${fighter.overall}<small>OVR</small></div>
        </div>

        <div class="ah-layout">
          <section class="ah-panel ah-panel-wide">
            <div class="ah-panel-head"><span class="ah-label">ATRIBUTOS</span><h2>Mapa técnico</h2></div>
            <div class="attr-grid">
              ${attrs.map(([label, value]) => `
                <div class="attr-row">
                  <span class="attr-label">${label}</span>
                  <div class="attr-bar-wrap"><div class="attr-bar-fill" style="width:${value}%"></div></div>
                  <strong class="attr-val">${value}</strong>
                </div>`).join('')}
            </div>
            ${history.length ? `
            <div class="ah-panel-head" style="margin-top:20px"><span class="ah-label">HISTÓRICO</span><h2>Últimas lutas</h2></div>
            ${history.map(h => `
              <div class="ah-news-row">
                <strong class="${h.result === 'W' ? 'pos' : h.result === 'L' ? 'neg' : ''}">${h.result === 'W' ? '✅ Vitória' : h.result === 'L' ? '❌ Derrota' : '➖ Empate'}</strong>
                <span>vs ${h.opponent?.name || '?'} · ${h.method} R${h.round} · ${h.date || ''}</span>
              </div>`).join('')}` : ''}
          </section>

          <aside class="ah-side">
            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">PROJEÇÃO DO OLHEIRO</span><h2>Relatório</h2></div>
              <div class="scout-row"><span>Potencial</span><strong>${report.potential}</strong></div>
              <div class="scout-row"><span>Traço</span><strong>${report.trait}</strong></div>
              <div class="scout-row"><span>Sinergia</span><strong>${report.synergy}</strong></div>
              <div class="scout-row"><span>Forma</span><strong>${fighter.conditioningStatus}</strong></div>
              <div class="scout-row"><span>Desgaste</span><strong>${fighter.careerWear || 0}</strong></div>
              ${belongs ? `<div class="scout-row"><span>Salário</span><strong>${formatCurrency(report.wage)}/sem.</strong></div>` : `<div class="scout-row"><span>Assinar</span><strong>${formatCurrency(report.signingCost)}</strong></div>`}
            </div>

            <!-- Org rankings panel -->
            ${this._renderAcademyFighterOrgRanks(fighter)}

            <!-- Hall da Fama eligibility -->
            ${this._renderAcademyFighterHoF(fighter)}

            ${belongs ? `
            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">AGENDA</span><h2>Próxima luta</h2></div>
              ${sched
                ? `<div class="scout-row"><span>Adversário</span><strong>${schedOpp?.name || '?'}</strong></div>
                   <div class="scout-row"><span>OVR</span><strong>${schedOpp?.overall || '?'}</strong></div>
                   ${(sched.beltStakes || []).length ? `<div class="scout-row"><span>Em jogo</span><strong style="color:#ffd700">${sched.beltStakes.join(' + ')}</strong></div>` : ''}
                   <button class="academy-btn academy-btn-quiet" id="cancel-fight" style="margin-top:12px;width:100%">Cancelar luta</button>`
                : `<button class="academy-btn academy-btn-primary" id="book-fight" style="width:100%">🥊 Agendar luta</button>`}
            </div>
            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">ELENCO</span><h2>Vínculo</h2></div>
              <button class="academy-btn academy-btn-danger" id="academy-release" style="width:100%">Dispensar atleta</button>
            </div>` : `
            <div class="ah-panel">
              <button class="academy-btn academy-btn-primary" id="sign-fighter" style="width:100%">Contratar · ${formatCurrency(report.signingCost)}</button>
            </div>`}
          </aside>
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.getElementById('academy-fighter-back').onclick = () => this.show(from);
    document.getElementById('book-fight')?.addEventListener('click', () =>
      this.show('academyFightBook', { fighterId }));
    document.getElementById('cancel-fight')?.addEventListener('click', () => {
      this.gs.cancelAcademyFight(fighterId); this.gs.save(); this.show('academyFighter', { fighterId, from });
    });
    document.getElementById('academy-release')?.addEventListener('click', () => {
      if (!confirm(`Dispensar ${fighter.name}?`)) return;
      this.gs.releaseAcademyFighter(fighter.id); this.gs.save(); this.show('academyRoster');
    });
    document.getElementById('sign-fighter')?.addEventListener('click', () => {
      const result = this.gs.signAcademyFighter(fighter.id);
      if (!result.success) return this._toast(result.reason);
      this.gs.save(); this.show('academyFighter', { fighterId, from: 'academyRoster' });
    });
  }

  _renderAcademyFighterOrgRanks(fighter) {
    const wc = fighter.weightClass;
    const orgInfo = WORLD_ORGS.map(org => {
      const bi        = getBeltInfo(org);
      const isChamp   = (fighter.belts || []).includes(org);
      const orgData   = this.gs.orgRankings?.[org]?.[wc];
      const idx       = isChamp ? -1 : (orgData?.contenders || []).findIndex(f => f.id === fighter.id);
      if (!isChamp && idx < 0) return null;
      return { org, bi, rank: isChamp ? 'C' : idx + 1, isChamp };
    }).filter(Boolean);
    if (!orgInfo.length) return '';
    return `
      <div class="ah-panel">
        <div class="ah-panel-head"><span class="ah-label">RANKINGS</span><h2>Posição por organização</h2></div>
        ${orgInfo.map(({ org, bi, rank, isChamp }) => `
          <div class="scout-row">
            <span>${bi.icon} ${org}</span>
            <strong style="color:${bi.color}">${isChamp ? '🏆 Campeão' : `#${rank} Contendor`}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  _renderAcademyFighterHoF(fighter) {
    const archivedDef = Object.values(fighter.divisionDefenses || {}).reduce((t, d) => t + Object.values(d || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef    = Object.values(fighter.beltDefenses  || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const worldTitles = (fighter.totalTitleWins || 0);
    const divs        = new Set((fighter.worldTitleHistory || []).map(e => e.weightClass)).size;
    const koPct       = fighter.koPct || 0;
    const eligible    = worldTitles >= 1 && (totalDef >= 5 || divs >= 2 || (fighter.wins || 0) >= 35);
    const inducted    = (this.gs.hallOfFame || []).some(e => e.id === fighter.id);
    if (!eligible && !inducted) return '';
    return `
      <div class="ah-panel" style="border-left: 3px solid #ffd700">
        <div class="ah-panel-head"><span class="ah-label">LEGADO</span><h2>Hall da Fama</h2></div>
        ${inducted
          ? `<div class="scout-row"><span>Status</span><strong style="color:#ffd700">🏛️ Induzido</strong></div>`
          : `<div class="scout-row"><span>Status</span><strong style="color:#ff9500">⭐ Elegível</strong></div>`}
        <div class="scout-row"><span>Títulos mundiais</span><strong>${worldTitles}</strong></div>
        <div class="scout-row"><span>Defesas de título</span><strong>${totalDef}</strong></div>
        ${divs >= 2 ? `<div class="scout-row"><span>Divisões</span><strong>${divs}</strong></div>` : ''}
      </div>
    `;
  }

  _render_academySponsors() {
    const a       = this.gs.academy;
    const offers  = a.sponsorOffers  || [];
    const active  = a.activeSponsors || [];
    const slots   = a.sponsorSlots   || 1;

    const catLabel = { equipment:'Equipamento', nutrition:'Nutrição', apparel:'Vestuário', media:'Mídia', betting:'Apostas', finance:'Financeiro' };
    const tierLabel = { 1:'Local', 2:'Regional', 3:'Nacional', 4:'Premium' };
    const tierColor = { 1:'#5a8a70', 2:'#6a7db8', 3:'#a86a20', 4:'#8b2fc9' };

    const offerCards = offers.length ? offers.map(o => `
      <div class="sp-card sp-offer">
        <div class="sp-card-top">
          <span class="sp-icon">${o.icon}</span>
          <div class="sp-card-info">
            <strong class="sp-name">${o.name}</strong>
            <span class="sp-meta">${catLabel[o.category] || o.category} · <span style="color:${tierColor[o.tier]}">${tierLabel[o.tier]}</span></span>
          </div>
          <div class="sp-pay">
            <span class="sp-pay-amount">${formatCurrency(o.weeklyPay)}<small>/sem</small></span>
            <span class="sp-pay-total">Total: ${formatCurrency(o.weeklyPay * o.duration)}</span>
          </div>
        </div>
        <div class="sp-obligation">📋 ${o.obligation}</div>
        <div class="sp-duration">⏳ ${o.duration} semanas · Expira sem. ${o.expiresWeek}</div>
        <div class="sp-actions">
          <button class="sp-btn-accept" data-sp-accept="${o.sponsorId}">✅ Assinar</button>
          <button class="sp-btn-decline" data-sp-decline="${o.sponsorId}">✗ Recusar</button>
        </div>
      </div>`) .join('')
    : `<div class="academy-empty">Nenhuma oferta no momento. Avance semanas para receber propostas.</div>`;

    const activeCards = active.length ? active.map(c => {
      const pct = Math.round((1 - c.weeksRemaining / c.duration) * 100);
      return `
      <div class="sp-card sp-active">
        <div class="sp-card-top">
          <span class="sp-icon">${c.icon}</span>
          <div class="sp-card-info">
            <strong class="sp-name">${c.name}</strong>
            <span class="sp-meta">${catLabel[c.category] || c.category} · <span style="color:${tierColor[c.tier]}">${tierLabel[c.tier]}</span></span>
          </div>
          <div class="sp-pay">
            <span class="sp-pay-amount">${formatCurrency(c.weeklyPay)}<small>/sem</small></span>
            <span class="sp-pay-weeks">${c.weeksRemaining} sem. restantes</span>
          </div>
        </div>
        <div class="sp-obligation">📋 ${c.obligation}</div>
        <div class="sp-progress-wrap">
          <div class="sp-progress-track"><div class="sp-progress-fill" style="width:${pct}%"></div></div>
          <span class="sp-progress-label">${pct}% concluído</span>
        </div>
        <div class="sp-actions">
          <button class="sp-btn-terminate" data-sp-terminate="${c.sponsorId}">Rescindir (multa: ${formatCurrency(c.weeklyPay)})</button>
        </div>
      </div>`;
    }).join('')
    : `<div class="academy-empty">Nenhum contrato ativo. Aceite uma oferta acima.</div>`;

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('sponsors')}
      <main class="academy-main">
        <div class="sp-topbar">
          <div>
            <h2 class="sp-title">Patrocinadores</h2>
            <p class="sp-sub">Vagas: ${active.length}/${slots} · ${formatCurrency(active.reduce((s,c) => s+c.weeklyPay,0))}/sem em contratos ativos</p>
          </div>
        </div>

        <section class="sp-section">
          <h3 class="sp-section-title">📨 Ofertas Pendentes <span class="sp-count">${offers.length}</span></h3>
          <div class="sp-cards">${offerCards}</div>
        </section>

        <section class="sp-section">
          <h3 class="sp-section-title">✅ Contratos Ativos <span class="sp-count">${active.length}/${slots}</span></h3>
          <div class="sp-cards">${activeCards}</div>
        </section>
      </main>
    </div>`;

    this._bindAcademyNav();

    this.root.querySelectorAll('[data-sp-accept]').forEach(btn => {
      btn.onclick = () => {
        const res = this.gs.acceptSponsor(btn.dataset.spAccept);
        if (!res.success) return this._toast(res.reason);
        this.gs.save(); this.show('academySponsors');
      };
    });
    this.root.querySelectorAll('[data-sp-decline]').forEach(btn => {
      btn.onclick = () => { this.gs.declineSponsor(btn.dataset.spDecline); this.gs.save(); this.show('academySponsors'); };
    });
    this.root.querySelectorAll('[data-sp-terminate]').forEach(btn => {
      btn.onclick = () => {
        const res = this.gs.terminateSponsor(btn.dataset.spTerminate);
        if (!res.success) return this._toast(res.reason);
        this.gs.save(); this.show('academySponsors');
      };
    });
  }

  // Academia Builder
  _render_academyBuilder() {
    const a = this.gs.academy;
    const state = this.gs.getBuilderState();
    if (!state) return;
    const { level, levelData, levelItems, levelComplete, bonuses, founderItems, legacyAthletes } = state;

    const facade = this._builderFacade(level, a.name);
    const grid = this._builderGrid(levelItems, legacyAthletes);

    const progressCount = levelItems.filter(x => x.bought).length;
    const progressPct = Math.round(progressCount / 15 * 100);

    const expandBtn = levelComplete && level < 6
      ? `<button class="builder-expand-btn" id="builder-expand">
           🏗️ Expandir para <strong>${ACADEMY_BUILDER_LEVELS[level].name}</strong>
           <span class="builder-expand-cost">${formatCurrency(levelData.expandCost)}</span>
         </button>`
      : level >= 6
        ? `<div class="builder-maxlevel">👑 Nível Máximo — Lenda do Boxe</div>`
        : `<div class="builder-progress-hint">${progressCount}/15 itens — compre todos para expandir</div>`;

    const bonusChips = Object.entries(bonuses)
      .filter(([,v]) => v !== 0)
      .map(([k, v]) => {
        const labels = { trainBonus:'Treino', injuryRisk:'Lesão', scoutBonus:'Scouting', morale:'Moral', reputation:'Reputação' };
        const neg = k === 'injuryRisk';
        const sign = neg ? (v < 0 ? '▼' : '▲') : (v > 0 ? '+' : '');
        return `<span class="builder-bonus-chip ${neg && v < 0 ? 'good' : (neg ? 'bad' : 'good')}">${labels[k] || k} ${sign}${Math.abs(v)}</span>`;
      }).join('');

    const founderSection = founderItems.length ? `
      <div class="founder-items-section">
        <div class="founder-items-head">
          <span class="founder-items-kicker">LEGADO DO FUNDADOR</span>
          <h3 class="founder-items-title">Peças exclusivas</h3>
          <p class="founder-items-sub">Itens que vieram com você da sua carreira como atleta. Não têm preço — fazem parte da história da academia.</p>
        </div>
        <div class="founder-items-grid">
          ${founderItems.map(item => {
            const effectChips = Object.entries(item.effect)
              .map(([k,v]) => {
                const labels = { trainBonus:'Treino', injuryRisk:'Lesão', scoutBonus:'Scouting', morale:'Moral', reputation:'Reputação' };
                return `<span class="founder-item-effect-chip">${labels[k]||k} +${v}</span>`;
              }).join('');
            return `<div class="founder-item-card">
              <div class="founder-item-top">
                <span class="founder-item-icon">${item.icon}</span>
                <div class="founder-item-info">
                  <strong class="founder-item-name">${item.name}</strong>
                  <span class="founder-item-condition">${item.condition}</span>
                </div>
                <span class="founder-item-badge">✦ Legado</span>
              </div>
              <p class="founder-item-desc">${item.desc}</p>
              <div class="founder-item-effects">${effectChips}</div>
            </div>`;
          }).join('')}
        </div>
      </div>` : '';

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('academyBuilder')}
      <main class="academy-main">
        <div class="builder-topbar">
          <div>
            <h2 class="builder-title">${a.name}</h2>
            <div class="builder-level-badge">Nível ${level} — ${levelData.name}</div>
          </div>
          <div class="builder-caixa">💵 ${formatCurrency(a.money)}</div>
        </div>

        ${founderSection}

        <div class="builder-layout">
          <!-- Fachada -->
          <div class="builder-facade-panel">
            <div class="builder-facade-wrap">${facade}</div>
            <div class="builder-bonuses">${bonusChips || '<span style="color:#888;font-size:.75rem">Sem bônus ainda</span>'}</div>
          </div>

          <!-- Grid de Itens -->
          <div class="builder-items-panel">
            <div class="builder-progress-bar-wrap">
              <div class="builder-progress-label">Nível ${level} — ${progressCount}/15</div>
              <div class="builder-progress-track"><div class="builder-progress-fill" style="width:${progressPct}%"></div></div>
            </div>
            ${grid}
            <div class="builder-expand-wrap">${expandBtn}</div>
          </div>
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();

    // buy item
    this.root.querySelectorAll('.builder-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = this.gs.buyBuilderItem(btn.dataset.id);
        if (!res.success) return this._toast(res.reason);
        this.gs.save(); this.show('academyBuilder');
      });
    });

    // expand
    this.root.querySelector('#builder-expand')?.addEventListener('click', () => {
      const res = this.gs.expandAcademy();
      if (!res.success) return this._toast(res.reason);
      this.gs.save(); this.show('academyBuilder');
    });
  }

  _builderFacade(level, academyName) {
    // Side-view SVG of the building facade, grows with level
    const floors = [1, 1, 2, 2, 3, 3][level - 1];
    const width = [180, 220, 260, 300, 340, 380][level - 1];
    const buildingH = floors * 70 + 30;
    const totalH = buildingH + 80; // + ground + sign area
    const roofStyles = ['flat', 'flat', 'peaked', 'peaked', 'modern', 'grand'][level - 1];
    const wallColors = ['#c8b49a', '#b0a890', '#9a9885', '#8a9480', '#7a8878', '#6a7868'][level - 1];
    const trimColors = ['#8c7a60', '#7a6e56', '#6a6448', '#5e6a50', '#4e5e48', '#3e5040'][level - 1];
    const signColors = ['#d4a800', '#c49000', '#b48020', '#a47028', '#94602e', '#845030'][level - 1];
    const levelLabels = ['🏠','🏘️','🏢','🏬','🏛️','🌟'][level - 1];

    // windows per floor based on width
    const winCols = Math.floor((width - 40) / 45);
    let windowsHTML = '';
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < winCols; c++) {
        const wx = 20 + c * 45 + 10;
        const wy = 30 + f * 70 + 20;
        const lit = Math.random() > 0.3;
        windowsHTML += `<rect x="${wx}" y="${wy}" width="22" height="26" rx="2" fill="${lit ? '#ffe87a' : '#6a7898'}" stroke="${trimColors}" stroke-width="2"/>`;
        if (lit) windowsHTML += `<rect x="${wx+2}" y="${wy+2}" width="8" height="10" fill="rgba(255,255,200,.4)"/>`;
      }
    }

    // door
    const doorX = width / 2 - 14;
    const doorY = buildingH - 36;
    const doorHTML = `
      <rect x="${doorX}" y="${doorY}" width="28" height="36" rx="3" fill="${trimColors}" stroke="#3a2a1a" stroke-width="1.5"/>
      <rect x="${doorX+4}" y="${doorY+4}" width="8" height="12" rx="1" fill="rgba(255,255,200,.5)"/>
      <rect x="${doorX+16}" y="${doorY+4}" width="8" height="12" rx="1" fill="rgba(255,255,200,.5)"/>
      <circle cx="${doorX+14}" cy="${doorY+22}" r="2.5" fill="#d4a800"/>`;

    // roof
    let roofHTML = '';
    if (roofStyles === 'peaked') {
      roofHTML = `<polygon points="${width/2},4 4,30 ${width-4},30" fill="${trimColors}" stroke="#3a2a1a" stroke-width="1.5"/>`;
    } else if (roofStyles === 'modern') {
      roofHTML = `<rect x="0" y="6" width="${width}" height="24" rx="0" fill="${trimColors}"/>
        <rect x="10" y="2" width="${width-20}" height="8" rx="2" fill="${wallColors}"/>`;
    } else if (roofStyles === 'grand') {
      roofHTML = `<rect x="0" y="4" width="${width}" height="26" rx="0" fill="${trimColors}"/>
        <rect x="-8" y="2" width="${width+16}" height="8" rx="1" fill="${trimColors}" opacity=".7"/>
        ${Array.from({length: Math.floor(width/30)}, (_,i) =>
          `<rect x="${i*30+8}" y="4" width="6" height="26" fill="${wallColors}" opacity=".3"/>`
        ).join('')}`;
    } else {
      roofHTML = `<rect x="-4" y="18" width="${width+8}" height="14" rx="2" fill="${trimColors}"/>`;
    }

    // sign
    const signW = Math.min(width - 20, academyName.length * 9 + 24);
    const signX = width / 2 - signW / 2;
    const displayName = academyName.length > 18 ? academyName.slice(0, 16) + '…' : academyName;

    // level indicator stars
    const stars = Array.from({length: level}, (_,i) =>
      `<text x="${width/2 - (level*10)/2 + i*12}" y="${totalH - 6}" font-size="10" fill="${signColors}">⭐</text>`
    ).join('');

    return `<svg viewBox="0 0 ${width} ${totalH}" xmlns="http://www.w3.org/2000/svg" class="builder-facade-svg">
      <!-- sky gradient -->
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d4e8f0"/>
          <stop offset="100%" stop-color="#e8f4e0"/>
        </linearGradient>
        <linearGradient id="wallG${level}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${wallColors}"/>
          <stop offset="100%" stop-color="${trimColors}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${totalH}" fill="url(#skyG)"/>

      <!-- ground -->
      <rect x="0" y="${buildingH+2}" width="${width}" height="30" fill="#8a9a70"/>
      <rect x="0" y="${buildingH}" width="${width}" height="4" fill="#6a7858"/>
      <!-- sidewalk -->
      <rect x="0" y="${buildingH+10}" width="${width}" height="4" fill="#c8c0a8" opacity=".6"/>

      <!-- building body -->
      <rect x="0" y="28" width="${width}" height="${buildingH - 28}" fill="url(#wallG${level})" stroke="${trimColors}" stroke-width="2"/>

      <!-- roof -->
      <g transform="translate(0, 0)">${roofHTML}</g>

      <!-- windows -->
      ${windowsHTML}

      <!-- door -->
      ${doorHTML}

      <!-- sign above door -->
      <rect x="${signX}" y="${buildingH - 68}" width="${signW}" height="28" rx="4" fill="${signColors}" stroke="#5a3a10" stroke-width="2"/>
      <text x="${width/2}" y="${buildingH - 50}" text-anchor="middle" font-family="'Courier New',monospace" font-size="11" font-weight="bold" fill="#3a2000">${displayName}</text>

      <!-- level emoji -->
      <text x="${width - 14}" y="46" text-anchor="middle" font-size="16">${levelLabels}</text>

      <!-- stars -->
      ${stars}
    </svg>`;
  }

  _builderGrid(items, legacyAthletes = []) {
    const trophyAthletes = legacyAthletes.filter(e =>
      (e.worldBelts?.length || 0) + (e.continentalBelts?.length || 0) + (e.trophies?.length || 0) > 0);
    const hallAthletes = legacyAthletes.filter(e => e.score >= 2.0);

    return `<div class="builder-grid">
      ${items.map((it, idx) => {
        // Showcase: Sala de Troféus
        if (it.bought && it.id === 'trophy_room') {
          return `<div class="builder-card bought showcase-card">
            <div class="builder-card-icon">${it.icon}</div>
            <div class="builder-card-name">${it.name}</div>
            <div class="builder-card-effect">${it.effect.replace(/([a-zA-Z]+)([+-]\d+)/, '$2 $1')}</div>
            ${trophyAthletes.length
              ? `<div class="builder-showcase-list">
                  ${trophyAthletes.slice(0,3).map(e => {
                    const flag = NAMES[e.nationality]?.flag || '';
                    const best = e.worldBelts?.length ? `🌍 ${e.worldBelts.length}× mundial` : e.continentalBelts?.length ? `🌎 Continental` : `🏅 Troféu`;
                    return `<div class="builder-showcase-row"><span>${flag} ${e.displayName}</span><span>${best}</span></div>`;
                  }).join('')}
                  ${trophyAthletes.length > 3 ? `<div class="builder-showcase-more">+${trophyAthletes.length - 3} mais</div>` : ''}
                </div>`
              : `<div class="builder-showcase-empty">Nenhum título ainda.<br>Os cinturões virão.</div>`}
          </div>`;
        }
        // Showcase: Hall da Fama
        if (it.bought && it.id === 'hall_of_fame') {
          return `<div class="builder-card bought showcase-card hall-card">
            <div class="builder-card-icon">${it.icon}</div>
            <div class="builder-card-name">${it.name}</div>
            <div class="builder-card-effect">${it.effect.replace(/([a-zA-Z]+)([+-]\d+)/, '$2 $1')}</div>
            ${hallAthletes.length
              ? `<div class="builder-showcase-list">
                  ${hallAthletes.slice(0,3).map(e => {
                    const flag = NAMES[e.nationality]?.flag || '';
                    return `<div class="builder-showcase-row"><span>${flag} ${e.displayName}</span><span>⭐ ${e.record}</span></div>`;
                  }).join('')}
                  ${hallAthletes.length > 3 ? `<div class="builder-showcase-more">+${hallAthletes.length - 3} lendas</div>` : ''}
                </div>`
              : `<div class="builder-showcase-empty">Nenhuma lenda ainda.<br>Escreva a história.</div>`}
          </div>`;
        }
        // Item comprado
        if (it.bought) {
          return `<div class="builder-card bought">
            <div class="builder-card-badge">✓</div>
            <div class="builder-card-icon">${it.icon}</div>
            <div class="builder-card-name">${it.name}</div>
            <div class="builder-card-effect">${it.effect.replace(/([a-zA-Z]+)([+-]\d+)/, '$2 $1')}</div>
          </div>`;
        }
        // Item disponível para compra
        return `<div class="builder-card available">
          <div class="builder-card-slot">${idx + 1}</div>
          <div class="builder-card-icon locked-icon">🔒</div>
          <div class="builder-card-name locked-name">???</div>
          <div class="builder-card-cost">${formatCurrency(it.cost)}</div>
          <button class="builder-buy-btn" data-id="${it.id}">
            <span>${it.icon}</span> ${it.name}
          </button>
        </div>`;
      }).join('')}
    </div>`;
  }

  // Fight Watch (manager watches athlete fight)
  _render_academyFightWatch({ pending = [], idx = 0, cornerAdvice = [] } = {}) {
    const sched   = pending[idx];
    if (!sched) return this.show('academyHub');
    const fighter  = this.gs.allFighters.find(f => f.id === sched.fighterId);
    const opponent = this.gs.allFighters.find(f => f.id === sched.opponentId);
    if (!fighter || !opponent) return this.show('academyHub');

    const importanceColors = { local:'#5a8a70', regional:'#6a7db8', nacional:'#a86a20', continental:'#8a4ab0', mundial:'#c0392b' };
    const importanceLabel  = { local:'Local', regional:'Regional', nacional:'Nacional', continental:'Continental', mundial:'Mundial ⭐' };
    const color = importanceColors[sched.importance] || '#5a8a70';

    const rounds     = fighter.wins >= 8 ? 10 : 6;
    const campFocus  = sched.campFocus || 'technique';
    const focusName  = TRAINING_FOCUSES.find(f => f.id === campFocus)?.name || campFocus;
    const campWeeks  = sched.campWeeksDone || 0;

    const adviceOptions = [
      { id: 'pressure',  label: '⚡ Aumentar pressão',   desc: 'Manda ele para cima, não dá sossego' },
      { id: 'patience',  label: '🛡️ Ser paciente',        desc: 'Esperrar a abertura, não desperdiçar energia' },
      { id: 'body',      label: '💥 Atacar o corpo',       desc: 'Acumular dano na barriga para o KO tardio' },
      { id: 'jab',       label: '🎯 Usar o jab',           desc: 'Controlar distância e ditar o ritmo' },
      { id: 'clinch',    label: '🤝 Buscar o clinch',      desc: 'Segurar nos momentos difíceis para recuperar' },
    ];

    this.root.innerHTML = `
    <div class="watch-screen">
      <div class="watch-header" style="border-bottom: 4px solid ${color}">
        <div class="watch-header-left">
          <span class="watch-importance-badge" style="background:${color}">LUTA ${importanceLabel[sched.importance]?.toUpperCase()}</span>
          <h1 class="watch-title">${fighter.name} <span style="color:#888">vs</span> ${opponent.name}</h1>
          <div class="watch-sub">${fighter.weightClassData?.name} · ${rounds} rounds · Camp: ${campWeeks} sem. de ${campFocus} (${focusName})</div>
        </div>
        <div class="watch-fighters">
          <div class="watch-fighter-card">
            <div class="watch-fighter-flag">${fighter.nationalityData?.flag || ''}</div>
            <strong>${fighter.name}</strong>
            <span>${fighter.record} · ${fighter.overall} OVR</span>
            <span class="watch-corner">🔵 SEU ATLETA</span>
          </div>
          <div class="watch-vs">VS</div>
          <div class="watch-fighter-card watch-fighter-opp">
            <div class="watch-fighter-flag">${opponent.nationalityData?.flag || ''}</div>
            <strong>${opponent.name}</strong>
            <span>${opponent.record} · ${opponent.overall} OVR</span>
            <span class="watch-corner watch-corner-opp">🔴 ADVERSÁRIO</span>
          </div>
        </div>
      </div>

      <div class="watch-body">
        <div class="watch-advice-panel">
          <h3 class="watch-advice-title">🎙️ Instrução de Corner</h3>
          <p class="watch-advice-sub">Você pode dar até 3 instruções antes e durante a luta. Cada uma aumenta levemente a chance do seu atleta.</p>
          <div class="watch-advice-grid">
            ${adviceOptions.map(opt => {
              const chosen = cornerAdvice.includes(opt.id);
              const disabled = !chosen && cornerAdvice.length >= 3;
              return `<button class="watch-advice-btn ${chosen ? 'chosen' : ''}" data-advice="${opt.id}" ${disabled ? 'disabled' : ''}>
                <strong>${opt.label}</strong>
                <small>${opt.desc}</small>
                ${chosen ? '<span class="watch-advice-check">✓</span>' : ''}
              </button>`;
            }).join('')}
          </div>
          <div class="watch-advice-count">${cornerAdvice.length}/3 instruções dadas</div>
        </div>

        <div class="watch-actions">
          <button class="watch-btn-watch" id="watch-simulate">
            ▶ Assistir luta ${pending.length > 1 ? `(${idx + 1}/${pending.length})` : ''}
          </button>
          <button class="watch-btn-skip" id="watch-skip">
            Simular automaticamente →
          </button>
        </div>
      </div>
    </div>`;

    // Toggle advice
    this.root.querySelectorAll('.watch-advice-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.advice;
        const newAdvice = cornerAdvice.includes(id)
          ? cornerAdvice.filter(a => a !== id)
          : cornerAdvice.length < 3 ? [...cornerAdvice, id] : cornerAdvice;
        this.show('academyFightWatch', { pending, idx, cornerAdvice: newAdvice });
      };
    });

    const afterFight = (result) => {
      this.gs.save();
      const nextIdx = idx + 1;
      if (nextIdx < pending.length) {
        this.show('academyFightWatch', { pending, idx: nextIdx, cornerAdvice: [] });
      } else {
        this.show('academyFightResult', { result });
      }
    };

    this.root.querySelector('#watch-simulate').onclick = () => {
      this.show('academyFightLive', { sched, pending, idx, cornerAdvice });
    };
    this.root.querySelector('#watch-skip').onclick = () => {
      const result = this.gs.simulateAcademyFight(sched.fighterId, sched.opponentId, []);
      afterFight(result);
    };
  }

  // Academy Fight Live (animated, manager POV)
  _render_academyFightLive({ sched, pending = [], idx = 0, cornerAdvice = [] } = {}) {
    if (!sched) return this.show('academyHub');
    const fighter  = this.gs.allFighters.find(f => f.id === sched.fighterId);
    const opponent = this.gs.allFighters.find(f => f.id === sched.opponentId);
    if (!fighter || !opponent) return this.show('academyHub');

    const rounds = fighter.wins >= 8 ? 10 : 6;
    const adviceBonus = Math.min(cornerAdvice.length * 0.04, 0.15);

    const engine = new LiveFightEngine(fighter, opponent, {
      rounds,
      strategy1: 'adapt',
      strategy2: pick(STRATEGIES).id,
      bonus1: { confidence: adviceBonus * 100 },
    });

    const event = sched.event || null;
    if (event && event.excitement === undefined) event.excitement = 35;

    const importanceColors = { local:'#5a8a70', regional:'#6a7db8', nacional:'#a86a20', continental:'#8a4ab0', mundial:'#c0392b' };
    const color = importanceColors[sched.importance] || '#5a8a70';
    const importanceLabel = { local:'Local', regional:'Regional', nacional:'Nacional', continental:'Continental', mundial:'Mundial ⭐' };

    const venueBar = event ? `
      <div class="fight-venue-bar">
        <span>${event.hostCity} · ${NAMES[event.hostNation]?.flag || ''}</span>
        <span>${event.attendance.toLocaleString('pt-BR')} torcedores</span>
        <span>Arena ${event.arena.globalLevel}/20</span>
        <span>${event.promoter?.name || 'Promotora local'}</span>
      </div>` : '';

    this.root.innerHTML = `
      <div class="screen fight-screen mgr-fight-screen">
        <div class="fight-top-bar" style="border-bottom: 3px solid ${color}">
          <div class="fight-event-name">🎙️ ${importanceLabel[sched.importance] || 'Luta'} — ${fighter.name} vs ${opponent.name}</div>
          <div class="fight-rounds-badge">${rounds} Rounds · ${fighter.weightClassData?.name || ''}</div>
        </div>
        ${venueBar}
        <div class="mgr-corner-tips">
          ${cornerAdvice.length
            ? `<span class="mgr-tips-label">Instruções:</span> ${cornerAdvice.map(a => `<span class="mgr-tip-chip">${a}</span>`).join('')}`
            : `<span style="color:#888;font-size:.8rem">Sem instruções de corner</span>`}
        </div>
        <div class="live-clock-bar">
          <span class="live-round" id="lv-round">ROUND 1</span>
          <span class="live-clock" id="lv-clock">3:00</span>
          <span class="live-speed">
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="2">2x</button>
            <button class="speed-btn" data-speed="4">4x</button>
          </span>
        </div>

        <canvas id="ring-canvas" width="560" height="280" class="ring-canvas"></canvas>

        <div class="live-hud">
          <div class="live-fighter">
            <div class="lvf-name">${fighter.name.split(' ')[0].toUpperCase()} <span style="font-size:.65rem;color:#4caf50">● SEU ATLETA</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="hp1" style="width:100%;background:#2ecc71"></div></div>
            <div class="bar-label-row"><span>HP</span><span id="hp1t">100%</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="st1" style="width:100%;background:#f4a261"></div></div>
            <div class="bar-label-row"><span>STM</span><span id="st1t">100%</span></div>
            <div class="kd-count" id="kd1"></div>
          </div>
          <div class="live-vs">VS</div>
          <div class="live-fighter">
            <div class="lvf-name">${opponent.name.split(' ')[0].toUpperCase()}</div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="hp2" style="width:100%;background:#2ecc71"></div></div>
            <div class="bar-label-row"><span>HP</span><span id="hp2t">100%</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="st2" style="width:100%;background:#f4a261"></div></div>
            <div class="bar-label-row"><span>STM</span><span id="st2t">100%</span></div>
            <div class="kd-count" id="kd2"></div>
          </div>
        </div>

        <div class="live-feed" id="live-feed">
          <div class="commentary-line">🔔 ${fighter.name.split(' ')[0]} vs ${opponent.name.split(' ')[0]} — COMEÇA A LUTA!</div>
        </div>

        <div id="corner-panel" class="corner-panel" style="display:none"></div>
        <div id="end-panel"    class="corner-panel" style="display:none"></div>
        <div class="scorecard" id="lv-scorecard" style="display:none"></div>
      </div>`;

    const canvas = document.getElementById('ring-canvas');
    this.fightAnim = new RingAnimation(canvas, fighter, opponent);
    this.fightAnim.eventDriven = true;
    this.fightAnim.setIntensity(0.35);
    if (event?.arena) this.fightAnim.setArena(event.arena);
    else this.fightAnim.setCrowdSize(this.gs.calcCrowdLevel(sched, fighter, opponent));
    this.fightAnim.start();

    const feed = document.getElementById('live-feed');
    const addLine = (text, cls = '') => {
      if (!text) return;
      const div = document.createElement('div');
      div.className = 'commentary-line ' + cls;
      const t = Math.max(0, engine.roundLen - engine.clock);
      const mm = Math.floor(t / 60), ss = Math.floor(t % 60).toString().padStart(2, '0');
      div.innerHTML = `<span class="feed-time">R${engine.round} ${mm}:${ss}</span> ${text}`;
      feed.prepend(div);
      while (feed.children.length > 30) feed.removeChild(feed.lastChild);
    };

    const updateBars = () => {
      const set = (id, val, isHp) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.width = val + '%';
        if (isHp) el.style.background = val < 30 ? '#e63946' : '#2ecc71';
        const t = document.getElementById(id + 't');
        if (t) t.textContent = Math.round(val) + '%';
      };
      set('hp1', engine.s1.hp, true);  set('st1', engine.s1.stamina, false);
      set('hp2', engine.s2.hp, true);  set('st2', engine.s2.stamina, false);
      const k1 = document.getElementById('kd1'), k2 = document.getElementById('kd2');
      if (k1) k1.textContent = engine.s1.knockdowns ? '⬇️'.repeat(engine.s1.knockdowns) : '';
      if (k2) k2.textContent = engine.s2.knockdowns ? '⬇️'.repeat(engine.s2.knockdowns) : '';
    };

    const updateClock = () => {
      const remaining = Math.max(0, engine.roundLen - engine.clock);
      const mm = Math.floor(remaining / 60), ss = Math.floor(remaining % 60).toString().padStart(2, '0');
      const c = document.getElementById('lv-clock'); if (c) c.textContent = `${mm}:${ss}`;
      const rd = document.getElementById('lv-round'); if (rd) rd.textContent = `ROUND ${engine.round}`;
    };

    const renderScorecard = () => {
      const sc = document.getElementById('lv-scorecard');
      if (!sc || engine.roundScores.length === 0) return;
      sc.style.display = 'block';
      let t1 = 0, t2 = 0;
      sc.innerHTML = `<table>
        <tr><th>Rd</th><th>${fighter.name.split(' ')[0]}</th><th>${opponent.name.split(' ')[0]}</th></tr>
        ${engine.roundScores.map(r => {
          t1 += r.s1; t2 += r.s2;
          return `<tr><td>${r.round}</td><td class="${r.s1 > r.s2 ? 'sc-win' : ''}">${r.s1}</td><td class="${r.s2 > r.s1 ? 'sc-win' : ''}">${r.s2}</td></tr>`;
        }).join('')}
        <tr class="sc-total"><td>Total</td><td>${t1}</td><td>${t2}</td></tr>
      </table>`;
    };

    // Corner entre rounds: manager não troca estratégia, só observa
    const showCorner = (ev) => {
      const panel = document.getElementById('corner-panel');
      const roundDamage = (ev.dmg1 || 0) + (ev.dmg2 || 0);
      if (roundDamage >= 16) {
        if (event) event.excitement = clamp(event.excitement + 6, 0, 100);
        this.fightAnim.reactCrowd(roundDamage >= 22);
      } else if (roundDamage < 5) {
        if (event) event.excitement = clamp(event.excitement - 6, 0, 100);
        this.fightAnim.booCrowd();
      }
      panel.style.display = 'block';
      panel.innerHTML = `
        <div class="corner-title">🪑 CORNER — Fim do Round ${ev.round}</div>
        <p class="corner-summary">${ev.text}</p>
        <p class="muted" style="color:#888;font-size:.85rem">Você está no corner. Observe e aguarde o próximo round.</p>
        <button class="btn btn-primary btn-lg" id="btn-bell">🔔 Próximo Round</button>
      `;
      document.getElementById('btn-bell').onclick = () => {
        panel.style.display = 'none';
        this.fightAnim.resetRound();
        engine.startNextRound();
      };
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const afterFight = (result) => {
      this.gs.save();
      const nextIdx = idx + 1;
      if (nextIdx < pending.length) {
        this.show('academyFightWatch', { pending, idx: nextIdx, cornerAdvice: [] });
      } else {
        this.show('academyFightResult', { result });
      }
    };

    const showEnd = (engineResult) => {
      if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
      const panel = document.getElementById('end-panel');
      panel.style.display = 'block';
      const won = engineResult.winnerFighter?.id === fighter.id;
      if (engineResult.isControversial) this.fightAnim.reactCrowd(true);
      panel.innerHTML = `
        <div class="corner-title">${engineResult.isDraw ? '🤝 EMPATE' : won ? '🏆 VITÓRIA!' : '💔 DERROTA'}</div>
        <p class="corner-summary">${engineResult.method}${!engineResult.isDraw ? ` — Round ${engineResult.round}` : ''}</p>
        <button class="btn btn-primary btn-lg" id="btn-result">Ver Resultado →</button>
      `;
      document.getElementById('btn-result').onclick = () => {
        // Simulate through career.js to apply stat changes and get purse
        const result = this.gs.simulateAcademyFight(sched.fighterId, sched.opponentId, cornerAdvice, engineResult);
        afterFight(result);
      };
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const startCountdown = (who) => {
      const kd = engine._pendingKD;
      if (!kd) return;
      const screen = document.querySelector('.fight-screen');
      const overlay = document.createElement('div');
      overlay.className = 'kd-overlay';
      overlay.innerHTML = `<div class="kd-count-num" id="kd-count-num">1</div><div class="kd-count-label">CONTAGEM</div><div class="kd-fighter-name">${kd.bName.toUpperCase()} ESTÁ NO CHÃO</div>`;
      screen.appendChild(overlay);
      let count = 0;
      const delay = () => Math.max(80, 600 / this.fightSpeed);
      const step = () => {
        count++;
        const el = document.getElementById('kd-count-num');
        if (el) { el.textContent = count; el.classList.remove('kd-pulse'); void el.offsetWidth; el.classList.add('kd-pulse'); }
        if (count >= 5) {
          const perCountChance = 1 - Math.pow(1 - kd.getUpChance, 1 / 6);
          if (Math.random() < perCountChance) {
            overlay.remove();
            engine.resolveKnockdown(true);
            if (engine.phase === 'over') return;
            this.fightTimer = setInterval(() => { engine.tick(0.6 * this.fightSpeed); updateClock(); updateBars(); }, 100);
            return;
          }
        }
        if (count >= 10) { overlay.remove(); engine.resolveKnockdown(false); return; }
        setTimeout(step, delay());
      };
      setTimeout(step, delay());
    };

    engine.on(ev => {
      switch (ev.type) {
        case 'punch':
          this.fightAnim.punch(ev.who, ev.big);
          if (event) event.excitement = clamp(event.excitement + (ev.big ? 3 : 0.25), 0, 100);
          if (ev.text) addLine(ev.text, ev.big ? 'feed-big' : '');
          break;
        case 'miss':     if (ev.text) addLine(ev.text, 'feed-muted'); break;
        case 'knockdown':
          this.fightAnim.knockdown(ev.who);
          if (event) event.excitement = clamp(event.excitement + 14, 0, 100);
          addLine(ev.text, 'feed-kd');
          if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
          setTimeout(() => startCountdown(ev.who), 400);
          break;
        case 'getup':    this.fightAnim.getUp(ev.who); addLine(ev.text, 'feed-kd'); break;
        case 'ko':
          this.fightAnim.ko(ev.who);
          if (event) event.excitement = clamp(event.excitement + 18, 0, 100);
          addLine(ev.text, 'feed-kd');
          break;
        case 'comment':  addLine(ev.text, 'feed-muted'); break;
        case 'roundEnd':
          addLine(ev.text, 'feed-round');
          renderScorecard();
          this.fightAnim.enterCorner();
          showCorner(ev);
          break;
        case 'roundStart': addLine(ev.text, 'feed-round'); break;
        case 'fightEnd':
          if (event && ev.result?.isControversial) event.excitement = clamp(event.excitement + 8, 0, 100);
          renderScorecard();
          showEnd(ev.result);
          break;
      }
      updateBars();
    });

    this.fightSpeed = 1;
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.fightSpeed = parseInt(btn.dataset.speed);
      };
    });

    this.fightTimer = setInterval(() => { engine.tick(0.6 * this.fightSpeed); updateClock(); updateBars(); }, 100);
  }

  _render_academyFightResult({ result } = {}) {
    if (!result) return this.show('academyHub');
    const { fighter, opponent, won, method, round, purse, academyCut } = result;
    const color = won ? '#176b5b' : '#c0392b';
    const icon  = won ? '✅' : '❌';

    this.root.innerHTML = `
    <div class="watch-screen">
      <div class="watch-header" style="border-bottom: 4px solid ${color}; text-align:center; padding: 40px 24px">
        <div style="font-size:4rem; margin-bottom:12px">${icon}</div>
        <h1 class="watch-title" style="color:${color}">${won ? 'VITÓRIA!' : 'DERROTA'}</h1>
        <p style="font-size:1.1rem; color:#444; margin:8px 0">${fighter?.name} ${won ? 'venceu' : 'perdeu para'} ${opponent?.name}</p>
        <p style="color:#888">${method} · Round ${round}</p>
      </div>
      <div class="watch-body" style="max-width:480px; margin:0 auto; padding:32px 24px">
        <div class="watch-result-row"><span>Bolsa do atleta</span><strong>${formatCurrency(purse)}</strong></div>
        <div class="watch-result-row"><span>Corte da academia (12%)</span><strong style="color:${color}">+${formatCurrency(academyCut)}</strong></div>
        <div class="watch-result-row"><span>Cartel após a luta</span><strong>${fighter?.record || '—'}</strong></div>
        <button class="watch-btn-watch" id="result-continue" style="margin-top:24px; width:100%">Continuar →</button>
      </div>
    </div>`;

    this.root.querySelector('#result-continue').onclick = () => this.show('academyHub');
  }

  _render_academyManagement({ tab = 'staff' } = {}) {
    const a = this.gs.academy;
    const staffBonus = this.gs.getAcademyStaffBonus();
    const budget = this.gs.academyWeeklyBudget();
    const exposure = this.gs.getShadowExposureRisk();

    // Staff tab
    const staffRows = ACADEMY_STAFF.map(role => {
      const current = a.staff[role.id] || 0;
      const currentTier = role.tiers.find(t => t.tier === current);
      const nextTier    = role.tiers.find(t => t.tier === current + 1);
      const signingFee  = nextTier ? nextTier.salary * (current === 0 ? 4 : 2) : 0;
      const canAfford   = nextTier && a.money >= signingFee;
      return `<div class="mgmt-card ${current > 0 ? 'mgmt-card-active' : ''}">
        <div class="mgmt-card-head">
          <span class="mgmt-icon">${role.icon}</span>
          <div>
            <strong class="mgmt-name">${role.name}</strong>
            <small>${role.desc}</small>
          </div>
          ${current > 0 ? `<span class="mgmt-badge mgmt-badge-hired">Tier ${current} · ${currentTier?.label}</span>` : `<span class="mgmt-badge">Vago</span>`}
        </div>
        <div class="mgmt-tiers">
          ${role.tiers.map(t => {
            const active  = current === t.tier;
            const past    = current > t.tier;
            const bonusTxt = Object.entries(t.bonus || {})
              .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${typeof v === 'number' && Math.abs(v) < 1 ? Math.round(v*100)+'%' : v}`)
              .join(' · ');
            return `<div class="mgmt-tier ${active ? 'active' : ''} ${past ? 'past' : ''}">
              <span class="mgmt-tier-label">${t.label}</span>
              <span class="mgmt-tier-salary">${formatCurrency(t.salary)}/sem.</span>
              <span class="mgmt-tier-bonus">${bonusTxt}</span>
              ${!past && !active && nextTier?.tier === t.tier ? `<button class="academy-btn academy-btn-primary mgmt-hire" data-role="${role.id}" data-tier="${t.tier}" ${!canAfford ? 'disabled' : ''}>
                ${current === 0 ? 'Contratar' : 'Promover'} · ${formatCurrency(signingFee)}
              </button>` : ''}
            </div>`;
          }).join('')}
        </div>
        ${current > 0 ? `<button class="academy-btn mgmt-fire" data-role="${role.id}">Dispensar</button>` : ''}
      </div>`;
    }).join('');

    // Upgrades tab
    const upgradeCards = ACADEMY_UPGRADES.map(upg => {
      const currentLvl  = a.upgrades[upg.id] || 1;
      const currentData = upg.levels.find(l => l.level === currentLvl);
      const nextData    = upg.levels.find(l => l.level === currentLvl + 1);
      const canAfford   = nextData && a.money >= nextData.cost;
      return `<div class="mgmt-upgrade-card">
        <div class="mgmt-upgrade-head">
          <span class="mgmt-icon">${upg.icon}</span>
          <div>
            <strong>${upg.name}</strong>
            <small>${upg.desc}</small>
          </div>
          <span class="mgmt-badge">${currentData?.label || 'Nível 1'}</span>
        </div>
        <div class="mgmt-upgrade-levels">
          ${upg.levels.map(l => {
            const done = currentLvl >= l.level;
            const eff  = Object.entries(l.effect || {}).filter(([k]) => !['canHostEvents','eventCap','maxRosterBonus'].includes(k))
              .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${typeof v === 'number' && Math.abs(v) < 1 ? Math.round(v*100)+'%' : v}`)
              .join(' · ');
            return `<div class="mgmt-level-row ${done ? 'done' : ''}">
              <span>${done ? '✓' : '○'} ${l.label}</span>
              <span class="mgmt-eff">${eff || (l.effect?.canHostEvents ? `Arena ${l.effect.eventCap} pessoas` : l.effect?.maxRosterBonus ? `+${l.effect.maxRosterBonus} vagas` : '—')}</span>
              ${!done && nextData?.level === l.level ? `<button class="academy-btn academy-btn-primary mgmt-upgrade" data-upgrade="${upg.id}" ${!canAfford ? 'disabled' : ''}>${formatCurrency(l.cost)}</button>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');

    // Shadow Economy tab
    const exposureColor = exposure >= 70 ? '#c0392b' : exposure >= 40 ? '#d4a017' : '#176b5b';
    const shadowCards = ACADEMY_SHADOW_ECONOMY.map(action => {
      const isActive = !!a.activeIllegal?.[action.id];
      const cost     = action.cost ? formatCurrency(action.cost) : action.costPerWeek ? formatCurrency(action.costPerWeek)+'/sem.' : formatCurrency(Math.round((action.costPercent||0.3)*1000))+'+ % da bolsa';
      const effTxt   = Object.entries(action.effect || {})
        .map(([k, v]) => k === 'winChance' ? `${Math.round(v*100)}% chance vitória` : k === 'returnMult' ? `retorno ${v}x` : k === 'trainGainMult' ? `treino x${v}` : k === 'purseBonus' ? `+${Math.round(v*100)}% bolsa` : k === 'decisionFlip' ? 'decisão revertida' : `${k} +${v}`)
        .join(' · ');
      return `<div class="mgmt-shadow-card ${isActive ? 'mgmt-shadow-active' : ''}">
        <div class="mgmt-shadow-head">
          <span class="mgmt-icon">${action.icon}</span>
          <div>
            <strong>${action.name}</strong>
            <small>${action.desc}</small>
          </div>
          ${isActive ? '<span class="mgmt-badge mgmt-badge-active">ATIVO ⚠️</span>' : ''}
        </div>
        <div class="mgmt-shadow-meta">
          <span>💰 ${cost}</span>
          <span>✨ ${effTxt}</span>
          <span>⚠️ Risco descoberta: ${Math.round(action.risk*100)}%</span>
          <span>☢️ Exposição: +${action.exposure}</span>
        </div>
        <div class="mgmt-shadow-scandal">
          Se descoberto: −${action.scandal.repLoss} rep${action.scandal.fine ? ` · multa ${formatCurrency(action.scandal.fine)}` : ''}${action.scandal.suspensionWeeks ? ` · ${action.scandal.suspensionWeeks}s suspensão` : ''}
        </div>
        <div class="mgmt-shadow-actions">
          ${isActive
            ? `<button class="academy-btn academy-btn-quiet mgmt-stop-illegal" data-action="${action.id}">Parar atividade</button>`
            : `<button class="academy-btn mgmt-start-illegal" data-action="${action.id}" style="background:#8b3434;color:white;border-color:#8b3434">Iniciar · ${action.cost ? formatCurrency(action.cost) : 'custo variável'}</button>`}
        </div>
      </div>`;
    }).join('');

    // Events tab
    const arenaLvl  = a.upgrades?.arena || 1;
    const arenaData = ACADEMY_UPGRADES.find(u => u.id === 'arena')?.levels.find(l => l.level === arenaLvl);
    const eventCards = ACADEMY_EVENT_TYPES.map(ev => {
      const canHost   = ev.capacityRequired === 0 || (arenaData?.effect?.canHostEvents && arenaData.effect.eventCap >= ev.capacityRequired);
      const canAfford = a.money >= ev.cost;
      const pastCount = (a.hostedEvents || []).filter(e => e.typeId === ev.id).length;
      return `<div class="mgmt-event-card ${!canHost ? 'mgmt-card-locked' : ''}">
        <div class="mgmt-card-head">
          <span class="mgmt-icon">${ev.icon}</span>
          <div>
            <strong>${ev.name}</strong>
            <small>${ev.desc}</small>
          </div>
          ${pastCount ? `<span class="mgmt-badge">${pastCount}× realizado</span>` : ''}
        </div>
        <div class="mgmt-event-meta">
          <span>💰 Custo: ${formatCurrency(ev.cost)}</span>
          <span>📈 Receita: ~${formatCurrency(ev.revenueBase)}</span>
          <span>⭐ +${ev.repGain} rep</span>
          ${ev.capacityRequired > 0 ? `<span class="mgmt-req ${!canHost ? 'mgmt-req-fail' : ''}">Arena ≥ ${ev.capacityRequired} pessoas</span>` : ''}
        </div>
        ${canHost
          ? `<button class="academy-btn academy-btn-primary mgmt-host-event" data-event="${ev.id}" ${!canAfford ? 'disabled title="Caixa insuficiente"' : ''}>${formatCurrency(ev.cost)} · Organizar</button>`
          : `<button class="academy-btn" disabled>Upgrade Arena necessário</button>`}
      </div>`;
    }).join('');

    // Transfer tab
    const roster = this.gs.getAcademyRoster();
    const transferRows = roster.map(f => {
      const val  = this.gs.getAthleteTransferValue(f.id);
      const rank = this.gs.rankings?.[f.weightClass]?.findIndex?.(r => r.fighter?.id === f.id);
      const rankTxt = rank >= 0 ? `#${rank+1}` : 'N/R';
      return `<div class="mgmt-transfer-row">
        <div class="mgmt-transfer-info">
          <span>${f.nationalityData?.flag||''}</span>
          <div><strong>${f.name}</strong><small>${f.age}a · ${f.record} · ${f.weightClassData?.name} · ${rankTxt}</small></div>
        </div>
        <div class="mgmt-transfer-val">
          <strong class="pos">${formatCurrency(val)}</strong>
          <button class="academy-btn academy-btn-primary mgmt-transfer-btn" data-fighter="${f.id}">Transferir</button>
        </div>
      </div>`;
    }).join('');

    const tabs = [
      ['staff',    '👥 Staff'],
      ['upgrades', '🏗️ Instalações'],
      ['events',   '🎟️ Eventos'],
      ['shadow',   '🌑 Underground'],
      ['transfers','💼 Transferências'],
    ];

    this.root.innerHTML = `
    <div class="academy-app">
      ${this._academyNav('management')}
      <main class="academy-main">
        <div class="ah-topbar">
          <div class="ah-topbar-left">
            <div class="ah-week-badge">🏗️ ADMINISTRAÇÃO</div>
            <h1 class="ah-title">Gestão da Academia</h1>
            <p class="ah-subtitle">Staff técnico · Infraestrutura · Eventos · Mercado de transferências</p>
          </div>
          <div class="mgmt-summary">
            <span>Salários/sem.: <strong>${formatCurrency(budget.staffCost + budget.wages)}</strong></span>
            <span>Caixa: <strong class="${a.money < 20000 ? 'neg' : 'pos'}">${formatCurrency(a.money)}</strong></span>
          </div>
        </div>

        <div class="mgmt-tabs">
          ${tabs.map(([id, label]) => `<button class="mgmt-tab ${tab === id ? 'active' : ''}" data-mgmt-tab="${id}">${label}</button>`).join('')}
        </div>

        <div class="mgmt-content">
          ${tab === 'staff'     ? `<div class="mgmt-staff-grid">${staffRows}</div>` : ''}
          ${tab === 'upgrades'  ? `<div class="mgmt-upgrade-grid">${upgradeCards}</div>` : ''}
          ${tab === 'events'    ? `<div class="mgmt-event-grid">${eventCards}</div>` : ''}
          ${tab === 'shadow'    ? `
            <div class="mgmt-shadow-warning">
              <div class="mgmt-exposure-bar">
                <span>☢️ Nível de Exposição</span>
                <div class="mgmt-exp-track"><div class="mgmt-exp-fill" style="width:${exposure}%;background:${exposureColor}"></div></div>
                <strong style="color:${exposureColor}">${Math.round(exposure)}%</strong>
              </div>
              <p>Atividades ilegais aumentam o risco de escândalos. A cada semana existe uma chance de ser descoberto. <strong>Use com cautela.</strong></p>
            </div>
            <div class="mgmt-shadow-grid">${shadowCards}</div>
            ${a.shadowHistory?.length ? `
            <div class="ah-panel" style="margin-top:14px">
              <div class="ah-panel-head"><span class="ah-label">HISTÓRICO</span><h2>Escândalos passados</h2></div>
              ${a.shadowHistory.slice(0,5).map(h => `<div class="ah-news-row"><small>${h.year} S${h.week}</small><span>${h.headline}</span></div>`).join('')}
            </div>` : ''}` : ''}
          ${tab === 'transfers' ? `
            <div class="ah-panel">
              <div class="ah-panel-head"><span class="ah-label">MERCADO</span><h2>Transferências de atletas</h2></div>
              ${roster.length ? transferRows : '<div class="academy-empty">Nenhum atleta no elenco.</div>'}
            </div>` : ''}
        </div>
      </main>
    </div>`;

    this._bindAcademyNav();
    document.querySelectorAll('.mgmt-tab').forEach(btn => btn.onclick = () =>
      this.show('academyManagement', { tab: btn.dataset.mgmtTab }));
    document.querySelectorAll('.mgmt-hire').forEach(btn => btn.onclick = () => {
      const result = this.gs.hireAcademyStaff(btn.dataset.role, Number(btn.dataset.tier));
      if (!result.success) return this._toast(result.reason);
      this.gs.save(); this.show('academyManagement', { tab: 'staff' });
    });
    document.querySelectorAll('.mgmt-fire').forEach(btn => btn.onclick = () => {
      if (!confirm('Dispensar este membro?')) return;
      this.gs.fireAcademyStaff(btn.dataset.role); this.gs.save(); this.show('academyManagement', { tab: 'staff' });
    });
    document.querySelectorAll('.mgmt-upgrade').forEach(btn => btn.onclick = () => {
      const result = this.gs.buyAcademyUpgrade(btn.dataset.upgrade);
      if (!result.success) return this._toast(result.reason);
      this.gs.save(); this.show('academyManagement', { tab: 'upgrades' });
    });
    document.querySelectorAll('.mgmt-host-event').forEach(btn => btn.onclick = () => {
      const result = this.gs.hostAcademyEvent(btn.dataset.event);
      if (!result.success) return this._toast(result.reason);
      this.gs.save();
      this._toast(`Evento realizado! Receita: ${formatCurrency(result.revenue)} · +${result.repGain} rep`);
      this.show('academyManagement', { tab: 'events' });
    });
    document.querySelectorAll('.mgmt-start-illegal').forEach(btn => btn.onclick = () => {
      if (!confirm(`⚠️ Iniciar "${btn.closest('.mgmt-shadow-card').querySelector('strong').textContent}"?\n\nIsto é ilegal. Se descoberto, pode gerar multas, suspensões e danos à reputação.`)) return;
      const result = this.gs.startIllegalAction(btn.dataset.action);
      if (!result.success) return this._toast(result.reason);
      this.gs.save(); this.show('academyManagement', { tab: 'shadow' });
    });
    document.querySelectorAll('.mgmt-stop-illegal').forEach(btn => btn.onclick = () => {
      this.gs.stopIllegalAction(btn.dataset.action); this.gs.save(); this.show('academyManagement', { tab: 'shadow' });
    });
    document.querySelectorAll('.mgmt-transfer-btn').forEach(btn => btn.onclick = () => {
      const f = this.gs.allFighters.find(x => x.id === Number(btn.dataset.fighter));
      if (!confirm(`Transferir ${f?.name}? Você receberá o valor de mercado mas perde o atleta.`)) return;
      const result = this.gs.transferAthlete(Number(btn.dataset.fighter));
      if (!result.success) return this._toast(result.reason);
      this.gs.save();
      this._toast(`${f?.name} transferido por ${formatCurrency(result.value)}!`);
      this.show('academyManagement', { tab: 'transfers' });
    });
  }

  _render_careerHub() {
    const p    = this.gs.player;
    const rank = this.gs.getPlayerRanking();
    const news = this.gs.news.slice(0, 8);
    const fans = this.newsGen.getFanComments(4);
    const weeklyCost = this.gs.staffWeeklyCost();

    this.root.innerHTML = `
      <div class="screen hub-screen">
        <div class="hub-header">
          <div class="hub-date-bar">📅 ${this.gs.dateString} &nbsp;·&nbsp; Semana ${this.gs.week}</div>
          <div class="hub-fighter-info">
            <div class="hub-avatar">${this._styleIcon(p.styleId)}</div>
            <div class="hub-name-block">
              <div class="hub-fighter-name">${p.displayName}</div>
              <div class="hub-fighter-sub">
                ${p.nationalityData?.flag || ''} ${p.nationalityData?.nation || ''} · ${p.weightClassData?.name || ''}
                ${(() => {
                const wb = (p.belts || []).filter(b => WORLD_ORGS.includes(b));
                if (wb.length >= 4) return ' · <span class="badge-champ badge-undisputed">👑 INDISCUTÍVEL</span>';
                if (wb.length === 3) return ' · <span class="badge-champ badge-super">🌟 SUPER CAMPEÃO</span>';
                if (wb.length === 2) return ' · <span class="badge-champ badge-unified">🏅 UNIFICADO</span>';
                if (wb.length === 1) return ' · <span class="badge-champ">🏆 CAMPEÃO</span>';
                return '';
              })()}
              </div>
              <div class="hub-record">${p.record} · ${p.kos + p.tkos > 0 ? (p.kos+p.tkos) + ' KOs' : ''}</div>
              ${((p.belts || []).length || (p.trophies || []).length) ? `
                <div class="hub-belts">
                  ${(p.belts || []).map(b => { const bi = getBeltInfo(b); const isSuper = (p.superBelts || []).includes(b); const dn = bi.displayName || bi.name; return `<span class="belt-chip ${isSuper ? 'belt-chip-super' : ''}" style="border-color:${bi.color}">${isSuper ? '✨' : bi.icon} ${dn}${isSuper ? ` (${p.beltDefenses[b]} def.)` : ''}</span>`; }).join('')}
                  ${(p.trophies || []).length ? `<span class="belt-chip" style="border-color:#b8860b;font-size:0.82em">🏅 ${p.trophies.length} troféu${p.trophies.length > 1 ? 's' : ''}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="hub-stats-row">
            ${this._statChip('RANKING', rank ? `#${rank}` : 'Fora')}
            ${this._statChip('OVERALL', p.overall)}
            ${this._statChip('MORAL', `${p.morale}%`)}
            ${this._statChip('DINHEIRO', formatCurrency(p.money))}
            ${this._statChip('DESPESAS', weeklyCost > 0 ? formatCurrency(weeklyCost) + '/sem' : '—')}
            ${this._statChip('IDADE', `${p.age} anos`)}
            ${this._statChip('FORMA', p.conditioningStatus)}
            ${this._statChip('DESGASTE', `${p.retirementRisk}%`)}
          </div>
        </div>

        <div class="hub-body">
          <!-- Actions -->
          <div class="hub-actions">

            <div class="hub-group hub-group-primary">
              <div class="hub-group-label">Próximos Passos</div>
              <button class="action-btn action-primary" id="btn-train">
                <span class="action-icon">💪</span>
                <div>
                  <div class="action-title">Treinar</div>
                  <div class="action-sub">Melhorar atributos antes da próxima luta</div>
                </div>
              </button>
              <button class="action-btn action-primary" id="btn-fights">
                <span class="action-icon">🥊</span>
                <div>
                  <div class="action-title">${
                    this.gs.activeTournament ? `🏆 Torneio: ${this.gs.activeTournament.rounds[this.gs.activeTournament.currentRound]}`
                    : this.gs.nextFight ? 'Continuar Luta Marcada' : 'Escolher Luta'
                  }</div>
                  <div class="action-sub">${
                    this.gs.activeTournament ? `${this.gs.activeTournament.name} · vs ${this.gs.nextFight?.opponent?.name || '—'}`
                    : this.gs.nextFight ? `Contra ${this.gs.nextFight.opponent.name} · ${this.gs.nextFight.rounds} rounds`
                    : `${this.gs.availableFights.length} lutas disponíveis`
                  }</div>
                </div>
              </button>
              ${this.gs.tournamentOffers?.length ? `
              <button class="action-btn action-warn" id="btn-tourn-offers">
                <span class="action-icon">🏆</span>
                <div>
                  <div class="action-title">Convite de Torneio</div>
                  <div class="action-sub">${this.gs.tournamentOffers[0].name}</div>
                </div>
              </button>` : ''}
              ${this.gs.incomingChallenges.length ? `
                <button class="action-btn action-alert" id="btn-challenges">
                  <span class="action-icon">📨</span>
                  <div>
                    <div class="action-title">Desafios Recebidos</div>
                    <div class="action-sub">${this.gs.incomingChallenges.length} proposta(s) aguardando resposta</div>
                  </div>
                </button>
              ` : ''}
              ${this.gs.mediaCrisis ? `
                <button class="action-btn action-alert" id="btn-media-crisis">
                  <span class="action-icon">⚠️</span>
                  <div>
                    <div class="action-title">Crise de Imagem</div>
                    <div class="action-sub">A imprensa aguarda uma resposta pública</div>
                  </div>
                </button>
              ` : ''}
            </div>

            <div class="hub-group">
              <div class="hub-group-label">Gestão</div>
              <button class="action-btn" id="btn-team">
                <span class="action-icon">👥</span>
                <div>
                  <div class="action-title">Equipe</div>
                  <div class="action-sub">${Object.keys(this.gs.staff).length} contratado(s) · ${weeklyCost > 0 ? formatCurrency(weeklyCost) + '/sem' : 'sem custos'}</div>
                </div>
              </button>
              <button class="action-btn" id="btn-contracts">
                <span class="action-icon">📄</span>
                <div>
                  <div class="action-title">Contratos e Promotores</div>
                  <div class="action-sub">${p.contract?.fightsRemaining > 0
                    ? `${p.contract.promoterName} · ${p.contract.fightsRemaining} luta(s)`
                    : 'Livre para negociar'}</div>
                </div>
              </button>
              <button class="action-btn ${p.weightTransition ? 'action-alert' : ''}" id="btn-weight-class">
                <span class="action-icon">⚖️</span>
                <div>
                  <div class="action-title">Mudar de Divisão</div>
                  <div class="action-sub">${p.weightTransition
                    ? `${p.weightTransition.weeksRemaining} sem. de adaptação restantes`
                    : `${p.weightClassData?.name || ''} · categorias adjacentes`}</div>
                </div>
              </button>
              <button class="action-btn" id="btn-invest">
                <span class="action-icon">💰</span>
                <div>
                  <div class="action-title">Investimentos</div>
                  <div class="action-sub">${GYM_LEVELS[p.gym?.level || 0].icon} ${GYM_LEVELS[p.gym?.level || 0].name}</div>
                </div>
              </button>
            </div>

            <div class="hub-group hub-group-info">
              <div class="hub-group-label">Consultar</div>
              <button class="action-btn action-info" id="btn-rankings">
                <span class="action-icon">📊</span>
                <div><div class="action-title">Rankings</div></div>
              </button>
              <button class="action-btn action-info" id="btn-stats">
                <span class="action-icon">📋</span>
                <div><div class="action-title">Ficha do Atleta</div><div class="action-sub">OVR ${p.overall}</div></div>
              </button>
              <button class="action-btn action-info ${(this.gs.rivals||[]).filter(r=>r.intensity>=2).length ? 'action-alert' : ''}" id="btn-rivals">
                <span class="action-icon">⚔️</span>
                <div><div class="action-title">Rivalidades</div><div class="action-sub">${(() => {
                  const hot = (this.gs.rivals || []).filter(r => r.intensity >= 2);
                  return hot.length ? `${hot.length} rival${hot.length > 1 ? 'es' : ''} ativo${hot.length > 1 ? 's' : ''}` : 'Nenhuma ativa';
                })()}</div></div>
              </button>
              <button class="action-btn action-info" id="btn-history">
                <span class="action-icon">📖</span>
                <div><div class="action-title">Histórico de Lutas</div></div>
              </button>
              <button class="action-btn action-info" id="btn-show">
                <span class="action-icon">🎙️</span>
                <div><div class="action-title">No Centro do Ringue</div></div>
              </button>
              <button class="action-btn action-info" id="btn-news">
                <span class="action-icon">📰</span>
                <div><div class="action-title">Central de Notícias</div><div class="action-sub">${this.gs.news.length} matérias</div></div>
              </button>
              ${!this.gs.incomingChallenges.length ? `
                <button class="action-btn action-info" id="btn-challenges">
                  <span class="action-icon">📨</span>
                  <div><div class="action-title">Desafios Recebidos</div><div class="action-sub">${rank && rank <= 20 ? 'Sua posição atrai adversários' : 'Chegue ao top 20'}</div></div>
                </button>
              ` : ''}
              <button class="action-btn action-info" id="btn-legacy">
                <span class="action-icon">🏛️</span>
                <div><div class="action-title">Legado</div><div class="action-sub">Pontuação GOAT e conquistas</div></div>
              </button>
            </div>

          </div>

          <!-- Right: News + Fans -->
          <div class="hub-right">
            <div class="hub-section">
              <h3>📰 Últimas Notícias</h3>
              <div class="news-list">
                ${news.length ? news.map(n => {
                  const scopeTag = {
                    local:       '<span class="news-scope scope-local">📍 Local</span>',
                    regional:    '<span class="news-scope scope-regional">🗺️ Regional</span>',
                    national:    '<span class="news-scope scope-national">🏳️ Nacional</span>',
                    continental: '<span class="news-scope scope-continental">🌍 Continental</span>',
                  }[n.scope] || '';
                  return `
                  <div class="news-item">
                    <span class="news-date">${n.date}</span>
                    ${scopeTag}
                    <span class="news-text">${n.headline}</span>
                  </div>`;
                }).join('') : '<p class="muted">Sem notícias recentes.</p>'}
              </div>
            </div>
            <div class="hub-section">
              <h3>📱 Redes Sociais</h3>
              <div class="fans-list">
                ${fans.map(f => `
                  <div class="fan-comment">
                    <span class="fan-user">${f.user}</span>
                    <span class="fan-text">${f.text}</span>
                    <span class="fan-likes">❤️ ${f.likes}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            ${p.isInjured ? `
              <div class="injury-banner">
                ⚠️ LESIONADO — ${p.injuryWeeks} semanas de recuperação restantes
              </div>
            ` : ''}
            ${p.weeksSinceTraining >= 8 ? `
              <div class="conditioning-banner">
                ⚠️ ${p.weeksSinceTraining} semanas sem camp · ${p.conditioningStatus}
              </div>
            ` : ''}
            ${p.weightTransition ? `
              <div class="conditioning-banner weight-transition-banner">
                ⚖️ Adaptação aos ${p.weightClassData?.name}: ${p.weightTransition.weeksRemaining}/${p.weightTransition.totalWeeks} semanas restantes
              </div>
            ` : ''}
          </div>
        </div>

        <div class="hub-footer">
          <div class="hub-footer-left">
            <button class="btn btn-ghost btn-sm" id="btn-save">💾 Salvar</button>
            <button class="btn btn-ghost btn-sm" id="btn-menu">← Menu</button>
            <button class="btn btn-ghost btn-sm action-retire" id="btn-retire">🎗️ Aposentar</button>
            <div class="lang-toggle lang-toggle-small">
              <button class="lang-btn ${I18n.getLang() === 'pt' ? 'active' : ''}" data-lang="pt">🇧🇷</button>
              <button class="lang-btn ${I18n.getLang() === 'en' ? 'active' : ''}" data-lang="en">🇺🇸</button>
            </div>
          </div>
          <button class="btn btn-advance-footer" id="btn-advance">⏭️ Avançar Semana <span class="advance-date">${this.gs.dateString}</span></button>
        </div>
      </div>
    `;

    document.getElementById('btn-train').onclick    = () => this.show('training');
    document.getElementById('btn-team').onclick     = () => this.show('team');
    document.getElementById('btn-challenges').onclick = () => this.show('challenges');
    const btnTournOffers = document.getElementById('btn-tourn-offers');
    if (btnTournOffers) btnTournOffers.onclick = () => this.show('tournamentOffer', { offer: this.gs.tournamentOffers[0] });
    document.getElementById('btn-contracts').onclick = () => this.show('contracts');
    document.getElementById('btn-fights').onclick   = () => {
      if (this.gs.activeTournament && this.gs.nextFight) {
        this.show('preFight', { fight: this.gs.nextFight });
      } else if (this.gs.activeTournament) {
        this._toast('Você está em um torneio — aguarde o próximo confronto.');
      } else if (this.gs.nextFight) {
        this.show('preFight', { fight: this.gs.nextFight });
      } else {
        this.show('fightSelect');
      }
    };
    document.getElementById('btn-rankings').onclick = () => this.show('rankings');
    document.getElementById('btn-stats').onclick    = () => this.show('athleteStats');
    document.getElementById('btn-weight-class').onclick = () => this.show('weightClass');
    document.getElementById('btn-history').onclick  = () => this.show('fightHistory');
    document.getElementById('btn-show').onclick     = () => this.show('analystShow');
    document.getElementById('btn-news').onclick     = () => this.show('newsCenter');
    if (this.gs.mediaCrisis) {
      document.getElementById('btn-media-crisis').onclick = () => this.show('mediaCrisis');
    }
    document.getElementById('btn-legacy').onclick   = () => this.show('legacy');
    document.getElementById('btn-rivals').onclick   = () => this.show('rivals');
    document.getElementById('btn-invest').onclick   = () => this.show('investments');
    document.getElementById('btn-retire').onclick   = () => {
      if (!confirm(t('Tem certeza que deseja encerrar sua carreira? Esta ação é permanente.'))) return;
      const result = this.gs.retirePlayer('voluntary');
      this.gs.save();
      this.show('retirement', { reason: result.reason });
    };
    document.getElementById('btn-advance').onclick  = () => {
      this.gs.advanceWeeks(1);
      this.gs.save();
      const forced = this.gs.checkForcedRetirement();
      if (forced) {
        this.gs.retirePlayer(forced);
        this.gs.save();
        this.show('retirement', { reason: forced, forced: true });
        return;
      }
      this.show('careerHub');
    };
    document.querySelectorAll('.lang-toggle .lang-btn').forEach(btn => {
      btn.onclick = () => { I18n.setLang(btn.dataset.lang); this.show('careerHub'); };
    });
    document.getElementById('btn-save').onclick = () => {
      this.gs.save();
      this._toast(t('Jogo salvo!'));
    };
    document.getElementById('btn-menu').onclick = () => {
      if (confirm(t('Voltar ao menu? Salve antes!'))) this.show('mainMenu');
    };
  }

  _styleIcon(styleId) {
    const icons = {
      pressure:'💣', outboxer:'🎯', counterpuncher:'⚡',
      slugger:'💥', swarmer:'🌪️', technical:'🧠',
      boxer_puncher:'⚖️',
    };
    return icons[styleId] || '🥊';
  }

  _statChip(label, val) {
    return `<div class="stat-chip"><div class="stat-chip-val">${val}</div><div class="stat-chip-label">${label}</div></div>`;
  }

  _billingLabel(billing) {
    return billing === 'main_event' ? 'Evento Principal' : billing === 'co_main' ? 'Co-Main Event' : 'Undercard';
  }
  // TEAM (STAFF)
  _render_team() {
    const p = this.gs.player;

    const roleCards = STAFF_ROLES.map(role => {
      const hiredTier = this.gs.staff[role.id];
      const isHired   = hiredTier !== undefined;

      return `
        <div class="staff-card ${isHired ? 'hired' : ''}">
          <div class="staff-header">
            <span class="staff-icon">${role.icon}</span>
            <div>
              <div class="staff-name">${role.name}</div>
              <div class="staff-effect">${role.effect}</div>
            </div>
          </div>
          ${isHired ? `
            <div class="staff-current">
              ✅ ${role.tiers[hiredTier].name} — ${formatCurrency(role.tiers[hiredTier].salary)}/semana
              <button class="btn btn-ghost btn-sm staff-fire" data-role="${role.id}">Demitir</button>
            </div>
          ` : ''}
          <div class="staff-tiers">
            ${role.tiers.map((t, i) => `
              <button class="staff-tier-btn ${isHired && hiredTier === i ? 'active' : ''}"
                      data-role="${role.id}" data-tier="${i}"
                      ${isHired && hiredTier === i ? 'disabled' : ''}>
                <span class="tier-name">${t.name}</span>
                <span class="tier-salary">${formatCurrency(t.salary)}/sem</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Equipe Técnica</h1>
        <div class="team-summary">
          <span>💰 Dinheiro: <strong class="gold">${formatCurrency(p.money)}</strong></span>
          <span>📉 Despesas: <strong>${formatCurrency(this.gs.staffWeeklyCost())}/semana</strong></span>
          <span class="muted">Salários são descontados a cada semana que passa.</span>
        </div>
        <div class="staff-grid">${roleCards}</div>
        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('careerHub');

    document.querySelectorAll('.staff-tier-btn:not([disabled])').forEach(btn => {
      btn.onclick = () => {
        const roleId = btn.dataset.role;
        const tier   = parseInt(btn.dataset.tier);
        const role   = STAFF_ROLES.find(r => r.id === roleId);
        const salary = role.tiers[tier].salary;

        // Needs at least 4 weeks of salary in the bank to hire
        if (p.money < salary * 4) {
          this._toast(`Dinheiro insuficiente! Precisa de ${formatCurrency(salary * 4)} (4 semanas de salário).`);
          return;
        }

        this.gs.staff[roleId] = tier;
        this.gs.save();
        this._toast(`${role.tiers[tier].name} contratado!`);
        this.show('team');
      };
    });

    document.querySelectorAll('.staff-fire').forEach(btn => {
      btn.onclick = () => {
        const roleId = btn.dataset.role;
        delete this.gs.staff[roleId];
        this.gs.save();
        this._toast('Membro da equipe demitido.');
        this.show('team');
      };
    });
  }
  // CONTRACTS / PROMOTERS
  _render_tournamentOffer({ offer }) {
    const roundStr = offer.rounds.join(' → ');
    this.root.innerHTML = `
      <div class="screen">
        <h2>🏆 Convite de Torneio</h2>
        <div class="info-card" style="margin-bottom:1.5rem">
          <div style="font-size:1.3rem;font-weight:700;margin-bottom:4px">${offer.name}</div>
          <div style="color:var(--muted);margin-bottom:12px">${offer.tier === 'regional' ? 'Torneio Regional' : 'Torneio Local'} · ${offer.weightClass}</div>
          <div class="stat-grid" style="grid-template-columns:1fr 1fr">
            <div class="stat-item"><div class="stat-label">Bolsa por luta</div><div class="stat-val">$${offer.pursePerFight.toLocaleString()}</div></div>
            <div class="stat-item"><div class="stat-label">Prêmio do campeão</div><div class="stat-val">$${offer.winnerPrize.toLocaleString()}</div></div>
            <div class="stat-item"><div class="stat-label">Participantes</div><div class="stat-val">${offer.size} lutadores</div></div>
            <div class="stat-item"><div class="stat-label">Formato</div><div class="stat-val">${roundStr}</div></div>
          </div>
        </div>
        <p style="color:var(--muted);font-size:.9rem;margin-bottom:1.5rem">⚠️ Ao aceitar, você não poderá escolher outras lutas até o torneio terminar.</p>
        <div style="display:flex;gap:12px">
          <button class="btn btn-primary" id="btn-accept-tourn">Aceitar Convite →</button>
          <button class="btn btn-ghost" id="btn-decline-tourn">Recusar</button>
        </div>
      </div>
    `;
    I18n.applyLang();
    document.getElementById('btn-accept-tourn').onclick = () => {
      const ok = this.gs.acceptTournament(offer.id);
      if (ok) {
        this._toast('Torneio aceito! Sua primeira luta foi marcada.');
        this.show('careerHub');
      } else {
        this._toast('Não foi possível aceitar o torneio agora.');
      }
    };
    document.getElementById('btn-decline-tourn').onclick = () => {
      this.gs.declineTournament(offer.id);
      this.show('careerHub');
    };
  }

  _render_contracts() {
    const p = this.gs.player;
    const contract = p.contract?.fightsRemaining > 0 ? p.contract : null;
    if (!contract && this.gs.contractOffers.length === 0) this.gs.generateContractOffers();

    const promoter = contract
      ? PROMOTERS.find(item => item.id === contract.promoterId)
      : null;

    this.root.innerHTML = `
      <div class="screen contracts-screen">
        <h1 class="screen-title">📄 Contratos e Promotores</h1>
        <p class="muted text-center">Escolha quem conduz sua carreira. Contratos melhores pagam mais, mas reduzem sua liberdade.</p>

        ${contract ? `
          <div class="active-contract">
            <div class="contract-heading">
              <div>
                <div class="contract-kicker">CONTRATO ATIVO</div>
                <h2>${contract.promoterName}</h2>
                <p class="muted">${promoter?.desc || ''}</p>
              </div>
              <div class="contract-fights">${contract.fightsRemaining}<span>lutas restantes</span></div>
            </div>
            <div class="contract-terms">
              ${this._contractTerm('Bolsa', `${contract.purseMultiplier.toFixed(2)}x`)}
              ${this._contractTerm('Bônus por vitória', `+${Math.round(contract.winBonus * 100)}%`)}
              ${this._contractTerm('Bônus por KO/TKO', `+${Math.round(contract.knockoutBonus * 100)}%`)}
              ${this._contractTerm('Exclusividade', contract.exclusivity ? 'Sim' : 'Não')}
              ${this._contractTerm('Mídia', `${contract.mediaCompleted || 0}/${contract.mediaObligations || 0} obrigação(ões)`)}
              ${this._contractTerm('Multa rescisória', formatCurrency(contract.terminationFee))}
            </div>
            <button class="btn btn-danger" id="btn-terminate-contract">Romper Contrato</button>
          </div>
        ` : `
          <div class="contract-status">
            <span>✅ Agente livre</span>
            <span>${this.gs.staff.agent !== undefined
              ? `🤝 ${STAFF_ROLES.find(r => r.id === 'agent').tiers[this.gs.staff.agent].name} negociando por você`
              : '⚠️ Sem agente: condições e contrapropostas mais fracas'}</span>
          </div>
          <div class="contract-offers">
            ${this.gs.contractOffers.map(offer => this._renderContractOffer(offer)).join('')}
          </div>
          <button class="btn btn-secondary" id="btn-new-contract-offers">🔄 Buscar Novas Propostas</button>
        `}

        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('careerHub');

    if (contract) {
      document.getElementById('btn-terminate-contract').onclick = () => {
        if (!confirm(`Romper contrato por ${formatCurrency(contract.terminationFee)}?`)) return;
        const result = this.gs.terminateContract();
        if (!result.success) {
          this._toast(result.reason);
          return;
        }
        this.gs.save();
        this.show('contracts');
        this._toast('Contrato encerrado.');
      };
      return;
    }

    document.querySelectorAll('.contract-accept').forEach(btn => {
      btn.onclick = () => {
        if (!this.gs.acceptContractOffer(Number(btn.dataset.offer))) return;
        this.gs.save();
        this.show('contracts');
        this._toast('Contrato assinado!');
      };
    });

    document.querySelectorAll('.contract-negotiate').forEach(btn => {
      btn.onclick = () => {
        const offerId = Number(btn.dataset.offer);
        const offer = this.gs.contractOffers.find(o => o.id === offerId);
        if (offer) this.show('contractNegotiate', { offer });
      };
    });

    document.getElementById('btn-new-contract-offers').onclick = () => {
      this.gs.generateContractOffers();
      this.gs.save();
      this.show('contracts');
      this._toast('Novas propostas recebidas.');
    };
  }

  _renderContractOffer(offer) {
    const promoter = PROMOTERS.find(p => p.id === offer.promoterId);
    const ORG_COLORS = { WBC: '#007a3d', WBA: '#003087', IBF: '#9b0000', WBO: '#7b2d8b' };
    const orgChips = [];
    if (promoter?.orgAffil)  orgChips.push(`<span class="contract-org-chip" style="background:${ORG_COLORS[promoter.orgAffil] || '#555'}">${promoter.orgAffil} principal</span>`);
    if (promoter?.orgAffil2) orgChips.push(`<span class="contract-org-chip contract-org-secondary" style="border-color:${ORG_COLORS[promoter.orgAffil2] || '#555'};color:${ORG_COLORS[promoter.orgAffil2] || '#555'}">${promoter.orgAffil2} secundária</span>`);
    const orgHtml = orgChips.length ? `<div class="contract-org-row">${orgChips.join('')}</div>` : '';
    return `
      <div class="contract-offer-card">
        <div class="contract-offer-head">
          <div>
            <div class="contract-prestige">Prestígio ${promoter?.prestige || 0}</div>
            <h3>${offer.promoterName}</h3>
            ${orgHtml}
            <p>${promoter?.desc || ''}</p>
          </div>
          <div class="contract-signing">+${formatCurrency(offer.signingBonus)}<span>luvas</span></div>
        </div>
        <div class="contract-terms">
          ${this._contractTerm('Duração', `${offer.fightsTotal} lutas`)}
          ${this._contractTerm('Bolsa', `${offer.purseMultiplier.toFixed(2)}x`)}
          ${this._contractTerm('Vitória', `+${Math.round(offer.winBonus * 100)}%`)}
          ${this._contractTerm('KO/TKO', `+${Math.round(offer.knockoutBonus * 100)}%`)}
          ${this._contractTerm('Exclusividade', offer.exclusivity ? 'Sim' : 'Não')}
          ${this._contractTerm('Rescisão', formatCurrency(offer.terminationFee))}
        </div>
        <div class="contract-actions">
          <button class="btn btn-primary contract-accept" data-offer="${offer.id}">Assinar</button>
          <button class="btn btn-secondary contract-negotiate" data-offer="${offer.id}"
            ${offer.negotiationRoundsLeft <= 0 ? 'disabled' : ''}>
            ${offer.negotiationRoundsLeft <= 0
              ? 'Negociação encerrada'
              : `Negociar Cláusulas (${offer.negotiationRoundsLeft} rodada${offer.negotiationRoundsLeft > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    `;
  }

  _contractTerm(label, value) {
    return `<div class="contract-term"><span>${label}</span><strong>${value}</strong></div>`;
  }
  // NEGOCIAÇÃO DE CLÁUSULAS
  _render_contractNegotiate({ offer }) {
    const CLAUSES = [
      { id: 'purse',             label: 'Bolsa base',           current: () => `${offer.purseMultiplier.toFixed(2)}x` },
      { id: 'signingBonus',      label: 'Luvas de assinatura',  current: () => formatCurrency(offer.signingBonus) },
      { id: 'winBonus',          label: 'Bônus por vitória',    current: () => `+${Math.round(offer.winBonus * 100)}%` },
      { id: 'knockoutBonus',     label: 'Bônus por KO/TKO',    current: () => `+${Math.round(offer.knockoutBonus * 100)}%` },
      { id: 'terminationFee',    label: 'Multa rescisória',     current: () => formatCurrency(offer.terminationFee) },
      { id: 'mediaObligations',  label: 'Obrigações de mídia',  current: () => `${offer.mediaObligations}` },
      { id: 'exclusivity',       label: 'Exclusividade',        current: () => offer.exclusivity ? 'Sim' : 'Não' },
      { id: 'fights',            label: 'Duração do contrato',  current: () => `${offer.fightsTotal} lutas` },
    ];
    const promoter = PROMOTERS.find(p => p.id === offer.promoterId);
    const hard = offer.hardClauses || [];

    this.root.innerHTML = `
      <div class="screen contracts-screen">
        <h1 class="screen-title">🤝 Negociação de Contrato</h1>
        <p class="muted text-center">${offer.promoterName} · Rodadas restantes: <strong>${offer.negotiationRoundsLeft}</strong></p>
        <p class="muted text-center" style="font-size:.82rem">Cada cláusula pode ser negociada uma vez. Cláusulas <span style="color:#e07b39">⚠️ difíceis</span> têm menor chance de sucesso.</p>

        <div class="contract-offer-card">
          ${CLAUSES.map(cl => {
            const isDone  = (offer.negotiatedClauses || []).includes(cl.id);
            const isHard  = hard.includes(cl.id);
            const canDo   = !isDone && offer.negotiationRoundsLeft > 0;
            return `
              <div class="clause-row ${isDone ? 'clause-done' : ''}">
                <div class="clause-info">
                  <span class="clause-label">${isHard ? '⚠️ ' : ''}${cl.label}</span>
                  <span class="clause-val">${cl.current()}</span>
                  ${isDone ? '<span class="clause-status">✔ negociada</span>' : ''}
                  ${isHard && !isDone ? '<span class="clause-status hard">difícil (~22%)</span>' : ''}
                  ${!isHard && !isDone ? '<span class="clause-status soft">normal (~52%)</span>' : ''}
                </div>
                <button class="btn btn-sm btn-secondary clause-btn" data-clause="${cl.id}" ${canDo ? '' : 'disabled'}>
                  Negociar
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <div class="create-footer">
          <button class="btn btn-primary contract-accept-final" data-offer="${offer.id}">Assinar com estas condições</button>
          <button class="btn btn-ghost" id="btn-back">← Voltar às propostas</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('contracts');
    document.querySelector('.contract-accept-final').onclick = () => {
      if (!this.gs.acceptContractOffer(offer.id)) return;
      this.gs.save();
      this.show('contracts');
      this._toast('Contrato assinado!');
    };

    document.querySelectorAll('.clause-btn').forEach(btn => {
      btn.onclick = () => {
        const clause = btn.dataset.clause;
        const result = this.gs.negotiateClause(offer.id, clause);
        this.gs.save();
        if (result.success) {
          this._toast(`✅ ${this._clauseLabel(clause)} melhorada!`);
        } else {
          this._toast(`❌ ${result.reason}`);
        }
        // Re-render com offer atualizado (já é a mesma referência)
        this.show('contractNegotiate', { offer });
      };
    });
  }

  _clauseLabel(clause) {
    return { purse: 'Bolsa', signingBonus: 'Luvas', winBonus: 'Bônus vitória',
             knockoutBonus: 'Bônus KO', terminationFee: 'Multa rescisória',
             mediaObligations: 'Mídia', exclusivity: 'Exclusividade', fights: 'Duração' }[clause] || clause;
  }
  // TRAINING
  _render_training() {
    this._trainFocuses = [];
    const p = this.gs.player;

    if (p.isInjured) {
      this.root.innerHTML = `
        <div class="screen">
          <h1 class="screen-title">Recuperação</h1>
          <div class="injury-card">
            <div class="injury-icon">🏥</div>
            <h3>Você está lesionado</h3>
            <p>${p.injuryWeeks} semanas restantes de recuperação.</p>
            <p class="muted">Descanse e aguarde a recuperação completa antes de treinar.</p>
            <button class="btn btn-primary" id="btn-rest">Descansar 1 Semana</button>
          </div>
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
        </div>
      `;
      document.getElementById('btn-back').onclick = () => this.show('careerHub');
      document.getElementById('btn-rest').onclick = () => {
        this.gs.advanceWeeks(1);
        this.gs.save();
        this.show('training');
      };
      return;
    }

    const focusCards = TRAINING_FOCUSES.map(f => `
      <div class="focus-card" id="focus-${f.id}" data-id="${f.id}">
        <div class="focus-name">${f.name}</div>
        <div class="focus-attrs">${f.attrs.map(a => this._attrShortLabel(a)).join(', ')}</div>
        <div class="focus-risk" style="color:${f.risk > 0.1 ? '#e63946' : f.risk > 0.05 ? '#f4a261' : '#2ecc71'}">
          Risco: ${f.risk > 0.1 ? 'Alto' : f.risk > 0.05 ? 'Médio' : 'Baixo'}
        </div>
      </div>
    `).join('');

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Treino</h1>
        <div class="training-container">
          <div class="training-left">
            <h3>Foco do Treino <span class="muted">(máx. 3)</span></h3>
            <p class="muted">Selecione até 3 áreas para focar no camp. Mais foco = mais ganho.</p>
            <div class="focus-grid" id="focus-grid">
              ${focusCards}
            </div>
            <div class="train-weeks">
              <label>Semanas de treino</label>
              <div class="weeks-control">
                <button class="attr-btn minus" id="weeks-minus">−</button>
                <span id="weeks-val">6</span>
                <button class="attr-btn plus"  id="weeks-plus">+</button>
              </div>
              <p class="muted" id="weeks-note">Custo do camp: <strong class="gold" id="camp-cost">${formatCurrency(6 * TRAINING_COST_PER_WEEK)}</strong> (+ salários da equipe)</p>
              ${this.gs.staffBonus('coach') > 0 ? `<p class="muted green">🧠 Técnico contratado: +${Math.round(this.gs.staffBonus('coach') * 100)}% de ganhos</p>` : ''}
              ${p.trainingBonus !== 0 ? `<p class="muted ${p.trainingBonus > 0 ? 'green' : ''}">🧠 Personalidade ${p.personality?.name}: ${p.trainingBonus > 0 ? '+' : ''}${Math.round(p.trainingBonus * 100)}% de ganhos</p>` : ''}
              ${this.gs.staffBonus('physio') > 0 ? `<p class="muted green">💪 Preparador físico: -${Math.round(this.gs.staffBonus('physio') * 100)}% risco de lesão</p>` : ''}
            </div>
          </div>

          <div class="training-right">
            <h3>Atributos Atuais</h3>
            ${this._renderAttrBars(p)}
          </div>
        </div>

        <div class="create-footer">
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
          <button class="btn btn-primary btn-lg" id="btn-do-train">Iniciar Camp →</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('careerHub');

    let weeks = 6;
    const updateCost = () => {
      document.getElementById('weeks-val').textContent = weeks;
      document.getElementById('camp-cost').textContent = formatCurrency(weeks * TRAINING_COST_PER_WEEK);
    };
    document.getElementById('weeks-minus').onclick = () => {
      if (weeks > 1) { weeks--; updateCost(); }
    };
    document.getElementById('weeks-plus').onclick = () => {
      if (weeks < 12) { weeks++; updateCost(); }
    };

    document.querySelectorAll('.focus-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        if (this._trainFocuses.includes(id)) {
          this._trainFocuses = this._trainFocuses.filter(x => x !== id);
          card.classList.remove('selected');
        } else if (this._trainFocuses.length < 3) {
          this._trainFocuses.push(id);
          card.classList.add('selected');
        }
      };
    });

    document.getElementById('btn-do-train').onclick = () => {
      const cost = weeks * TRAINING_COST_PER_WEEK;
      if (p.money < cost) {
        this._toast(`Dinheiro insuficiente! O camp custa ${formatCurrency(cost)}.`);
        return;
      }
      p.money -= cost;

      const gymB = this.gs.gymBonus();
      const camp = new TrainingCamp(p, weeks, this._trainFocuses, {
        gain: this.gs.staffBonus('coach') + gymB.gain,
        risk: this.gs.staffBonus('physio') + gymB.risk,
      });
      const result = camp.simulate();
      this.gs.advanceWeeks(weeks, { trained: true });
      this.gs.save();
      this.show('trainingResult', { result, weeks });
    };
  }

  _render_trainingResult({ result, weeks }) {
    const injury = result.injury;
    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Resultado do Treino</h1>
        <div class="result-card">
          <div class="result-header">
            ${injury ? '⚠️ Camp interrompido por lesão!' : '✅ Camp concluído com sucesso!'}
          </div>
          <p class="muted">${weeks} semanas de treino intenso.</p>

          ${injury ? `
            <div class="injury-alert">
              <strong>Lesão:</strong> ${injury.desc}
              <br>Recuperação estimada: ${injury.weeks} semanas.
            </div>
          ` : ''}

          <h3>Melhorias Obtidas</h3>
          ${result.improvements.length ? `
            <div class="improvements-list">
              ${result.improvements.map(i => `
                <div class="improvement-row">
                  <span>${i.label}</span>
                  <span class="gain">+${i.gain}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="muted">Nenhuma melhoria significativa desta vez.</p>'}
        </div>
        <button class="btn btn-primary" id="btn-done">Continuar →</button>
      </div>
    `;
    document.getElementById('btn-done').onclick = () => this.show('careerHub');
  }

  _render_challenges() {
    const challenges = this.gs.incomingChallenges;
    const p = this.gs.player;
    const rank = this.gs.getPlayerRanking();

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">📨 Desafios Recebidos</h1>
        <p class="muted text-center">
          ${p.isChampion
            ? 'Como campeão, desafiantes e promotoras tentarão garantir uma disputa pelo seu cinturão.'
            : rank && rank <= 10
              ? 'Você está na elite do ranking. Recusar lutas demais pode afetar sua reputação.'
              : 'Lutadores próximos da sua posição podem desafiar você diretamente.'}
        </p>
        <div class="challenge-summary">
          <span>Ranking: <strong>${rank ? `#${rank}` : 'Fora'}</strong></span>
          <span>Status: <strong>${p.isChampion ? 'Campeão mundial' : rank <= 10 ? 'Top 10' : rank <= 20 ? 'Top 20' : 'Não elegível'}</strong></span>
          <span>Forma: <strong>${p.conditioningStatus}</strong></span>
        </div>
        <div class="fight-offers">
          ${challenges.length
            ? challenges.map(challenge => this._renderChallenge(challenge)).join('')
            : '<div class="empty-state"><h3>Nenhum desafio pendente</h3><p>Novos chamados podem chegar com o avanço das semanas.</p></div>'}
        </div>
        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('careerHub');
    document.querySelectorAll('.challenge-accept').forEach(btn => {
      btn.onclick = () => {
        const result = this.gs.acceptIncomingChallenge(Number(btn.dataset.id));
        if (!result.success) {
          this._toast(result.reason);
          return;
        }
        this.gs.save();
        this.show('fightCamp', { fight: result.fight });
      };
    });
    document.querySelectorAll('.challenge-decline').forEach(btn => {
      btn.onclick = () => {
        const result = this.gs.declineIncomingChallenge(Number(btn.dataset.id));
        if (!result.success) {
          this._toast(result.reason);
          return;
        }
        this.gs.save();
        this.show('challenges');
        this._toast(`Desafio recusado. Reputação -${result.reputationLost}.`);
      };
    });
  }

  _renderChallenge(challenge) {
    const opponent   = challenge.opponent;
    const beltStakes = challenge.beltStakes || (challenge.titleBelt ? [challenge.titleBelt] : []);
    const isTitle    = beltStakes.length > 0;
    const isUnif     = beltStakes.length > 1;
    const stars      = '⭐'.repeat(challenge.risk) + '☆'.repeat(5 - challenge.risk);
    const wc         = this.gs.player?.weightClass;

    // Org ranking positions for this challenger
    const orgRankBadges = beltStakes.map(org => {
      const orgData = this.gs.orgRankings?.[org]?.[wc];
      const idx = (orgData?.contenders || []).findIndex(f => f.id === opponent.id);
      const bi  = getBeltInfo(org);
      return `<span class="org-rank-badge" style="border-color:${bi.color}; color:${bi.color}">${bi.icon} ${org} #${idx >= 0 ? idx + 1 : '?'}</span>`;
    }).join('');

    // Banner text
    let bannerHtml = '';
    if (isUnif) {
      bannerHtml = `<div class="title-banner unification-banner">👑 LUTA DE UNIFICAÇÃO — ${beltStakes.join(' + ')}</div>`;
    } else if (isTitle) {
      const bi = getBeltInfo(beltStakes[0]);
      bannerHtml = `<div class="title-banner" style="background:${bi.color}">${bi.icon} DEFESA DO ${bi.name.toUpperCase()}</div>`;
    }

    // Belts at stake chips
    const beltChips = beltStakes.map(org => {
      const bi = getBeltInfo(org);
      return `<span class="belt-chip" style="border-color:${bi.color}; font-size:.72rem">${bi.icon} ${bi.name}</span>`;
    }).join('');

    return `
      <div class="fight-offer challenge-card ${isTitle ? 'title-fight' : ''} ${isUnif ? 'unification-fight' : ''}">
        ${bannerHtml}
        <div class="challenge-kicker">${challenge.challengerPromoter?.name || challenge.promoter?.name || 'Promotora'} · expira em ${challenge.expiresIn} semana(s)</div>
        <div class="fight-offer-header">
          <div class="opp-info">
            <div class="opp-name">${opponent.displayName}</div>
            <div class="opp-sub">${opponent.nationalityData?.flag || ''} ${opponent.nationalityData?.nation || ''} · ${opponent.style?.name || ''}</div>
            <div class="opp-record">${opponent.record} · <span class="opp-rank">#${opponent.ranking || '?'} ranking geral</span></div>
            ${orgRankBadges ? `<div class="org-rank-badges">${orgRankBadges}</div>` : ''}
          </div>
          <div class="opp-ratings">
            <div class="rating-pill">OVR <strong>${opponent.overall}</strong></div>
          </div>
        </div>
        ${beltChips ? `<div class="challenge-belts-row">${beltChips}</div>` : ''}
        <div class="fight-offer-details">
          <div class="detail-item"><span class="detail-label">Risco</span><span class="detail-val">${stars}</span></div>
          <div class="detail-item"><span class="detail-label">Bolsa</span><span class="detail-val gold">${formatCurrency(challenge.purse)}</span></div>
          <div class="detail-item"><span class="detail-label">Rounds</span><span class="detail-val">${challenge.rounds}R</span></div>
          ${isUnif ? `<div class="detail-item"><span class="detail-label">Em jogo</span><span class="detail-val" style="color:#ffd700">${beltStakes.length} cinturões</span></div>` : ''}
        </div>
        <div class="challenge-actions">
          <button class="btn btn-primary challenge-accept" data-id="${challenge.id}">Aceitar Desafio</button>
          <button class="btn btn-danger challenge-decline" data-id="${challenge.id}">Recusar</button>
        </div>
      </div>
    `;
  }

  _attrShortLabel(a) {
    const m = { strength:'Força', speed:'Vel', stamina:'Res', chin:'Queixo', reflexes:'Ref',
                jab:'Jab', straight:'Dir', defense:'Def', footwork:'Pés', combinations:'Comb',
                precision:'Prec', ringIQ:'IQ', courage:'Cor', composure:'Eq', resilience:'Res',
                bodyPunch:'Corpo', counter:'Cont', distance:'Dist', clinch:'Clin' };
    return m[a] || a;
  }

  _renderAttrBars(f) {
    const attrs = [
      ['Força', f.strength], ['Velocidade', f.speed], ['Resistência', f.stamina],
      ['Queixo', f.chin], ['Defesa', f.defense], ['Jab', f.jab],
      ['Ring IQ', f.ringIQ], ['Coragem', f.courage],
    ];
    return `<div class="attr-bars-mini">
      ${attrs.map(([l, v]) => `
        <div class="bar-row">
          <span class="bar-label">${l}</span>
          <div class="mini-bar"><div class="mini-bar-fill" style="width:${v}%"></div></div>
          <span class="bar-num">${v}</span>
        </div>
      `).join('')}
    </div>`;
  }
  // FIGHT SELECT
  _render_fightSelect() {
    if (!this.gs.availableFights.length) this.gs.generateAvailableFights();
    const fights = this.gs.availableFights;
    const p = this.gs.player;

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Escolher Luta</h1>
        <p class="muted">Selecione o próximo adversário. Cada luta tem risco e recompensa diferente.</p>
        <div class="fight-offers">
          ${fights.map(f => this._renderFightOffer(f)).join('')}
        </div>
        <div class="create-footer">
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
          <button class="btn btn-secondary" id="btn-refresh">🔄 Novas Ofertas</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick    = () => this.show('careerHub');
    document.getElementById('btn-refresh').onclick = () => {
      const previousIds = this.gs.availableFights.map(f => f.opponent?.id).join(',');
      this.gs.refreshAvailableFights();
      this.gs.save();
      this.show('fightSelect');
      const currentIds = this.gs.availableFights.map(f => f.opponent?.id).join(',');
      this._toast(currentIds === previousIds
        ? 'As melhores opções disponíveis continuam sendo estas.'
        : 'Novas ofertas recebidas!');
    };

    fights.forEach(f => {
      const btn = document.getElementById(`accept-${f.id}`);
      if (btn) btn.onclick = () => this.show('fightCamp', { fight: f });
    });
  }

  _renderFightOffer(fight) {
    const opp  = fight.opponent;
    const stars = '⭐'.repeat(fight.risk) + '☆'.repeat(5 - fight.risk);
    const belt  = fight.titleBelt ? getBeltInfo(fight.titleBelt) : null;
    const myBeltInfo = fight.isUnification && fight.myBelt ? getBeltInfo(fight.myBelt) : null;
    const event = fight.event;

    // Compute org rank badges for the opponent
    const wc = opp.weightClass;
    const ORG_COLORS = { WBC: '#007a3d', WBA: '#003087', IBF: '#9b0000', WBO: '#7b2d8b' };
    let orgBadgesHtml = '';
    if (this.gs.orgRankings) {
      const badges = [];
      for (const org of ['WBC','WBA','IBF','WBO']) {
        const orgWc = this.gs.orgRankings[org]?.[wc];
        if (!orgWc) continue;
        if (orgWc.champion?.id === opp.id) {
          badges.push(`<span class="org-rank-badge" style="background:${ORG_COLORS[org]}">${org} 🏆</span>`);
        } else {
          const idx = (orgWc.contenders || []).findIndex(f => f.id === opp.id);
          if (idx >= 0) badges.push(`<span class="org-rank-badge" style="background:${ORG_COLORS[org]}">${org} #${idx + 1}</span>`);
        }
      }
      if (badges.length) orgBadgesHtml = `<div class="org-rank-badges" style="margin-top:4px">${badges.join('')}</div>`;
    }

    return `
      <div class="fight-offer ${fight.isTitle ? 'title-fight' : ''} ${fight.isUnification ? 'unification-fight' : ''} ${fight.isRivalry ? 'rivalry-fight' : ''}">
        ${fight.isUnification ? `<div class="title-banner unification-banner">⚡ LUTA DE UNIFICAÇÃO — ${belt ? belt.icon + ' ' + belt.name.toUpperCase() : ''} vs ${myBeltInfo ? myBeltInfo.icon + ' ' + myBeltInfo.name.toUpperCase() : ''}</div>` : fight.isRivalry ? `<div class="title-banner rivalry-banner">⚔️ RIVALIDADE — ${'★'.repeat(fight.rivalIntensity || 1)} Bolsa extra por ser revanche</div>` : belt ? `<div class="title-banner" style="background:${belt.color}">${belt.icon} EM JOGO: ${belt.name.toUpperCase()}${fight.vacant && belt.tier >= 4 ? ' — VAGO' : ''}</div>` : ''}
        <div class="fight-offer-header">
          <div class="opp-info">
            <div class="opp-name">${opp.displayName}</div>
            <div class="opp-sub">${opp.nationalityData?.flag || ''} ${opp.nationalityData?.nation || ''} · ${opp.style?.name || ''}</div>
            <div class="opp-record">${opp.record}${opp.kos + opp.tkos > 0 ? ` (${opp.kos+opp.tkos} KOs)` : ''} · <span class="opp-rank">#${opp.ranking || '?'} ranking</span></div>
            ${orgBadgesHtml}
          </div>
          <div class="opp-ratings">
            <div class="rating-pill">OVR <strong>${opp.overall}</strong></div>
            <div class="rating-pill">ATK <strong>${opp.offensiveRating}</strong></div>
            <div class="rating-pill">DEF <strong>${opp.defensiveRating}</strong></div>
          </div>
        </div>
        <div class="fight-offer-details">
          <div class="detail-item">
            <span class="detail-label">Risco</span>
            <span class="detail-val">${stars}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Bolsa</span>
            <span class="detail-val gold">${formatCurrency(fight.purse)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Rounds</span>
            <span class="detail-val">${fight.rounds}R</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Ranking</span>
            <span class="detail-val">${fight.rankingImpact}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Promotora</span>
            <span class="detail-val">${fight.promoter.name}</span>
          </div>
          ${event ? `
            <div class="detail-item">
              <span class="detail-label">Arena</span>
              <span class="detail-val">${event.arena.name} · N${event.arena.globalLevel}/20</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Público projetado</span>
              <span class="detail-val">${event.attendance.toLocaleString('pt-BR')} / ${event.arena.capacity.toLocaleString('pt-BR')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Posição no card</span>
              <span class="detail-val">${this._billingLabel(event.billing)}</span>
            </div>
          ` : ''}
        </div>
        <button class="btn btn-primary fight-accept-btn" id="accept-${fight.id}">Aceitar Luta →</button>
      </div>
    `;
  }
  // PRE-FIGHT
  _render_preFight({ fight }) {
    this._pendingFight    = fight;
    this._pendingStrategy = 'adapt';
    const p   = this.gs.player;
    const opp = fight.opponent;
    const event = fight.event;

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Vestiário — Dia da Luta</h1>
        <div class="prefight-grid">
          <!-- Matchup -->
          <div class="matchup-card">
            <div class="matchup-fighter">
              <div class="mf-icon">${this._styleIcon(p.styleId)}</div>
              <div class="mf-name">${p.displayName}</div>
              <div class="mf-record">${p.record}</div>
              <div class="mf-overall">OVR ${p.overall}</div>
              <div class="mf-nat">${p.nationalityData?.flag || ''}</div>
            </div>
            <div class="matchup-vs">VS</div>
            <div class="matchup-fighter">
              <div class="mf-icon">${this._styleIcon(opp.styleId)}</div>
              <div class="mf-name">${opp.displayName}</div>
              <div class="mf-record">${opp.record}</div>
              <div class="mf-overall">OVR ${opp.overall}</div>
              <div class="mf-nat">${opp.nationalityData?.flag || ''}</div>
            </div>
          </div>

          ${event ? `
            <div class="event-day-card">
              <div>
                <span class="event-scope">${event.scope.toUpperCase()} · NÍVEL ${event.arena.level}/4</span>
                <h3>${event.arena.name}</h3>
                <p>${event.hostCity} · ${NAMES[event.hostNation]?.flag || ''} ${NAMES[event.hostNation]?.nation || ''}</p>
              </div>
              <div class="event-day-stats">
                <strong>${event.attendance.toLocaleString('pt-BR')}</strong><span>torcedores</span>
                <strong>${formatCurrency(event.gate)}</strong><span>bilheteria</span>
                <strong>${this._billingLabel(event.billing)}</strong><span>posição no card</span>
              </div>
              <div class="event-card-list">
                ${event.card.map((bout, index) => `
                  <div class="event-bout ${bout.playerBout ? 'player-bout' : ''}">
                    <span>${index + 1}</span>
                    <strong>${bout.red} vs ${bout.blue}</strong>
                    <small>${bout.weightClass} · ${this._billingLabel(bout.billing)}</small>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Strategy -->
          <div class="strategy-section">
            <h3>🎯 Estratégia</h3>
            <p class="muted">Escolha o plano de luta. Isso influencia como seu lutador se comporta no ringue.</p>
            <div class="strategy-grid">
              ${STRATEGIES.map(s => `
                <div class="strategy-card ${s.id === 'adapt' ? 'selected' : ''}" data-id="${s.id}" id="strat-${s.id}">
                  <div class="strat-name">${s.name}</div>
                  <div class="strat-desc">${s.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Stats comparison -->
          <div class="stats-compare">
            <h3>📊 Comparação</h3>
            ${this._renderComparison(p, opp)}
          </div>

          ${this.gs.staffBonus('analyst') > 0 ? `
            <div class="stats-compare scouting-report">
              <h3>📋 Relatório do Analista</h3>
              <p class="muted">Seu analista de adversários preparou um dossiê completo sobre ${opp.name}.</p>
              ${this._renderAttrBars(opp)}
              <p class="green" style="margin-top:8px">✓ Bônus tático de +${Math.round(this.gs.staffBonus('analyst') * 100)}% aplicado na luta</p>
            </div>
          ` : ''}
        </div>

        <div class="create-footer">
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
          <button class="btn btn-primary btn-xl fight-start-btn" id="btn-fight">🔔 LUTAR!</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('fightSelect');

    document.querySelectorAll('.strategy-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._pendingStrategy = card.dataset.id;
      };
    });

    document.getElementById('btn-fight').onclick = () => {
      try { this.show('fight', { fight }); }
      catch(e) { console.error('[btn-fight]', e); alert('Erro ao iniciar luta: ' + e.message); }
    };
  }

  _renderComparison(p, opp) {
    const rows = [
      ['Overall',      p.overall,          opp.overall],
      ['Ataque',       p.offensiveRating,  opp.offensiveRating],
      ['Defesa',       p.defensiveRating,  opp.defensiveRating],
      ['KO Power',     p.koThreat,         opp.koThreat],
      ['Resistência',  p.stamina,          opp.stamina],
      ['Ring IQ',      p.ringIQ,           opp.ringIQ],
      ['Experiência',  p.wins + p.losses,  opp.wins + opp.losses],
    ];
    return `<table class="compare-table">
      <tr><th>${p.name.split(' ')[0]}</th><th>Stat</th><th>${opp.name.split(' ')[0]}</th></tr>
      ${rows.map(([label, v1, v2]) => `
        <tr class="${v1 > v2 ? 'adv-p' : v2 > v1 ? 'adv-o' : ''}">
          <td class="cmp-val ${v1 > v2 ? 'win' : ''}">${v1}</td>
          <td class="cmp-label">${label}</td>
          <td class="cmp-val ${v2 > v1 ? 'win' : ''}">${v2}</td>
        </tr>
      `).join('')}
    </table>`;
  }
  // FIGHT
  _render_fight({ fight }) {
    const p   = this.gs.player;
    const opp = fight.opponent;

    // Engine ao vivo: o round corre num relógio comprimido e qualquer
    // tick pode produzir um golpe, knockdown ou nocaute
    const engine = new LiveFightEngine(p, opp, {
      rounds: fight.rounds,
      strategy1: this._pendingStrategy,
      strategy2: pick(STRATEGIES).id,
      bonus1: {
        confidence: this.gs.staffBonus('psychologist') + this.gs.getHomeAdvantage(fight),
        tkoResist:  this.gs.staffBonus('cutman'),
        matchup:    this.gs.staffBonus('analyst'),
      },
    });
    this.gs.nextFight = fight;

    const beltInfo  = fight.titleBelt ? getBeltInfo(fight.titleBelt) : null;
    const beltBadge = beltInfo ? `${beltInfo.icon} ${fight.beltDisplayName || getBeltDisplayName(fight.titleBelt, { year: this.gs.year, weightClass: p.weightClass })}` : (p.weightClassData?.name || '');
    const event = fight.event;
    if (event && event.excitement === undefined) event.excitement = 35;

    this.root.innerHTML = `
      <div class="screen fight-screen">
        <div class="fight-top-bar">
          <div class="fight-event-name">${fight.promoter.name}${event ? ` · ${event.arena.name}` : ''}</div>
          <div class="fight-rounds-badge">${fight.rounds} Rounds · ${beltBadge}</div>
        </div>
        ${event ? `
          <div class="fight-venue-bar">
            <span>${event.hostCity} · ${NAMES[event.hostNation]?.flag || ''}</span>
            <span>${event.attendance.toLocaleString('pt-BR')} torcedores</span>
            <span>Arena ${event.arena.globalLevel}/20</span>
            <span>${this._billingLabel(event.billing)}</span>
          </div>
        ` : ''}

        <div class="live-clock-bar">
          <span class="live-round" id="lv-round">ROUND 1</span>
          <span class="live-clock" id="lv-clock">3:00</span>
          <span class="live-speed">
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="2">2x</button>
            <button class="speed-btn" data-speed="4">4x</button>
          </span>
        </div>

        <canvas id="ring-canvas" width="560" height="280" class="ring-canvas"></canvas>

        <div class="live-hud">
          <div class="live-fighter">
            <div class="lvf-name">${p.name.split(' ')[0].toUpperCase()}</div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="hp1" style="width:100%;background:#2ecc71"></div></div>
            <div class="bar-label-row"><span>HP</span><span id="hp1t">100%</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="st1" style="width:100%;background:#f4a261"></div></div>
            <div class="bar-label-row"><span>STM</span><span id="st1t">100%</span></div>
            <div class="kd-count" id="kd1"></div>
          </div>
          <div class="live-vs">VS</div>
          <div class="live-fighter">
            <div class="lvf-name">${opp.name.split(' ')[0].toUpperCase()}</div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="hp2" style="width:100%;background:#2ecc71"></div></div>
            <div class="bar-label-row"><span>HP</span><span id="hp2t">100%</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar" id="st2" style="width:100%;background:#f4a261"></div></div>
            <div class="bar-label-row"><span>STM</span><span id="st2t">100%</span></div>
            <div class="kd-count" id="kd2"></div>
          </div>
        </div>

        <div class="live-feed" id="live-feed">
          <div class="commentary-line">🔔 Começa a luta! ${p.name.split(' ')[0]} vs ${opp.name.split(' ')[0]}!</div>
        </div>

        <div id="corner-panel" class="corner-panel" style="display:none"></div>
        <div id="end-panel" class="corner-panel" style="display:none"></div>

        <div class="scorecard" id="lv-scorecard" style="display:none"></div>
      </div>
    `;

    // Animação em modo orientado a eventos: só golpes reais geram trocações
    const canvas = document.getElementById('ring-canvas');
    this.fightAnim = new RingAnimation(canvas, p, opp);
    this.fightAnim.eventDriven = true;
    this.fightAnim.setIntensity(0.35);
    if (event?.arena) this.fightAnim.setArena(event.arena);
    else this.fightAnim.setCrowdSize(this.gs.calcCrowdLevel(fight, p, opp));
    this.fightAnim.start();

    const feed = document.getElementById('live-feed');
    const addLine = (text, cls = '') => {
      if (!text) return;
      const div = document.createElement('div');
      div.className = 'commentary-line ' + cls;
      const t = Math.max(0, engine.roundLen - engine.clock);
      const mm = Math.floor(t / 60), ss = Math.floor(t % 60).toString().padStart(2, '0');
      div.innerHTML = `<span class="feed-time">R${engine.round} ${mm}:${ss}</span> ${text}`;
      feed.prepend(div);
      while (feed.children.length > 30) feed.removeChild(feed.lastChild);
    };

    const updateBars = () => {
      const set = (id, val, isHp) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.width = val + '%';
        if (isHp) el.style.background = val < 30 ? '#e63946' : '#2ecc71';
        const t = document.getElementById(id + 't');
        if (t) t.textContent = Math.round(val) + '%';
      };
      set('hp1', engine.s1.hp, true);  set('st1', engine.s1.stamina, false);
      set('hp2', engine.s2.hp, true);  set('st2', engine.s2.stamina, false);
      const k1 = document.getElementById('kd1'), k2 = document.getElementById('kd2');
      if (k1) k1.textContent = engine.s1.knockdowns ? '⬇️'.repeat(engine.s1.knockdowns) : '';
      if (k2) k2.textContent = engine.s2.knockdowns ? '⬇️'.repeat(engine.s2.knockdowns) : '';
    };

    const updateClock = () => {
      const remaining = Math.max(0, engine.roundLen - engine.clock);
      const mm = Math.floor(remaining / 60);
      const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
      const c = document.getElementById('lv-clock');
      if (c) c.textContent = `${mm}:${ss}`;
      const rd = document.getElementById('lv-round');
      if (rd) rd.textContent = `ROUND ${engine.round}`;
    };

    const renderScorecard = () => {
      const sc = document.getElementById('lv-scorecard');
      if (!sc || engine.roundScores.length === 0) return;
      sc.style.display = 'block';
      let t1 = 0, t2 = 0;
      sc.innerHTML = `<table>
        <tr><th>Rd</th><th>${p.name.split(' ')[0]}</th><th>${opp.name.split(' ')[0]}</th></tr>
        ${engine.roundScores.map(r => {
          t1 += r.s1; t2 += r.s2;
          return `<tr><td>${r.round}</td><td class="${r.s1 > r.s2 ? 'sc-win' : ''}">${r.s1}</td><td class="${r.s2 > r.s1 ? 'sc-win' : ''}">${r.s2}</td></tr>`;
        }).join('')}
        <tr class="sc-total"><td>Total</td><td>${t1}</td><td>${t2}</td></tr>
      </table>`;
    };

    // Corner entre rounds: troca de estratégia
    const showCorner = (ev) => {
      const panel = document.getElementById('corner-panel');
      const roundDamage = (ev.dmg1 || 0) + (ev.dmg2 || 0);
      let crowdReaction = '';
      if (roundDamage < 5) {
        crowdReaction = 'A torcida vaia o ritmo lento do round.';
        if (event) event.excitement = clamp(event.excitement - 6, 0, 100);
        this.fightAnim.booCrowd();
      } else if (roundDamage >= 16) {
        crowdReaction = 'A arena se levanta para aplaudir o ritmo intenso.';
        if (event) event.excitement = clamp(event.excitement + 6, 0, 100);
        this.fightAnim.reactCrowd(roundDamage >= 22);
      }
      panel.style.display = 'block';
      panel.innerHTML = `
        <div class="corner-title">🪑 CORNER — Fim do Round ${ev.round}</div>
        <p class="corner-summary">${ev.text}</p>
        ${crowdReaction ? `<p class="corner-summary">${crowdReaction}</p>` : ''}
        <p class="muted">Ajuste a estratégia para o próximo round:</p>
        <div class="strategy-grid corner-strats">
          ${STRATEGIES.map(s => `
            <div class="strategy-card ${s.id === engine.strategy1 ? 'selected' : ''}" data-id="${s.id}">
              <div class="strat-name">${s.name}</div>
              <div class="strat-desc">${s.desc}</div>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary btn-lg" id="btn-bell">🔔 Tocar o Gongo</button>
      `;
      panel.querySelectorAll('.strategy-card').forEach(card => {
        card.onclick = () => {
          panel.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          engine.setStrategy(card.dataset.id);
        };
      });
      document.getElementById('btn-bell').onclick = () => {
        panel.style.display = 'none';
        this.fightAnim.resetRound();
        engine.startNextRound();
      };
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const showEnd = (result) => {
      if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
      const panel = document.getElementById('end-panel');
      panel.style.display = 'block';
      const won = result.winnerFighter?.id === p.id;
      const neutral = result.isDraw || result.isNoContest;
      const controversy = result.isControversial
        ? 'A decisao divide a arena e provoca uma forte reacao da torcida.'
        : '';
      if (result.isControversial) {
        if (event) event.excitement = clamp(event.excitement + 8, 0, 100);
        this.fightAnim.reactCrowd(true);
        addLine(controversy, 'feed-big');
      }
      panel.innerHTML = `
        <div class="corner-title">${result.isNoContest ? '⚖️ SEM RESULTADO' : result.isDraw ? '🤝 EMPATE' : won ? '🏆 VITÓRIA' : '💔 DERROTA'}</div>
        <p class="corner-summary">${result.method}${!neutral ? ` — Round ${result.round}` : ''}</p>
        ${controversy ? `<p class="corner-summary">${controversy}</p>` : ''}
        <button class="btn btn-primary btn-lg" id="btn-result">Ver Resultado Completo →</button>
      `;
      document.getElementById('btn-result').onclick = () => {
        try {
          this.gs.processFightResult(engine);
          this.gs.advanceWeeks(1);
          this.gs.save();
          this.show('postFight', { sim: engine, fight });
        } catch (e) {
          console.error('[btn-result] erro ao processar resultado:', e);
          alert('Erro ao processar resultado: ' + e.message);
        }
      };
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // A animação e o feed reagem aos eventos REAIS da engine
    engine.on(ev => {
      switch (ev.type) {
        case 'punch':
          this.fightAnim.punch(ev.who, ev.big);
          if (event) event.excitement = clamp(event.excitement + (ev.big ? 3 : 0.25), 0, 100);
          if (ev.text) addLine(ev.text, ev.big ? 'feed-big' : '');
          break;
        case 'miss':
          if (ev.text) addLine(ev.text, 'feed-muted');
          break;
        case 'knockdown':
          this.fightAnim.knockdown(ev.who);
          if (event) event.excitement = clamp(event.excitement + 14, 0, 100);
          addLine(ev.text, 'feed-kd');
          // Pausar o timer e iniciar a contagem
          if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
          setTimeout(() => startCountdown(ev.who), 400);
          break;
        case 'getup':
          this.fightAnim.getUp(ev.who);
          addLine(ev.text, 'feed-kd');
          break;
        case 'ko':
          this.fightAnim.ko(ev.who);
          if (event) event.excitement = clamp(event.excitement + 18, 0, 100);
          addLine(ev.text, 'feed-kd');
          break;
        case 'comment':
          addLine(ev.text, 'feed-muted');
          break;
        case 'roundEnd':
          addLine(ev.text, 'feed-round');
          renderScorecard();
          this.fightAnim.enterCorner();
          showCorner(ev);
          break;
        case 'roundStart':
          addLine(ev.text, 'feed-round');
          break;
        case 'fightEnd':
          renderScorecard();
          showEnd(ev.result);
          break;
      }
      updateBars();
    });

    // Velocidade: 1x = round de 3min em ~30s reais
    this.fightSpeed = 1;
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.fightSpeed = parseInt(btn.dataset.speed);
      };
    });

    // Countdown 1–10 após knockdown; pausa o timer e chama engine.resolveKnockdown()
    const startCountdown = (who) => {
      const kd = engine._pendingKD;
      if (!kd) return;

      const screen = document.querySelector('.fight-screen');
      const overlay = document.createElement('div');
      overlay.className = 'kd-overlay';
      overlay.innerHTML = `
        <div class="kd-count-num" id="kd-count-num">1</div>
        <div class="kd-count-label">CONTAGEM</div>
        <div class="kd-fighter-name">${kd.bName.toUpperCase()} ESTÁ NO CHÃO</div>
      `;
      screen.appendChild(overlay);

      let count = 0;
      const delay = () => Math.max(80, 600 / this.fightSpeed);

      const step = () => {
        count++;
        const el = document.getElementById('kd-count-num');
        if (el) {
          el.textContent = count;
          el.classList.remove('kd-pulse');
          void el.offsetWidth; // reflow para reiniciar animação
          el.classList.add('kd-pulse');
        }

        // Lutador pode se levantar a partir da contagem 5
        if (count >= 5) {
          const perCountChance = 1 - Math.pow(1 - kd.getUpChance, 1 / 6);
          if (Math.random() < perCountChance) {
            overlay.remove();
            engine.resolveKnockdown(true);
            if (engine.phase === 'over') return;
            this.fightTimer = setInterval(() => {
              engine.tick(0.6 * this.fightSpeed);
              updateClock();
              updateBars();
            }, 100);
            return;
          }
        }

        if (count >= 10) {
          overlay.remove();
          engine.resolveKnockdown(false);
          return;
        }

        setTimeout(step, delay());
      };

      setTimeout(step, delay());
    };

    // Loop: tick a cada 100ms; 0.6s de jogo por tick a 1x
    this.fightTimer = setInterval(() => {
      engine.tick(0.6 * this.fightSpeed);
      updateClock();
      updateBars();
    }, 100);
  }
  // FIGHT CAMP
  _render_fightCamp({ fight }) {
    this._pendingFight  = fight;
    this._trainFocuses  = [];
    const p   = this.gs.player;
    const opp = fight.opponent;
    const campWeeks = Math.max(0, (fight.weeksToFight || 6) - 1);
    const belt = fight.titleBelt ? getBeltInfo(fight.titleBelt) : null;

    const focusCards = TRAINING_FOCUSES.map(f => `
      <div class="focus-card" data-id="${f.id}">
        <div class="focus-name">${f.name}</div>
        <div class="focus-attrs">${f.attrs.map(a => this._attrShortLabel(a)).join(', ')}</div>
      </div>
    `).join('');

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">🏕️ Fight Camp</h1>
        ${fight.isUnification
          ? `<div class="camp-belt-banner" style="background:#9b59b620;border-color:#9b59b6">⚡ LUTA DE UNIFICAÇÃO — ${belt ? belt.icon + ' ' + (fight.beltDisplayName || getBeltDisplayName(fight.titleBelt, { year: this.gs.year, weightClass: p.weightClass })).toUpperCase() : ''} E ${getBeltInfo(fight.myBelt || '').icon || ''} SEU CINTURÃO EM JOGO</div>`
          : belt ? `<div class="camp-belt-banner" style="background:${belt.color}22;border-color:${belt.color}">${belt.icon} EM JOGO: ${(fight.beltDisplayName || getBeltDisplayName(fight.titleBelt, { year: this.gs.year, weightClass: p.weightClass })).toUpperCase()}${fight.vacant && belt.tier >= 4 ? ' — VAGO' : ''}</div>` : ''}
        <div class="camp-matchup">
          <span class="camp-fighter">${p.displayName}</span>
          <span class="camp-vs">VS</span>
          <span class="camp-fighter">${opp.displayName}</span>
        </div>
        <div class="camp-meta">
          <span>⏳ <strong>${campWeeks}</strong> semanas de preparo</span>
          <span>🎪 ${fight.promoter?.name || ''}</span>
          <span>💰 Bolsa: <strong class="gold">${formatCurrency(fight.purse)}</strong></span>
          <span>🔔 ${fight.rounds} rounds</span>
        </div>

        ${campWeeks > 0 ? `
          <div class="camp-training">
            <h3>Treino durante o camp <span class="muted">(opcional, máx. 3 focos)</span></h3>
            <p class="muted">Escolha focos de treino ou deixe em branco para descansar e se preparar mentalmente.</p>
            <div class="focus-grid">${focusCards}</div>
            <p class="muted">Custo: <strong class="gold" id="camp-cost-lbl">${formatCurrency(0)}</strong></p>
            ${this.gs.staffBonus('coach') > 0 ? `<p class="muted green">🧠 Técnico: ganhos reduzidos no camp de luta (60%)</p>` : ''}
            ${p.gym?.level > 0 ? `<p class="muted green">${GYM_LEVELS[p.gym.level].icon} ${GYM_LEVELS[p.gym.level].name}: +${Math.round(GYM_LEVELS[p.gym.level].gainBonus*100)}% ganho</p>` : ''}
          </div>
        ` : '<p class="muted" style="margin:16px 0">Luta em 1 semana — sem tempo para treino estruturado.</p>'}

        <div class="camp-sparrings">
          <h3>Contratar Sparrings <span class="muted">(opcional, máx. 2)</span></h3>
          <p class="muted">Bônus temporário de atributo apenas para esta luta.</p>
          <div class="sparring-grid">
            ${SPARRING_TYPES.map(s => `
              <div class="sparring-card" data-id="${s.id}">
                <span class="sparring-icon">${s.icon}</span>
                <div class="sparring-name">${s.name}</div>
                <div class="sparring-attrs">${Object.entries(s.attrs).map(([a,v]) => `+${v} ${this._attrShortLabel(a)}`).join(' · ')}</div>
                <div class="sparring-cost gold">${formatCurrency(s.cost)}</div>
              </div>
            `).join('')}
          </div>
          <p class="muted">Sparrings contratados: <strong id="sparring-count">0</strong> · Custo extra: <strong class="gold" id="sparring-cost-lbl">${formatCurrency(0)}</strong></p>
        </div>

        <div class="create-footer">
          <button class="btn btn-ghost" id="btn-back">← Cancelar Luta</button>
          <button class="btn btn-primary btn-lg" id="btn-fight-night">🥊 Pronto! Noite de Luta →</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('fightSelect');

    // Sparrings
    this._selectedSparrings = [];
    document.querySelectorAll('.sparring-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        if (this._selectedSparrings.includes(id)) {
          this._selectedSparrings = this._selectedSparrings.filter(x => x !== id);
          card.classList.remove('selected');
        } else if (this._selectedSparrings.length < 2) {
          this._selectedSparrings.push(id);
          card.classList.add('selected');
        }
        const spCost = this._selectedSparrings.reduce((s, sid) => s + (SPARRING_TYPES.find(x => x.id === sid)?.cost || 0), 0);
        document.getElementById('sparring-count').textContent = this._selectedSparrings.length;
        document.getElementById('sparring-cost-lbl').textContent = formatCurrency(spCost);
      };
    });

    if (campWeeks > 0) {
      document.querySelectorAll('.focus-card').forEach(card => {
        card.onclick = () => {
          const id = card.dataset.id;
          if (this._trainFocuses.includes(id)) {
            this._trainFocuses = this._trainFocuses.filter(x => x !== id);
            card.classList.remove('selected');
          } else if (this._trainFocuses.length < 3) {
            this._trainFocuses.push(id);
            card.classList.add('selected');
          }
          const cost = this._trainFocuses.length > 0 ? campWeeks * TRAINING_COST_PER_WEEK : 0;
          document.getElementById('camp-cost-lbl').textContent = formatCurrency(cost);
        };
      });
    }

    document.getElementById('btn-fight-night').onclick = () => { try {
      if (campWeeks > 0 && this._trainFocuses.length > 0) {
        const cost = campWeeks * TRAINING_COST_PER_WEEK;
        if (p.money < cost) {
          this._toast(`Dinheiro insuficiente para o camp! (${formatCurrency(cost)})`);
          return;
        }
        p.money -= cost;
        const gymB2 = this.gs.gymBonus();
        const camp = new TrainingCamp(p, campWeeks, this._trainFocuses, {
          gain: this.gs.staffBonus('coach') * 0.6 + gymB2.gain,
          risk: this.gs.staffBonus('physio') + gymB2.risk,
        });
        const result = camp.simulate();
        if (result.injury) {
          this._toast(`⚠️ Lesão no camp! ${result.injury.desc} — ${result.injury.weeks} semanas`);
          this.gs.advanceWeeks(campWeeks, { trained: true });
          this.gs.save();
          this.show('careerHub');
          return;
        }
      } else if (campWeeks > 0) {
        // No training selected, just rest
      }
      if (campWeeks > 0) this.gs.advanceWeeks(campWeeks);

      // Aplicar boosts de sparring temporariamente no fighter (restaurar após luta)
      const spCost = this._selectedSparrings.reduce((s, sid) => s + (SPARRING_TYPES.find(x => x.id === sid)?.cost || 0), 0);
      if (spCost > 0 && p.money >= spCost) {
        p.money -= spCost;
        const boosts = {};
        for (const sid of this._selectedSparrings) {
          const sp = SPARRING_TYPES.find(x => x.id === sid);
          if (sp) for (const [attr, val] of Object.entries(sp.attrs)) boosts[attr] = (boosts[attr] || 0) + val;
        }
        fight._sparringRestore = {};
        for (const [attr, val] of Object.entries(boosts)) {
          fight._sparringRestore[attr] = p[attr];
          p[attr] = clamp((p[attr] || 50) + val, 1, 99);
        }
        fight._sparringIds = [...this._selectedSparrings];
      }

      this.gs.nextFight = fight;
      this.gs.save();
      const mediaScope = this._majorFightMediaScope(fight);
      if (mediaScope && !fight.preFightInterviewDone) {
        const questions = pickPreFightQuestions(mediaScope, this.gs.getUsedInterviewQuestionIds());
        this.show('preFightInterview', { questions, fight, mediaScope });
      } else {
        this.show('preFight', { fight });
      }
    } catch(e) { console.error('[btn-fight-night]', e); alert('Erro ao iniciar camp: ' + e.message); } };
  }
  // ATHLETE STATS
  _render_athleteStats() {
    const p    = this.gs.player;
    const nat  = NAMES[p.nationality];
    const wc   = p.weightClassData;
    const sty  = p.style;
    const pers = p.personality;
    const syn  = getSynergy(p.styleId, p.personalityId);

    const groups = [
      { title: '⚡ Físico', attrs: [
        ['Força',       p.strength],  ['Velocidade',  p.speed],
        ['Resistência', p.stamina],   ['Queixo',      p.chin],
        ['Reflexos',    p.reflexes],
      ]},
      { title: '🥊 Técnico', attrs: [
        ['Jab',          p.jab],       ['Direto',      p.straight],
        ['Cruzado',      p.cross],     ['Uppercut',    p.uppercut],
        ['Defesa',       p.defense],   ['Jogo de Pés', p.footwork],
        ['Combinações',  p.combinations], ['Precisão', p.precision],
        ['Ring IQ',      p.ringIQ],    ['Soco no Corpo', p.bodyPunch],
      ]},
      { title: '🧠 Mental', attrs: [
        ['Coragem',    p.courage],  ['Equilíbrio', p.composure],
        ['Resiliência', p.resilience],
      ]},
    ];

    const bar = ([label, val]) => {
      const cls = val >= 80 ? 'bar-elite' : val >= 65 ? 'bar-good' : '';
      return `
        <div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="mini-bar"><div class="mini-bar-fill ${cls}" style="width:${val}%"></div></div>
          <span class="bar-num ${val >= 80 ? 'gold' : ''}">${val}</span>
        </div>`;
    };

    const trait = nat?.trait;

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Ficha do Atleta</h1>
        <div class="ap-header">
          <div class="ap-avatar">${this._styleIcon(p.styleId)}</div>
          <div class="ap-identity">
            <div class="ap-name">${p.displayName}</div>
            <div class="ap-sub">${nat?.flag || ''} ${nat?.nation || ''} · ${wc?.name || ''} · ${p.age} anos</div>
            <div class="ap-record">${p.record} · ${p.kos + p.tkos} KOs · ${p.careerWinPct}% vitórias</div>
            <div class="ap-meta">Estilo: <strong>${sty?.name || ''}</strong> · Personalidade: <strong>${pers?.name || ''}</strong></div>
            <div class="ap-meta">Torcida: <strong>${p.fanReach?.local || 0} local</strong> · <strong>${p.fanReach?.national || 0} nacional</strong> · <strong>${p.fanReach?.international || 0} internacional</strong></div>
            ${((p.belts || []).length || (p.trophies || []).length) ? `
              <div class="hub-belts" style="margin-top:6px">
                ${(p.belts || []).map(b => { const bi = getBeltInfo(b); return `<span class="belt-chip" style="border-color:${bi.color}">${bi.icon} ${bi.displayName || bi.name}</span>`; }).join('')}
                ${(p.trophies || []).length ? `<span class="belt-chip" style="border-color:#b8860b;font-size:0.82em" title="${(p.trophies||[]).map(t=>t.name).join(', ')}">🏅 ${p.trophies.length} troféu${p.trophies.length>1?'s':''}</span>` : ''}
              </div>` : ''}
          </div>
          <div class="ap-ovr">
            <div class="ovr-num">${p.overall}</div>
            <div class="ovr-label">OVR</div>
          </div>
        </div>
        ${trait ? `
          <div class="trait-panel" style="margin:12px 0">
            <div class="trait-name">⭐ ${trait.name}</div>
            <div class="trait-desc">${trait.desc}</div>
          </div>` : ''}
        ${syn ? `
          <div class="trait-panel synergy-panel" style="margin:12px 0">
            <div class="trait-name">🔥 Sinergia: ${syn.label}</div>
            <div class="trait-desc">${syn.desc} <em>Seu estilo e personalidade se reforçam no ringue.</em></div>
          </div>` : ''}
        ${pers ? `
          <div class="trait-panel" style="margin:12px 0">
            <div class="trait-name">🧠 ${pers.name}</div>
            <div class="trait-desc">${pers.ringDesc || ''}</div>
          </div>` : ''}
        <div class="ap-attrs">
          ${groups.map(g => `
            <div class="ap-attr-group">
              <div class="attr-group-title">${g.title}</div>
              <div class="attr-bars-mini">${g.attrs.map(bar).join('')}</div>
            </div>`).join('')}
        </div>
        <button class="btn btn-ghost" id="btn-back" style="margin-top:16px">← Voltar</button>
      </div>
    `;
    document.getElementById('btn-back').onclick = () => this.show('careerHub');
  }

  _render_weightClass() {
    const p = this.gs.player;
    const options = this.gs.getWeightClassOptions();
    const heldBelts = (p.belts || []).map(belt => getBeltInfo(belt).name);
    const directionInfo = {
      up: {
        title: 'Subir de divisão',
        benefits: '+3 Força, +2 Queixo, +1 Durabilidade, maior repercussão e bolsas futuras',
        costs: '-1 Velocidade, 6 semanas de adaptação e queda inicial no ranking',
      },
      down: {
        title: 'Descer de divisão',
        benefits: '+2 Velocidade, +2 Reflexos, +1 Jogo de Pés',
        costs: '-2 Força, -2 Queixo, 8 semanas de corte e desgaste físico maior',
      },
    };

    this.root.innerHTML = `
      <div class="screen weight-class-screen">
        <h1 class="screen-title">⚖️ Mudança de Divisão</h1>
        <div class="weight-current-card">
          <span>DIVISÃO ATUAL</span>
          <strong>${p.weightClassData?.name}</strong>
          <small>Ranking #${this.gs.getPlayerRanking() || '?'} · Limite ${p.weightClassData?.limit_kg >= 900 ? 'Livre' : `${p.weightClassData?.limit_kg} kg`}</small>
        </div>
        ${p.weightTransition ? `
          <div class="weight-adaptation-card">
            <h3>Adaptação em andamento</h3>
            <p>Restam <strong>${p.weightTransition.weeksRemaining} semana(s)</strong>. Os atributos temporariamente afetados retornam gradualmente.</p>
            <div class="weight-progress"><span style="width:${Math.round((1 - p.weightTransition.weeksRemaining / p.weightTransition.totalWeeks) * 100)}%"></span></div>
          </div>
        ` : ''}
        ${heldBelts.length ? `
          <div class="weight-warning">
            <strong>Atenção:</strong> a mudança deixará ${heldBelts.join(', ')} vago(s). Eles continuarão registrados no seu legado.
          </div>
        ` : ''}
        <div class="weight-options">
          ${options.map(option => {
            const check = this.gs.canChangeWeightClass(option.id);
            const info = directionInfo[option.direction];
            return `
              <article class="weight-option-card ${check.ok ? '' : 'disabled'}">
                <div class="weight-direction">${option.direction === 'up' ? '↑' : '↓'} ${info.title}</div>
                <h2>${option.name}</h2>
                <div class="weight-limit">${option.limit_kg >= 900 ? 'Sem limite' : `Até ${option.limit_kg} kg`}</div>
                <p class="weight-benefit"><strong>Recompensas:</strong> ${info.benefits}</p>
                <p class="weight-cost"><strong>Consequências:</strong> ${info.costs}</p>
                ${check.ok
                  ? `<button class="btn btn-primary btn-change-weight" data-weight="${option.id}">Escolher ${option.name}</button>`
                  : `<div class="weight-blocked">${check.reason}</div>`}
              </article>
            `;
          }).join('')}
        </div>
        <p class="muted text-center">Uma nova mudança só poderá ocorrer 26 semanas depois e apenas para uma divisão adjacente.</p>
        <button class="btn btn-ghost" id="btn-back-weight">← Voltar</button>
      </div>
    `;

    document.querySelectorAll('.btn-change-weight').forEach(btn => {
      btn.onclick = () => {
        const target = WEIGHT_CLASSES.find(w => w.id === btn.dataset.weight);
        const beltWarning = heldBelts.length ? ` Você abrirá mão de ${heldBelts.length} cinturão(ões) ativo(s).` : '';
        if (!confirm(`Confirmar mudança para ${target.name}?${beltWarning}`)) return;
        const result = this.gs.changeWeightClass(target.id);
        if (!result.ok) {
          this._toast(result.reason);
          this.show('weightClass');
          return;
        }
        this.gs.save();
        this._toast(`Mudança para ${target.name} confirmada.`);
        this.show('careerHub');
      };
    });
    document.getElementById('btn-back-weight').onclick = () => this.show('careerHub');
  }
  // POST-FIGHT
  _render_postFight({ sim, fight }) {
    const r     = sim.finalResult;
    const p     = this.gs.player;
    const opp   = fight.opponent;
    const isWin = r && !r.isDraw && !r.isNoContest && r.winnerFighter?.id === p.id;
    const isDraw= r?.isDraw;
    const isNoContest = r?.isNoContest;

    const fightNews = this.newsGen.generateFightNews(sim, fight);
    const fans      = this.newsGen.getFanComments(5, { fight, result: r });
    const show      = this.newsGen.generateShowSegment('post_fight', { fight, result: r });

    const isKO = isKnockoutResult(r?.method);
    const hasBelt = !!fight?.titleBelt;
    const beltTier = hasBelt ? (getBeltInfo(fight.titleBelt)?.tier || 0) : 0;
    const isWorldBelt = beltTier >= 4;   // continental (4) or world (5)
    const isTrophy    = hasBelt && beltTier <= 3; // local / regional / national
    const tournResult = this.gs.lastFightResult?._tournamentResult;
    const trophyName  = isTrophy ? (fight.beltDisplayName || getBeltDisplayName(fight.titleBelt, { year: this.gs.year, weightClass: p.weightClass })) : '';
    const moment = tournResult?.type === 'tournament-win'       ? 'tournament-win'
      : tournResult?.type === 'tournament-eliminated' ? 'tournament-eliminated'
      : tournResult?.type === 'tournament-advance'    ? 'tournament-advance'
      : isNoContest ? 'no-contest'
      : isDraw      ? 'draw'
      : isWin && isWorldBelt  ? 'title-win'
      : !isWin && !isDraw && isWorldBelt ? 'title-loss'
      : isWin && isTrophy     ? 'trophy-win'
      : !isWin && !isDraw && isTrophy ? 'trophy-loss'
      : isWin && isKO   ? 'ko-win'
      : !isWin && !isDraw && isKO ? 'ko-loss'
      : isWin  ? 'win'
      : 'loss';

    const momentCfg = {
      'title-win':   { emoji: '👑', word: 'CAMPEÃO!',       tagline: 'O cinturão é seu.',                  wordClass: 'word-title-win' },
      'title-loss':  { emoji: '💔', word: 'DERROTA',        tagline: 'O título mudou de mãos.',             wordClass: 'word-loss' },
      'trophy-win':  { emoji: '🏅', word: 'TÍTULO!',        tagline: trophyName ? `${trophyName} conquistado.` : 'Mais um título no legado.', wordClass: 'word-win' },
      'trophy-loss': { emoji: '📉', word: 'DERROTA',        tagline: 'O título ficou com o adversário.',    wordClass: 'word-loss' },
      'ko-win':      { emoji: '💥', word: 'NOCAUTE!',       tagline: `${r?.method || 'KO'} — Round ${r?.round}. Noite perfeita.`, wordClass: 'word-ko' },
      'ko-loss':     { emoji: '😵', word: 'NOCAUTE',        tagline: 'Hora de reconstruir.',                wordClass: 'word-loss' },
      'win':         { emoji: '✅', word: 'VITÓRIA',        tagline: 'Mais uma no cartel.',                 wordClass: 'word-win' },
      'loss':        { emoji: '📉', word: 'DERROTA',        tagline: 'Toda derrota ensina.',                wordClass: 'word-loss' },
      'draw':        { emoji: '🤝', word: 'EMPATE',         tagline: 'A decisão dividiu opiniões.',         wordClass: 'word-draw' },
      'no-contest':  { emoji: '⚖️', word: 'SEM RESULTADO', tagline: 'O resultado foi anulado.',            wordClass: 'word-draw' },
      'tournament-win':       { emoji: '🏆', word: 'CAMPEÃO!',  tagline: `${tournResult?.name || 'Torneio'} conquistado! Bolsa: $${(tournResult?.prize||0).toLocaleString()}`, wordClass: 'word-title-win' },
      'tournament-advance':   { emoji: '⬆️', word: 'AVANÇOU!',  tagline: `Classificado para ${tournResult?.round || 'próxima fase'}.`, wordClass: 'word-win' },
      'tournament-eliminated':{ emoji: '❌', word: 'ELIMINADO', tagline: 'O torneio terminou aqui. Hora de reconstruir.',              wordClass: 'word-loss' },
    }[moment];

    const beltWon = isWin && hasBelt ? { ...getBeltInfo(fight.titleBelt), displayName: fight.beltDisplayName || getBeltDisplayName(fight.titleBelt, { year: this.gs.year, weightClass: p.weightClass }) } : null;

    this.root.innerHTML = `
      <div class="screen postfight-screen">
        <div class="result-banner moment-${moment}">
          <div class="result-emoji">${momentCfg.emoji}</div>
          <div class="result-word ${momentCfg.wordClass}">${momentCfg.word}</div>
          <div class="result-tagline">${momentCfg.tagline}</div>
          ${beltWon ? `
            <div class="belt-won-badge" style="border-color:${beltWon.color}">
              ${beltWon.icon} ${beltWon.displayName || beltWon.name}
            </div>
          ` : ''}
          <div class="result-method">${r?.method || ''} ${!isDraw && !isNoContest && !isKO ? `— Round ${r?.round}` : ''}</div>
        </div>

        <div class="postfight-grid">
          <!-- Left: Stats & News -->
          <div class="postfight-left">
            <div class="pf-section">
              <h3>📊 Estatísticas da Luta</h3>
              <div class="fight-stats">
                <div class="fstat"><span>Dano causado (${p.name.split(' ')[0]})</span><span>${sim.s2.totalDmg.toFixed(1)}</span></div>
                <div class="fstat"><span>Dano sofrido</span><span>${sim.s1.totalDmg.toFixed(1)}</span></div>
                <div class="fstat"><span>Knockdowns causados</span><span>${sim.s2.knockdowns}</span></div>
                <div class="fstat"><span>Knockdowns sofridos</span><span>${sim.s1.knockdowns}</span></div>
              </div>
            </div>

            <div class="pf-section">
              <h3>📰 Repercussão na Mídia</h3>
              ${fightNews.map(n => `<div class="news-item"><span class="news-text">${n.headline}</span></div>`).join('')}
            </div>

            <div class="pf-section">
              <h3>📱 Redes Sociais</h3>
              <div class="fans-list">
                ${fans.map(f => `
                  <div class="fan-comment">
                    <span class="fan-user">${f.user}</span>
                    <span class="fan-text">${f.text}</span>
                    <span class="fan-likes">❤️ ${f.likes}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right: Show + Career Update -->
          <div class="postfight-right">
            <div class="pf-section">
              <h3>${show.title} — ${show.segment}</h3>
              <div class="show-segment">
                ${show.lines.map(l => `
                  <div class="show-line">
                    <span class="show-host">${l.host.emoji} <strong>${l.host.name}</strong> (${l.host.role})</span>
                    <span class="show-quote">${l.text}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="pf-section career-update">
              <h3>📈 Atualização de Carreira</h3>
              <div class="career-stat"><span>Cartel</span><span class="gold">${p.record}</span></div>
              <div class="career-stat"><span>Ranking</span><span>#${this.gs.getPlayerRanking() || '?'}</span></div>
              <div class="career-stat"><span>Moral</span><span>${p.morale}%</span></div>
              <div class="career-stat"><span>Dinheiro</span><span class="gold">${formatCurrency(p.money)}</span></div>
              <div class="career-stat"><span>Pagamento recebido</span><span class="gold">+${formatCurrency(this.gs.lastFightPayout || fight.purse)}</span></div>
              ${fight.event ? `
                <div class="career-stat"><span>Arena</span><span>${fight.event.arena.name}</span></div>
                <div class="career-stat"><span>Público</span><span>${fight.event.attendance.toLocaleString('pt-BR')} / ${fight.event.arena.capacity.toLocaleString('pt-BR')}</span></div>
                <div class="career-stat"><span>Bilheteria</span><span class="gold">${formatCurrency(fight.event.gate)}</span></div>
                <div class="career-stat"><span>Sua participação</span><span class="gold">+${formatCurrency(fight.event.gateShare)}</span></div>
              ` : ''}
              ${(p.belts || []).length ? `
                <div class="career-stat champ-row"><span>${p.belts.map(b => { const bi = getBeltInfo(b); return `${bi.icon} ${bi.displayName || bi.name}`; }).join(' · ')}</span></div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="create-footer">
          <button class="btn btn-primary btn-lg" id="btn-continue">Continuar Carreira →</button>
        </div>
      </div>
    `;

    document.getElementById('btn-continue').onclick = () => {
      const ctx = isNoContest ? 'draw'
                : isWin && fight?.titleBelt ? 'title_win'
                : !isWin && !isDraw && fight?.titleBelt ? 'title_loss'
                : isWin && isKnockoutResult(r?.method) ? 'ko_win'
                : !isWin && !isDraw && isKnockoutResult(r?.method) ? 'ko_loss'
                : isWin ? 'win'
                : isDraw ? 'draw'
                : 'loss';
      // Verificar aposentadoria forçada antes de qualquer outra navegação
      const forced = this.gs.checkForcedRetirement();
      if (forced) {
        this.gs.retirePlayer(forced);
        this.gs.save();
        this.show('retirement', { reason: forced, forced: true });
        return;
      }
      // Coletivas são exclusivas de campeonatos nacionais, continentais e mundiais.
      const beltTier = fight?.titleBelt ? getBeltInfo(fight.titleBelt).tier : 0;
      const worthy   = beltTier >= 3;
      const questions = worthy ? pickInterviewQuestions(ctx, this.gs.getUsedInterviewQuestionIds()) : [];
      if (questions.length) {
        this.show('interview', { questions, fight, fightCtx: ctx });
      } else {
        this.gs.generateAvailableFights();
        this.gs.save();
        this.show('careerHub');
      }
    };
  }
  // ENTREVISTA PÓS-LUTA
  _render_interview({ questions, fight, fightCtx }) {
    let current = 0;
    const answers = [];

    const rivalFighter = fight?.opponent
      ? this.gs.getRival(fight.opponent.id) || this.gs.rivals?.find(r => r.fighterId === fight.opponent?.id)
      : null;

    const renderQuestion = () => {
      const q = questions[current];
      const rivalId = rivalFighter?.fighterId || null;

      this.root.innerHTML = `
        <div class="screen interview-screen">
          <div class="interview-header">
            <div class="interview-kicker">🎙️ COLETIVA DE IMPRENSA</div>
            <div class="interview-progress">${current + 1} / ${questions.length}</div>
          </div>

          <div class="interview-card">
            <div class="interview-journalist">📰 <em>"${q.question}"</em></div>
            <div class="interview-answers">
              ${q.answers.map(a => `
                <button class="interview-answer-btn" data-qid="${q.id}" data-aid="${a.id}" data-rival="${rivalId || ''}">
                  <span class="answer-text">${a.text}</span>
                  <span class="answer-tone tone-${a.tone}">${
                    a.tone === 'aggressive' ? '🔥 Agressivo'
                    : a.tone === 'confident' ? '💪 Confiante'
                    : a.tone === 'humble' ? '🙏 Humilde'
                    : '🤝 Diplomático'
                  }</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.querySelectorAll('.interview-answer-btn').forEach(btn => {
        btn.onclick = () => {
          const qId = btn.dataset.qid;
          const aId = btn.dataset.aid;
          const rId = btn.dataset.rival ? parseInt(btn.dataset.rival) : null;
          const result = this.gs.applyInterviewAnswer(qId, aId, rId);
          if (!result) return;

          answers.push({ qId, aId });

          // Mostrar efeito brevemente
          const card = document.querySelector('.interview-card');
          const popDelta = result.effects.popularity || 0;
          const repDelta = result.effects.reputation  || 0;
          card.innerHTML = `
            <div class="interview-flavor">${result.flavor}</div>
            <div class="interview-effects">
              ${popDelta !== 0 ? `<span class="eff-chip ${popDelta > 0 ? 'eff-pos' : 'eff-neg'}">${popDelta > 0 ? '+' : ''}${popDelta} Popularidade</span>` : ''}
              ${repDelta !== 0 ? `<span class="eff-chip ${repDelta > 0 ? 'eff-pos' : 'eff-neg'}">${repDelta > 0 ? '+' : ''}${repDelta} Reputação</span>` : ''}
              ${result.effects.rivalIntensity > 0 ? `<span class="eff-chip eff-rival">🔥 Rivalidade intensificada</span>` : ''}
            </div>
            <button class="btn btn-primary" id="btn-next-q">${current + 1 < questions.length ? 'Próxima pergunta →' : 'Finalizar coletiva →'}</button>
          `;

          document.getElementById('btn-next-q').onclick = () => {
            current++;
            if (current < questions.length) {
              renderQuestion();
            } else {
              this.gs.generateAvailableFights();
              this.gs.save();
              this.show('careerHub');
            }
          };
        };
      });
    };

    renderQuestion();
  }

  _majorFightMediaScope(fight) {
    if (!fight?.titleBelt) return null;
    const tier = getBeltInfo(fight.titleBelt).tier || 0;
    if (tier >= 5) return 'world';
    if (tier === 4) return 'continental';
    if (tier === 3) return 'national';
    return null;
  }

  _render_preFightInterview({ questions, fight, mediaScope }) {
    let current = 0;
    const labels = {
      national: 'COLETIVA NACIONAL',
      continental: 'COLETIVA CONTINENTAL',
      world: 'COLETIVA MUNDIAL',
    };

    const renderQuestion = () => {
      const q = questions[current];
      this.root.innerHTML = `
        <div class="screen interview-screen">
          <div class="interview-header">
            <div class="interview-kicker">🎙️ ${labels[mediaScope] || 'COLETIVA PRÉ-LUTA'}</div>
            <div class="interview-progress">${current + 1} / ${questions.length}</div>
          </div>
          <div class="interview-card">
            <div class="interview-journalist">📰 <em>"${q.question}"</em></div>
            <div class="interview-answers">
              ${q.answers.map(a => `
                <button class="interview-answer-btn" data-qid="${q.id}" data-aid="${a.id}">
                  <span class="answer-text">${a.text}</span>
                  <span class="answer-tone tone-${a.tone}">${a.tone === 'aggressive' ? 'Agressivo' : a.tone === 'confident' ? 'Confiante' : a.tone === 'humble' ? 'Humilde' : 'Diplomático'}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>`;

      document.querySelectorAll('.interview-answer-btn').forEach(btn => {
        btn.onclick = () => {
          const result = this.gs.applyInterviewAnswer(btn.dataset.qid, btn.dataset.aid, fight.opponent?.id);
          if (!result) return;
          const card = document.querySelector('.interview-card');
          card.innerHTML = `
            <div class="interview-reaction">${result.flavor}</div>
            ${result.opponentResponse ? `
              <div class="opponent-response">
                <strong>${fight.opponent.name} responde:</strong>
                <span>${result.opponentResponse}</span>
              </div>
            ` : ''}
            <button class="btn btn-primary" id="btn-next-pre-question">
              ${current + 1 < questions.length ? 'Próxima pergunta →' : 'Ir para a encarada →'}
            </button>
          `;
          document.getElementById('btn-next-pre-question').onclick = () => {
            current++;
            if (current < questions.length) renderQuestion();
            else this.show('faceOff', { fight, mediaScope });
          };
        };
      });
    };

    if (!questions.length) {
      this.show('faceOff', { fight, mediaScope });
      return;
    }
    renderQuestion();
  }

  _render_faceOff({ fight, mediaScope }) {
    this.root.innerHTML = `
      <div class="screen faceoff-screen">
        <div class="interview-header">
          <div class="interview-kicker">📸 ENCARADA OFICIAL</div>
          <div class="interview-progress">${String(mediaScope || 'evento').toUpperCase()}</div>
        </div>
        <div class="faceoff-stage">
          <div class="faceoff-fighter">
            <span>VOCÊ</span>
            <strong>${this.gs.player.displayName}</strong>
          </div>
          <div class="faceoff-vs">VS</div>
          <div class="faceoff-fighter">
            <span>ADVERSÁRIO</span>
            <strong>${fight.opponent.name}</strong>
          </div>
        </div>
        <p class="muted faceoff-prompt">Escolha sua postura diante das câmeras.</p>
        <div class="faceoff-actions">
          ${FACE_OFF_CHOICES.map(choice => `
            <button class="interview-answer-btn" data-choice="${choice.id}">
              <span class="answer-text">${choice.label}</span>
              <span class="answer-tone tone-${choice.tone}">${choice.tone}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.querySelectorAll('[data-choice]').forEach(btn => {
      btn.onclick = () => {
        const result = this.gs.applyFaceOffChoice(btn.dataset.choice, fight.opponent.id);
        if (!result) return;
        fight.preFightInterviewDone = true;
        fight.faceOffDone = true;
        this.gs.nextFight = fight;
        this.gs.save();
        this._toast('A encarada repercutiu na imprensa.');
        this.show('preFight', { fight });
      };
    });
  }

  _render_mediaCrisis() {
    const crisis = this.gs.mediaCrisis;
    if (!crisis) { this.show('careerHub'); return; }

    const p = this.gs.player;
    const template = MEDIA_CRISES.find(c => c.id === crisis.crisisType);
    const responses = template?.responses || MEDIA_CRISIS_RESPONSES;
    const pid = p?.personalityId || '';
    const personalityLabel = p?.personality?.name || '';

    const fmtDelta = (base, bonus) => {
      const total = base + (bonus || 0);
      const sign = total >= 0 ? '+' : '';
      const bonusStr = bonus ? ` <span class="crisis-personality-bonus">(${bonus >= 0 ? '+' : ''}${bonus} ${personalityLabel})</span>` : '';
      return `${sign}${total}${bonusStr}`;
    };

    const responseHtml = responses.map(r => {
      const bonus = r.personalityBonus?.[pid] || {};
      const popTotal = r.popularity + (bonus.popularity || 0);
      const repTotal = r.reputation  + (bonus.reputation  || 0);
      const hasPersBonus = bonus.popularity || bonus.reputation;
      const badgeClass = hasPersBonus
        ? (popTotal + repTotal > r.popularity + r.reputation ? 'crisis-badge-boost' : 'crisis-badge-penalty')
        : '';
      return `
        <button class="interview-answer-btn crisis-response-btn" data-response="${r.id}">
          <div class="crisis-response-header">
            <span class="crisis-response-icon">${r.icon || '💬'}</span>
            <span class="answer-text">${r.label}</span>
            ${hasPersBonus ? `<span class="crisis-personality-badge ${badgeClass}">${personalityLabel}</span>` : ''}
          </div>
          <div class="crisis-response-effects">
            <span class="${popTotal >= 0 ? 'stat-pos' : 'stat-neg'}">👥 ${fmtDelta(r.popularity, bonus.popularity)}</span>
            <span class="${repTotal >= 0 ? 'stat-pos' : 'stat-neg'}">⭐ ${fmtDelta(r.reputation, bonus.reputation)}</span>
          </div>
        </button>`;
    }).join('');

    this.root.innerHTML = `
      <div class="screen media-crisis-screen">
        <div class="media-crisis-card">
          <div class="interview-kicker">⚠️ CRISE DE IMAGEM</div>
          <h1>${crisis.headline}</h1>
          <p class="crisis-subtext">A repercussão continuará até que você escolha uma resposta pública. Sua personalidade <strong>${personalityLabel}</strong> influencia o resultado.</p>
          <div class="media-crisis-actions">${responseHtml}</div>
        </div>
        <button class="btn btn-ghost" id="btn-back-crisis">← Voltar</button>
      </div>
    `;
    document.querySelectorAll('[data-response]').forEach(btn => {
      btn.onclick = () => {
        const result = this.gs.resolveMediaCrisis(btn.dataset.response);
        if (!result) return;
        this.gs.save();
        const popSign = result.popDelta >= 0 ? '+' : '';
        const repSign = result.repDelta  >= 0 ? '+' : '';
        this._toast(`Resposta publicada. 👥 ${popSign}${result.popDelta}  ⭐ ${repSign}${result.repDelta}`);
        this.show('careerHub');
      };
    });
    document.getElementById('btn-back-crisis').onclick = () => this.show('careerHub');
  }

  _render_newsCenter(opts = {}) {
    const scope = opts.scope || 'all';
    const scopes = [
      ['all', 'Todas'], ['local', 'Local'], ['regional', 'Regional'],
      ['national', 'Nacional'], ['continental', 'Continental'], ['world', 'Mundial'],
    ];
    const items = this.gs.news.filter(n => scope === 'all' || n.scope === scope);
    this.root.innerHTML = `
      <div class="screen news-center-screen">
        <div class="news-center-header">
          <h1 class="screen-title">📰 Central de Notícias</h1>
          <button class="btn btn-ghost" id="btn-back-news">← Voltar</button>
        </div>
        <p class="muted">Cobertura do circuito local à imprensa mundial.</p>
        <div class="news-filter-bar">
          ${scopes.map(([id, label]) => `<button class="wc-tab ${scope === id ? 'active' : ''}" data-scope="${id}">${label}</button>`).join('')}
        </div>
        <div class="news-center-list">
          ${items.length ? items.map(n => `
            <article class="news-center-card scope-border-${n.scope || 'world'}">
              <div class="news-center-meta">
                <span>${n.outlet || (n.scope === 'local' ? 'Imprensa Local' : n.scope === 'regional' ? 'Noticiário Regional' : n.scope === 'national' ? 'TV Nacional' : n.scope === 'continental' ? 'Mídia Continental' : 'Imprensa Mundial')}</span>
                <span>${n.date}</span>
              </div>
              <h3>${n.headline}</h3>
              <span class="news-scope scope-${n.scope || 'world'}">${(n.scope || 'world').toUpperCase()}</span>
            </article>
          `).join('') : '<div class="empty-state">Nenhuma matéria neste alcance ainda.</div>'}
        </div>
      </div>`;
    document.getElementById('btn-back-news').onclick = () => this.show('careerHub');
    document.querySelectorAll('.news-filter-bar [data-scope]').forEach(btn => {
      btn.onclick = () => this.show('newsCenter', { scope: btn.dataset.scope });
    });
  }
  // RANKINGS
  // INVESTIMENTOS
  _render_investments(opts = {}) {
    const p   = this.gs;
    const pl  = p.player;
    const tab = opts.tab || 'gym';

    const tabs = [
      { id: 'gym',      label: '🏋️ Academia' },
      { id: 'media',    label: '📱 Mídia' },
      { id: 'lifestyle',label: '🏠 Estilo de Vida' },
      { id: 'recovery', label: '💊 Recuperação' },
    ];

    // Academia
    const gymContent = () => {
      const cur = pl.gym?.level || 0;
      return GYM_LEVELS.map(g => {
        const owned   = g.id === cur;
        const upgrade = g.id === cur + 1;
        const locked  = g.id > cur + 1 || g.id <= cur;
        const upgradeCost = g.id > 0 ? g.cost - (GYM_LEVELS[cur].cost || 0) : 0;
        return `
          <div class="invest-card ${owned ? 'owned' : ''} ${upgrade ? 'upgradable' : ''}">
            <div class="invest-icon">${g.icon}</div>
            <div class="invest-body">
              <div class="invest-name">${g.name} ${owned ? '<span class="owned-badge">✓ ATUAL</span>' : ''}</div>
              <div class="invest-desc">${g.desc}</div>
              <div class="invest-stats">
                ${g.gainBonus > 0 ? `<span class="invest-stat pos">+${Math.round(g.gainBonus*100)}% ganho de atributo</span>` : ''}
                ${g.riskBonus > 0 ? `<span class="invest-stat pos">-${Math.round(g.riskBonus*100)}% risco de lesão</span>` : ''}
                ${g.maintenance > 0 ? `<span class="invest-stat neg">${formatCurrency(g.maintenance)}/mês manutenção</span>` : ''}
              </div>
            </div>
            <div class="invest-action">
              ${owned ? '<span class="muted">Ativa</span>'
                : upgrade ? `<button class="btn btn-primary invest-btn" data-action="gym" data-id="${g.id}">${formatCurrency(upgradeCost)}<br><small>Upgrade</small></button>`
                : g.id < cur ? '<span class="muted">Superada</span>'
                : `<span class="muted locked">Bloqueada</span>`}
            </div>
          </div>`;
      }).join('');
    };

    // Mídia
    const mediaContent = () => {
      const totalWeek = p.year * 52 + p.week;
      return MEDIA_CAMPAIGNS.map(c => {
        const lastUsed  = (p.mediaCooldowns || {})[c.id] || 0;
        const weeksLeft = Math.max(0, c.cooldownWeeks - (totalWeek - lastUsed));
        const canBuy    = weeksLeft === 0 && pl.money >= c.cost;
        return `
          <div class="invest-card ${!canBuy && weeksLeft === 0 ? 'cant-afford' : ''}">
            <div class="invest-icon">${c.icon}</div>
            <div class="invest-body">
              <div class="invest-name">${c.name}</div>
              <div class="invest-desc">${c.desc}</div>
              <div class="invest-stats">
                <span class="invest-stat pos">+${c.popularity} Popularidade</span>
                ${c.reputation > 0 ? `<span class="invest-stat pos">+${c.reputation} Reputação</span>` : ''}
              </div>
            </div>
            <div class="invest-action">
              ${weeksLeft > 0
                ? `<span class="muted">${weeksLeft}sem.</span>`
                : `<button class="btn ${canBuy ? 'btn-primary' : 'btn-ghost'} invest-btn" data-action="media" data-id="${c.id}" ${!canBuy ? 'disabled' : ''}>${formatCurrency(c.cost)}</button>`}
            </div>
          </div>`;
      }).join('');
    };

    // Estilo de Vida
    const lifestyleContent = () => {
      const owned = pl.lifestyle || [];
      return LIFESTYLE_ITEMS.map(i => {
        const have   = owned.includes(i.id);
        const canBuy = !have && pl.money >= i.cost;
        return `
          <div class="invest-card ${have ? 'owned' : ''} ${!canBuy && !have ? 'cant-afford' : ''}">
            <div class="invest-icon">${i.icon}</div>
            <div class="invest-body">
              <div class="invest-name">${i.name} ${have ? '<span class="owned-badge">✓</span>' : ''}</div>
              <div class="invest-desc">${i.desc}</div>
              <div class="invest-stats">
                <span class="invest-stat pos">+${i.morale} Moral permanente</span>
              </div>
            </div>
            <div class="invest-action">
              ${have
                ? '<span class="muted">Adquirido</span>'
                : `<button class="btn ${canBuy ? 'btn-primary' : 'btn-ghost'} invest-btn" data-action="lifestyle" data-id="${i.id}" ${!canBuy ? 'disabled' : ''}>${formatCurrency(i.cost)}</button>`}
            </div>
          </div>`;
      }).join('');
    };

    // Recuperação
    const recoveryContent = () => {
      const injured  = pl.isInjured || pl.injuryWeeks > 0;
      return RECOVERY_TREATMENTS.map(t => {
        const canBuy = pl.money >= t.cost;
        return `
          <div class="invest-card ${!canBuy ? 'cant-afford' : ''}">
            <div class="invest-icon">${t.icon}</div>
            <div class="invest-body">
              <div class="invest-name">${t.name}</div>
              <div class="invest-desc">${t.desc}</div>
              <div class="invest-stats">
                ${injured ? `<span class="invest-stat pos">-${t.weeksReduced} semana(s) de recuperação</span>` : ''}
                <span class="invest-stat pos">+${t.staminaBonus} Stamina</span>
              </div>
            </div>
            <div class="invest-action">
              <button class="btn ${canBuy ? 'btn-primary' : 'btn-ghost'} invest-btn" data-action="recovery" data-id="${t.id}" ${!canBuy ? 'disabled' : ''}>${formatCurrency(t.cost)}</button>
            </div>
          </div>`;
      }).join('');
    };

    const content = tab === 'gym' ? gymContent()
                  : tab === 'media' ? mediaContent()
                  : tab === 'lifestyle' ? lifestyleContent()
                  : recoveryContent();

    this.root.innerHTML = `
      <div class="screen investments-screen">
        <div class="invest-header">
          <h1 class="screen-title">💰 Investimentos</h1>
          <div class="invest-balance">${formatCurrency(pl.money)}</div>
        </div>

        <div class="invest-tabs">
          ${tabs.map(t => `<button class="invest-tab ${t.id === tab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
        </div>

        <div class="invest-list">${content}</div>

        <div class="create-footer">
          <button class="btn btn-secondary" id="btn-back-invest">← Voltar</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back-invest').onclick = () => this.show('careerHub');
    document.querySelectorAll('.invest-tab').forEach(btn => {
      btn.onclick = () => this.show('investments', { tab: btn.dataset.tab });
    });
    document.querySelectorAll('.invest-btn:not([disabled])').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        let result;
        if (action === 'gym')       result = this.gs.buyGym(parseInt(id));
        if (action === 'media')     result = this.gs.buyMediaCampaign(id);
        if (action === 'lifestyle') result = this.gs.buyLifestyleItem(id);
        if (action === 'recovery')  result = this.gs.buyRecoveryTreatment(id);
        if (result?.success) {
          this.gs.save();
          this.show('investments', { tab });
        } else {
          this._toast(result?.reason || 'Não foi possível concluir.');
        }
      };
    });
  }
  // RIVALIDADES
  _render_rivals() {
    const p = this.gs.player;
    const rivals = (this.gs.rivals || []).sort((a, b) => b.intensity - a.intensity);

    const intensityLabel = (n) => ['', '😒 Leve', '😤 Crescente', '😡 Intensa', '🔥 Explosiva', '💀 Lendária'][n] || '';
    const intensityColor = (n) => ['', '#888', '#f4a261', '#e76f51', '#e63946', '#9b59b6'][n] || '#888';

    const rivalCards = rivals.length ? rivals.map(r => {
      const fighter = this.gs.allFighters.find(f => f.id === r.fighterId);
      const rankStr = fighter?.ranking ? `#${fighter.ranking}` : '—';
      const record  = `${r.wins}V–${r.losses}D contra ele`;
      return `
        <div class="rival-card">
          <div class="rival-intensity-bar" style="background:${intensityColor(r.intensity)}"></div>
          <div class="rival-body">
            <div class="rival-name">${r.name}</div>
            <div class="rival-meta">${rankStr} · ${record}</div>
            <div class="rival-reason">${r.reason}</div>
            <div class="rival-intensity-label" style="color:${intensityColor(r.intensity)}">${intensityLabel(r.intensity)}</div>
          </div>
          <div class="rival-intensity-stars">${'★'.repeat(r.intensity)}${'☆'.repeat(5 - r.intensity)}</div>
        </div>
      `;
    }).join('') : `<div class="muted" style="padding:20px">Nenhuma rivalidade ainda. Vença ou perca de forma dramática e as histórias começarão a surgir.</div>`;

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">⚔️ Rivalidades</h1>
        <div class="rivals-list">${rivalCards}</div>
        <div class="create-footer">
          <button class="btn btn-secondary" id="btn-back-rivals">← Voltar</button>
        </div>
      </div>
    `;
    document.getElementById('btn-back-rivals').onclick = () => this.show('careerHub');
  }
  _render_rankings() {
    const wcs       = WEIGHT_CLASSES;
    const p         = this.gs.player;
    let selectedWc  = p?.weightClass || 'welterweight';
    let selectedOrg = 'unified'; // 'unified' | 'WBC' | 'WBA' | 'IBF' | 'WBO'

    const renderUnified = (wcId) => {
      const fighters = (this.gs.rankings[wcId] || []).slice(0, 15);
      const beltMap  = new Map();
      for (const f of (this.gs.rankings[wcId] || []))
        for (const b of (f.belts || [])) beltMap.set(b, f);
      const holders = [...beltMap.entries()]
        .map(([belt, fighter]) => ({ belt, info: getBeltInfo(belt), fighter }))
        .sort((a, b) => b.info.tier - a.info.tier);

      return `
        <div class="ranking-list">
          ${holders.length ? `
            <div class="belt-holders">
              ${holders.map(h => `
                <div class="ranking-champ" style="border-color:${h.info.color}">
                  ${h.info.icon} <strong>${h.info.name}:</strong>
                  ${h.fighter.name} — ${h.fighter.record}
                </div>
              `).join('')}
            </div>
          ` : ''}
          <table class="ranking-table">
            <tr><th>#</th><th>Lutador</th><th>Nac</th><th>Cartel</th><th>OVR</th><th>Estilo</th></tr>
            ${fighters.map((f, i) => `
              <tr class="${f.id === p?.id ? 'player-row' : ''} ${f.isChampion ? 'champ-row' : ''}">
                <td>${i + 1}</td>
                <td>${(f.belts || []).map(b => getBeltInfo(b).icon).join('')} ${f.name}${f.id === p?.id ? ' ← VOCÊ' : ''}</td>
                <td>${f.nationalityData?.flag || ''}</td>
                <td>${f.record}</td>
                <td>${f.overall}</td>
                <td>${f.style?.name || ''}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    };

    const renderOrg = (wcId, org) => {
      const bi      = getBeltInfo(org);
      const orgData = this.gs.orgRankings?.[org]?.[wcId];
      if (!orgData) return `<p class="muted">Rankings da ${org} não disponíveis.</p>`;
      const { champion, contenders } = orgData;
      const playerOrgRank = contenders.findIndex(f => f.id === p?.id);

      return `
        <div class="ranking-list">
          <div class="org-rank-header" style="border-color:${bi.color}">
            <span style="font-size:1.5rem">${bi.icon}</span>
            <div>
              <div style="font-weight:800; color:${bi.color}">${bi.name}</div>
              <div class="muted" style="font-size:.78rem">${this._orgRankDesc(org)}</div>
            </div>
          </div>
          ${champion ? `
            <div class="ranking-champ" style="border-color:${bi.color}">
              ${bi.icon} <strong>Campeão ${org}:</strong>
              ${champion.name}${champion.id === p?.id ? ' ← VOCÊ' : ''} — ${champion.record}
            </div>
          ` : '<div class="muted" style="padding:8px 0">Cinturão vago</div>'}
          ${playerOrgRank >= 0 ? `
            <div class="org-rank-you" style="border-color:${bi.color}">
              Você é o #${playerOrgRank + 1} contendor da ${org} nesta divisão
            </div>
          ` : p && (p.belts || []).includes(org) ? '' : `
            <div class="muted" style="font-size:.8rem; padding:4px 0">Você não está no top-15 desta organização.</div>
          `}
          <table class="ranking-table">
            <tr><th>#</th><th>Contendor</th><th>Nac</th><th>Cartel</th><th>OVR</th></tr>
            ${contenders.slice(0, 15).map((f, i) => `
              <tr class="${f.id === p?.id ? 'player-row' : ''}">
                <td>${i + 1}${i === 0 ? ' 🎯' : ''}</td>
                <td>${f.name}${f.id === p?.id ? ' ← VOCÊ' : ''}${i === 0 ? ' <span class="mandatory-tag">Mandatório</span>' : ''}</td>
                <td>${f.nationalityData?.flag || ''}</td>
                <td>${f.record}</td>
                <td>${f.overall}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    };

    const renderContent = () =>
      selectedOrg === 'unified' ? renderUnified(selectedWc) : renderOrg(selectedWc, selectedOrg);

    const orgMeta = { WBC: '#0B6623', WBA: '#0047AB', IBF: '#8B0000', WBO: '#6A0DAD' };
    const orgTabs = ['unified', ...WORLD_ORGS].map(org => {
      const color = org === 'unified' ? 'var(--muted)' : orgMeta[org];
      const isActive = org === selectedOrg;
      return `<button class="org-tab ${isActive ? 'active' : ''}" data-org="${org}" style="${isActive ? `background:${color}20; border-color:${color}; color:${color}` : ''}">${org === 'unified' ? '🌐 Geral' : org}</button>`;
    }).join('');

    const wcTabs = wcs.map(wc =>
      `<button class="wc-tab ${wc.id === selectedWc ? 'active' : ''}" data-wc="${wc.id}">${wc.name}</button>`
    ).join('');

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Rankings Mundiais</h1>
        <div class="org-tabs" id="org-tabs">${orgTabs}</div>
        <div class="wc-tabs" id="wc-tabs">${wcTabs}</div>
        <div id="ranking-content">${renderContent()}</div>
        <button class="btn btn-ghost" id="btn-back" style="margin-top:16px">← Voltar</button>
      </div>
    `;

    document.getElementById('btn-back').onclick = () => this.show('careerHub');

    const rerender = () => {
      document.getElementById('ranking-content').innerHTML = renderContent();
      // Re-bind mandatory challenger tooltip if needed
    };

    document.querySelectorAll('.org-tab').forEach(tab => {
      tab.onclick = () => {
        selectedOrg = tab.dataset.org;
        document.querySelectorAll('.org-tab').forEach(t => { t.classList.remove('active'); t.removeAttribute('style'); });
        const color = selectedOrg === 'unified' ? 'var(--muted)' : orgMeta[selectedOrg];
        tab.classList.add('active');
        tab.style.cssText = `background:${color}20; border-color:${color}; color:${color}`;
        rerender();
      };
    });

    document.querySelectorAll('.wc-tab').forEach(tab => {
      tab.onclick = () => {
        selectedWc = tab.dataset.wc;
        document.querySelectorAll('.wc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        rerender();
      };
    });
  }

  _orgRankDesc(org) {
    return {
      WBC: 'Valoriza atividade e número de vitórias',
      WBA: 'Valoriza poder de nocaute e finalizações',
      IBF: 'Valoriza qualidade técnica e overall',
      WBO: 'Valoriza apelo popular e entretenimento',
    }[org] || '';
  }
  // FIGHT HISTORY
  _render_fightHistory() {
    const p    = this.gs.player;
    const hist = p.fightHistory;

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">Histórico de Lutas</h1>
        <div class="fighter-profile">
          <div class="profile-name">${p.displayName}</div>
          <div class="profile-record">
            ${p.wins}V-${p.losses}D-${p.draws}E
            &nbsp;·&nbsp; ${p.kos + p.tkos} KOs
            &nbsp;·&nbsp; ${p.careerWinPct}% vitórias
          </div>
        </div>

        ${hist.length === 0 ? '<p class="muted text-center">Nenhuma luta registrada ainda.</p>' : `
          <table class="history-table">
            <tr><th>Data</th><th>Res.</th><th>Adversário</th><th>Método</th><th>Rd</th></tr>
            ${hist.map(h => `
              <tr class="hist-row-${h.result.toLowerCase()}">
                <td>${h.date}</td>
                <td class="hist-result ${h.result === 'W' ? 'win' : h.result === 'L' ? 'loss' : 'draw'}">${h.result}</td>
                <td>${h.opponent.name}</td>
                <td>${h.method}</td>
                <td>${h.round}</td>
              </tr>
            `).join('')}
          </table>
        `}
        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;
    document.getElementById('btn-back').onclick = () => this.show('careerHub');
  }
  // ANALYST SHOW
  _render_analystShow() {
    const segments = ['post_fight', 'ranking', 'preview'].map(t =>
      this.newsGen.generateShowSegment(t)
    );

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">🎙️ No Centro do Ringue</h1>
        <p class="muted text-center">O programa de debate mais famoso do boxe. Ao vivo toda semana.</p>
        <div class="show-segments">
          ${segments.map((s, i) => `
            <div class="show-card">
              <div class="show-card-header">
                <span class="show-card-title">${s.title}</span>
                <span class="show-segment-label">${s.segment}</span>
              </div>
              <div class="show-lines">
                ${s.lines.map(l => `
                  <div class="show-line">
                    <div class="show-host-name">${l.host.emoji} ${l.host.name} <span class="muted">${l.host.role}</span></div>
                    <div class="show-quote-text">"${l.text}"</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost" id="btn-back">← Voltar</button>
      </div>
    `;
    document.getElementById('btn-back').onclick = () => this.show('careerHub');
  }
  // LEGACY / GOAT
  _legacyScore() {
    const p = this.gs.player;
    const archivedDef = Object.values(p.divisionDefenses || {}).reduce((total, division) =>
      total + Object.values(division || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef    = Object.values(p.beltDefenses || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const championDivisions = new Set((p.worldTitleHistory || []).map(entry => entry.weightClass)).size;
    const eventRecords = p.eventRecords || {};
    const worldHeld   = (p.belts || []).filter(b => WORLD_ORGS.includes(b)).length;
    const territorialScore = (p.titlesWon || [])
      .filter(b => !WORLD_ORGS.includes(b))
      .reduce((total, b) => total + getBeltInfo(b).tier * 8, 0) +
      (p.trophies || []).reduce((total, t) => total + (t.tier === 'national' ? 12 : t.tier === 'regional' ? 6 : 3), 0);
    const notableWins = (p.fightHistory || []).filter(h => h.result === 'W' && h.opponentRanking && h.opponentRanking <= 5).length;
    return (
      p.wins * 3 +
      (p.kos + p.tkos) * 2 +
      territorialScore +
      (p.totalTitleWins  || 0) * 50 +
      totalDef * 20 +
      (p.superBelts  || []).length * 150 +
      worldHeld * 30 +
      (p.unificationWins || 0) * 60 +
      Math.max(0, championDivisions - 1) * 120 +
      (eventRecords.sellouts || 0) * 12 +
      (eventRecords.mainEvents || 0) * 5 +
      Math.floor((eventRecords.maxAttendance || 0) / 10000) * 8 +
      notableWins * 25
    );
  }

  _legacyTier(score) {
    if (score >= 1400) return { tier: 'G.O.A.T.',    next: Infinity, color: '#ffd700', label: 'O Maior de Todos os Tempos' };
    if (score >= 900)  return { tier: 'Lenda',        next: 1400,     color: '#ff6b35', label: 'Ícone Mundial do Boxe' };
    if (score >= 500)  return { tier: 'Campeão',      next: 900,      color: '#9b59b6', label: 'Campeão Reconhecido' };
    if (score >= 200)  return { tier: 'Contendor',    next: 500,      color: '#3498db', label: 'Força Reconhecida' };
    if (score >= 50)   return { tier: 'Prospecto',    next: 200,      color: '#2ecc71', label: 'Começo Promissor' };
    return               { tier: 'Estreante',         next: 50,       color: '#888',    label: 'Apenas Começando' };
  }

  _render_legacy() {
    const p     = this.gs.player;
    const score = this._legacyScore();
    const tier  = this._legacyTier(score);
    const pct   = tier.next === Infinity ? 100 : Math.min(100, Math.round(((score - (score >= 900 ? 900 : score >= 500 ? 500 : score >= 200 ? 200 : score >= 50 ? 50 : 0)) / (tier.next - (score >= 900 ? 900 : score >= 500 ? 500 : score >= 200 ? 200 : score >= 50 ? 50 : 0))) * 100));

    const archivedDef = Object.values(p.divisionDefenses || {}).reduce((total, division) =>
      total + Object.values(division || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef    = Object.values(p.beltDefenses || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const allDefenseEntries = [
      ...Object.entries(p.beltDefenses || {}),
      ...Object.values(p.divisionDefenses || {}).flatMap(division => Object.entries(division || {})),
    ];
    const continentalDef = allDefenseEntries
      .filter(([belt]) => getBeltInfo(belt).tier === 4)
      .reduce((sum, [, count]) => sum + count, 0);
    const worldDef = allDefenseEntries
      .filter(([belt]) => WORLD_ORGS.includes(belt))
      .reduce((sum, [, count]) => sum + count, 0);
    const championDivisions = new Set((p.worldTitleHistory || []).map(entry => entry.weightClass));
    const eventRecords = p.eventRecords || {};
    const worldHeld   = (p.belts || []).filter(b => WORLD_ORGS.includes(b));
    const titlesWon   = [...new Set([...(p.titlesWon || []), ...(p.belts || [])])];
    const notableWins = (p.fightHistory || []).filter(h => h.result === 'W' && h.opponentRanking && h.opponentRanking <= 5);
    const careerYears = Math.floor((this.gs.week + (this.gs.year - 2024) * 52) / 52) || 1;
    const titleReigns = (p.titleReigns || []).filter(reign => getBeltInfo(reign.belt).tier >= 4);
    const reignDuration = reign => {
      const start = (reign.startYear || 2024) * 52 + (reign.startWeek || 1);
      const end = (reign.endYear || this.gs.year) * 52 + (reign.endWeek || this.gs.week);
      const weeks = Math.max(1, end - start + 1);
      const years = Math.floor(weeks / 52);
      const rest = weeks % 52;
      return years
        ? `${years} ano${years !== 1 ? 's' : ''}${rest ? ` e ${rest} sem.` : ''}`
        : `${weeks} semana${weeks !== 1 ? 's' : ''}`;
    };

    const minorAchievements = [];
    const majorAchievements = [];
    const impressiveFacts = [];

    for (const belt of titlesWon) {
      const info = getBeltInfo(belt);
      const achievement = { icon: info.icon, text: info.name, color: info.color };
      if (WORLD_ORGS.includes(belt) || info.tier >= 4) majorAchievements.push(achievement);
      else minorAchievements.push(achievement);
    }
    // Troféus (local/regional/nacional — não únicos)
    const trophyCount = (p.trophies || []).length;
    if (trophyCount > 0) {
      const natCount  = (p.trophies||[]).filter(t => t.tier === 'national').length;
      const regCount  = (p.trophies||[]).filter(t => t.tier === 'regional').length;
      const locCount  = (p.trophies||[]).filter(t => t.tier === 'local').length;
      if (natCount > 0) minorAchievements.push({ icon: '🏅', text: `${natCount}× Campeão Nacional`, color: '#b8860b' });
      if (regCount > 0) minorAchievements.push({ icon: '🏅', text: `${regCount}× Campeão Regional`, color: '#b8860b' });
      if (locCount > 0) minorAchievements.push({ icon: '🏅', text: `${locCount}× Campeão Local`, color: '#b8860b' });
    }

    if (p.wins >= 1)  minorAchievements.push({ icon: '🥊', text: 'Primeira vitória profissional' });
    if (p.wins >= 10) minorAchievements.push({ icon: '🔟', text: '10 vitórias na carreira' });
    if (p.wins >= 20) majorAchievements.push({ icon: '💪', text: '20 vitórias na carreira' });
    if (p.totalTitleWins >= 1) majorAchievements.push({ icon: '🏆', text: 'Campeão Mundial' });
    if (p.totalTitleWins >= 2) majorAchievements.push({ icon: '🏆', text: 'Campeão mundial por múltiplas organizações' });
    if (championDivisions.size >= 2) majorAchievements.push({ icon: '⚖️', text: `Campeão mundial em ${championDivisions.size} divisões` });
    if (totalDef >= 3) majorAchievements.push({ icon: '🛡️', text: '3+ defesas de cinturão mundial' });
    if ((eventRecords.sellouts || 0) >= 1) majorAchievements.push({ icon: '🎟️', text: 'Primeiro evento com ingressos esgotados' });
    if ((eventRecords.maxAttendance || 0) >= 50000) majorAchievements.push({ icon: '🏟️', text: 'Lutou diante de mais de 50 mil torcedores' });
    if ((eventRecords.maxGate || 0) >= 10000000) impressiveFacts.push({ icon: '💰', text: 'Evento com bilheteria superior a $10 milhões' });

    if (p.losses === 0 && p.wins >= 5) impressiveFacts.push({ icon: '⭐', text: 'Invicto com 5+ vitórias' });
    if ((p.kos + p.tkos) >= 5) impressiveFacts.push({ icon: '💥', text: '5+ finalizações por KO/TKO' });
    if ((p.kos + p.tkos) >= 10) impressiveFacts.push({ icon: '💣', text: '10+ nocautes na carreira' });
    if (p.unificationWins >= 1) impressiveFacts.push({ icon: '🏅', text: 'Campeão Unificado' });
    if (p.unificationWins >= 2) impressiveFacts.push({ icon: '🌟', text: 'Super Campeão com três cinturões' });
    if (p.unificationWins >= 3) impressiveFacts.push({ icon: '👑', text: 'Campeão Indiscutível' });
    if ((p.superBelts || []).length >= 1) impressiveFacts.push({ icon: '✨', text: 'Super-Cinturão após 10 defesas' });
    if (notableWins.length >= 1) impressiveFacts.push({ icon: '🎯', text: 'Vitória sobre Top-5 mundial' });
    if (notableWins.length >= 3) impressiveFacts.push({ icon: '🏟️', text: '3+ vitórias sobre adversários Top-5' });

    this.root.innerHTML = `
      <div class="screen legacy-screen">
        <h1 class="screen-title">🏛️ Legado</h1>

        <!-- Score header -->
        <div class="legacy-header">
          <div class="legacy-score-block">
            <div class="legacy-score-num">${score}</div>
            <div class="legacy-score-label">Pontos de Legado</div>
          </div>
          <div style="flex:1">
            <div class="legacy-tier" style="color:${tier.color}">${tier.tier}</div>
            <div class="muted" style="font-size:.82rem; margin:2px 0">${tier.label}</div>
            <div class="legacy-tier-bar">
              <div class="legacy-tier-fill" style="width:${pct}%; background:${tier.color}"></div>
            </div>
            ${tier.next !== Infinity ? `<div class="muted" style="font-size:.78rem">${tier.next - score} pts para próxima tier</div>` : `<div style="color:${tier.color}; font-size:.82rem; font-weight:700">✦ Nível máximo atingido</div>`}
          </div>
        </div>

        <!-- Career stats grid -->
        <div class="legacy-stats-grid">
          ${this._legStat(p.record, 'Cartel')}
          ${this._legStat(p.koPct + '%', 'KO%')}
          ${this._legStat(careerYears + ' anos', 'Carreira')}
          ${this._legStat(p.totalTitleWins || 0, 'Títulos Mundiais')}
          ${this._legStat(`${totalDef}<small>${continentalDef} continentais / ${worldDef} mundiais</small>`, 'Defesas')}
          ${this._legStat(p.unificationWins || 0, 'Unificações')}
          ${this._legStat(championDivisions.size, 'Divisões com Mundial')}
          ${this._legStat((p.superBelts || []).length, 'Super-Cinturões')}
          ${this._legStat(titlesWon.length, 'Títulos Conquistados')}
          ${this._legStat(notableWins.length, 'Vitórias Top-5')}
          ${this._legStat((eventRecords.maxAttendance || 0).toLocaleString('pt-BR'), 'Recorde de Público')}
          ${this._legStat(formatCurrency(eventRecords.maxGate || 0), 'Recorde de Bilheteria')}
          ${this._legStat(eventRecords.sellouts || 0, 'Eventos Esgotados')}
          ${this._legStat(eventRecords.mainEvents || 0, 'Main Events')}
          ${this._legStat(p.overall, 'OVR Atual')}
        </div>

        ${(p.eventHistory || []).length ? `
          <div class="legacy-section">
            <h3>🏟️ Grandes Eventos</h3>
            ${(p.eventHistory || []).slice(0, 8).map(event => `
              <div class="notable-win-row">
                <span>${event.arena} · ${this._billingLabel(event.billing)}</span>
                <span class="muted">${event.attendance.toLocaleString('pt-BR')} pessoas · ${formatCurrency(event.gate)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${titleReigns.length ? `
          <div class="legacy-section">
            <h3>Reinados como Campeão</h3>
            ${titleReigns.slice().reverse().map(reign => {
              const info = getBeltInfo(reign.belt);
              const division = WEIGHT_CLASSES.find(w => w.id === reign.weightClass);
              const active = !reign.endYear;
              const period = active
                ? `${reign.startYear} - atual`
                : reign.startYear === reign.endYear ? `${reign.startYear}` : `${reign.startYear} - ${reign.endYear}`;
              return `<div class="notable-win-row">
                <span>${info.icon} ${getBeltDisplayName(reign.belt, { weightClass: reign.weightClass })}<br>
                  <small class="muted">${division?.name || reign.weightClass} · ${reign.defenses || 0} defesa${reign.defenses === 1 ? '' : 's'}</small>
                </span>
                <span class="muted">${period}<br><small>${reignDuration(reign)}${active ? ' · reinado ativo' : ''}</small></span>
              </div>`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Super belts -->
        ${(p.superBelts || []).length ? `
          <div class="legacy-section">
            <h3>✨ Super-Cinturões</h3>
            <p class="muted" style="font-size:.82rem; margin-bottom:8px">Conquistados após 10 defesas do mesmo cinturão mundial.</p>
            ${(p.superBelts || []).map(org => {
              const bi = getBeltInfo(org);
              const defs = (p.beltDefenses || {})[org] || 10;
              return `<div class="super-belt-row">
                <span class="super-belt-icon">✨</span>
                <div>
                  <div style="font-weight:700; color:${bi.color}">${bi.name}</div>
                  <div class="muted" style="font-size:.8rem">${defs} defesas — nível lendário</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : ''}

        <!-- Cinturões mundiais com contagem de defesas -->
        ${worldHeld.length || (p.worldTitleHistory || []).length || (p.totalTitleWins || 0) > 0 ? `
          <div class="legacy-section">
            <h3>🏆 Cinturões Mundiais</h3>
            ${worldHeld.map(org => {
              const bi   = getBeltInfo(org);
              const defs = (p.beltDefenses || {})[org] || 0;
              const isSuper = (p.superBelts || []).includes(org);
              return `<div class="notable-win-row">
                <span>${isSuper ? '✨' : bi.icon} ${bi.name}</span>
                <span class="muted">${defs} defesa${defs !== 1 ? 's' : ''}${isSuper ? ' · Super-Cinturão' : ''}</span>
              </div>`;
            }).join('')}
            ${worldHeld.length === 0 ? '<p class="muted" style="font-size:.85rem">Nenhum cinturão mundial ativo.</p>' : ''}
            ${(p.worldTitleHistory || []).length ? `
              <h4 style="margin:14px 0 6px">Reinados por divisão</h4>
              ${(p.worldTitleHistory || []).map(entry => {
                const division = WEIGHT_CLASSES.find(w => w.id === entry.weightClass);
                return `<div class="notable-win-row">
                  <span>${getBeltInfo(entry.belt).icon} ${getBeltInfo(entry.belt).name}</span>
                  <span class="muted">${division?.name || entry.weightClass} · ${entry.year || '?'}</span>
                </div>`;
              }).join('')}
            ` : ''}
          </div>
        ` : ''}

        <!-- GOAT Checklist -->
        ${this._renderGoatChecklist(p, score, totalDef, notableWins, championDivisions, careerYears)}

        ${this._renderAchievementSection('🥉 Conquistas Menores', minorAchievements, 'minor')}
        ${this._renderAchievementSection('🏆 Conquistas Maiores', majorAchievements, 'major')}
        ${this._renderAchievementSection('✨ Fatos Impressionantes', impressiveFacts, 'impressive')}

        <!-- Vitórias notáveis -->
        ${notableWins.length ? `
          <div class="legacy-section">
            <h3>🎯 Vitórias Notáveis (vs. Top-5)</h3>
            ${notableWins.map(h => `
              <div class="notable-win-row">
                <span>${h.opponent.name} <span class="muted">(#${h.opponentRanking})</span></span>
                <span class="muted">${h.method} · R${h.round} · ${h.date}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
          <button class="btn btn-ghost" id="btn-back">← Voltar</button>
          <button class="btn btn-secondary" id="btn-hof">🏛️ Hall da Fama</button>
        </div>
      </div>
    `;

    document.getElementById('btn-hof').onclick = () => this.show('hallOfFame');
    document.getElementById('btn-back').onclick = () => {
      if (p.retiredAt) {
        this.show('retirement', {
          reason: p.retirementReason || 'voluntary',
          forced: p.retirementReason && p.retirementReason !== 'voluntary',
        });
      } else {
        this.show('careerHub');
      }
    };
  }

  _renderGoatChecklist(p, score, totalDef, notableWins, championDivisions, careerYears) {
    const wins   = p.wins || 0;
    const losses = p.losses || 0;
    const kos    = (p.kos || 0) + (p.tkos || 0);
    const koPct  = wins > 0 ? Math.round(kos / wins * 100) : 0;

    const criteria = [
      {
        label: 'Registro quase perfeito',
        desc:  'Derrota 0 ou % vitória ≥ 94% com 25+ lutas',
        done:  losses === 0 || (wins + losses >= 25 && wins / (wins + losses) >= 0.94),
        ref:   'Mayweather (50-0), Marciano (49-0)',
      },
      {
        label: '30+ vitórias profissionais',
        desc:  `Você tem ${wins} vitória${wins !== 1 ? 's' : ''}`,
        done:  wins >= 30,
        ref:   'Sugar Ray Robinson (173), Pacquiao (62+)',
      },
      {
        label: 'KO% acima de 65%',
        desc:  `Seu KO% é ${koPct}%`,
        done:  koPct >= 65,
        ref:   'Marciano (87%), Tyson (75% nos primeiros anos)',
      },
      {
        label: 'Campeão Mundial',
        desc:  'Pelo menos 1 cinturão mundial conquistado',
        done:  (p.totalTitleWins || 0) >= 1,
        ref:   'Requisito mínimo no debate GOAT',
      },
      {
        label: '10+ defesas de título mundial',
        desc:  `Você tem ${totalDef} defesa${totalDef !== 1 ? 's' : ''}`,
        done:  totalDef >= 10,
        ref:   'Joe Louis (25), Holmes (20), Ali (19)',
      },
      {
        label: '3+ vitórias sobre Top-5',
        desc:  `Você venceu ${notableWins.length} adversário${notableWins.length !== 1 ? 's' : ''} Top-5`,
        done:  notableWins.length >= 3,
        ref:   'Qualidade da oposição — fator decisivo no debate GOAT',
      },
      {
        label: 'Campeão em 2+ divisões',
        desc:  `Você foi campeão em ${championDivisions.size} divisão${championDivisions.size !== 1 ? 'ões' : ''}`,
        done:  championDivisions.size >= 2,
        ref:   'Pacquiao (8 divisões), Sugar Ray Leonard (5)',
      },
      {
        label: 'Campeão Indiscutível',
        desc:  'Todos os cinturões mundiais de uma divisão',
        done:  (p.unificationWins || 0) >= 3,
        ref:   'Usyk, Canelo, Terence Crawford (era moderna)',
      },
      {
        label: '15+ anos de carreira de elite',
        desc:  `Você tem ${careerYears} ano${careerYears !== 1 ? 's' : ''} de carreira`,
        done:  careerYears >= 15,
        ref:   'Robinson (25 anos), Foreman (20 anos)',
      },
      {
        label: 'Super-Cinturão conquistado',
        desc:  '10 defesas do mesmo cinturão mundial',
        done:  (p.superBelts || []).length >= 1,
        ref:   'Simboliza reinado histórico: Louis (1937-49)',
      },
    ];

    const done  = criteria.filter(c => c.done).length;
    const total = criteria.length;
    const pct   = Math.round(done / total * 100);
    const goatUnlocked = done >= 8;

    return `
      <div class="legacy-section goat-checklist-section">
        <div class="goat-header">
          <h3>🐐 Checklist GOAT</h3>
          <div class="goat-progress-wrap">
            <span class="goat-count ${goatUnlocked ? 'goat-unlocked' : ''}">${done}/${total}</span>
            <div class="goat-bar-bg"><div class="goat-bar-fill" style="width:${pct}%"></div></div>
            ${goatUnlocked ? `<div class="goat-badge">✦ G.O.A.T.</div>` : `<div class="goat-need">${8 - done} critério${8 - done !== 1 ? 's' : ''} para o G.O.A.T.</div>`}
          </div>
        </div>
        <p class="muted" style="font-size:.8rem; margin:4px 0 10px">Baseado nos critérios usados pela imprensa especializada para definir o maior de todos os tempos.</p>
        <div class="goat-list">
          ${criteria.map(c => `
            <div class="goat-item ${c.done ? 'goat-done' : 'goat-pending'}">
              <span class="goat-check">${c.done ? '✅' : '⬜'}</span>
              <div class="goat-item-body">
                <div class="goat-item-label">${c.label}</div>
                <div class="goat-item-desc">${c.desc}</div>
                <div class="goat-item-ref">Ref: ${c.ref}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${goatUnlocked ? `
          <div class="goat-unlocked-banner">
            🐐 Você atingiu os critérios do G.O.A.T.! Quando se aposentar, entrará para o <strong>Hall da Fama</strong> como uma lenda do boxe.
          </div>
        ` : ''}
      </div>
    `;
  }

  _render_hallOfFame() {
    const hof = (this.gs.hallOfFame || []).slice().sort((a, b) => (b.goatScore || 0) - (a.goatScore || 0));
    const player = this.gs.player;
    const playerInducted = hof.some(e => e.isPlayer);

    this.root.innerHTML = `
      <div class="screen">
        <h1 class="screen-title">🏛️ Hall da Fama</h1>
        <p class="muted" style="margin-bottom:16px">As maiores lendas do boxe de todos os tempos. Induzidos com base em títulos, defesas, vitórias sobre elite e longevidade.</p>

        ${playerInducted ? `
          <div class="hof-player-banner">
            🌟 ${player?.name} está no Hall da Fama!
          </div>
        ` : player && !player.retiredAt ? `
          <div class="hof-criteria-hint">
            Para entrar no Hall da Fama: 1 título mundial + 5 defesas, ou múltiplas divisões, ou 35+ vitórias com títulos.
          </div>
        ` : ''}

        ${hof.length === 0 ? '<p class="muted">Nenhuma lenda induzida ainda.</p>' : `
          <div class="hof-list">
            ${hof.map((legend, i) => `
              <div class="hof-card ${legend.isPlayer ? 'hof-player' : ''}">
                <div class="hof-rank">${i + 1}</div>
                <div class="hof-card-body">
                  <div class="hof-name-row">
                    <span class="hof-flag">${legend.flag || '🏴'}</span>
                    <span class="hof-name">${legend.name}</span>
                    ${legend.isPlayer ? '<span class="hof-you-badge">VOCÊ</span>' : ''}
                    <span class="hof-era">${legend.era}</span>
                  </div>
                  <div class="hof-record">${legend.record} · ${legend.kos} KOs · KO% ${legend.koPct}%</div>
                  <div class="hof-stats-row">
                    <span>🏆 ${legend.titleDefs} defesas</span>
                    <span>⚖️ ${legend.divisions} divisão${legend.divisions !== 1 ? 'ões' : ''}</span>
                    <span>⭐ ${(legend.goatScore || 0).toLocaleString('pt-BR')} pts</span>
                  </div>
                  ${(legend.highlights || []).length ? `
                    <ul class="hof-highlights">
                      ${legend.highlights.map(h => `<li>${h}</li>`).join('')}
                    </ul>
                  ` : ''}
                  <div class="hof-bio">${legend.bio}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}

        <button class="btn btn-ghost" id="btn-back" style="margin-top:16px">← Voltar</button>
      </div>
    `;
    document.getElementById('btn-back').onclick = () => this.show('legacy');
  }

  _legStat(val, label) {
    return `<div class="legacy-stat"><div class="legacy-stat-num">${val}</div><div class="legacy-stat-label">${label}</div></div>`;
  }

  _renderAchievementSection(title, achievements, kind) {
    if (!achievements.length) return '';
    return `
      <div class="legacy-section legacy-achievements-${kind}">
        <h3>${title}</h3>
        <div class="achievements-grid">
          ${achievements.map(a => `
            <div class="achievement-chip" ${a.color ? `style="border-color:${a.color}"` : ''}>
              <span class="ach-icon">${a.icon}</span>
              <span class="ach-text">${a.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  // APOSENTADORIA
  _render_retirement({ reason = 'voluntary', forced = false } = {}) {
    const p     = this.gs.player;
    const score = this._legacyScore();
    const tier  = this._legacyTier(score);

    const reasonMsg = {
      voluntary: 'decidiu encerrar sua carreira nos seus próprios termos.',
      age:       'chegou ao limite da idade permitida para competição profissional.',
      wear:      'acumulou desgaste físico suficiente para obrigar o encerramento da carreira.',
      medical:   'sofreu três nocautes consecutivos, sendo aposentado por decisão médica.',
    }[reason] || 'encerrou sua carreira.';

    const archivedDef = Object.values(p.divisionDefenses || {}).reduce((t, d) =>
      t + Object.values(d || {}).reduce((a, b) => a + b, 0), 0);
    const totalDef   = Object.values(p.beltDefenses || {}).reduce((a, b) => a + b, 0) + archivedDef;
    const titlesWon  = [...new Set([...(p.titlesWon || []), ...(p.belts || [])])];
    const worldTitles = titlesWon.filter(b => WORLD_ORGS.includes(b));
    const notableWins = (p.fightHistory || []).filter(h => h.result === 'W' && h.opponentRanking && h.opponentRanking <= 5);
    const careerYears = Math.floor(((this.gs.year || 2024) - 2024) + (this.gs.week || 0) / 52) || 1;

    const hallTier = score >= 900 ? { label: 'Hall da Fama — Imortal', color: '#ffd700', icon: '👑' }
                   : score >= 500 ? { label: 'Hall da Fama — Elite', color: '#c0a060', icon: '🏆' }
                   : score >= 200 ? { label: 'Hall da Fama — Consagrado', color: '#8888cc', icon: '🌟' }
                   : score >= 50  ? { label: 'Reconhecido', color: '#88aa88', icon: '🥊' }
                   :                { label: 'Lutador de clube', color: '#888888', icon: '🥋' };

    this.root.innerHTML = `
      <div class="screen retirement-screen">
        <div class="retirement-banner" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);">
          <div style="font-size:3.5rem; margin-bottom:8px">${hallTier.icon}</div>
          <h1 style="font-size:2rem; margin:0; color:#fff">${p.displayName}</h1>
          <div style="color:${tier.color}; font-size:1.1rem; font-weight:700; margin:6px 0">${tier.tier}</div>
          <p style="color:#aaa; font-size:.9rem; max-width:480px; margin:8px auto 0">
            ${p.nationalityData?.flag || ''} ${p.nationalityData?.nation || ''} · ${p.weightClassData?.name || ''}
            &nbsp;·&nbsp; ${forced ? '⚠️' : '🎗️'} ${p.displayName} ${reasonMsg}
          </p>
        </div>

        <div class="retirement-body">
          <!-- Stats grid -->
          <div class="ret-section">
            <h3>📊 Resumo da Carreira</h3>
            <div class="legacy-stats-grid">
              ${this._legStat(p.record, 'Cartel final')}
              ${this._legStat(`${p.koPct}%`, 'KO%')}
              ${this._legStat(`${careerYears} anos`, 'Anos em atividade')}
              ${this._legStat(p.age, 'Idade de aposentadoria')}
              ${this._legStat(worldTitles.length, 'Títulos Mundiais')}
              ${this._legStat(totalDef, 'Defesas de título')}
              ${this._legStat(notableWins.length, 'Vitórias Top-5')}
              ${this._legStat(score, 'Pontos de legado')}
            </div>
          </div>

          <!-- Hall of Fame tier -->
          <div class="ret-section" style="text-align:center; padding:20px">
            <div style="font-size:2.2rem">${hallTier.icon}</div>
            <div style="color:${hallTier.color}; font-size:1.3rem; font-weight:800; margin:6px 0">${hallTier.label}</div>
            <div class="legacy-tier-bar" style="max-width:320px; margin:8px auto">
              <div class="legacy-tier-fill" style="width:${Math.min(100, Math.round(score / 10))}%; background:${hallTier.color}"></div>
            </div>
            <div style="color:#aaa; font-size:.84rem">${score} pontos de legado</div>
          </div>

          <!-- Títulos conquistados -->
          ${titlesWon.length ? `
            <div class="ret-section">
              <h3>🏆 Títulos Conquistados</h3>
              <div class="hub-belts" style="justify-content:center; flex-wrap:wrap; gap:8px">
                ${titlesWon.map(b => {
                  const bi = getBeltInfo(b);
                  return `<span class="belt-chip" style="border-color:${bi.color}">${bi.icon} ${bi.displayName || bi.name}</span>`;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Troféus -->
          ${(p.trophies || []).length ? `
            <div class="ret-section">
              <h3>🏅 Troféus Territoriais</h3>
              <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center">
                ${['national','regional','local'].map(tier => {
                  const cnt = (p.trophies||[]).filter(t => t.tier === tier).length;
                  if (!cnt) return '';
                  const label = {national:'Nacional',regional:'Regional',local:'Local'}[tier];
                  return `<span class="belt-chip" style="border-color:#b8860b">🏅 ${cnt}× ${label}</span>`;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Grandes vitórias -->
          ${notableWins.length ? `
            <div class="ret-section">
              <h3>⭐ Grandes Vitórias</h3>
              ${notableWins.slice(0, 5).map(h => `
                <div class="notable-win-row">
                  <span>${h.result === 'W' ? '✅' : '❌'} vs. ${h.opponent?.name || '?'} (#${h.opponentRanking})</span>
                  <span class="muted">${h.method || ''} · ${h.date || ''}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Bônus GOAT para o modo manager -->
          ${this._renderRetirementGoatBonus(p)}
        </div>

        <div class="create-footer">
          <button class="btn btn-secondary" id="btn-found-academy">Fundar uma Academia</button>
          <button class="btn btn-primary" id="btn-view-legacy">Ver Legado Completo</button>
          <button class="btn btn-ghost" id="btn-main-menu">← Menu Principal</button>
        </div>
      </div>
    `;

    document.getElementById('btn-found-academy').onclick = () => this.show('createAcademy', { fromRetirement: true });
    document.getElementById('btn-view-legacy').onclick = () => this.show('legacy', { from: 'retirement' });
    document.getElementById('btn-main-menu').onclick   = () => this.show('mainMenu');
  }
  _renderRetirementGoatBonus(p) {
    const proj = this.gs.getAcademyFounderProjection(p);
    if (!proj) return '';
    const { goatCount, isGoat, isLegend, money, reputation, maxRoster, sponsorSlots } = proj;
    if (!goatCount) return '';

    const tier = isGoat   ? { label: 'G.O.A.T.',  color: '#ffd700', icon: '🐐', desc: 'O maior de todos os tempos. Sua academia começa no topo.' }
               : isLegend ? { label: 'Lenda',      color: '#ff9500', icon: '🌟', desc: 'Uma carreira histórica que abre todas as portas.' }
               :             { label: 'Veterano',  color: '#88aacc', icon: '🥊', desc: 'Passagem respeitada no esporte que alavanca a academia.' };

    const bonuses = [
      { label: 'Capital inicial',    val: `${formatCurrency(money)}`,        icon: '💰' },
      { label: 'Reputação inicial',  val: `${reputation} pts`,               icon: '⭐' },
      { label: 'Roster máximo',      val: `${maxRoster} atletas`,            icon: '👥' },
      { label: 'Slots de patrocínio',val: `${sponsorSlots} slot${sponsorSlots > 1 ? 's' : ''}`, icon: '🤝' },
    ];

    return `
      <div class="ret-section goat-bonus-section" style="border-left: 3px solid ${tier.color}">
        <h3>${tier.icon} Bônus de Legado — Modo Academia</h3>
        <p class="muted" style="font-size:.82rem; margin-bottom:12px">
          ${tier.desc} <strong style="color:${tier.color}">${goatCount}/10 critérios GOAT</strong> atingidos.
        </p>
        <div class="goat-bonus-grid">
          ${bonuses.map(b => `
            <div class="goat-bonus-chip">
              <span class="goat-bonus-icon">${b.icon}</span>
              <div>
                <div class="goat-bonus-val">${b.val}</div>
                <div class="goat-bonus-label">${b.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${isGoat || isLegend ? `
          <div class="goat-bonus-items">
            <div class="goat-bonus-item-label">Itens exclusivos na academia:</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px">
              ${isLegend ? `<span class="belt-chip" style="border-color:${tier.color}">🐐 Galeria das Lendas</span>` : ''}
              ${isGoat   ? `<span class="belt-chip" style="border-color:#ffd700">🗿 Estátua do G.O.A.T.</span>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // HELPERS
  _modal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        ${html}
        <button class="btn btn-ghost modal-close">Fechar</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  _toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
}
