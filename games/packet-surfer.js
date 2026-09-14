export function createPacketSurfer(host, { w, h, scoreKey }) {
  const LANES = 3;
  let width = w;
  let height = h;
  let raf = 0;
  let running = false;
  let lane = 1;
  let targetLane = 1;
  let y = 0;
  let speed = 220;
  let distance = 0;
  let packets = 0;
  let score = 0;
  let alive = true;
  let spawnAcc = 0;
  let boost = 0;
  const entities = [];
  const listeners = [];
  let touchStartX = 0;

  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    listeners.push(() => el.removeEventListener(ev, fn, opts));
  };

  function laneX(i) {
    const pad = width * 0.18;
    const span = width - pad * 2;
    return pad + (span * (i + 0.5)) / LANES;
  }

  function updateStats() {
    host.setStats([
      `Dist ${distance | 0}m`,
      `Packets ${packets}`,
      `Speed ${speed | 0}`,
      `Score ${score | 0}`,
    ]);
  }

  function renderHud() {
    host.hud.innerHTML = `
      <div class="hud-tray">
        <button type="button" id="psLeft">← Lane</button>
        <button type="button" id="psRight">Lane →</button>
        <span class="hud-chip">Arrows / swipe · collect cyan · avoid red</span>
      </div>`;
    on(host.hud.querySelector("#psLeft"), "click", () => shift(-1));
    on(host.hud.querySelector("#psRight"), "click", () => shift(1));
  }

  function shift(dir) {
    targetLane = Math.max(0, Math.min(LANES - 1, targetLane + dir));
    host.beep(500 + targetLane * 40, 0.04, "triangle", 0.025);
  }

  function spawn() {
    const kindRoll = Math.random();
    const kind = kindRoll < 0.55 ? "packet" : kindRoll < 0.85 ? "loss" : "cdn";
    entities.push({
      kind,
      lane: (Math.random() * LANES) | 0,
      y: -30,
      r: kind === "cdn" ? 16 : 11,
    });
  }

  function endRun() {
    running = false;
    alive = false;
    host.saveScore(scoreKey, score);
    host.showOverlay(
      "Link Dropped",
      `Score ${score | 0} · Distance ${distance | 0}m · Packets ${packets}`,
      "Surf again",
      () => reset()
    );
  }

  function reset() {
    lane = 1;
    targetLane = 1;
    y = 0;
    speed = 220;
    distance = 0;
    packets = 0;
    score = 0;
    alive = true;
    spawnAcc = 0;
    boost = 0;
    entities.length = 0;
    running = true;
    host.hideOverlay();
    updateStats();
    last = performance.now();
    loop(last);
  }

  function tick(dt) {
    if (!alive) return;
    boost = Math.max(0, boost - dt);
    const spd = speed * (boost > 0 ? 1.45 : 1);
    distance += spd * dt * 0.1;
    score += spd * dt * 0.05 + packets * 0.001;
    speed = Math.min(480, speed + dt * 4);
    y += spd * dt;

    lane += (targetLane - lane) * Math.min(1, dt * 12);

    spawnAcc += dt;
    if (spawnAcc > Math.max(0.28, 0.7 - speed / 1200)) {
      spawnAcc = 0;
      spawn();
      if (Math.random() < 0.35) spawn();
    }

    const py = height * 0.72;
    const px = laneX(lane);
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      e.y += spd * dt;
      if (e.y > height + 40) {
        entities.splice(i, 1);
        continue;
      }
      const ex = laneX(e.lane);
      if (Math.hypot(ex - px, e.y - py) < e.r + 14) {
        if (e.kind === "packet") {
          packets++;
          score += 25;
          host.beep(740, 0.04, "square", 0.03);
          updateStats();
        } else if (e.kind === "cdn") {
          boost = 1.6;
          score += 40;
          host.beep(920, 0.08, "triangle", 0.04);
          updateStats();
        } else {
          host.beep(120, 0.15, "sawtooth", 0.05);
          endRun();
          return;
        }
        entities.splice(i, 1);
      }
    }
    if ((distance | 0) % 20 === 0) updateStats();
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);
    // scrolling subnet stripes
    const offset = y % 48;
    for (let i = -1; i < height / 48 + 2; i++) {
      const yy = i * 48 - offset;
      ctx.fillStyle = i % 2 === 0 ? "rgba(61,224,200,0.03)" : "rgba(224,138,60,0.03)";
      ctx.fillRect(0, yy, width, 48);
    }

    for (let i = 0; i < LANES; i++) {
      const x = laneX(i);
      ctx.strokeStyle = "rgba(120,200,220,0.2)";
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const e of entities) {
      const x = laneX(e.lane);
      ctx.beginPath();
      ctx.arc(x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = e.kind === "packet" ? "#3de0c8" : e.kind === "cdn" ? "#f0b06a" : "#e85d5d";
      ctx.fill();
      ctx.fillStyle = "#05080d";
      ctx.font = "700 8px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(e.kind === "packet" ? "PKT" : e.kind === "cdn" ? "CDN" : "LOSS", x, e.y + 3);
    }

    const px = laneX(lane);
    const py = height * 0.72;
    ctx.beginPath();
    ctx.moveTo(px, py - 16);
    ctx.lineTo(px + 14, py + 12);
    ctx.lineTo(px - 14, py + 12);
    ctx.closePath();
    ctx.fillStyle = boost > 0 ? "#f0b06a" : "#e7eef6";
    ctx.fill();
    ctx.strokeStyle = "#3de0c8";
    ctx.stroke();

    ctx.fillStyle = "rgba(143,163,184,0.8)";
    ctx.font = "600 10px JetBrains Mono";
    ctx.textAlign = "left";
    ctx.fillText("VPC SURF", 16, 28);
    if (boost > 0) {
      ctx.fillStyle = "#f0b06a";
      ctx.fillText("CDN BOOST", 16, 46);
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
    if (e.key === "ArrowLeft" || e.key === "a") shift(-1);
    if (e.key === "ArrowRight" || e.key === "d") shift(1);
  });
  on(host.canvas, "touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });
  on(host.canvas, "touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 30) shift(dx > 0 ? 1 : -1);
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
