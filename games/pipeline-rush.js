export function createPipelineRush(host, { w, h, scoreKey }) {
  const STAGES = ["Lint", "Test", "Build", "Scan", "Deploy"];
  let width = w;
  let height = h;
  let raf = 0;
  let running = false;
  let timeLeft = 75;
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let ships = 0;
  let misses = 0;
  let spawnAcc = 0;
  const commits = [];
  const listeners = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    listeners.push(() => el.removeEventListener(ev, fn, opts));
  };

  function stageY(i) {
    const top = 70;
    const gap = (height - 120) / (STAGES.length - 1);
    return top + i * gap;
  }

  function updateStats() {
    host.setStats([
      `Time ${Math.ceil(timeLeft)}s`,
      `Ships ${ships}`,
      `Combo ×${combo}`,
      `Score ${score}`,
    ]);
  }

  function renderHud() {
    host.hud.innerHTML = `
      <div class="hud-tray">
        <button type="button" id="prHit">HIT GATE (Space)</button>
        <span class="hud-chip">Tap when a commit is in the glowing window</span>
      </div>`;
    on(host.hud.querySelector("#prHit"), "click", () => hit());
  }

  function spawn() {
    commits.push({
      x: -30,
      stage: 0,
      speed: 140 + Math.random() * 40 + (75 - timeLeft) * 1.2,
      alive: true,
      hit: false,
    });
  }

  function hit() {
    if (!running) return;
    let best = null;
    let bestDist = 1e9;
    const hitX = width * 0.72;
    for (const c of commits) {
      if (!c.alive || c.hit) continue;
      const y = stageY(c.stage);
      const d = Math.hypot(c.x - hitX, 0);
      if (Math.abs(c.x - hitX) < 54 && d < bestDist) {
        best = c;
        bestDist = d;
      }
      void y;
    }
    if (!best) {
      combo = 0;
      misses++;
      host.beep(160, 0.08, "sawtooth", 0.03);
      updateStats();
      return;
    }
    const perfect = Math.abs(best.x - hitX) < 22;
    best.hit = true;
    best.stage++;
    best.x = 40;
    best.hit = false;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    const pts = (perfect ? 30 : 18) + combo * 4;
    score += pts;
    host.beep(perfect ? 880 : 620, 0.05, "square", 0.03);
    if (best.stage >= STAGES.length) {
      best.alive = false;
      ships++;
      score += 80 + combo * 10;
      host.beep(980, 0.1, "triangle", 0.04);
    }
    updateStats();
  }

  function endRun() {
    running = false;
    host.saveScore(scoreKey, score);
    host.showOverlay(
      "Pipeline Complete",
      `Score ${score} · Ships ${ships} · Best combo ×${bestCombo} · Misses ${misses}`,
      "Run again",
      () => reset()
    );
  }

  function reset() {
    timeLeft = 75;
    score = 0;
    combo = 0;
    bestCombo = 0;
    ships = 0;
    misses = 0;
    spawnAcc = 0;
    commits.length = 0;
    running = true;
    host.hideOverlay();
    updateStats();
    last = performance.now();
    loop(last);
  }

  function tick(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      endRun();
      return;
    }
    spawnAcc += dt;
    const interval = Math.max(0.55, 1.35 - (75 - timeLeft) * 0.01);
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      spawn();
    }
    const hitX = width * 0.72;
    for (let i = commits.length - 1; i >= 0; i--) {
      const c = commits[i];
      if (!c.alive) {
        commits.splice(i, 1);
        continue;
      }
      c.x += c.speed * dt;
      if (c.x > width + 40) {
        commits.splice(i, 1);
        combo = 0;
        misses++;
        score = Math.max(0, score - 15);
        host.beep(140, 0.07, "sawtooth", 0.03);
        updateStats();
      } else if (c.x > hitX + 56 && !c.warned) {
        c.warned = true;
      }
    }
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(61,224,200,0.04)";
    for (let y = 0; y < height; y += 28) ctx.fillRect(0, y, width, 1);

    const hitX = width * 0.72;
    STAGES.forEach((name, i) => {
      const y = stageY(i);
      ctx.strokeStyle = "rgba(120,200,220,0.2)";
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
      ctx.fillStyle = "#8fa3b8";
      ctx.font = "600 11px JetBrains Mono";
      ctx.textAlign = "left";
      ctx.fillText(name, 24, y - 10);
      // timing window
      ctx.fillStyle = "rgba(61,224,200,0.12)";
      ctx.fillRect(hitX - 48, y - 16, 96, 32);
      ctx.strokeStyle = "rgba(61,224,200,0.55)";
      ctx.strokeRect(hitX - 48, y - 16, 96, 32);
    });

    ctx.strokeStyle = "#e08a3c";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(hitX, 40);
    ctx.lineTo(hitX, height - 40);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const c of commits) {
      if (!c.alive) continue;
      const y = stageY(c.stage);
      const inWindow = Math.abs(c.x - hitX) < 48;
      ctx.beginPath();
      ctx.arc(c.x, y, inWindow ? 12 : 9, 0, Math.PI * 2);
      ctx.fillStyle = inWindow ? "#3de0c8" : "#e08a3c";
      ctx.fill();
      ctx.fillStyle = "#05080d";
      ctx.font = "700 9px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText("SHA", c.x, y + 3);
    }
  }

  let last = 0;
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    draw(host.canvas.getContext("2d"));
    raf = requestAnimationFrame(loop);
  }

  renderHud();
  updateStats();
  on(window, "keydown", (e) => {
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      hit();
    }
  });
  on(host.canvas, "pointerdown", () => hit());

  return {
    start() {
      reset();
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      running = true;
      last = performance.now();
      loop(last);
    },
    resize({ w: nw, h: nh }) {
      width = nw;
      height = nh;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      listeners.forEach((off) => off());
      host.hud.innerHTML = "";
    },
  };
}
