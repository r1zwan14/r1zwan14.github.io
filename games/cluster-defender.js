export function createClusterDefender(host, { w, h, scoreKey }) {
  const BUILDINGS = [
    { id: "pod", name: "Pod", cost: 40, dps: 8, range: 70, hp: 40, color: "#3de0c8" },
    { id: "hpa", name: "HPA", cost: 70, dps: 4, range: 100, hp: 50, color: "#6ff0dc", aura: 1.35 },
    { id: "cache", name: "Cache", cost: 55, dps: 12, range: 55, hp: 35, color: "#e08a3c" },
    { id: "waf", name: "WAF", cost: 90, dps: 18, range: 80, hp: 60, color: "#f0b06a" },
  ];

  let width = w;
  let height = h;
  let raf = 0;
  let running = false;
  let selected = 0;
  let credits = 220;
  let wave = 1;
  let hp = 100;
  let score = 0;
  let spent = 0;
  let time = 0;
  let spawnTimer = 0;
  let waveLeft = 8;
  let betweenWaves = 0;
  const towers = [];
  const enemies = [];
  const particles = [];
  const path = [];

  const listeners = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    listeners.push(() => el.removeEventListener(ev, fn, opts));
  };

  function buildPath() {
    path.length = 0;
    const margin = 40;
    path.push({ x: margin, y: height * 0.2 });
    path.push({ x: width * 0.35, y: height * 0.2 });
    path.push({ x: width * 0.35, y: height * 0.55 });
    path.push({ x: width * 0.7, y: height * 0.55 });
    path.push({ x: width * 0.7, y: height * 0.28 });
    path.push({ x: width - margin, y: height * 0.28 });
    path.push({ x: width - margin, y: height * 0.72 });
    path.push({ x: width * 0.5, y: height * 0.72 });
    path.push({ x: width * 0.5, y: height - 50 });
  }

  function renderHud() {
    host.hud.innerHTML = `
      <div class="hud-tray" id="cdTray">
        ${BUILDINGS.map(
          (b, i) =>
            `<button type="button" data-i="${i}" class="${i === selected ? "is-active" : ""}">${i + 1}. ${b.name} ($${b.cost})</button>`
        ).join("")}
      </div>`;
    host.hud.querySelectorAll("[data-i]").forEach((btn) => {
      on(btn, "click", () => {
        selected = Number(btn.getAttribute("data-i"));
        renderHud();
      });
    });
  }

  function updateStats() {
    host.setStats([
      `HP ${Math.max(0, hp | 0)}`,
      `Credits $${credits | 0}`,
      `Wave ${wave}/8`,
      `Score ${score | 0}`,
    ]);
  }

  function spawnEnemy() {
    const kind = Math.random() < 0.18 + wave * 0.02 ? "chaos" : "traffic";
    enemies.push({
      kind,
      t: 0,
      hp: kind === "chaos" ? 40 + wave * 8 : 22 + wave * 5,
      max: kind === "chaos" ? 40 + wave * 8 : 22 + wave * 5,
      speed: kind === "chaos" ? 55 + wave * 3 : 70 + wave * 4,
      reward: kind === "chaos" ? 28 : 14,
      dmg: kind === "chaos" ? 14 : 8,
    });
  }

  function posOnPath(t) {
    let dist = t;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist <= seg) {
        const u = dist / seg;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, done: false };
      }
      dist -= seg;
    }
    const last = path[path.length - 1];
    return { x: last.x, y: last.y, done: true };
  }

  function pathLen() {
    let L = 0;
    for (let i = 0; i < path.length - 1; i++) {
      L += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    }
    return L;
  }

  function placeTower(x, y) {
    const b = BUILDINGS[selected];
    if (credits < b.cost) {
      host.beep(180, 0.08, "sawtooth", 0.03);
      return;
    }
    for (const t of towers) {
      if (Math.hypot(t.x - x, t.y - y) < 36) return;
    }
    // keep off path
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b2 = path[i + 1];
      const px = b2.x - a.x;
      const py = b2.y - a.y;
      const len2 = px * px + py * py || 1;
      let u = ((x - a.x) * px + (y - a.y) * py) / len2;
      u = Math.max(0, Math.min(1, u));
      const cx = a.x + u * px;
      const cy = a.y + u * py;
      if (Math.hypot(x - cx, y - cy) < 28) return;
    }
    credits -= b.cost;
    spent += b.cost;
    towers.push({ ...b, x, y, cool: 0 });
    host.beep(640, 0.05, "square", 0.03);
    updateStats();
  }

  function pointer(e) {
    const r = host.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - r.left) / r.width) * width,
      y: ((clientY - r.top) / r.height) * height,
    };
  }

  function endGame(won) {
    running = false;
    const efficiency = Math.max(0.4, 1.3 - spent / 900);
    const finalScore = Math.floor(score * efficiency + (won ? 500 : 0) + hp * 2);
    host.saveScore(scoreKey, finalScore);
    host.showOverlay(
      won ? "Cluster Held" : "Control Plane Down",
      `Score ${finalScore} · Waves ${wave} · Efficiency ×${efficiency.toFixed(2)}`,
      "Retry",
      () => reset()
    );
  }

  function reset() {
    credits = 220;
    wave = 1;
    hp = 100;
    score = 0;
    spent = 0;
    time = 0;
    spawnTimer = 0;
    waveLeft = 8;
    betweenWaves = 1.5;
    towers.length = 0;
    enemies.length = 0;
    particles.length = 0;
    running = true;
    host.hideOverlay();
    updateStats();
    loop();
  }

  function tick(dt) {
    time += dt;
    if (betweenWaves > 0) {
      betweenWaves -= dt;
    } else {
      spawnTimer -= dt;
      if (waveLeft > 0 && spawnTimer <= 0) {
        spawnEnemy();
        waveLeft--;
        spawnTimer = Math.max(0.45, 1.1 - wave * 0.06);
      }
      if (waveLeft <= 0 && enemies.length === 0) {
        if (wave >= 8) {
          endGame(true);
          return;
        }
        wave++;
        waveLeft = 7 + wave;
        betweenWaves = 2.2;
        credits += 40 + wave * 10;
        host.beep(880, 0.1, "triangle", 0.04);
        updateStats();
      }
    }

    const total = pathLen();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += e.speed * dt;
      const p = posOnPath(e.t);
      e.x = p.x;
      e.y = p.y;
      if (p.done || e.t >= total) {
        hp -= e.dmg;
        enemies.splice(i, 1);
        host.beep(140, 0.1, "sawtooth", 0.04);
        updateStats();
        if (hp <= 0) {
          endGame(false);
          return;
        }
      }
    }

    for (const t of towers) {
      t.cool -= dt;
      let target = null;
      let best = 1e9;
      const range = t.range * (t.aura || 1);
      for (const e of enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d < range && d < best) {
          best = d;
          target = e;
        }
      }
      if (target && t.cool <= 0) {
        const dps = t.dps * (t.id === "hpa" ? 1 + towers.filter((x) => x.id === "pod").length * 0.08 : 1);
        target.hp -= dps;
        t.cool = 0.35;
        particles.push({ x: t.x, y: t.y, x2: target.x, y2: target.y, life: 0.12, color: t.color });
        if (target.hp <= 0) {
          credits += target.reward;
          score += target.reward * 2 + wave;
          enemies.splice(enemies.indexOf(target), 1);
          host.beep(760, 0.04, "square", 0.025);
          updateStats();
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].life -= dt;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);
    // grid
    ctx.strokeStyle = "rgba(61,224,200,0.05)";
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // path
    ctx.strokeStyle = "rgba(224,138,60,0.45)";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = "rgba(15,23,34,0.85)";
    ctx.lineWidth = 12;
    ctx.stroke();

    // control plane
    const cp = path[path.length - 1];
    ctx.fillStyle = "rgba(61,224,200,0.2)";
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3de0c8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#e7eef6";
    ctx.font = "600 10px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText("CP", cp.x, cp.y + 3);

    for (const t of towers) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,34,0.9)";
      ctx.fill();
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = t.color;
      ctx.font = "600 9px JetBrains Mono";
      ctx.fillText(t.name.slice(0, 3).toUpperCase(), t.x, t.y + 3);
      ctx.strokeStyle = `${t.color}33`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range * (t.aura || 1), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const e of enemies) {
      const r = e.kind === "chaos" ? 11 : 8;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fillStyle = e.kind === "chaos" ? "#e85d5d" : "#8fa3b8";
      ctx.fill();
      ctx.fillStyle = "#05080d";
      ctx.fillRect(e.x - 10, e.y - r - 8, 20 * (e.hp / e.max), 3);
    }

    for (const p of particles) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life * 8);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (betweenWaves > 0) {
      ctx.fillStyle = "rgba(231,238,246,0.7)";
      ctx.font = "700 18px Syne";
      ctx.textAlign = "center";
      ctx.fillText(`Wave ${wave} incoming…`, width / 2, 36);
    }
  }

  let last = 0;
  function loop(ts = 0) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw(host.canvas.getContext("2d"));
    raf = requestAnimationFrame(loop);
  }

  buildPath();
  renderHud();
  updateStats();

  on(host.canvas, "click", (e) => {
    if (!running) return;
    const p = pointer(e);
    placeTower(p.x, p.y);
  });
  on(window, "keydown", (e) => {
    if (e.key >= "1" && e.key <= "4") {
      selected = Number(e.key) - 1;
      renderHud();
    }
  });

  return {
    start() {
      reset();
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (overlayVisible()) return;
      running = true;
      last = performance.now();
      loop(last);
    },
    resize({ w: nw, h: nh }) {
      width = nw;
      height = nh;
      buildPath();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      listeners.forEach((off) => off());
      host.hud.innerHTML = "";
    },
  };

  function overlayVisible() {
    return !document.getElementById("gameOverlay")?.hidden;
  }
}
