export function createArchitectureTycoon(host, { w, h, scoreKey }) {
  const TILES = [
    { id: "vpc", name: "VPC", cost: 20, scale: 5, costM: 8, rel: 10, color: "#3de0c8" },
    { id: "eks", name: "EKS/GKE", cost: 45, scale: 35, costM: 22, rel: 18, color: "#6ff0dc" },
    { id: "rds", name: "RDS", cost: 35, scale: 12, costM: 18, rel: 25, color: "#e08a3c" },
    { id: "lb", name: "LB", cost: 25, scale: 20, costM: 10, rel: 15, color: "#f0b06a" },
    { id: "obs", name: "Obs", cost: 30, scale: 8, costM: 12, rel: 30, color: "#8fa3b8" },
  ];

  const MISSION = { rps: 10000, budget: 100, minRel: 55 };

  let width = w;
  let height = h;
  let raf = 0;
  let running = false;
  let selected = 0;
  let credits = 160;
  let mode = "place"; // place | wire
  let wireFrom = null;
  let score = 0;
  let won = false;
  const nodes = [];
  const edges = [];
  const listeners = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    listeners.push(() => el.removeEventListener(ev, fn, opts));
  };

  const COLS = 6;
  const ROWS = 4;

  function cellSize() {
    const pad = 24;
    const hudSpace = 20;
    const cw = (width - pad * 2) / COLS;
    const ch = (height - pad * 2 - hudSpace) / ROWS;
    return { pad, cw, ch };
  }

  function cellCenter(c, r) {
    const { pad, cw, ch } = cellSize();
    return { x: pad + c * cw + cw / 2, y: pad + r * ch + ch / 2 };
  }

  function metrics() {
    let scale = 0;
    let cost = 0;
    let rel = 20;
    const linked = new Set();
    edges.forEach((e) => {
      linked.add(e.a);
      linked.add(e.b);
    });
    nodes.forEach((n, i) => {
      const mult = linked.has(i) ? 1.25 : 0.7;
      scale += n.scale * mult;
      cost += n.costM;
      rel += n.rel * (linked.has(i) ? 0.6 : 0.25);
    });
    if (nodes.some((n) => n.id === "obs")) rel += 12;
    if (nodes.some((n) => n.id === "lb") && nodes.some((n) => n.id === "eks")) scale *= 1.15;
    const rps = Math.floor(scale * 180);
    rel = Math.min(100, Math.floor(rel));
    return { rps, cost: Math.floor(cost), rel };
  }

  function updateStats() {
    const m = metrics();
    host.setStats([
      `Credits $${credits}`,
      `RPS ${m.rps}/${MISSION.rps}`,
      `Cost $${m.cost}/$${MISSION.budget}`,
      `Rel ${m.rel}%`,
      `Score ${score}`,
    ]);
  }

  function renderHud() {
    host.hud.innerHTML = `
      <div class="hud-tray">
        <button type="button" id="atPlace" class="${mode === "place" ? "is-active" : ""}">Place</button>
        <button type="button" id="atWire" class="${mode === "wire" ? "is-active" : ""}">Wire</button>
        ${TILES.map(
          (t, i) =>
            `<button type="button" data-t="${i}" class="${i === selected && mode === "place" ? "is-active" : ""}">${t.name} $${t.cost}</button>`
        ).join("")}
        <span class="hud-chip">Mission: ${MISSION.rps} RPS · budget $${MISSION.budget} · rel ≥ ${MISSION.minRel}%</span>
      </div>`;
    on(host.hud.querySelector("#atPlace"), "click", () => {
      mode = "place";
      wireFrom = null;
      renderHud();
    });
    on(host.hud.querySelector("#atWire"), "click", () => {
      mode = "wire";
      renderHud();
    });
    host.hud.querySelectorAll("[data-t]").forEach((btn) => {
      on(btn, "click", () => {
        selected = Number(btn.getAttribute("data-t"));
        mode = "place";
        renderHud();
      });
    });
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

  function hitNode(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (Math.hypot(nodes[i].x - x, nodes[i].y - y) < 28) return i;
    }
    return -1;
  }

  function placeAt(x, y) {
    const { pad, cw, ch } = cellSize();
    const c = Math.floor((x - pad) / cw);
    const r = Math.floor((y - pad) / ch);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    if (nodes.some((n) => n.c === c && n.r === r)) return;
    const t = TILES[selected];
    if (credits < t.cost) {
      host.beep(160, 0.08, "sawtooth", 0.03);
      return;
    }
    credits -= t.cost;
    const pos = cellCenter(c, r);
    nodes.push({ ...t, c, r, x: pos.x, y: pos.y });
    host.beep(620, 0.05, "square", 0.03);
    score += 10;
    checkWin();
    updateStats();
  }

  function checkWin() {
    if (won) return;
    const m = metrics();
    if (m.rps >= MISSION.rps && m.cost <= MISSION.budget && m.rel >= MISSION.minRel) {
      won = true;
      score += 500 + credits * 2;
      host.saveScore(scoreKey, score);
      host.beep(980, 0.15, "triangle", 0.05);
      host.showOverlay(
        "Mission Complete",
        `Architecture rated ★★★ · Score ${score} · RPS ${m.rps} · Cost $${m.cost} · Rel ${m.rel}%`,
        "New mission",
        () => reset()
      );
    }
  }

  function reset() {
    credits = 160;
    selected = 0;
    mode = "place";
    wireFrom = null;
    score = 0;
    won = false;
    nodes.length = 0;
    edges.length = 0;
    running = true;
    host.hideOverlay();
    renderHud();
    updateStats();
    last = performance.now();
    loop(last);
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);
    const { pad, cw, ch } = cellSize();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeStyle = "rgba(120,200,220,0.12)";
        ctx.strokeRect(pad + c * cw + 4, pad + r * ch + 4, cw - 8, ch - 8);
      }
    }

    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      if (!a || !b) continue;
      ctx.strokeStyle = "rgba(61,224,200,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,34,0.95)";
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = n.color;
      ctx.font = "700 10px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(n.name, n.x, n.y + 3);
    }

    if (wireFrom != null && nodes[wireFrom]) {
      ctx.strokeStyle = "rgba(224,138,60,0.6)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(nodes[wireFrom].x, nodes[wireFrom].y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const m = metrics();
    const ok =
      m.rps >= MISSION.rps && m.cost <= MISSION.budget && m.rel >= MISSION.minRel;
    ctx.fillStyle = ok ? "#3de0c8" : "#8fa3b8";
    ctx.font = "600 11px JetBrains Mono";
    ctx.textAlign = "left";
    ctx.fillText(
      `SIM  RPS ${m.rps}  COST $${m.cost}  REL ${m.rel}%`,
      16,
      height - 14
    );
  }

  let last = 0;
  function loop(ts) {
    if (!running) return;
    last = ts;
    draw(host.canvas.getContext("2d"));
    // soft score tick for linked systems
    const m = metrics();
    if (nodes.length && edges.length) score += 0.02;
    if ((ts / 500 | 0) % 2 === 0) updateStats();
    void m;
    raf = requestAnimationFrame(loop);
  }

  on(host.canvas, "pointerdown", (e) => {
    const p = pointer(e);
    if (mode === "place") {
      placeAt(p.x, p.y);
      return;
    }
    const idx = hitNode(p.x, p.y);
    if (idx < 0) {
      wireFrom = null;
      return;
    }
    if (wireFrom == null) {
      wireFrom = idx;
      host.beep(480, 0.04, "triangle", 0.025);
      return;
    }
    if (wireFrom === idx) {
      wireFrom = null;
      return;
    }
    const exists = edges.some(
      (e) => (e.a === wireFrom && e.b === idx) || (e.a === idx && e.b === wireFrom)
    );
    if (!exists) {
      edges.push({ a: wireFrom, b: idx });
      score += 25;
      host.beep(700, 0.05, "square", 0.03);
      checkWin();
      updateStats();
    }
    wireFrom = null;
  });

  renderHud();
  updateStats();

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
      loop(performance.now());
    },
    resize({ w: nw, h: nh }) {
      width = nw;
      height = nh;
      const { pad, cw, ch } = cellSize();
      nodes.forEach((n) => {
        n.x = pad + n.c * cw + cw / 2;
        n.y = pad + n.r * ch + ch / 2;
      });
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      listeners.forEach((off) => off());
      host.hud.innerHTML = "";
    },
  };
}
