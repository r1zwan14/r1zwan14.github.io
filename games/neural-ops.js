export function createNeuralOps(host, { w, h, scoreKey }) {
  let width = w;
  let height = h;
  let raf = 0;
  let running = false;
  let latency = 42;
  let cost = 55;
  let reliability = 70;
  let healthy = 0;
  let bestHealthy = 0;
  let score = 0;
  let drag = null;
  const advice = [];
  const nodes = [];
  const listeners = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    listeners.push(() => el.removeEventListener(ev, fn, opts));
  };

  function seedNodes() {
    nodes.length = 0;
    const labels = ["API", "EKS", "TF", "CI", "OBS", "CACHE", "IAM", "GKE"];
    labels.forEach((label, i) => {
      const ang = (i / labels.length) * Math.PI * 2;
      nodes.push({
        label,
        x: width * 0.42 + Math.cos(ang) * Math.min(width, height) * 0.22,
        y: height * 0.48 + Math.sin(ang) * Math.min(width, height) * 0.22,
        vx: 0,
        vy: 0,
      });
    });
  }

  function bandOk() {
    return latency >= 25 && latency <= 55 && cost >= 35 && cost <= 65 && reliability >= 60 && reliability <= 90;
  }

  function pushAdvice(text) {
    advice.unshift({ text, t: 4 });
    if (advice.length > 5) advice.pop();
  }

  function recomputeAdvice() {
    if (latency > 60) pushAdvice("ai · scale HPA / add cache edge");
    else if (latency < 20) pushAdvice("ai · over-provisioned — right-size nodes");
    if (cost > 70) pushAdvice("ai · cut idle capacity · schedule batch off-peak");
    else if (cost < 30) pushAdvice("ai · budget too lean — reliability risk");
    if (reliability < 55) pushAdvice("ai · widen canary · add obs alerts");
    else if (reliability > 92) pushAdvice("ai · reliability ceiling — optimize cost");
    if (bandOk()) pushAdvice("ai · control plane nominal — hold the band");
  }

  function updateStats() {
    host.setStats([
      `Latency ${latency | 0}`,
      `Cost ${cost | 0}`,
      `Rel ${reliability | 0}`,
      `Healthy ${healthy | 0}s`,
      `Score ${score | 0}`,
    ]);
  }

  function renderHud() {
    host.hud.innerHTML = `
      <div class="hud-panel" id="noPanel">
        <h3>AI Advisor</h3>
        <div id="noAdvice" class="mono" style="min-height:4.5rem;font-size:0.75rem;color:#8fa3b8"></div>
        <div class="hud-dials">
          <label>Latency <input type="range" id="dLat" min="5" max="95" value="${latency}" /></label>
          <label>Cost <input type="range" id="dCost" min="5" max="95" value="${cost}" /></label>
          <label>Reliability <input type="range" id="dRel" min="5" max="95" value="${reliability}" /></label>
        </div>
        <p style="margin-top:0.6rem">Keep all meters in the healthy band. Drag nodes to reshape the mesh.</p>
      </div>`;
    const bind = (id, setter) => {
      const el = host.hud.querySelector(id);
      on(el, "input", () => {
        setter(Number(el.value));
        recomputeAdvice();
        updateStats();
        host.beep(400 + Number(el.value), 0.03, "triangle", 0.02);
      });
    };
    bind("#dLat", (v) => (latency = v));
    bind("#dCost", (v) => (cost = v));
    bind("#dRel", (v) => (reliability = v));
    paintAdvice();
  }

  function paintAdvice() {
    const box = host.hud.querySelector("#noAdvice");
    if (!box) return;
    box.innerHTML = advice.map((a) => `<div style="margin:0.25rem 0;color:#3de0c8">${a.text}</div>`).join("") ||
      `<div>ai · awaiting telemetry…</div>`;
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

  function reset() {
    latency = 42;
    cost = 55;
    reliability = 70;
    healthy = 0;
    bestHealthy = 0;
    score = 0;
    advice.length = 0;
    drag = null;
    seedNodes();
    pushAdvice("ai · neural ops online — balance the triad");
    running = true;
    host.hideOverlay();
    renderHud();
    updateStats();
    last = performance.now();
    loop(last);
  }

  let celebrated = 0;

  function tick(dt) {
    // natural drift toward chaos unless managed
    latency += (Math.random() - 0.48) * 8 * dt;
    cost += (Math.random() - 0.5) * 6 * dt;
    reliability += (Math.random() - 0.52) * 7 * dt;
    latency = Math.max(5, Math.min(95, latency));
    cost = Math.max(5, Math.min(95, cost));
    reliability = Math.max(5, Math.min(95, reliability));

    // sync dials
    const dLat = host.hud.querySelector("#dLat");
    const dCost = host.hud.querySelector("#dCost");
    const dRel = host.hud.querySelector("#dRel");
    if (dLat && document.activeElement !== dLat) dLat.value = String(latency | 0);
    if (dCost && document.activeElement !== dCost) dCost.value = String(cost | 0);
    if (dRel && document.activeElement !== dRel) dRel.value = String(reliability | 0);

    if (bandOk()) {
      healthy += dt;
      score += dt * 12;
      if (healthy > bestHealthy) {
        bestHealthy = healthy;
        host.saveScore(scoreKey, Math.floor(bestHealthy * 10 + score));
      }
    } else {
      healthy = Math.max(0, healthy - dt * 1.5);
    }

    for (const a of advice) a.t -= dt;
    while (advice.length && advice[advice.length - 1].t <= 0) advice.pop();

    // soft physics
    const cx = width * 0.42;
    const cy = height * 0.48;
    nodes.forEach((n, i) => {
      if (n === drag) return;
      n.vx += (cx - n.x) * 0.0006;
      n.vy += (cy - n.y) * 0.0006;
      n.vx += Math.sin(performance.now() / 800 + i) * 0.015;
      n.vy += Math.cos(performance.now() / 900 + i) * 0.015;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const o = nodes[j];
        const dx = n.x - o.x;
        const dy = n.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 70) {
          n.vx += (dx / d) * 0.08;
          n.vy += (dy / d) * 0.08;
        }
      }
      n.vx += ((latency - 50) / 50) * 0.02;
      n.vy += ((cost - 50) / 50) * 0.02;
      n.vx *= 0.9;
      n.vy *= 0.9;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(40, Math.min(width * 0.75, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    });

    if (Math.random() < dt * 0.35) recomputeAdvice();
    paintAdvice();
    updateStats();

    if (healthy >= 30 && celebrated < 30) {
      celebrated = 30;
      host.saveScore(scoreKey, Math.floor(score + healthy * 10));
      running = false;
      host.showOverlay(
        "Band Locked",
        `Held healthy state for ${healthy | 0}s · Score ${score | 0}. Keep going or reset.`,
        "Continue",
        () => {
          running = true;
          last = performance.now();
          loop(last);
        }
      );
    }
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);
    // healthy band indicator
    const ok = bandOk();
    ctx.fillStyle = ok ? "rgba(61,224,200,0.08)" : "rgba(232,93,93,0.06)";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 180) {
          ctx.strokeStyle = `rgba(61,224,200,${(1 - d / 180) * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    const pulse = 14 + Math.sin(performance.now() / 350) * 3;
    ctx.beginPath();
    ctx.arc(width * 0.42, height * 0.48, pulse, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "rgba(61,224,200,0.35)" : "rgba(224,138,60,0.3)";
    ctx.fill();

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,34,0.95)";
      ctx.fill();
      ctx.strokeStyle = ok ? "#3de0c8" : "#e08a3c";
      ctx.stroke();
      ctx.fillStyle = "#e7eef6";
      ctx.font = "700 9px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y + 3);
    }

    // triad meters visual
    const meters = [
      { label: "LAT", v: latency, x: width - 70, y: 50, good: [25, 55] },
      { label: "COST", v: cost, x: width - 70, y: 120, good: [35, 65] },
      { label: "REL", v: reliability, x: width - 70, y: 190, good: [60, 90] },
    ];
    for (const m of meters) {
      ctx.strokeStyle = "rgba(120,200,220,0.25)";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      const inBand = m.v >= m.good[0] && m.v <= m.good[1];
      ctx.strokeStyle = inBand ? "#3de0c8" : "#e85d5d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 24, -Math.PI / 2, -Math.PI / 2 + (m.v / 100) * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#8fa3b8";
      ctx.font = "600 9px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(m.label, m.x, m.y + 3);
    }

    ctx.fillStyle = ok ? "#3de0c8" : "#f0b06a";
    ctx.font = "700 12px JetBrains Mono";
    ctx.textAlign = "left";
    ctx.fillText(ok ? `NOMINAL · ${healthy | 0}s` : "DRIFT", 16, 28);
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

  on(host.canvas, "pointerdown", (e) => {
    const p = pointer(e);
    drag = null;
    for (const n of nodes) {
      if (Math.hypot(n.x - p.x, n.y - p.y) < 22) {
        drag = n;
        host.beep(560, 0.03, "triangle", 0.02);
        break;
      }
    }
  });
  on(host.canvas, "pointermove", (e) => {
    if (!drag) return;
    const p = pointer(e);
    drag.x = p.x;
    drag.y = p.y;
    drag.vx = 0;
    drag.vy = 0;
  });
  on(window, "pointerup", () => {
    drag = null;
  });

  return {
    start() {
      celebrated = 0;
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
