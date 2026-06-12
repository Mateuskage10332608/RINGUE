// ============================================================
//  animation.js  –  Animação do ringue com perspectiva 3/4
// ============================================================

class RingAnimation {
  constructor(canvas, f1, f2) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.w      = canvas.width;
    this.h      = canvas.height;

    this.name1  = f1.name.split(' ')[0].toUpperCase();
    this.name2  = f2.name.split(' ')[0].toUpperCase();
    this.color1 = '#e63946';
    this.color2 = '#4ecdc4';

    // Perspectiva 3/4: ring ocupa área central, crowd ao redor
    this._setupLayout();

    // Estado dos lutadores (em coordenadas do ringue: 0-1)
    this.p1 = { rx: 0.30, ry: 0.5, x: 0, y: 0, tx: 0, ty: 0 };
    this.p2 = { rx: 0.70, ry: 0.5, x: 0, y: 0, tx: 0, ty: 0 };
    this._projectFighter(this.p1);
    this._projectFighter(this.p2);
    this.p1.tx = this.p1.x; this.p1.ty = this.p1.y;
    this.p2.tx = this.p2.x; this.p2.ty = this.p2.y;

    this.state     = 'circle';
    this.stateTime = 0;
    this.intensity = 0.5;
    this.koDown    = null;
    this.flashes   = [];
    this.running   = false;
    this._raf      = null;
    this.eventDriven = false;
    this._kdTimer  = 0;
    this._kdWho    = null;
    this._tick     = 0;
    this.crowdLevel = 0;
    this._crowd    = [];
    this.arena = { scope: 'local', level: 1, globalLevel: 1, look: 'community' };
    this._inCorner = false;

    // Árbitro
    this._ref = { x: this.ring.cx, y: this.ring.cy, tx: this.ring.cx, ty: this.ring.cy };

    // Cornermen
    this._cornermen = this._buildCornermen();

    // Partículas de suor/impacto
    this._particles = [];
  }

  // ── Layout e projeção 3/4 ─────────────────────────────────
  _setupLayout() {
    const W = this.w, H = this.h;
    // Ring ocupa ~68% da largura e ~64% da altura, centralizado ligeiramente acima
    const rw = W * 0.68, rh = H * 0.64;
    const rx = (W - rw) / 2, ry = H * 0.18;
    this.ring = { x: rx, y: ry, w: rw, h: rh, cx: rx + rw / 2, cy: ry + rh / 2 };

    // Para projeção 3/4: parte de cima do ring é "mais longe" (menor escala)
    // parte de baixo é "mais perto" (maior escala)
    this.perspTop    = 0.78;  // escala no topo
    this.perspBottom = 1.10;  // escala na base
  }

  // Converte coordenadas do ringue (rx 0-1, ry 0-1) para canvas
  _ringToCanvas(rx, ry) {
    const r = this.ring;
    const scale = this.perspTop + (this.perspBottom - this.perspTop) * ry;
    const cx = r.x + r.w * rx;
    const cy = r.y + r.h * ry;
    return { x: cx, y: cy, scale };
  }

  _projectFighter(p) {
    const c = this._ringToCanvas(p.rx, p.ry);
    p.x = c.x; p.y = c.y; p.scale = c.scale;
  }

  _buildCornermen() {
    // P1: canto superior-esquerdo; P2: canto inferior-direito
    const r = this.ring;
    return [
      // Cornermen do P1 (fora do ring, canto sup-esq)
      { cx: r.x - 14, cy: r.y + 8,  color: this.color1, who: 'p1', role: 'trainer' },
      { cx: r.x - 28, cy: r.y + 18, color: this.color1, who: 'p1', role: 'cutman'  },
      { cx: r.x - 8,  cy: r.y + 24, color: this.color1, who: 'p1', role: 'second'  },
      // Cornermen do P2 (fora do ring, canto inf-dir)
      { cx: r.x + r.w + 14, cy: r.y + r.h - 8,  color: this.color2, who: 'p2', role: 'trainer' },
      { cx: r.x + r.w + 28, cy: r.y + r.h - 18, color: this.color2, who: 'p2', role: 'cutman'  },
      { cx: r.x + r.w + 8,  cy: r.y + r.h - 24, color: this.color2, who: 'p2', role: 'second'  },
    ];
  }

  // ── API pública (mantém interface igual) ─────────────────
  punch(attackerWho, big = false) {
    if (this.koDown || this._kdTimer > 0) return;
    const target = attackerWho === 'p1' ? this.p2 : this.p1;
    const attacker = attackerWho === 'p1' ? this.p1 : this.p2;

    const mx = (this.p1.x + this.p2.x) / 2;
    const my = (this.p1.y + this.p2.y) / 2;

    // Aproxima os dois para o centro
    const c1 = this._ringToCanvas(this.p1.rx, this.p1.ry);
    const c2 = this._ringToCanvas(this.p2.rx, this.p2.ry);
    this.p1.tx = mx - (mx - c1.x) * 0.3;
    this.p2.tx = mx - (mx - c2.x) * 0.3;
    this.p1.ty = my; this.p2.ty = my;
    this.state = 'exchange';
    this.stateTime = rand(20, 45);

    // Impacto no alvo
    const flashSize = big ? 18 : 9;
    this.flashes.push({
      x: target.x + randFloat(-6, 6),
      y: target.y + randFloat(-10, 2),
      life: big ? 24 : 14,
      maxLife: big ? 24 : 14,
      big,
      size: flashSize,
    });

    // Partículas de suor
    const pCount = big ? 6 : 3;
    for (let i = 0; i < pCount; i++) {
      this._particles.push({
        x: target.x, y: target.y - 10,
        vx: randFloat(-2.5, 2.5),
        vy: randFloat(-3, -0.5),
        life: rand(12, 22),
        maxLife: 20,
        color: big ? '#ffd700' : 'rgba(200,220,255,0.8)',
        size: randFloat(1.5, big ? 4 : 2.5),
      });
    }

    // Excitação da plateia
    if (big) this._exciteCrowd();
  }

  knockdown(who) {
    this._kdTimer = 9999;
    this._kdWho = who;
    this._exciteCrowd(true);
    // Partículas de queda
    const p = who === 'p1' ? this.p1 : this.p2;
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: p.x, y: p.y,
        vx: randFloat(-3, 3), vy: randFloat(-4, 1),
        life: rand(20, 35), maxLife: 30,
        color: who === 'p1' ? this.color1 : this.color2,
        size: randFloat(2, 5),
      });
    }
  }

  getUp(who) { if (this._kdWho === who) this._kdTimer = 0; }

  ko(who) {
    this.koDown = who;
    this._kdTimer = 0;
  }

  enterCorner() {
    this._inCorner = true;
    this.koDown = null; this._kdTimer = 0; this._kdWho = null;
    this.flashes = []; this._particles = [];
    // Vai para os cantos
    const r = this.ring;
    this.p1.tx = r.x + r.w * 0.12;
    this.p1.ty = r.y + r.h * 0.15;
    this.p2.tx = r.x + r.w * 0.88;
    this.p2.ty = r.y + r.h * 0.85;
    // Árbitro no centro
    this._ref.tx = r.cx; this._ref.ty = r.cy;
  }

  resetRound() {
    this._inCorner = false;
    this.koDown = null; this._kdTimer = 0; this._kdWho = null;
    this.flashes = []; this._particles = [];
    const r = this.ring;
    this.p1.tx = r.x + r.w * 0.25; this.p1.ty = r.y + r.h * 0.5;
    this.p2.tx = r.x + r.w * 0.75; this.p2.ty = r.y + r.h * 0.5;
    this.state = 'circle';
    this.stateTime = 80;
  }

  setIntensity(x) { this.intensity = clamp(x, 0.15, 1); }

  setCrowdSize(level) {
    this.crowdLevel = Math.round(clamp(level, 1, 20));
    this._buildCrowd();
  }

  setArena(arena) {
    if (!arena) return;
    this.arena = arena;
    this.setCrowdSize(arena.globalLevel || 1);
  }

  start() { if (this.running) return; this.running = true; this._loop(); }
  stop()  { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }

  // ── Crowd ─────────────────────────────────────────────────
  _buildCrowd() {
    this._crowd = [];
    const r = this.ring;
    const n = 14 + this.crowdLevel * 4;
    const sections = [
      // Norte (atrás do ringue) — mais afastado, menor
      { side: 'N', rows: 3, rowH: 9,  startY: r.y - 14, slotW: r.w / (n * 0.6) },
      // Sul (frente do ringue) — mais perto, maior
      { side: 'S', rows: 4, rowH: 11, startY: r.y + r.h + 10, slotW: r.w / (n * 0.6) },
      // Leste e Oeste (laterais)
      { side: 'E', rows: 2, rowH: 10, startX: r.x + r.w + 10 },
      { side: 'W', rows: 2, rowH: 10, startX: r.x - 14 },
    ];

    // Norte
    for (let row = 0; row < 3; row++) {
      const count = Math.round(n * 0.6) + row * 2;
      for (let i = 0; i < count; i++) {
        const x = r.x + (r.w / (count + 1)) * (i + 1);
        const y = sections[0].startY - row * 9;
        const scale = 0.60 - row * 0.06;
        this._crowd.push({ x, y, phase: Math.random() * Math.PI * 2,
          hue: (i * 31 + row * 77) % 360, scale, side: 'N', excite: 0 });
      }
    }
    // Sul
    for (let row = 0; row < 4; row++) {
      const count = Math.round(n * 0.6) + row;
      for (let i = 0; i < count; i++) {
        const x = r.x + (r.w / (count + 1)) * (i + 1);
        const y = sections[1].startY + row * 11;
        const scale = 0.95 + row * 0.04;
        this._crowd.push({ x, y, phase: Math.random() * Math.PI * 2,
          hue: (i * 31 + row * 77) % 360, scale, side: 'S', excite: 0 });
      }
    }
    // Leste
    for (let row = 0; row < 3; row++) {
      const count = Math.round(n * 0.35);
      for (let i = 0; i < count; i++) {
        const x = sections[2].startX + row * 10;
        const y = r.y + (r.h / (count + 1)) * (i + 1);
        this._crowd.push({ x, y, phase: Math.random() * Math.PI * 2,
          hue: (i * 47) % 360, scale: 0.75, side: 'E', excite: 0 });
      }
    }
    // Oeste
    for (let row = 0; row < 3; row++) {
      const count = Math.round(n * 0.35);
      for (let i = 0; i < count; i++) {
        const x = sections[3].startX - row * 10;
        const y = r.y + (r.h / (count + 1)) * (i + 1);
        this._crowd.push({ x, y, phase: Math.random() * Math.PI * 2,
          hue: (i * 47) % 360, scale: 0.75, side: 'W', excite: 0 });
      }
    }
  }

  _exciteCrowd(strong = false) {
    for (const c of this._crowd) {
      if (Math.random() < (strong ? 0.9 : 0.45)) {
        c.excite = strong ? rand(60, 100) : rand(30, 60);
      }
    }
  }

  reactCrowd(strong = false) {
    this._exciteCrowd(strong);
  }

  booCrowd() {
    // Plateia senta, excitação vai a zero rapidamente
    for (const c of this._crowd) {
      c.excite = 0;
      // Marca como "entediado" — corpo levemente menor por alguns frames
      c._bored = rand(80, 160);
    }
    // Adiciona partículas de "vaias" — pequenos pontos escuros saindo da plateia
    const r = this.ring;
    for (let i = 0; i < 8; i++) {
      const cx = r.x + Math.random() * r.w;
      const cy = r.y - 10 + Math.random() * -20;
      this._particles.push({
        x: cx, y: cy,
        vx: randFloat(-1, 1), vy: randFloat(-2, -0.5),
        life: rand(25, 45), maxLife: 40,
        color: 'rgba(180,180,180,0.5)',
        size: randFloat(1, 2.5),
      });
    }
  }

  // ── Loop principal ────────────────────────────────────────
  _loop() {
    if (!this.running) return;
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _update() {
    this._tick++;

    // Resfria excitação e tédio da plateia
    for (const c of this._crowd) {
      if (c.excite > 0) c.excite--;
      if (c._bored > 0) c._bored--;
    }

    // Partículas
    for (const p of this._particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18;
      p.vx *= 0.92; p.life--;
    }
    this._particles = this._particles.filter(p => p.life > 0);

    if (this._inCorner) {
      this._ease(this.p1, 0.08); this._ease(this.p2, 0.08);
      this._ref.x += (this._ref.tx - this._ref.x) * 0.05;
      this._ref.y += (this._ref.ty - this._ref.y) * 0.05;
      this.flashes = [];
      return;
    }

    this.stateTime--;

    if (this.koDown) {
      this._drift2D(this.koDown === 'p1' ? this.p2 : this.p1, 0.3);
      this._ref.tx = (this.koDown === 'p1' ? this.p1 : this.p2).x;
      this._ref.ty = (this.koDown === 'p1' ? this.p1 : this.p2).y + 20;
      this._ref.x += (this._ref.tx - this._ref.x) * 0.04;
      this._ref.y += (this._ref.ty - this._ref.y) * 0.04;
      return;
    }

    if (this._kdTimer > 0) { this._kdTimer--; return; }

    if (this.stateTime <= 0) this._nextState();

    const r = this.ring;
    const cx = r.cx, cy = r.cy;

    switch (this.state) {
      case 'circle':
        this._drift2D(this.p1, 0.5);
        this._drift2D(this.p2, 0.5);
        break;
      case 'engage': {
        const mx = (this.p1.x + this.p2.x) / 2;
        const my = (this.p1.y + this.p2.y) / 2;
        this.p1.tx = mx - 22; this.p1.ty = my;
        this.p2.tx = mx + 22; this.p2.ty = my;
        break;
      }
      case 'exchange':
        if (!this.eventDriven && Math.random() < 0.25 * this.intensity) {
          const mx = (this.p1.x + this.p2.x) / 2;
          const my = (this.p1.y + this.p2.y) / 2;
          this.flashes.push({
            x: mx + randFloat(-12, 12), y: my + randFloat(-8, 8),
            life: 14, maxLife: 14, big: Math.random() < 0.2, size: 8,
          });
        }
        this.p1.x += randFloat(-1, 1); this.p1.y += randFloat(-0.7, 0.7);
        this.p2.x += randFloat(-1, 1); this.p2.y += randFloat(-0.7, 0.7);
        break;
      case 'retreat':
        this.p1.tx = cx - randFloat(55, 100);
        this.p1.ty = cy + randFloat(-40, 40);
        this.p2.tx = cx + randFloat(55, 100);
        this.p2.ty = cy + randFloat(-40, 40);
        break;
    }

    this._ease(this.p1, 0.07); this._ease(this.p2, 0.07);

    // Árbitro segue o centro da ação
    this._ref.tx = (this.p1.x + this.p2.x) / 2 + 22;
    this._ref.ty = (this.p1.y + this.p2.y) / 2 + 10;
    this._ref.x += (this._ref.tx - this._ref.x) * 0.03;
    this._ref.y += (this._ref.ty - this._ref.y) * 0.03;

    // Mantém dentro do ring
    const r2 = this.ring;
    const pad = 26;
    for (const p of [this.p1, this.p2]) {
      p.x = clamp(p.x, r2.x + pad, r2.x + r2.w - pad);
      p.y = clamp(p.y, r2.y + pad, r2.y + r2.h - pad);
    }

    this.flashes = this.flashes.filter(f => --f.life > 0);
  }

  _ease(p, s) {
    p.x += (p.tx - p.x) * s;
    p.y += (p.ty - p.y) * s;
  }

  _drift2D(p, speed) {
    if (Math.abs(p.x - p.tx) < 5 && Math.abs(p.y - p.ty) < 5) {
      const r = this.ring;
      p.tx = r.cx + randFloat(-r.w * 0.3, r.w * 0.3);
      p.ty = r.cy + randFloat(-r.h * 0.28, r.h * 0.28);
    }
    p.x += (p.tx - p.x) * 0.025 * speed;
    p.y += (p.ty - p.y) * 0.025 * speed;
  }

  _nextState() {
    const r = Math.random();
    if (this.eventDriven) {
      this.state = r < 0.5 ? 'retreat' : 'circle';
      this.stateTime = rand(40, 90);
      return;
    }
    if (this.state === 'exchange') {
      this.state = r < 0.6 ? 'retreat' : 'circle';
      this.stateTime = rand(40, 90);
    } else if (this.state === 'engage') {
      this.state = 'exchange';
      this.stateTime = rand(30, Math.round(40 + 60 * this.intensity));
    } else {
      this.state = r < 0.3 + 0.5 * this.intensity ? 'engage' : 'circle';
      this.stateTime = this.state === 'engage' ? rand(30, 60) : rand(40, 100);
    }
  }

  // ── Desenho ───────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this._drawBackground();
    this._drawArenaStands();

    // Plateia (atrás = norte primeiro, depois frente no final)
    this._drawCrowdSection('N');
    this._drawCrowdSection('E');
    this._drawCrowdSection('W');

    // Ring
    this._drawRing();

    // Cornermen (dentro da área do ring, nos cantos)
    this._drawCornermen();

    // Árbitro
    this._drawReferee();

    // Lutadores
    const p1Down = this.koDown === 'p1' || this._kdWhoActive('p1');
    const p2Down = this.koDown === 'p2' || this._kdWhoActive('p2');

    // Ordem de desenho por y (perspectiva)
    if (this.p1.y < this.p2.y) {
      this._drawFighter(this.p1, this.color1, this.name1, p1Down, 'left');
      this._drawFighter(this.p2, this.color2, this.name2, p2Down, 'right');
    } else {
      this._drawFighter(this.p2, this.color2, this.name2, p2Down, 'right');
      this._drawFighter(this.p1, this.color1, this.name1, p1Down, 'left');
    }

    // Partículas
    this._drawParticles();

    // Flashes de impacto
    this._drawFlashes();

    // Plateia sul (na frente, por cima de tudo)
    this._drawCrowdSection('S');

    // Spotlight / vinheta
    this._drawVignette();
  }

  _drawBackground() {
    const ctx = this.ctx;
    const W = this.w, H = this.h;
    const scope = this.arena.scope;
    const level = this.arena.level || 1;

    const bgGrads = {
      local:       ['#12100e', '#1a1510'],
      regional:    ['#0d1220', '#111828'],
      national:    ['#0f0d1e', '#18122a'],
      continental: ['#100818', '#1a0e28'],
      world:       ['#0d0b08', '#1a1500'],
    };
    const [c1, c2] = bgGrads[scope] || bgGrads.local;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow — cor temática no centro inferior (vem do ringue)
    const glowColors = {
      local: 'rgba(255,200,80,0.04)',
      regional: 'rgba(100,160,255,0.06)',
      national: 'rgba(160,100,255,0.07)',
      continental: 'rgba(200,80,255,0.08)',
      world: 'rgba(255,200,50,0.12)',
    };
    const glow = ctx.createRadialGradient(W/2, H*0.55, H*0.05, W/2, H*0.55, H*0.7);
    glow.addColorStop(0, glowColors[scope] || glowColors.local);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  _drawArenaStands() {
    const ctx = this.ctx;
    const W = this.w, H = this.h;
    const r = this.ring;
    const scope = this.arena.scope;
    const level = this.arena.level || 1;
    const si = ['local', 'regional', 'national', 'continental', 'world'].indexOf(scope);
    ctx.save();

    // ── LOCAL: ginásio bare-bones, paredes de tijolo, lâmpadas expostas ──
    if (scope === 'local') {
      // Parede de tijolo (textura simples)
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(0, 0, W, H);
      // Grade de tijolos
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#5a3a28';
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 14) {
        for (let x = (Math.floor(y/14) % 2) * 18; x < W; x += 36) {
          ctx.strokeRect(x, y, 34, 12);
        }
      }
      // Lâmpadas expostas no teto (poucas)
      const bulbCount = 3 + level;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < bulbCount; i++) {
        const bx = W * (i + 1) / (bulbCount + 1);
        ctx.fillStyle = '#ffe8a0';
        ctx.beginPath(); ctx.arc(bx, 6, 4 + level, 0, Math.PI * 2); ctx.fill();
        // fio pendurado
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, 6); ctx.stroke();
        // cone de luz fraco
        const cone = ctx.createRadialGradient(bx, 10, 2, bx, 10, 40 + level * 8);
        cone.addColorStop(0, 'rgba(255,220,100,0.10)');
        cone.addColorStop(1, 'rgba(255,220,100,0)');
        ctx.fillStyle = cone;
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(bx, 10, 40 + level * 8, 0, Math.PI * 2); ctx.fill();
      }
      // Arquibancada simples (tábuas de madeira, nível <= 2 = só lateral, 3-4 = volta toda)
      const rows = 1 + level;
      ctx.globalAlpha = 0.30;
      for (let i = 0; i < rows; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#3b2a1a' : '#4a3525';
        // topo
        ctx.fillRect(r.x - 14 - i*9, r.y - 10 - i*7, r.w + (14+i*9)*2, 8);
        if (level >= 3) {
          // laterais
          ctx.fillRect(r.x - 14 - i*9, r.y, 8, r.h);
          ctx.fillRect(r.x + r.w + 6 + i*9, r.y, 8, r.h);
        }
      }
    }

    // ── REGIONAL: arena esportiva, cadeiras coloridas, placar simples ──
    else if (scope === 'regional') {
      // Arquibancadas com cadeiras em cores
      const rows = 2 + level;
      const chairColors = ['#c0392b','#2980b9','#f39c12','#27ae60','#8e44ad'];
      for (let i = 0; i < rows; i++) {
        const inset = i * 8;
        ctx.globalAlpha = 0.22 - i * 0.02;
        ctx.fillStyle = chairColors[i % chairColors.length];
        // topo
        ctx.fillRect(r.x - 18 - inset, r.y - 12 - i*8, r.w + (18+inset)*2, 9);
        // lados
        ctx.fillRect(r.x - 18 - inset, r.y, 9, r.h);
        ctx.fillRect(r.x + r.w + 9 + inset, r.y, 9, r.h);
        if (level >= 3) {
          ctx.fillRect(r.x - 18 - inset, r.y + r.h + 4 + i*6, r.w + (18+inset)*2, 7);
        }
      }
      // Iluminação profissional — 4 holofotes nos cantos
      if (level >= 2) {
        const spots = [[r.x - 20, r.y - 18], [r.x+r.w+20, r.y-18]];
        if (level >= 3) spots.push([r.x-20, r.y+r.h+18], [r.x+r.w+20, r.y+r.h+18]);
        for (const [sx, sy] of spots) {
          const beam = ctx.createRadialGradient(sx, sy, 4, r.cx, r.cy, r.w * 0.7);
          beam.addColorStop(0, 'rgba(220,220,255,0.12)');
          beam.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = beam;
          ctx.globalAlpha = 0.7;
          ctx.fillRect(0, 0, W, H);
        }
      }
      // Placar simples (level 3+)
      if (level >= 3) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#111';
        ctx.fillRect(W/2 - 42, 4, 84, 18);
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PLACAR AO VIVO', W/2, 13);
      }
      // Faixas de patrocinador (level 4)
      if (level >= 4) {
        const bannerY = r.y - 28;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#1a3a6e';
        ctx.fillRect(r.x, bannerY, r.w, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PATROCINADOR OFICIAL', r.cx, bannerY + 7);
      }
    }

    // ── NATIONAL: arena grande, múltiplos níveis, câmeras, banners ──
    else if (scope === 'national') {
      // Múltiplas fileiras de arquibancada
      const tiers = 2 + level;
      for (let t = 0; t < tiers; t++) {
        const inset = t * 10;
        const alpha = 0.28 - t * 0.04;
        ctx.globalAlpha = alpha;
        // Gradiente das fileiras
        const tierGrad = ctx.createLinearGradient(0, r.y - 15 - t*10, 0, r.y - 5 - t*10);
        tierGrad.addColorStop(0, t % 2 === 0 ? '#2c3e70' : '#1a2850');
        tierGrad.addColorStop(1, t % 2 === 0 ? '#1a2850' : '#2c3e70');
        ctx.fillStyle = tierGrad;
        ctx.fillRect(r.x - 20 - inset, r.y - 15 - t*10, r.w + (20+inset)*2, 11);
        ctx.fillRect(r.x - 20 - inset, r.y, 11, r.h);
        ctx.fillRect(r.x + r.w + 9 + inset, r.y, 11, r.h);
        ctx.fillRect(r.x - 20 - inset, r.y + r.h + 5 + t*8, r.w + (20+inset)*2, 10);
      }
      // Holofotes profissionais (4 a 6 feixes)
      const beamCount = 4 + level;
      for (let i = 0; i < beamCount; i++) {
        const bx = r.x + r.w * (i / (beamCount - 1));
        const by = r.y - 25;
        const beam = ctx.createLinearGradient(bx, by, bx + (r.cx - bx) * 0.3, r.cy);
        beam.addColorStop(0, 'rgba(230,230,255,0.15)');
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beam;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 18, r.cy);
        ctx.lineTo(bx + 18, r.cy);
        ctx.closePath();
        ctx.fill();
      }
      // Telão / scoreboard eletrônico
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#050a14';
      ctx.fillRect(W/2 - 55, 2, 110, 20);
      ctx.strokeStyle = '#2255aa';
      ctx.lineWidth = 1;
      ctx.strokeRect(W/2 - 55, 2, 110, 20);
      ctx.fillStyle = '#22aaff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`▶ EVENTO NACIONAL — NÍVEL ${level}`, W/2, 12);
      // Banners de patrocinador nas laterais
      if (level >= 2) {
        const bannerW = 14, bannerH = r.h * 0.35;
        const bannerY = r.cy - bannerH / 2;
        const bannerColors = ['#c0392b','#2471a3','#1a8a4a'];
        for (let i = 0; i < Math.min(3, level); i++) {
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = bannerColors[i % bannerColors.length];
          ctx.fillRect(r.x - 32 - i*16, bannerY + i*(bannerH/3), bannerW, bannerH/2.5);
          ctx.fillRect(r.x + r.w + 18 + i*16, bannerY + i*(bannerH/3), bannerW, bannerH/2.5);
        }
      }
      // Câmera de TV (level 3+)
      if (level >= 3) {
        this._drawTVCamera(r.x - 40, r.y + r.h * 0.4);
        this._drawTVCamera(r.x + r.w + 40, r.y + r.h * 0.6);
      }
    }

    // ── CONTINENTAL: coliseu, múltiplos andares, telas gigantes, bandeiras ──
    else if (scope === 'continental') {
      // Múltiplos andares de arquibancada com gradiente épico
      const floors = 3 + level;
      for (let f = 0; f < floors; f++) {
        const inset = f * 12;
        ctx.globalAlpha = 0.32 - f * 0.04;
        const floorGrad = ctx.createLinearGradient(0, 0, W, H);
        floorGrad.addColorStop(0, f % 2 === 0 ? '#1a0a30' : '#0a1540');
        floorGrad.addColorStop(1, f % 2 === 0 ? '#0a1540' : '#1a0a30');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(r.x - 22 - inset, r.y - 18 - f*12, r.w + (22+inset)*2, 13);
        ctx.fillRect(r.x - 22 - inset, r.y, 13, r.h);
        ctx.fillRect(r.x + r.w + 9 + inset, r.y, 13, r.h);
        ctx.fillRect(r.x - 22 - inset, r.y + r.h + 6 + f*10, r.w + (22+inset)*2, 12);
      }
      // Feixes de luz coloridos
      const beamColors = ['rgba(150,80,255,0.12)','rgba(80,150,255,0.10)','rgba(255,80,150,0.10)','rgba(80,255,200,0.08)'];
      for (let i = 0; i < 4 + level; i++) {
        const angle = (i / (4+level)) * Math.PI;
        const bx = r.cx + Math.cos(angle) * r.w * 0.8;
        const by = r.y - 30;
        const beam = ctx.createLinearGradient(bx, by, r.cx, r.cy + r.h*0.3);
        beam.addColorStop(0, beamColors[i % beamColors.length]);
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beam;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx, by - 10);
        ctx.lineTo(r.cx - 30, r.cy + r.h*0.3);
        ctx.lineTo(r.cx + 30, r.cy + r.h*0.3);
        ctx.closePath();
        ctx.fill();
      }
      // Telas gigantes nas laterais
      this._drawBigScreen(r.x - 60, r.y + 10, 48, 32, level);
      this._drawBigScreen(r.x + r.w + 12, r.y + 10, 48, 32, level);
      // Câmeras de TV múltiplas
      this._drawTVCamera(r.x - 48, r.y + r.h * 0.3);
      this._drawTVCamera(r.x + r.w + 48, r.y + r.h * 0.5);
      if (level >= 3) {
        this._drawTVCamera(r.x + r.w * 0.2, r.y - 35);
        this._drawTVCamera(r.x + r.w * 0.8, r.y - 35);
      }
      // Bandeiras internacionais no topo
      const flagColors = ['#c0392b','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'];
      const flagCount = 4 + level * 2;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < flagCount; i++) {
        const fx = W * (i + 0.5) / flagCount;
        ctx.fillStyle = flagColors[i % flagColors.length];
        ctx.fillRect(fx - 8, 0, 14, 10 + Math.sin(this._tick * 0.04 + i) * 2);
      }
      // Scoreboard épico
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#08050f';
      ctx.fillRect(W/2 - 70, 2, 140, 22);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W/2 - 70, 2, 140, 22);
      const tick = this._tick;
      const pulse = 0.85 + Math.sin(tick * 0.06) * 0.15;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`◆ EVENTO CONTINENTAL — NÍVEL ${level}`, W/2, 13);
    }

    // ── WORLD: espetáculo máximo, ouro, pirotecnia, telas enormes ──
    else if (scope === 'world') {
      // Arquibancadas monumentais com brilho dourado
      const tiers = 5 + level - 1;
      for (let t = 0; t < tiers; t++) {
        const inset = t * 13;
        ctx.globalAlpha = 0.35 - t * 0.04;
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, t % 2 === 0 ? '#2a1a00' : '#1a1000');
        g.addColorStop(0.5, t % 2 === 0 ? '#3a2800' : '#2a1a00');
        g.addColorStop(1, t % 2 === 0 ? '#2a1a00' : '#1a1000');
        ctx.fillStyle = g;
        ctx.fillRect(r.x - 25 - inset, r.y - 20 - t*13, r.w + (25+inset)*2, 14);
        ctx.fillRect(r.x - 25 - inset, r.y, 14, r.h);
        ctx.fillRect(r.x + r.w + 11 + inset, r.y, 14, r.h);
        ctx.fillRect(r.x - 25 - inset, r.y + r.h + 8 + t*11, r.w + (25+inset)*2, 13);
        // Borda dourada em cada tier
        ctx.globalAlpha = 0.15 - t * 0.02;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x - 25 - inset, r.y - 20 - t*13, r.w + (25+inset)*2, 14);
      }
      // Feixes de luz dourados e brancos espetaculares
      const beamPairs = 3 + level;
      for (let i = 0; i < beamPairs * 2; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const bx = r.cx + side * r.w * (0.4 + (Math.floor(i/2) / beamPairs) * 0.5);
        const by = -10;
        const isGold = i % 3 === 0;
        const beam = ctx.createLinearGradient(bx, by, r.cx, r.cy);
        beam.addColorStop(0, isGold ? 'rgba(255,215,0,0.20)' : 'rgba(255,255,255,0.14)');
        beam.addColorStop(0.6, isGold ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.04)');
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beam;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(r.cx - 50 - i*5, r.cy + r.h*0.4);
        ctx.lineTo(r.cx + 50 + i*5, r.cy + r.h*0.4);
        ctx.closePath();
        ctx.fill();
      }
      // Telas gigantes
      this._drawBigScreen(r.x - 72, r.y + 5, 60, 40, level);
      this._drawBigScreen(r.x + r.w + 12, r.y + 5, 60, 40, level);
      if (level >= 3) {
        this._drawBigScreen(r.x - 72, r.y + r.h - 50, 60, 36, level);
        this._drawBigScreen(r.x + r.w + 12, r.y + r.h - 50, 60, 36, level);
      }
      // Câmeras em todas as posições
      for (const [cx2, cy2] of [
        [r.x - 55, r.y + r.h * 0.25], [r.x + r.w + 55, r.y + r.h * 0.25],
        [r.x - 55, r.y + r.h * 0.65], [r.x + r.w + 55, r.y + r.h * 0.65],
        [r.x + r.w * 0.15, r.y - 38],  [r.x + r.w * 0.85, r.y - 38],
      ]) {
        this._drawTVCamera(cx2, cy2);
      }
      // Bandeiras do mundo em todas as bordas
      const flagColors = ['#c0392b','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#e74c3c','#1abc9c'];
      const flagCount = 8 + level * 3;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < flagCount; i++) {
        const fx = W * (i + 0.5) / flagCount;
        const waveH = 12 + Math.sin(this._tick * 0.05 + i * 0.9) * 3;
        ctx.fillStyle = flagColors[i % flagColors.length];
        ctx.fillRect(fx - 9, 0, 16, waveH);
        // Brilho na bandeira
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(fx - 9, 0, 5, waveH * 0.6);
      }
      // Scoreboard dourado pulsante
      const tick2 = this._tick;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#100800';
      ctx.fillRect(W/2 - 80, 2, 160, 24);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(W/2 - 80, 2, 160, 24);
      const pulse2 = 0.8 + Math.sin(tick2 * 0.08) * 0.2;
      ctx.globalAlpha = pulse2;
      const goldText = ctx.createLinearGradient(W/2 - 60, 0, W/2 + 60, 0);
      goldText.addColorStop(0, '#ffd700');
      goldText.addColorStop(0.5, '#fff8dc');
      goldText.addColorStop(1, '#ffd700');
      ctx.fillStyle = goldText;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`★ EVENTO MUNDIAL — NÍVEL ${level} ★`, W/2, 14);
      // Partículas douradas de "pirotecnia" no topo
      if (level >= 3 && tick2 % 40 < 3) {
        for (let i = 0; i < 8; i++) {
          const px = W * (i + 0.5) / 8 + randFloat(-15, 15);
          this._particles.push({
            x: px, y: 20,
            vx: randFloat(-2, 2), vy: randFloat(-3, -1),
            life: rand(20, 35), maxLife: 30,
            color: i % 2 === 0 ? '#ffd700' : '#fff',
            size: randFloat(1.5, 3),
          });
        }
      }
    }

    ctx.restore();
  }

  _drawTVCamera(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 8, y - 4, 16, 8);
    ctx.fillStyle = '#1a6a9a';
    ctx.beginPath(); ctx.arc(x + 7, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 12, y - 2, 6, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.globalAlpha = 0.6 + Math.sin(this._tick * 0.1) * 0.4;
    ctx.beginPath(); ctx.arc(x - 10, y - 5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawBigScreen(x, y, w, h, level) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#050a0f';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = level >= 4 ? '#ffd700' : '#2255aa';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    // Scan lines animadas
    const scanLine = Math.floor(this._tick * 0.5) % h;
    ctx.fillStyle = 'rgba(0,150,255,0.12)';
    ctx.fillRect(x + 2, y + scanLine, w - 4, 2);
    // Conteúdo falso da tela: retângulos coloridos simulando transmissão
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#112233';
    ctx.fillRect(x + 2, y + 2, w - 4, h * 0.6);
    ctx.fillStyle = '#223344';
    ctx.fillRect(x + 2, y + h * 0.65, w - 4, h * 0.3);
    ctx.restore();
  }

  _drawRing() {
    const ctx = this.ctx;
    const r = this.ring;

    // Sombra do ringue
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.shadowBlur = 0;

    // Mat do ringue — cor varia com o escopo do evento
    const matColors = {
      local:       ['#b8a888', '#c8b89a', '#b0a080'],
      regional:    ['#8898b8', '#9aaac8', '#7888a8'],
      national:    ['#9888b8', '#aa99cc', '#8878a8'],
      continental: ['#7868a8', '#8878c0', '#6858a0'],
      world:       ['#c8a830', '#e0c050', '#b89020'],
    };
    const [mc0, mc1, mc2] = matColors[this.arena.scope] || matColors.local;
    const matGrad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    matGrad.addColorStop(0, mc0);
    matGrad.addColorStop(0.5, mc1);
    matGrad.addColorStop(1, mc2);
    ctx.fillStyle = matGrad;
    ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);

    // Linhas de textura do canvas (lona)
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    for (let i = 0; i < r.h; i += 6) {
      ctx.beginPath();
      ctx.moveTo(r.x + 2, r.y + 2 + i);
      ctx.lineTo(r.x + r.w - 2, r.y + 2 + i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Logo do ringue (círculo central com texto)
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.cx, r.cy, 36, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.cx, r.cy, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#4a3520';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RINGUE', r.cx, r.cy);
    ctx.restore();

    // Linhas do ringue (vermelho e azul como ringue olímpico)
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = this.color1;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x + r.w * 0.08, r.y + r.h * 0.10, r.w * 0.84, r.h * 0.80);
    ctx.strokeStyle = this.color2;
    ctx.strokeRect(r.x + r.w * 0.14, r.y + r.h * 0.16, r.w * 0.72, r.h * 0.68);
    ctx.globalAlpha = 1;

    // Posts dos cantos (4 posts com cor por dono)
    this._drawPost(r.x + 2,       r.y + 2,       this.color1, true);   // P1: sup-esq
    this._drawPost(r.x + r.w - 2, r.y + 2,       '#888',      true);   // neutro sup-dir
    this._drawPost(r.x + 2,       r.y + r.h - 2, '#888',      false);  // neutro inf-esq
    this._drawPost(r.x + r.w - 2, r.y + r.h - 2, this.color2, false);  // P2: inf-dir

    // Cordas — 3 fileiras com profundidade
    this._drawRopes();
  }

  _drawPost(x, y, color, isTop) {
    const ctx = this.ctx;
    const postR = 7;

    // Base do post
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x, y + 3, postR, 0, Math.PI * 2); ctx.fill();

    // Corpo do post
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, postR);
    grad.addColorStop(0, '#e0e0e0');
    grad.addColorStop(0.5, '#aaa');
    grad.addColorStop(1, '#555');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, postR, 0, Math.PI * 2); ctx.fill();

    // Almofada colorida do canto
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, postR * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Brilho
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(x - 2, y - 2, postR * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  _drawRopes() {
    const ctx = this.ctx;
    const r = this.ring;
    // 3 cordas horizontais, com espessura crescente (perspectiva: corda de cima mais fina)
    const ropeY = [r.y + r.h * 0.22, r.y + r.h * 0.52, r.y + r.h * 0.78];
    const ropeW = [1.5, 2.5, 3.5];
    const colors = ['#e63946', '#f5f5f5', '#4ecdc4'];

    for (let i = 0; i < 3; i++) {
      const ry = ropeY[i];
      // Sombra da corda
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = ropeW[i] + 1;
      ctx.beginPath(); ctx.moveTo(r.x + 7, ry + 2); ctx.lineTo(r.x + r.w - 7, ry + 2); ctx.stroke();
      // Corda
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = ropeW[i];
      ctx.beginPath(); ctx.moveTo(r.x + 7, ry); ctx.lineTo(r.x + r.w - 7, ry); ctx.stroke();
    }

    // Tensores verticais das cordas (estacas)
    const stakeX = [r.x + r.w * 0.33, r.x + r.w * 0.67];
    for (const sx of stakeX) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, ropeY[0]); ctx.lineTo(sx, ropeY[2]); ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  _drawCornermen() {
    const ctx = this.ctx;
    const tick = this._tick;

    for (const cm of this._cornermen) {
      const isP1 = cm.who === 'p1';
      // Animação: agitação no corner
      const exciteP1 = this._crowd.filter(c => c.side === 'N').reduce((s, c) => s + c.excite, 0);
      const agitate = (isP1 ? exciteP1 : 100 - exciteP1) * 0.002;
      const bob = Math.sin(tick * 0.08 + (isP1 ? 0 : Math.PI)) * (1 + agitate * 2);

      const x = cm.cx, y = cm.cy + bob;
      const s = 5.5; // tamanho base

      ctx.globalAlpha = 0.92;

      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y + s * 2.2, s * 0.6, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();

      // Corpo
      const bodyGrad = ctx.createLinearGradient(x - s, y, x + s, y + s * 2.5);
      bodyGrad.addColorStop(0, cm.color);
      bodyGrad.addColorStop(1, this._darken(cm.color, 0.5));
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 1.5, s * 0.6, s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça
      ctx.fillStyle = cm.role === 'cutman' ? '#f4d03f' : '#e8c49a';
      ctx.beginPath(); ctx.arc(x, y, s * 0.65, 0, Math.PI * 2); ctx.fill();

      // Braços levantados se excitado
      if (agitate > 0.3) {
        ctx.strokeStyle = cm.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        const armAngle = Math.sin(tick * 0.2) * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.5, y + s * 0.8);
        ctx.lineTo(x - s * 1.3, y - s * 0.3 + Math.sin(tick * 0.15) * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.5, y + s * 0.8);
        ctx.lineTo(x + s * 1.3, y - s * 0.3 + Math.sin(tick * 0.15 + 1) * s);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }

  _drawReferee() {
    const ctx = this.ctx;
    const ref = this._ref;
    const s = 7;
    const bob = Math.sin(this._tick * 0.06) * 0.8;
    const x = ref.x, y = ref.y + bob;

    ctx.globalAlpha = 0.85;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + s * 2.2, s * 0.55, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();

    // Calça preta
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(x, y + s * 1.8, s * 0.55, s * 0.75, 0, 0, Math.PI * 2); ctx.fill();

    // Camisa branca listrada
    const shirtGrad = ctx.createLinearGradient(x - s, y, x + s, y);
    shirtGrad.addColorStop(0, '#fff');
    shirtGrad.addColorStop(0.45, '#fff');
    shirtGrad.addColorStop(0.5, '#222');
    shirtGrad.addColorStop(0.55, '#fff');
    shirtGrad.addColorStop(1, '#fff');
    ctx.fillStyle = shirtGrad;
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.9, s * 0.58, s * 0.85, 0, 0, Math.PI * 2); ctx.fill();

    // Cabeça
    ctx.fillStyle = '#e8c49a';
    ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, Math.PI * 2); ctx.fill();

    // Laço borboleta
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x - 3, y + s * 0.25);
    ctx.lineTo(x - 1, y + s * 0.4);
    ctx.lineTo(x + 1, y + s * 0.25);
    ctx.lineTo(x + 3, y + s * 0.4);
    ctx.lineTo(x, y + s * 0.32);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  _drawCrowdSection(side) {
    const ctx = this.ctx;
    const tick = this._tick;
    const members = this._crowd.filter(c => c.side === side);

    for (const c of members) {
      const excited = c.excite > 0;
      const bored   = (c._bored || 0) > 0;
      const bob = excited
        ? Math.sin(tick * 0.25 + c.phase) * 3.5 * (c.excite / 60)
        : bored
          ? Math.sin(tick * 0.02 + c.phase) * 0.4   // quase parado quando vaiando
          : Math.sin(tick * 0.05 + c.phase) * 1.2;
      const s = c.scale * (excited ? 5.5 : bored ? 3.8 : 4.5);

      // Sombra da pessoa
      ctx.globalAlpha = excited ? 0.5 : bored ? 0.18 : 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + s * 2 + bob, s * 0.5, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo
      ctx.globalAlpha = excited ? 0.95 : bored ? 0.45 : 0.75;
      const bodyH = excited ? s * 2.2 : bored ? s * 1.3 : s * 1.6;
      ctx.fillStyle = bored ? `hsl(${c.hue}, 20%, 35%)` : `hsl(${c.hue}, 65%, 45%)`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + s + bob, s * 0.48, bodyH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça
      ctx.fillStyle = `hsl(${c.hue}, 40%, 70%)`;
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, s * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Braços levantados se excitado
      if (excited && c.excite > 15) {
        ctx.strokeStyle = `hsl(${c.hue}, 65%, 55%)`;
        ctx.lineWidth = s * 0.35;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.8;
        const wave = Math.sin(tick * 0.22 + c.phase);
        ctx.beginPath();
        ctx.moveTo(c.x - s * 0.4, c.y + s * 0.5 + bob);
        ctx.lineTo(c.x - s * 1.1, c.y - s * 0.5 + wave * s * 0.7 + bob);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c.x + s * 0.4, c.y + s * 0.5 + bob);
        ctx.lineTo(c.x + s * 1.1, c.y - s * 0.5 + wave * s * 0.7 + bob);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }

  _drawFighter(p, color, name, isDown, side) {
    const ctx = this.ctx;
    const other = p === this.p1 ? this.p2 : this.p1;
    const ang = Math.atan2(other.y - p.y, other.x - p.x);
    const s = 13; // tamanho base do lutador

    if (isDown) {
      // Caído: ellipse achatada com efeito de queda
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 6, s * 1.8, s * 0.55, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, s * 1.7, s * 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
      // Cabeça caída
      ctx.fillStyle = '#e8c49a';
      ctx.beginPath(); ctx.arc(p.x - s * 1.1, p.y + 2, s * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      const jitter = this.state === 'exchange' ? randFloat(-1.5, 1.5) : 0;

      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x + 2, p.y + s + jitter, s * 0.75, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shorts / calção (corpo)
      const shortGrad = ctx.createRadialGradient(p.x - 2, p.y + 2, 1, p.x, p.y + s * 0.4, s * 1.1);
      shortGrad.addColorStop(0, this._lighten(color, 0.3));
      shortGrad.addColorStop(1, this._darken(color, 0.4));
      ctx.fillStyle = shortGrad;
      ctx.beginPath();
      ctx.ellipse(p.x + jitter * 0.3, p.y + s * 0.45, s * 0.68, s * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      // Torso / camiseta
      const torsoGrad = ctx.createLinearGradient(p.x - s * 0.5, p.y - s * 0.3, p.x + s * 0.5, p.y + s * 0.3);
      torsoGrad.addColorStop(0, 'rgba(240,240,240,0.9)');
      torsoGrad.addColorStop(1, 'rgba(180,180,180,0.7)');
      ctx.fillStyle = torsoGrad;
      ctx.beginPath();
      ctx.ellipse(p.x + jitter * 0.2, p.y - s * 0.05, s * 0.55, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça
      const headGrad = ctx.createRadialGradient(p.x - 2, p.y - s * 0.85, 1, p.x, p.y - s * 0.88, s * 0.52);
      headGrad.addColorStop(0, '#f4d090');
      headGrad.addColorStop(1, '#c89060');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(p.x + jitter * 0.1, p.y - s * 0.88, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Luvas (duas, apontadas para o adversário)
      const gloveAng1 = ang - 0.4;
      const gloveAng2 = ang + 0.4;
      for (const ga of [gloveAng1, gloveAng2]) {
        const gx = p.x + Math.cos(ga) * (s * 1.15) + jitter;
        const gy = p.y + Math.sin(ga) * (s * 1.15) * 0.6;
        // Sombra da luva
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(gx + 1, gy + 2, s * 0.48, s * 0.38, ga, 0, Math.PI * 2); ctx.fill();
        // Luva
        const gloveGrad = ctx.createRadialGradient(gx - 1, gy - 1, 1, gx, gy, s * 0.48);
        gloveGrad.addColorStop(0, this._lighten(color, 0.25));
        gloveGrad.addColorStop(1, this._darken(color, 0.3));
        ctx.fillStyle = gloveGrad;
        ctx.beginPath(); ctx.ellipse(gx, gy, s * 0.47, s * 0.36, ga, 0, Math.PI * 2); ctx.fill();
        // Brilho da luva
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(gx - 1, gy - 1, s * 0.15, 0, Math.PI * 2); ctx.fill();
      }

      // Protetor de cabeça (pequeno arco acima da cabeça)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x + jitter * 0.1, p.y - s * 0.88, s * 0.6, Math.PI * 0.85, Math.PI * 0.15, true);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Nome
    const labelY = isDown ? p.y - s * 0.8 : p.y - s * 1.65;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(p.x - 22, labelY - 10, 44, 14, 3);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, p.x, labelY - 3);
  }

  _drawParticles() {
    const ctx = this.ctx;
    for (const p of this._particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawFlashes() {
    const ctx = this.ctx;
    for (const f of this.flashes) {
      const alpha = f.life / f.maxLife;
      const r = f.size * (0.5 + alpha * 0.5);
      // Glow externo
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = f.big ? '#ffd700' : '#fff';
      ctx.beginPath(); ctx.arc(f.x, f.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
      // Estrela de impacto
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.big ? '#ffd700' : '#fff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang  = (Math.PI / 4) * i;
        const dist = i % 2 === 0 ? r : r * 0.38;
        const px = f.x + Math.cos(ang) * dist;
        const py = f.y + Math.sin(ang) * dist;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawVignette() {
    const ctx = this.ctx;
    const r = this.ring;

    // Spotlight no centro do ringue
    const spot = ctx.createRadialGradient(r.cx, r.cy, r.w * 0.12, r.cx, r.cy, r.w * 0.72);
    spot.addColorStop(0, 'rgba(255,250,220,0)');
    spot.addColorStop(0.6, 'rgba(255,250,220,0)');
    spot.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = spot;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // Vinheta geral da tela
    const vig = ctx.createRadialGradient(this.w / 2, this.h / 2, this.w * 0.25,
                                          this.w / 2, this.h / 2, this.w * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  // ── Helpers ───────────────────────────────────────────────
  _kdWhoActive(who) { return this._kdTimer > 0 && this._kdWho === who; }

  _lighten(hex, amt) {
    const [r, g, b] = this._parseHex(hex);
    return `rgb(${Math.min(255, r + 255 * amt)},${Math.min(255, g + 255 * amt)},${Math.min(255, b + 255 * amt)})`;
  }
  _darken(hex, amt) {
    const [r, g, b] = this._parseHex(hex);
    return `rgb(${Math.max(0, r - 255 * amt)},${Math.max(0, g - 255 * amt)},${Math.max(0, b - 255 * amt)})`;
  }
  _parseHex(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
}

// ============================================================
//  PresserAnimation  –  Coletiva de imprensa animada
// ============================================================
class PresserAnimation {
  constructor(canvas, f1, f2, cfg = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.w      = canvas.width;
    this.h      = canvas.height;

    this.f1  = { name: f1.name, color: f1.color || '#e63946', role: f1.role || '' };
    this.f2  = { name: f2.name, color: f2.color || '#4ecdc4', role: f2.role || '' };
    this.cfg = { title: cfg.title || '', scope: cfg.scope || 'national', promoter: cfg.promoter || '' };

    this._tick   = 0;
    this.running = false;
    this._raf    = null;

    this.seats = {
      p1: { x: this.w * 0.28, y: this.h * 0.57 },
      p2: { x: this.w * 0.72, y: this.h * 0.57 },
    };

    // Per-fighter animation state
    this._anim = {
      p1: { state: 'idle', timer: 0, offsetY: 0, offsetX: 0, glow: 0, shake: 0 },
      p2: { state: 'idle', timer: 0, offsetY: 0, offsetX: 0, glow: 0, shake: 0 },
    };

    this._camFlashes  = [];
    this._particles   = [];
    this._journalists = this._buildJournalists();
  }

  // ── API ───────────────────────────────────────────────────
  react(who, tone) {
    const apply = (key, dur) => {
      const a = this._anim[key];
      a.state = 'react_' + tone;
      a.timer = dur;
      a.glow  = tone === 'confident' ? 1.0 : 0;
    };
    if (who === 'p1' || who === 'both') apply('p1', 130);
    if (who === 'p2' || who === 'both') apply('p2', 95);
    this._triggerFlashes(tone === 'aggressive' ? 7 : 4);
  }

  opponentReact(tone) { this.react('p2', tone); }

  start() { if (this.running) return; this.running = true; this._loop(); }
  stop()  { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }

  // ── Loop ─────────────────────────────────────────────────
  _loop() {
    if (!this.running) return;
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _update() {
    this._tick++;

    for (const key of ['p1', 'p2']) {
      const a = this._anim[key];
      if (a.timer > 0) {
        a.timer--;
        const t = a.timer;
        const total = key === 'p1' ? 130 : 95;
        switch (a.state) {
          case 'react_aggressive':
            // Rise up, shake, then settle
            a.offsetY = t > total * 0.65 ? -(total - t) * 0.45
                      : t > total * 0.35 ? -total * 0.65 * 0.45
                      : -t * 0.25;
            a.shake   = t > total * 0.45 ? (t % 5 < 2 ? 4 : -4) : 0;
            if (t === Math.round(total * 0.85) || t === Math.round(total * 0.75)) {
              this._emitSlam(key);
            }
            break;
          case 'react_confident':
            // Lean forward toward center
            a.offsetX = key === 'p1'
              ? Math.min((total - t) / total * 16, 16) * (t > 20 ? 1 : t / 20)
              : -Math.min((total - t) / total * 16, 16) * (t > 20 ? 1 : t / 20);
            a.glow = t > 25 ? (total - t) / total : t / 25;
            break;
          case 'react_humble':
            // Bow head, then return
            a.offsetY = t > total * 0.75 ? (total - t) * 0.18
                      : t < total * 0.22 ? -(t) * 0.2
                      : total * 0.25 * 0.18;
            break;
          case 'react_diplomatic':
            // Gentle nod
            a.offsetY = Math.sin((total - t) * 0.14) * 5;
            break;
        }
        if (a.timer === 0) {
          Object.assign(a, { state: 'idle', offsetY: 0, offsetX: 0, glow: 0, shake: 0 });
        }
      }
    }

    for (const j of this._journalists) {
      if (j.flashTimer > 0) j.flashTimer--;
    }

    // Periodic ambient flashes from cameras
    if (this._tick % 110 === 0) this._triggerFlashes(1);

    this._camFlashes = this._camFlashes.filter(f => --f.life > 0);
    for (const p of this._particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.92; p.life--;
    }
    this._particles = this._particles.filter(p => p.life > 0);
  }

  // ── Helpers ───────────────────────────────────────────────
  _buildJournalists() {
    const { w, h } = this;
    const list = [];
    // Left press table — 3 people, evenly spaced
    for (let i = 0; i < 3; i++) {
      list.push({ x: w * 0.08 + i * w * 0.10, y: h * 0.855, phase: i * 1.3, hasCamera: i === 1, flashTimer: 0 });
    }
    // Right press table — 3 people
    for (let i = 0; i < 3; i++) {
      list.push({ x: w * 0.62 + i * w * 0.10, y: h * 0.855, phase: i * 1.7 + 0.9, hasCamera: i === 1, flashTimer: 0 });
    }
    return list;
  }

  _triggerFlashes(count) {
    for (let i = 0; i < count; i++) {
      const j = this._journalists[Math.floor(Math.random() * this._journalists.length)];
      j.flashTimer = 18 + Math.random() * 22;
      this._camFlashes.push({
        x: j.x + (Math.random() - 0.5) * 30,
        y: j.y - 18,
        life: 10, maxLife: 10,
        size: 7 + Math.random() * 9,
      });
    }
  }

  _emitSlam(who) {
    const pos = this.seats[who];
    const col = who === 'p1' ? this.f1.color : this.f2.color;
    for (let i = 0; i < 7; i++) {
      this._particles.push({
        x: pos.x + (Math.random() - 0.5) * 28,
        y: pos.y - 8,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -Math.random() * 3.5,
        life: rand(14, 24), maxLife: 22,
        color: col,
        size: randFloat(1.5, 3.5),
      });
    }
  }

  // ── Desenho ───────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this._drawBg();
    this._drawBackdrop();
    this._drawTable();
    this._drawMics();
    this._drawSeatedFighter('p1');
    this._drawSeatedFighter('p2');
    this._drawJournalistArea();
    this._drawCamFlashes();
    this._drawParticles();
    this._drawVignette();
  }

  _drawBg() {
    const ctx = this.ctx;
    const { w, h } = this;
    const cols = {
      national:    ['#0e0c1a', '#1a1428'],
      continental: ['#0c0818', '#140e24'],
      world:       ['#100c06', '#1e1600'],
    };
    const [c1, c2] = cols[this.cfg.scope] || cols.national;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, c1); bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  _drawBackdrop() {
    const ctx = this.ctx;
    const { w, h } = this;
    const bx = w * 0.05, by = h * 0.02;
    const bw = w * 0.90, bh = h * 0.38;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 18;
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(bx, by, bw, bh);
    ctx.shadowBlur = 0;

    // Background gradient
    const bgCols = {
      national:    ['#1c1460', '#0e0a38'],
      continental: ['#1c0850', '#0e0528'],
      world:       ['#281800', '#160c00'],
    };
    const [s1, s2] = bgCols[this.cfg.scope] || bgCols.national;
    const bg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bg.addColorStop(0, s1); bg.addColorStop(1, s2);
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, bw, bh);

    // World: gold border
    if (this.cfg.scope === 'world') {
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.globalAlpha = 1;
    }

    // Top accent stripe
    const stripeCol = { national: '#2244cc', continental: '#8822cc', world: '#c8a000' }[this.cfg.scope] || '#2244cc';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = stripeCol;
    ctx.fillRect(bx, by, bw, 5);
    ctx.globalAlpha = 1;

    // Fight title (center)
    const titleText = this.cfg.title || 'COLETIVA DE IMPRENSA';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.cfg.scope === 'world' ? '#ffd700' : '#ffffff';
    ctx.font = `bold ${Math.round(bw * 0.052)}px sans-serif`;
    ctx.fillText(titleText.toUpperCase(), bx + bw / 2, by + bh * 0.38);

    // Promoter
    if (this.cfg.promoter) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `${Math.round(bw * 0.028)}px sans-serif`;
      ctx.fillText(this.cfg.promoter.toUpperCase(), bx + bw / 2, by + bh * 0.60);
    }

    // Fighter nameplates — left (f1) and right (f2)
    const nw = bw * 0.30, nh = bh * 0.25;
    for (const [fighter, align, nx] of [
      [this.f1, 'left',  bx + 10],
      [this.f2, 'right', bx + bw - 10],
    ]) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = fighter.color;
      ctx.fillRect(align === 'left' ? nx : nx - nw, by + bh - nh - 6, nw, nh);
      ctx.globalAlpha = 1;
      ctx.fillStyle = fighter.color;
      ctx.font = `bold ${Math.round(bw * 0.029)}px sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const tx = align === 'left' ? nx + 8 : nx - 8;
      ctx.fillText(fighter.name.toUpperCase(), tx, by + bh - nh / 2 - 8);
      if (fighter.role) {
        ctx.fillStyle = 'rgba(255,255,255,0.40)';
        ctx.font = `${Math.round(bw * 0.022)}px sans-serif`;
        ctx.fillText(fighter.role, tx, by + bh - nh / 2 + 8);
      }
    }
  }

  _drawTable() {
    const ctx = this.ctx;
    const { w, h } = this;
    const tx = w * 0.03, ty = h * 0.60;
    const tw = w * 0.94, thTop = h * 0.035, thFace = h * 0.155;

    // Table top (dark wood)
    const topGrad = ctx.createLinearGradient(tx, ty, tx, ty + thTop);
    topGrad.addColorStop(0, '#2e2010'); topGrad.addColorStop(1, '#1c1208');
    ctx.fillStyle = topGrad;
    ctx.fillRect(tx, ty, tw, thTop);

    // Top edge highlight
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + tw, ty); ctx.stroke();
    ctx.globalAlpha = 1;

    // Table front face
    const faceGrad = ctx.createLinearGradient(tx, ty + thTop, tx, ty + thTop + thFace);
    faceGrad.addColorStop(0, '#1e1208'); faceGrad.addColorStop(1, '#140c04');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(tx, ty + thTop, tw, thFace);

    // Title on table front
    if (this.cfg.title) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.font = `bold ${Math.round(tw * 0.034)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.cfg.title.toUpperCase(), w / 2, ty + thTop + thFace * 0.55);
    }

    // Table legs
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#100a04'; ctx.lineWidth = 4;
    for (const lx of [tx + 22, tx + tw - 22]) {
      ctx.beginPath();
      ctx.moveTo(lx, ty + thTop + thFace);
      ctx.lineTo(lx, ty + thTop + thFace + h * 0.07);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawMics() {
    const ctx = this.ctx;
    const { h } = this;
    const tableY = h * 0.60;

    for (const [sx, col] of [[this.seats.p1.x, this.f1.color], [this.seats.p2.x, this.f2.color]]) {
      ctx.save();
      ctx.globalAlpha = 0.88;
      // Stand
      ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, tableY);
      ctx.lineTo(sx, tableY - h * 0.065);
      ctx.lineTo(sx - 4, tableY - h * 0.09);
      ctx.stroke();
      // Mic head
      ctx.fillStyle = '#bbb';
      ctx.beginPath(); ctx.ellipse(sx - 4, tableY - h * 0.10, 4.5, 5.5, -0.3, 0, Math.PI * 2); ctx.fill();
      // Color dot (logo)
      ctx.fillStyle = col; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(sx - 4, tableY - h * 0.10, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _drawSeatedFighter(who) {
    const ctx = this.ctx;
    const { w, h } = this;
    const fighter = who === 'p1' ? this.f1 : this.f2;
    const a       = this._anim[who];
    const seat    = this.seats[who];
    const color   = fighter.color;
    const s       = 21;  // bigger figure

    const tableY  = h * 0.60;
    const x       = seat.x + (a.offsetX || 0) + (a.shake || 0);
    const bodyY   = tableY - s * 0.7 + (a.offsetY || 0);

    // Glow (confident)
    if (a.glow > 0.05) {
      const gl = ctx.createRadialGradient(x, bodyY - s * 1.0, s * 0.4, x, bodyY - s * 1.0, s * 3.2);
      gl.addColorStop(0, `${color}66`); gl.addColorStop(1, `${color}00`);
      ctx.fillStyle = gl;
      ctx.globalAlpha = a.glow * 0.6;
      ctx.beginPath(); ctx.arc(x, bodyY - s * 1.0, s * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Arms (L-shape: upper arm down → forearm horizontal to table) ──
    const armColor = this._lighten(color, 0.06);
    ctx.strokeStyle = armColor;
    ctx.lineWidth   = s * 0.28;   // thin — no glove look
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.globalAlpha = 0.88;

    const shoulderY = bodyY + s * 0.18;
    const elbowLX = x - s * 0.82, elbowRX = x + s * 0.82;
    const elbowY  = shoulderY + s * 0.62;
    const wristY  = tableY - s * 0.14;

    // Helper: draw one arm (shoulder → elbow → wrist)
    const drawArm = (sx, sy, ex, ey, wx, wy) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(wx, wy);
      ctx.stroke();
    };

    const wav = Math.sin(this._tick * 0.3) * 2;

    if (a.state === 'react_aggressive' && a.timer > 55) {
      // Slam fists forward on table — arms go DOWN and slightly inward
      const lean = Math.min((130 - a.timer) / 35, 1) * s * 0.3;
      drawArm(x - s*0.5, shoulderY,  x - s*0.6, shoulderY + s*0.35 + wav,  x - s*0.45 + lean, wristY + wav);
      drawArm(x + s*0.5, shoulderY,  x + s*0.6, shoulderY + s*0.35 - wav,  x + s*0.45 - lean, wristY - wav);
    } else if (a.state === 'react_confident' && a.timer > 20) {
      // One arm extends toward opponent, other rests normally
      const dir = who === 'p1' ? 1 : -1;
      // Near arm (rests)
      drawArm(x - s*0.5*dir, shoulderY,  x - s*0.65*dir, shoulderY + s*0.4,  x - s*0.55*dir, wristY);
      // Far arm (reaches toward center)
      drawArm(x + s*0.5*dir, shoulderY,  x + s*0.7*dir, shoulderY + s*0.25,  x + s*1.3*dir, wristY - s*0.1);
    } else {
      // Idle / humble / diplomatic — arms hang straight down to table, close to body
      drawArm(x - s*0.48, shoulderY,  x - s*0.62, shoulderY + s*0.42,  x - s*0.55, wristY);
      drawArm(x + s*0.48, shoulderY,  x + s*0.62, shoulderY + s*0.42,  x + s*0.55, wristY);
    }
    ctx.globalAlpha = 1;

    // ── Torso / shirt ──
    const torsoG = ctx.createLinearGradient(x - s * 0.65, bodyY - s * 0.2, x + s * 0.65, bodyY + s * 0.7);
    torsoG.addColorStop(0, this._lighten(color, 0.22));
    torsoG.addColorStop(1, this._darken(color, 0.35));
    ctx.fillStyle = torsoG;
    ctx.beginPath();
    ctx.ellipse(x, bodyY + s * 0.22, s * 0.68, s * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar / shirt detail
    ctx.strokeStyle = this._lighten(color, 0.35);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x, bodyY - s * 0.42);
    ctx.lineTo(x - s * 0.18, bodyY + s * 0.08);
    ctx.moveTo(x, bodyY - s * 0.42);
    ctx.lineTo(x + s * 0.18, bodyY + s * 0.08);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Head ──
    const bowOffset = a.state === 'react_humble' ? (a.offsetY || 0) * 0.55 : 0;
    const headX = x, headY = bodyY - s * 0.78 + bowOffset;
    const headG = ctx.createRadialGradient(headX - 2, headY - 3, 1, headX, headY, s * 0.56);
    headG.addColorStop(0, '#f5d898'); headG.addColorStop(1, '#c08850');
    ctx.fillStyle = headG;
    ctx.beginPath(); ctx.arc(headX, headY, s * 0.50, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = this._darken(color, 0.15);
    ctx.globalAlpha = 0.50;
    ctx.beginPath();
    ctx.ellipse(headX, headY - s * 0.30, s * 0.48, s * 0.24, 0, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Eyes
    const eyeY = headY - s * 0.04;
    ctx.fillStyle = '#222';
    ctx.globalAlpha = 0.75;
    for (const ex of [headX - s * 0.17, headX + s * 0.17]) {
      ctx.beginPath(); ctx.arc(ex, eyeY, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.18;
    for (const ex of [headX - s * 0.17, headX + s * 0.17]) {
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 2.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Nameplate on table front face (not floating below) ──
    const npY  = tableY + h * 0.055;
    const npW  = s * 4.2, npH = s * 0.72;
    ctx.fillStyle = `${color}22`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - npW / 2, npY, npW, npH, 2);
    else ctx.rect(x - npW / 2, npY, npW, npH);
    ctx.fill();
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(npH * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Truncate name to fit
    // Use last name (last word) for the nameplate — avoids showing nickname prefixes
    const parts = fighter.name.trim().split(' ');
    const firstName = parts[parts.length - 1].toUpperCase();
    ctx.fillText(firstName, x, npY + npH * 0.54);
  }

  _drawJournalistArea() {
    const ctx = this.ctx;
    const { w, h } = this;
    const tick = this._tick;

    // Two press tables
    for (const [tx, tw2] of [[w * 0.02, w * 0.35], [w * 0.63, w * 0.35]]) {
      const ty2 = h * 0.79, th2 = h * 0.16;
      // Table body
      ctx.globalAlpha = 0.80;
      ctx.fillStyle = '#1a0e08';
      ctx.fillRect(tx, ty2, tw2, th2);
      // Top edge highlight
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, ty2); ctx.lineTo(tx + tw2, ty2); ctx.stroke();
      ctx.strokeStyle = '#2e1c0c'; ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty2, tw2, th2);
      ctx.globalAlpha = 1;
    }

    // Journalists — larger (s=13)
    for (const j of this._journalists) {
      const bob = Math.sin(tick * 0.055 + j.phase) * 1.5;
      const s = 13;
      const x = j.x, y = j.y + bob;

      ctx.globalAlpha = 0.85;
      // Body (jacket)
      const bodyG = ctx.createLinearGradient(x - s * 0.5, y, x + s * 0.5, y + s * 1.5);
      bodyG.addColorStop(0, '#2e2e42'); bodyG.addColorStop(1, '#1a1a28');
      ctx.fillStyle = bodyG;
      ctx.beginPath(); ctx.ellipse(x, y + s * 1.0, s * 0.50, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      // Shirt collar / tie line
      ctx.strokeStyle = '#aaaa88'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.32); ctx.lineTo(x, y + s * 0.85); ctx.stroke();
      ctx.globalAlpha = 0.85;
      // Head
      ctx.fillStyle = '#e0b888';
      ctx.beginPath(); ctx.arc(x, y, s * 0.44, 0, Math.PI * 2); ctx.fill();
      // Hair
      ctx.fillStyle = '#2a1a0a'; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.24, s * 0.42, s * 0.20, 0, Math.PI, 0); ctx.fill();
      ctx.globalAlpha = 0.85;
      // Eyes (tiny dots)
      ctx.fillStyle = '#333';
      for (const ex of [x - s * 0.14, x + s * 0.14]) {
        ctx.beginPath(); ctx.arc(ex, y + s * 0.02, 1.1, 0, Math.PI * 2); ctx.fill();
      }

      if (j.hasCamera) {
        const lit = j.flashTimer > 0;
        // Arms holding camera
        ctx.strokeStyle = '#2e2e42'; ctx.lineWidth = s * 0.20; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.45, y + s * 0.38);
        ctx.lineTo(x + s * 0.35, y + s * 0.10); ctx.stroke();
        // Camera body
        ctx.fillStyle = '#181818';
        const cx = x + s * 0.35, cy = y + s * 0.10;
        ctx.fillRect(cx - 2, cy - s * 0.26, s * 0.78, s * 0.46);
        // Lens circle
        ctx.fillStyle = lit ? '#ffffcc' : '#1c4a78';
        ctx.globalAlpha = lit ? 1.0 : 0.85;
        ctx.beginPath(); ctx.arc(cx + s * 0.52, cy, s * 0.22, 0, Math.PI * 2); ctx.fill();
        // Lens rim
        ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(cx + s * 0.52, cy, s * 0.26, 0, Math.PI * 2); ctx.stroke();
        // REC blink dot
        ctx.fillStyle = '#e63946';
        ctx.globalAlpha = 0.5 + Math.sin(tick * 0.13) * 0.5;
        ctx.beginPath(); ctx.arc(cx + s * 0.08, cy - s * 0.18, 1.8, 0, Math.PI * 2); ctx.fill();
      } else {
        // Notepad in hands
        ctx.strokeStyle = '#2e2e42'; ctx.lineWidth = s * 0.20; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.4, y + s * 0.38);
        ctx.lineTo(x + s * 0.1, y + s * 0.55); ctx.stroke();
        ctx.fillStyle = '#f5f5e0'; ctx.globalAlpha = 0.65;
        ctx.fillRect(x + s * 0.04, y + s * 0.40, s * 0.55, s * 0.38);
        // Lines on notepad
        ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.5;
        for (let li = 0; li < 3; li++) {
          const ly = y + s * 0.50 + li * s * 0.10;
          ctx.beginPath(); ctx.moveTo(x + s * 0.08, ly); ctx.lineTo(x + s * 0.54, ly); ctx.stroke();
        }
        // Pen
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.50, y + s * 0.38);
        ctx.lineTo(x + s * 0.62, y + s * 0.25); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawCamFlashes() {
    const ctx = this.ctx;
    for (const f of this._camFlashes) {
      const alpha = (f.life / f.maxLife) * 0.75;
      const grad  = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 2.2);
      grad.addColorStop(0, 'rgba(255,255,255,0.92)');
      grad.addColorStop(0.3, 'rgba(255,255,200,0.55)');
      grad.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawParticles() {
    const ctx = this.ctx;
    for (const p of this._particles) {
      const a = (p.life / p.maxLife) * 0.85;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawVignette() {
    const ctx = this.ctx;
    const { w, h } = this;
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.60)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  _lighten(hex, amt) {
    const [r, g, b] = this._parseHex(hex);
    return `rgb(${Math.min(255,r+255*amt)},${Math.min(255,g+255*amt)},${Math.min(255,b+255*amt)})`;
  }
  _darken(hex, amt) {
    const [r, g, b] = this._parseHex(hex);
    return `rgb(${Math.max(0,r-255*amt)},${Math.max(0,g-255*amt)},${Math.max(0,b-255*amt)})`;
  }
  _parseHex(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
}
