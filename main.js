/* Nightshift Runner — vanilla JS canvas endless runner */
(function () {
  'use strict';

  /* ---------- DOM ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const touchControls = document.getElementById('touch-controls');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const startBestEl = document.getElementById('start-best');
  const hullPipsEl = document.getElementById('hull-pips');
  const chargeFillEl = document.getElementById('charge-fill');
  const startScreen = document.getElementById('start-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const finalDistanceEl = document.getElementById('final-distance');
  const finalBestEl = document.getElementById('final-best');

  /* ---------- Constants ---------- */
  const BEST_KEY = 'nightshiftRunner.best';
  const BASE_SPEED = 320;        // px / sec
  const MAX_SPEED = 760;
  const SPEED_K = 0.022;         // speed grows with distance
  const GRAVITY = 2300;          // px / sec^2
  const JUMP_VEL = -760;         // v0.0.3 — lower jump height (~126px), 3 jumps instead
  const SLIDE_TIME = 0.6;        // seconds
  const HULL_MAX = 3;
  const INVULN_TIME = 1.0;       // seconds of blink i-frames after a hit
  const BOOST_TIME = 2.0;        // seconds of boost
  const BOOST_COOLDOWN = 8.0;    // seconds before boost can refill / reactivate
  const BOOST_MULT = 1.7;        // speed multiplier while boosting
  const BOOST_SCORE_MULT = 2;    // score-rate multiplier while boosting
  const CHARGE_MAX = 100;
  const CHARGE_PER_CORE = 25;    // 4 cores fill the bar
  const CHARGE_DRAIN = 50;       // charge drained per second while boosting
  const SCORE_PER_PX = 1 / 8;    // 1 point per ~8px scrolled
  const CORE_SCORE = 10;         // bonus score per energy core
  // v0.0.5 — collectible coins + magnet powerup + distance milestones
  const COIN_SCORE = 5;          // score per coin
  const COIN_GAP_MIN = 170;      // px between coin spawns
  const COIN_GAP_MAX = 320;
  const MAGNET_INTERVAL = 25;    // seconds between magnet spawns
  const MAGNET_DURATION = 6;     // seconds of magnet attraction
  const MAGNET_PULL = 460;       // px/sec attraction toward runner
  const METERS_PER_PX = 1 / 10;  // distance(px) -> displayed meters

  /* ---------- State ---------- */
  let W = 0, H = 0, dpr = 1, groundY = 0, scale = 1;
  let state = 'start';           // start | playing | paused | gameover
  let runner = null;
  let speed = BASE_SPEED;
  let distance = 0;
  let score = 0;
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  let pulseCharge = 0;
  let boosting = false;
  let boostTimer = 0;
  let boostCooldown = 0;
  let obstacles = [];
  let collectibles = [];
  let particles = [];
  let speedLines = [];
  let nextObstacleDist = 0;
  let nextCoreDist = 0;
  let nextCoinDist = 0;          // v0.0.5 — coin spawn pacing
  let magnetSpawnTimer = 0;      // v0.0.5 — seconds until next magnet pickup spawns
  let magnetTimer = 0;           // v0.0.5 — seconds of active magnet attraction remaining
  let milestonesHit = {};        // v0.0.5 — track one-shot distance achievements
  let layers = [];
  let stars = [];
  let moonX = 0, moonY = 0, moonR = 0;
  let runPhase = 0;
  let screenShake = 0;
  let flashAlpha = 0;
  let lastTime = 0;
  let tapStart = null;

  /* ---------- Helpers ---------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ---------- Best / hull DOM ---------- */
  startBestEl.textContent = best;
  bestEl.textContent = best;

  function updateHullPips() {
    hullPipsEl.innerHTML = '';
    for (let i = 0; i < HULL_MAX; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (runner && i < runner.hull ? ' on' : '');
      hullPipsEl.appendChild(pip);
    }
  }

  /* ---------- Resize / world geometry ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = Math.floor(H * 0.80);
    scale = Math.max(0.72, Math.min(1.4, H / 720));
    moonX = W * 0.78;
    moonY = H * 0.17;
    moonR = Math.max(26, Math.min(58, H * 0.07));
    makeBuildings();
    makeStars();
    if (runner) {
      runner.x = W * 0.26;
      runner.w = 26 * scale;
      runner.h = 52 * scale;
      if (runner.onGround) runner.y = groundY;
    }
  }

  /* ---------- Parallax buildings ---------- */
  function makeBuildings() {
    layers = [
      { opts: { minW: 40, maxW: 92, minH: 80, maxH: 180, color: '#0b112c', parallax: 0.18, density: 0.34 }, arr: [] },
      { opts: { minW: 56, maxW: 134, minH: 120, maxH: 270, color: '#111a3e', parallax: 0.42, density: 0.5 }, arr: [] }
    ];
    for (const L of layers) fillLayer(L);
  }

  function fillLayer(L) {
    const o = L.opts;
    let x = -40;
    while (x < W + 240) {
      const w = rand(o.minW, o.maxW) * scale;
      const h = rand(o.minH, o.maxH) * scale;
      L.arr.push({ x: x, w: w, h: h, color: o.color, parallax: o.parallax, wins: makeWindows(w, h, o.density) });
      x += w + rand(6, 22) * scale;
    }
  }

  function makeWindows(bw, bh, density) {
    const wins = [];
    const ww = Math.max(3, 4 * scale);
    const wh = Math.max(4, 5 * scale);
    const gapX = Math.max(6, 8 * scale);
    const gapY = Math.max(8, 10 * scale);
    const padX = 6 * scale, padY = 8 * scale;
    for (let y = padY; y < bh - padY - wh; y += wh + gapY) {
      for (let x = padX; x < bw - padX - ww; x += ww + gapX) {
        if (Math.random() < density) {
          wins.push({ x: x, y: y, color: Math.random() < 0.72 ? '#ffd24a' : '#36e0ff' });
        }
      }
    }
    return wins;
  }

  function updateLayer(L, dt, spd) {
    const arr = L.arr;
    const o = L.opts;
    for (const b of arr) {
      b.x -= spd * b.parallax * dt;
      if (b.x + b.w < -20) {
        let maxX = -1e9;
        for (const other of arr) if (other.x > maxX) maxX = other.x;
        b.x = maxX + rand(6, 22) * scale;
        b.w = rand(o.minW, o.maxW) * scale;
        b.h = rand(o.minH, o.maxH) * scale;
        b.wins = makeWindows(b.w, b.h, o.density);
      }
    }
  }

  function makeStars() {
    stars = [];
    const n = Math.floor(W * H / 16000);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * groundY * 0.85, r: Math.random() < 0.5 ? 1 : 2, tw: Math.random() * Math.PI * 2 });
    }
  }

  /* ---------- Runner ---------- */
  function resetRunner() {
    runner = {
      x: W * 0.26,
      y: groundY,
      vy: 0,
      onGround: true,
      jumpsLeft: 3,                  // v0.0.3 — triple-jump budget
      sliding: false,
      slideTimer: 0,
      invuln: 0,
      hull: HULL_MAX,
      w: 26 * scale,
      h: 52 * scale
    };
    updateHullPips();
  }

  function runnerHitbox() {
    const w = runner.w * 0.82;
    if (runner.sliding) {
      const sh = 26 * scale;
      return { x: runner.x - w / 2, y: groundY - sh, w: w, h: sh };
    }
    return { x: runner.x - w / 2, y: runner.y - runner.h, w: w, h: runner.h };
  }

  function jump() {
    if (state !== 'playing') return;
    if (runner.sliding) { runner.sliding = false; runner.slideTimer = 0; }
    // v0.0.3 — triple-jump: 3 jumps per ground touch, decaying power (1st full, 2nd 82%, 3rd 68%)
    if (runner.jumpsLeft > 0) {
      const mult = runner.onGround ? 1 : (runner.jumpsLeft >= 2 ? 0.82 : 0.68);
      runner.vy = JUMP_VEL * mult;
      runner.onGround = false;
      runner.jumpsLeft--;
      if (window.MUX) MUX.bump();
    }
  }

  function startSlide() {
    if (state !== 'playing') return;
    if (runner.onGround) {
      runner.sliding = true;
      runner.slideTimer = SLIDE_TIME;
      runner.vy = 0;
    } else {
      // fast-fall to reach the ground quickly, then slide on landing
      runner.vy = Math.max(runner.vy, 760);
    }
  }

  function updateRunner(dt) {
    if (!runner.onGround) {
      runner.vy += GRAVITY * dt;
      runner.y += runner.vy * dt;
      if (runner.y >= groundY) {
        runner.y = groundY;
        runner.vy = 0;
        runner.onGround = true;
        runner.jumpsLeft = 3;        // v0.0.3 — refill triple-jump on landing
      }
    }
    if (runner.sliding) {
      runner.slideTimer -= dt;
      if (runner.slideTimer <= 0) runner.sliding = false;
    }
    if (runner.invuln > 0) runner.invuln -= dt;
  }

  /* ---------- Boost ---------- */
  function activateBoost() {
    if (state !== 'playing') return;
    if (!boosting && boostCooldown <= 0 && pulseCharge >= CHARGE_MAX) {
      boosting = true;
      boostTimer = BOOST_TIME;
    }
  }
  function releaseBoost() {
    if (boosting) {
      boosting = false;
      boostTimer = 0;
      boostCooldown = BOOST_COOLDOWN;
    }
  }
  function updateBoost(dt) {
    if (boosting) {
      boostTimer -= dt;
      pulseCharge -= CHARGE_DRAIN * dt;
      if (pulseCharge <= 0) pulseCharge = 0;
      if (boostTimer <= 0) {
        boosting = false;
        boostCooldown = BOOST_COOLDOWN;
      }
    } else if (boostCooldown > 0) {
      boostCooldown -= dt;
      if (boostCooldown < 0) boostCooldown = 0;
    }
  }

  function currentSpeed() {
    let s = Math.min(MAX_SPEED, BASE_SPEED + distance * SPEED_K);
    if (boosting) s *= BOOST_MULT;
    return s;
  }

  /* ---------- Spawning ---------- */
  function updateSpawns() {
    if (distance >= nextObstacleDist) {
      spawnObstacle();
      const gap = Math.max(260, 460 - distance * 0.025) + rand(0, 200);
      nextObstacleDist = distance + gap;
    }
    if (distance >= nextCoreDist) {
      spawnCores();
      const gap = Math.max(170, 340 - distance * 0.018) + rand(0, 160);
      nextCoreDist = distance + gap;
    }
    if (distance >= nextCoinDist) {            // v0.0.5 — coin pickups
      spawnCoins();
      nextCoinDist = distance + rand(COIN_GAP_MIN, COIN_GAP_MAX);
    }
  }

  function spawnCoins() {                       // v0.0.5 — small gold coins floating at jump-height
    const x = W + 60;
    const n = 1 + Math.floor(Math.random() * 3);
    const arc = Math.random() < 0.4;
    const baseY = groundY - rand(86, 132) * scale;
    for (let i = 0; i < n; i++) {
      const cx = x + i * 30 * scale;
      const cy = arc ? baseY - Math.sin((i / (n - 1 || 1)) * Math.PI) * 26 * scale : baseY;
      collectibles.push({ type: 'coin', x: cx, y: cy, r: 7 * scale, phase: i * 0.5 });
    }
  }

  function spawnMagnet() {                      // v0.0.5 — rare purple-star magnet powerup
    const x = W + 60;
    const y = groundY - rand(96, 138) * scale;
    collectibles.push({ type: 'magnet', x: x, y: y, r: 12 * scale, phase: 0 });
  }

  function updateMagnet(dt) {                   // v0.0.5 — magnet timer + periodic spawn
    if (magnetTimer > 0) {
      magnetTimer -= dt;
      if (magnetTimer < 0) magnetTimer = 0;
    }
    magnetSpawnTimer -= dt;
    if (magnetSpawnTimer <= 0) {
      spawnMagnet();
      magnetSpawnTimer = MAGNET_INTERVAL + rand(-3, 5);
    }
  }

  function spawnObstacle() {
    const x = W + 60;
    const d = distance;
    const r = Math.random();
    let type;
    if (d < 700) type = 'barrier';
    else if (d < 1700) type = r < 0.6 ? 'barrier' : (r < 0.85 ? 'gate' : 'drone');
    else type = r < 0.45 ? 'barrier' : (r < 0.75 ? 'gate' : 'drone');

    if (type === 'barrier') {
      const w = rand(28, 46) * scale;
      const h = rand(34, 50) * scale;
      obstacles.push({ type: type, x: x, y: groundY - h, w: w, h: h });
    } else if (type === 'gate') {
      const w = rand(44, 64) * scale;
      const postH = 78 * scale;
      const laserH = 16 * scale;
      const laserY = groundY - 62 * scale;
      obstacles.push({ type: type, x: x, w: w, postH: postH, laserY: laserY, laserH: laserH });
    } else { // drone
      const r2 = 16 * scale;
      const high = Math.random() < 0.5;
      const cy = high ? groundY - 70 * scale : groundY - 30 * scale;
      obstacles.push({ type: type, x: x, cy: cy, r: r2, phase: Math.random() * Math.PI * 2, baseCy: cy });
    }
  }

  function spawnCores() {
    const x = W + 60;
    if (Math.random() < 0.08) {
      collectibles.push({ type: 'shield', x: x, y: groundY - 62 * scale, r: 12 * scale, phase: 0 });
      return;
    }
    const n = 2 + Math.floor(Math.random() * 4);
    const arc = Math.random() < 0.5;
    const baseY = groundY - (Math.random() < 0.5 ? 86 : 132) * scale;
    for (let i = 0; i < n; i++) {
      const cx = x + i * 34 * scale;
      const cy = arc ? baseY - Math.sin((i / (n - 1 || 1)) * Math.PI) * 50 * scale : baseY;
      collectibles.push({ type: 'core', x: cx, y: cy, r: 9 * scale, phase: i * 0.6 });
    }
  }

  function obstacleHitbox(o) {
    if (o.type === 'drone') return { x: o.x - o.r, y: o.cy - o.r, w: o.r * 2, h: o.r * 2 };
    if (o.type === 'gate') return { x: o.x, y: o.laserY, w: o.w, h: o.laserH };
    return { x: o.x, y: o.y, w: o.w, h: o.h };
  }

  function updateObstacles(dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * dt;
      if (o.type === 'drone') {
        o.phase += dt * 4;
        o.cy = o.baseCy + Math.sin(o.phase) * 6 * scale;
      }
      if (o.x < -90) obstacles.splice(i, 1);
    }
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.phase += dt * 5;
      let scrolls = true;
      if (magnetTimer > 0 && c.type === 'coin') {   // v0.0.5 — magnet pulls coins toward runner
        const tx = runner.x;
        const ty = runner.y - runner.h * 0.5;
        const dx = tx - c.x, dy = ty - c.y;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
          const step = Math.min(d, MAGNET_PULL * dt);
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
          scrolls = false;
        }
      }
      if (scrolls) c.x -= speed * dt;
      if (c.x < -40) collectibles.splice(i, 1);
    }
  }

  /* ---------- Collisions ---------- */
  function checkCollisions() {
    const rb = runnerHitbox();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (aabb(rb, obstacleHitbox(o))) {
        if (runner.invuln <= 0) {
          damageRunner(o);
          obstacles.splice(i, 1);
        }
      }
    }
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      const cb = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (aabb(rb, cb)) {
        collect(c);
        collectibles.splice(i, 1);
      }
    }
  }

  function damageRunner(o) {
    runner.hull -= 1;
    runner.invuln = INVULN_TIME;
    screenShake = 9;
    flashAlpha = 0.55;
    let hx = o.x, hy = groundY - 40 * scale;
    if (o.type === 'drone') { hx = o.x; hy = o.cy; }
    else if (o.type === 'gate') { hy = o.laserY; }
    else { hy = o.y; }
    burst(hx, hy, '#ff3b3b', 16);
    updateHullPips();
    if (window.MUX) MUX.hit();
    if (runner.hull <= 0) endGame();
  }

  function collect(c) {
    if (c.type === 'core') {
      score += CORE_SCORE;
      if (!boosting) pulseCharge = Math.min(CHARGE_MAX, pulseCharge + CHARGE_PER_CORE);
      burst(c.x, c.y, '#36e0ff', 9);
    } else if (c.type === 'coin') {            // v0.0.5 — coin pickup
      score += COIN_SCORE;
      burst(c.x, c.y, '#ffd24a', 8);
      if (window.MUX) MUX.bump();               // auto coin SFX via gamekit bridge
    } else if (c.type === 'magnet') {          // v0.0.5 — magnet powerup
      magnetTimer = MAGNET_DURATION;
      burst(c.x, c.y, '#b14dff', 16);
      if (window.MUX) MUX.bump();
    } else { // shield
      if (runner.hull < HULL_MAX) { runner.hull += 1; updateHullPips(); }
      burst(c.x, c.y, '#27ff8a', 14);
    }
  }

  /* ---------- Particles + speed lines ---------- */
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(40, 190);
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, life: rand(0.3, 0.7), max: 0.7, color: color });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function updateSpeedLines(dt) {
    if (boosting && Math.random() < 0.7) {
      speedLines.push({ x: W + 20, y: Math.random() * H, len: rand(40, 150) * scale, spd: speed * 2.3, life: 0.5, color: Math.random() < 0.5 ? '#bfffff' : '#ffffff' });
    }
    for (let i = speedLines.length - 1; i >= 0; i--) {
      const s = speedLines[i];
      s.x -= s.spd * dt;
      s.life -= dt;
      if (s.x < -220 || s.life <= 0) speedLines.splice(i, 1);
    }
  }

  /* ---------- HUD sync ---------- */
  function syncHUD() {
    scoreEl.textContent = Math.floor(score);
    bestEl.textContent = best;
    chargeFillEl.style.width = (pulseCharge / CHARGE_MAX * 100) + '%';
    chargeFillEl.classList.toggle('boosting', boosting);
    chargeFillEl.classList.toggle('cooling', !boosting && boostCooldown > 0);
  }

  /* ---------- Distance milestones (v0.0.5) ---------- */
  function checkMilestones() {
    const meters = Math.floor(distance * METERS_PER_PX);
    if (meters >= 1000 && !milestonesHit.d1k) {
      milestonesHit.d1k = true;
      if (window.GK) GK.achievement('d1k', 'Long Runner', 'Reach 1000m');
    }
    if (meters >= 3000 && !milestonesHit.d3k) {
      milestonesHit.d3k = true;
      if (window.GK) GK.achievement('d3k', 'Marathoner', 'Reach 3000m');
    }
    if (meters >= 6000 && !milestonesHit.d6k) {
      milestonesHit.d6k = true;
      if (window.GK) GK.achievement('d6k', 'Iron Runner', 'Reach 6000m');
    }
  }

  /* ---------- Update ---------- */
  function update(dt) {
    if (state === 'playing') {
      speed = currentSpeed();
      distance += speed * dt;
      score += (speed * dt) * SCORE_PER_PX * (boosting ? BOOST_SCORE_MULT : 1);
      runPhase += dt * (8 + speed * 0.02);
      updateRunner(dt);
      updateBoost(dt);
      updateMagnet(dt);            // v0.0.5 — magnet timer + spawn
      updateObstacles(dt);
      updateParticles(dt);
      updateSpeedLines(dt);
      updateSpawns();
      checkCollisions();
      checkMilestones();           // v0.0.5 — distance achievements
      for (const L of layers) updateLayer(L, dt, speed);
    } else {
      // menus: idle runner + slow ambient drift on the start screen
      runPhase += dt * 6;
      if (runner && runner.onGround) runner.y = groundY;
      const ambient = state === 'start' ? 120 : 0;
      for (const L of layers) updateLayer(L, dt, ambient);
      updateParticles(dt);
    }
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 40);
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 1.6);
    syncHUD();
  }

  /* ---------- Drawing ---------- */
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#070b1a');
    g.addColorStop(0.6, '#0c1230');
    g.addColorStop(1, '#1a0f38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, groundY + 2);
  }

  function drawStars() {
    const t = performance.now() * 0.001;
    ctx.fillStyle = '#cfe0ff';
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(s.tw + t));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon() {
    ctx.save();
    const grd = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 2.3);
    grd.addColorStop(0, 'rgba(200,210,255,0.32)');
    grd.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9ecff';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,130,170,0.28)';
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.32, moonY - moonR * 0.22, moonR * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + moonR * 0.22, moonY + moonR * 0.32, moonR * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBuildings() {
    for (const L of layers) {
      for (const b of L.arr) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
        for (const w of b.wins) {
          ctx.fillStyle = w.color;
          ctx.fillRect(b.x + w.x, groundY - b.h + w.y, Math.max(3, 4 * scale), Math.max(4, 5 * scale));
        }
      }
    }
  }

  function drawGround() {
    ctx.fillStyle = '#04050b';
    ctx.fillRect(0, groundY, W, H - groundY);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#00e5ff');
    g.addColorStop(0.5, '#ff2d9b');
    g.addColorStop(1, '#00e5ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 2 * scale, W, 3 * scale);
    ctx.fillStyle = 'rgba(0,229,255,0.16)';
    ctx.fillRect(0, groundY, W, 10 * scale);
    // scrolling street markings
    const step = 60 * scale;
    const off = distance % step;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = -off; x < W; x += step) {
      ctx.fillRect(x, groundY + (H - groundY) * 0.5, 30 * scale, 3 * scale);
    }
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.type === 'barrier') {
        ctx.save();
        ctx.shadowColor = '#ff2d9b';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff2d9b';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(o.x, o.y, 2, o.h);
        ctx.restore();
      } else if (o.type === 'gate') {
        ctx.fillStyle = '#1a2240';
        ctx.fillRect(o.x, groundY - o.postH, 6 * scale, o.postH);
        ctx.fillRect(o.x + o.w - 6 * scale, groundY - o.postH, 6 * scale, o.postH);
        ctx.fillStyle = '#2a3566';
        ctx.fillRect(o.x, groundY - o.postH, 6 * scale, 4 * scale);
        ctx.fillRect(o.x + o.w - 6 * scale, groundY - o.postH, 6 * scale, 4 * scale);
        ctx.save();
        ctx.shadowColor = '#ff3b3b';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ff3b3b';
        ctx.fillRect(o.x, o.laserY, o.w, o.laserH);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(o.x, o.laserY + o.laserH * 0.4, o.w, 2);
        ctx.restore();
      } else {
        drawDrone(o);
      }
    }
  }

  function drawDrone(o) {
    const cx = o.x, cy = o.cy, r = o.r;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = '#ff3b3b';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#171a2e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,90,90,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(o.phase * 3));
    ctx.fillStyle = 'rgba(255,60,60,' + blink + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCollectibles() {
    for (const c of collectibles) {
      const pulse = 1 + 0.14 * Math.sin(c.phase);
      ctx.save();
      if (c.type === 'coin') {                  // v0.0.5 — small gold coin
        ctx.shadowColor = '#ffd24a';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,250,210,0.95)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.type === 'magnet') {         // v0.0.5 — purple 5-point star
        ctx.shadowColor = '#b14dff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#b14dff';
        drawStar(c.x, c.y, c.r * pulse * 1.25, c.r * pulse * 0.55, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        drawStar(c.x, c.y, c.r * pulse * 1.25, c.r * pulse * 0.55, 5);
        ctx.stroke();
      } else if (c.type === 'core') {
        ctx.shadowColor = '#36e0ff';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#36e0ff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(235,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else { // shield
        ctx.shadowColor = '#27ff8a';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#27ff8a';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - c.r);
        ctx.lineTo(c.x + c.r, c.y);
        ctx.lineTo(c.x, c.y + c.r);
        ctx.lineTo(c.x - c.r, c.y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawStar(cx, cy, outer, inner, points) {  // v0.0.5 — polygon star helper
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI / points) * i - Math.PI / 2;
      const r = (i % 2 === 0) ? outer : inner;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawMagnetHud() {                    // v0.0.5 — small magnet timer bar
    if (magnetTimer <= 0) return;
    const bw = 150, bh = 8;
    const bx = (W - bw) / 2;
    const by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = '#b14dff';
    ctx.fillRect(bx, by, (magnetTimer / MAGNET_DURATION) * bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('MAGNET ' + magnetTimer.toFixed(1) + 's', W / 2, by + bh + 14);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawRunner() {
    if (!runner) return;
    const blink = runner.invuln > 0 && Math.floor(performance.now() / 80) % 2 === 0;
    if (blink) return;
    const s = scale;
    ctx.save();
    ctx.translate(runner.x, runner.y);
    ctx.shadowColor = 'rgba(0,229,255,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#040509';
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = 1.5;

    if (runner.sliding) {
      // sliding: body lowered and leaning back, legs forward
      ctx.beginPath();
      ctx.moveTo(-15 * s, -22 * s);
      ctx.lineTo(15 * s, -22 * s);
      ctx.lineTo(20 * s, -10 * s);
      ctx.lineTo(10 * s, -3 * s);
      ctx.lineTo(-16 * s, -7 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-15 * s, -25 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-20 * s, -27 * s, 6 * s, 2.5 * s);
      ctx.fillStyle = '#040509';
      ctx.fillRect(4 * s, -6 * s, 16 * s, 5 * s);
      ctx.fillRect(4 * s, -2 * s, 13 * s, 4 * s);
    } else if (!runner.onGround) {
      // jump: legs tucked, arms up
      roundRect(-9 * s, -40 * s, 18 * s, 26 * s, 6 * s);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -48 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-5 * s, -50 * s, 10 * s, 2.5 * s);
      ctx.strokeStyle = '#040509';
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath();
      ctx.moveTo(-3 * s, -34 * s);
      ctx.lineTo(-12 * s, -26 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3 * s, -34 * s);
      ctx.lineTo(12 * s, -30 * s);
      ctx.stroke();
      ctx.lineWidth = 4.5 * s;
      ctx.beginPath();
      ctx.moveTo(-5 * s, -16 * s);
      ctx.lineTo(-2 * s, -4 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5 * s, -16 * s);
      ctx.lineTo(10 * s, -8 * s);
      ctx.stroke();
    } else {
      // run: torso, head, visor, swinging arms and legs
      roundRect(-9 * s, -42 * s, 18 * s, 28 * s, 7 * s);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -50 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-5 * s, -52 * s, 10 * s, 2.5 * s);
      const swing = Math.sin(runPhase);
      ctx.strokeStyle = '#040509';
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, -38 * s);
      ctx.lineTo(swing * 8 * s, -28 * s);
      ctx.stroke();
      const legA = Math.sin(runPhase), legB = Math.sin(runPhase + Math.PI);
      ctx.lineWidth = 4.5 * s;
      ctx.beginPath();
      ctx.moveTo(-4 * s, -16 * s);
      ctx.lineTo(-4 * s + legA * 7 * s, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4 * s, -16 * s);
      ctx.lineTo(4 * s + legB * 7 * s, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (!speedLines.length) return;
    ctx.save();
    ctx.lineWidth = 2;
    for (const s of speedLines) {
      ctx.globalAlpha = Math.max(0, s.life / 0.5) * 0.6;
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.len, s.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }
    drawSky();
    drawStars();
    drawMoon();
    drawBuildings();
    drawGround();
    drawObstacles();
    drawCollectibles();
    drawRunner();
    drawParticles();
    drawSpeedLines();
    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + flashAlpha + ')';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    drawMagnetHud();              // v0.0.5 — steady magnet timer bar (no shake)
  }

  /* ---------- Loop ---------- */
  function loop(t) {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    if (dt > 0.05) dt = 0.05; // clamp to avoid huge jumps after tab switch
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- Game lifecycle ---------- */
  function showScreen(id) {
    [startScreen, pauseScreen, gameoverScreen].forEach(function (s) {
      s.classList.toggle('active', s.id === id);
    });
  }

  function startGame() {
    resetRunner();
    obstacles = [];
    collectibles = [];
    particles = [];
    speedLines = [];
    speed = BASE_SPEED;
    distance = 0;
    score = 0;
    pulseCharge = 0;
    boosting = false;
    boostTimer = 0;
    boostCooldown = 0;
    nextObstacleDist = 440;
    nextCoreDist = 240;
    nextCoinDist = 200;            // v0.0.5 — first coins appear quickly
    magnetSpawnTimer = MAGNET_INTERVAL;   // v0.0.5 — first magnet ~25s in
    magnetTimer = 0;
    milestonesHit = {};
    screenShake = 0;
    flashAlpha = 0;
    updateHullPips();
    state = 'playing';
    showScreen(null);
    hud.classList.remove('hidden');
    touchControls.classList.remove('hidden');
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    showScreen('pause-screen');
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    showScreen(null);
  }
  function endGame() {
    state = 'gameover';
    if (window.MUX) MUX.over();
    if (Math.floor(score) > best) {
      best = Math.floor(score);
      localStorage.setItem(BEST_KEY, String(best));
    }
    finalScoreEl.textContent = Math.floor(score);
    finalDistanceEl.textContent = Math.floor(distance / 10) + ' M';
    finalBestEl.textContent = best;
    startBestEl.textContent = best;
    bestEl.textContent = best;
    showScreen('gameover-screen');
  }
  function goHome() {
    state = 'start';
    resetRunner();
    obstacles = [];
    collectibles = [];
    particles = [];
    speedLines = [];
    hud.classList.add('hidden');
    touchControls.classList.add('hidden');
    showScreen('start-screen');
  }

  /* ---------- Input: keyboard ---------- */
  const HANDLED = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyP', 'Escape', 'Enter'];

  window.addEventListener('keydown', function (e) {
    if (HANDLED.indexOf(e.code) !== -1) e.preventDefault();
    if (e.repeat) return;
    if (state === 'start') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'KeyW') startGame();
      return;
    }
    if (state === 'gameover') {
      if (e.code === 'Space' || e.code === 'Enter') startGame();
      return;
    }
    if (state === 'paused') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Escape') resumeGame();
      return;
    }
    // playing
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jump();
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') startSlide();
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') activateBoost();
    else if (e.code === 'KeyP' || e.code === 'Escape') pauseGame();
  });

  window.addEventListener('keyup', function (e) {
    if (state === 'playing' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) releaseBoost();
  });

  /* ---------- Input: on-screen buttons (pointer = touch + mouse) ---------- */
  function bindHold(el, onDown, onUp) {
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); onDown(); });
    if (onUp) {
      el.addEventListener('pointerup', function (e) { e.preventDefault(); onUp(); });
      el.addEventListener('pointerleave', function () { onUp(); });
      el.addEventListener('pointercancel', function () { onUp(); });
    }
  }
  bindHold(document.getElementById('ctrl-jump'), jump);
  bindHold(document.getElementById('ctrl-slide'), startSlide);
  bindHold(document.getElementById('ctrl-boost'), activateBoost, releaseBoost);

  /* ---------- Input: tap / swipe on the play field ---------- */
  canvas.addEventListener('pointerdown', function (e) {
    if (state !== 'playing') return;
    tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointermove', function (e) {
    if (state !== 'playing' || !tapStart) return;
    if (e.clientY - tapStart.y > 44) { startSlide(); tapStart = null; }
  });
  canvas.addEventListener('pointerup', function (e) {
    if (!tapStart) return;
    const dy = e.clientY - tapStart.y;
    const dt = performance.now() - tapStart.t;
    if (state === 'playing' && Math.abs(dy) < 30 && dt < 300) {
      if (tapStart.y < H * 0.5) jump();
      else startSlide();
    }
    tapStart = null;
  });
  canvas.addEventListener('pointercancel', function () { tapStart = null; });

  /* ---------- Buttons ---------- */
  document.getElementById('pause-btn').addEventListener('click', function () {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  });
  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('retry-btn').addEventListener('click', startGame);
  document.getElementById('home-btn').addEventListener('click', goHome);
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  document.getElementById('home-btn-pause').addEventListener('click', goHome);

  /* ---------- Auto-pause when hidden ---------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing') pauseGame();
  });

  /* ---------- Init ---------- */
  resize();
  resetRunner();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  requestAnimationFrame(loop);
})();
// ---- v0.0.5 gamekit wiring (splash + menu + stats + leaderboard + auto-update) ----
if (window.GK) {
  GK.boot({ title: "Nightshift Runner", tagline: "Endless night runner", theme: "#0a0a12" });
  GK.help({ title: "Nightshift Runner", objective: "Run through the night city. Jump and slide past obstacles.", controls: ["Touch: tap = jump, swipe down = slide","Space: jump (double/triple in air)","Down / S: slide","P: pause","F: fullscreen"], tips: "Collect coins; Magnet powerup pulls them in." });
  GK.exposeState(function () { try { return { score: (window.S && window.S.score) || window.score || 0, mode: (window.S && window.S.mode) || 'play', wave: (window.S && window.S.wave) || 0 }; } catch (e) { return {}; } });
  GK._manualRecord = false;
  setTimeout(function () { GK.ready(); }, 600);
}
