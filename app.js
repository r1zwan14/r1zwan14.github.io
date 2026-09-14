import { createClusterDefender } from "./games/cluster-defender.js";
import { createPipelineRush } from "./games/pipeline-rush.js";
import { createNeuralOps } from "./games/neural-ops.js";
import { createPacketSurfer } from "./games/packet-surfer.js";
import { createArchitectureTycoon } from "./games/architecture-tycoon.js";

const MODES = {
  cluster: { title: "Cluster Defender", create: createClusterDefender, key: "cd" },
  pipeline: { title: "Pipeline Rush", create: createPipelineRush, key: "pr" },
  neural: { title: "Neural Ops", create: createNeuralOps, key: "no" },
  surfer: { title: "Packet Surfer", create: createPacketSurfer, key: "ps" },
  tycoon: { title: "Architecture Tycoon", create: createArchitectureTycoon, key: "at" },
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const hub = document.getElementById("hub");
const gameView = document.getElementById("gameView");
const canvas = document.getElementById("gameCanvas");
const hud = document.getElementById("gameHud");
const stats = document.getElementById("gameStats");
const gameTitle = document.getElementById("gameTitle");
const overlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayBody = document.getElementById("overlayBody");
const overlayPrimary = document.getElementById("overlayPrimary");
const overlaySecondary = document.getElementById("overlaySecondary");
const hubScores = document.getElementById("hubScores");

let current = null;
let currentId = null;
let muted = localStorage.getItem("np-mute") === "1";
let warpOn = !reduced;
let audioCtx = null;

if (reduced) document.body.classList.add("warp-off");

/* ---------- Scores ---------- */
function loadScores() {
  try {
    return JSON.parse(localStorage.getItem("np-scores") || "{}");
  } catch {
    return {};
  }
}

function saveScore(key, score) {
  const scores = loadScores();
  const prev = scores[key] || 0;
  if (score > prev) {
    scores[key] = Math.floor(score);
    localStorage.setItem("np-scores", JSON.stringify(scores));
  }
  renderHubScores();
}

function renderHubScores() {
  if (!hubScores) return;
  const scores = loadScores();
  const lines = Object.entries(MODES).map(([id, m]) => {
    const s = scores[m.key];
    return `${m.title}: ${s != null ? s : "—"}`;
  });
  hubScores.textContent = `High scores · ${lines.join(" · ")}`;
}
renderHubScores();

/* ---------- Audio ---------- */
function beep(freq = 440, dur = 0.06, type = "square", gain = 0.03) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* ignore */
  }
}

const muteBtn = document.getElementById("muteBtn");
muteBtn?.setAttribute("aria-pressed", String(!muted));
muteBtn?.addEventListener("click", () => {
  muted = !muted;
  localStorage.setItem("np-mute", muted ? "1" : "0");
  muteBtn.setAttribute("aria-pressed", String(!muted));
  muteBtn.textContent = muted ? "Muted" : "Sound";
  beep(660, 0.05);
});
if (muteBtn) muteBtn.textContent = muted ? "Muted" : "Sound";

document.getElementById("warpBtn")?.addEventListener("click", (e) => {
  warpOn = !warpOn;
  document.body.classList.toggle("warp-off", !warpOn);
  e.currentTarget.setAttribute("aria-pressed", String(warpOn));
});

/* ---------- Cursor + ambient ---------- */
const cursor = document.getElementById("cursor");
const cursorRing = document.getElementById("cursorRing");
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
const ring = { x: mouse.x, y: mouse.y };

if (finePointer && cursor && cursorRing) {
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
  });
  document.querySelectorAll(".mode-card, .ghost-btn, .solid-btn, .brand").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      cursor.classList.add("is-hot");
      cursorRing.classList.add("is-hot");
    });
    el.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-hot");
      cursorRing.classList.remove("is-hot");
    });
  });
  (function loop() {
    ring.x += (mouse.x - ring.x) * 0.2;
    ring.y += (mouse.y - ring.y) * 0.2;
    cursorRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
    requestAnimationFrame(loop);
  })();
}

const ambient = document.getElementById("ambient");
const actx = ambient?.getContext("2d");
const nodes = [];

function resizeAmbient() {
  if (!ambient || !actx) return;
  ambient.width = innerWidth * devicePixelRatio;
  ambient.height = innerHeight * devicePixelRatio;
  ambient.style.width = `${innerWidth}px`;
  ambient.style.height = `${innerHeight}px`;
  actx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  nodes.length = 0;
  const n = Math.min(55, Math.floor((innerWidth * innerHeight) / 28000));
  for (let i = 0; i < n; i++) {
    nodes.push({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    });
  }
}

function drawAmbient() {
  if (!actx) return;
  actx.clearRect(0, 0, innerWidth, innerHeight);
  if (warpOn && !reduced) {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > innerWidth) n.vx *= -1;
      if (n.y < 0 || n.y > innerHeight) n.vy *= -1;
      actx.fillStyle = "rgba(61,224,200,0.65)";
      actx.beginPath();
      actx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
      actx.fill();
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          actx.strokeStyle = `rgba(61,224,200,${(1 - d / 120) * 0.25})`;
          actx.beginPath();
          actx.moveTo(a.x, a.y);
          actx.lineTo(b.x, b.y);
          actx.stroke();
        }
      }
    }
  }
  requestAnimationFrame(drawAmbient);
}
resizeAmbient();
drawAmbient();
window.addEventListener("resize", resizeAmbient);

/* ---------- Scramble ---------- */
function scramble(el, text) {
  if (!el || reduced || !warpOn) {
    if (el) el.textContent = text;
    return;
  }
  const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/";
  const start = performance.now();
  const dur = 700;
  (function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    let out = "";
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " ") out += " ";
      else if (t > i / text.length) out += text[i];
      else out += glyphs[(Math.random() * glyphs.length) | 0];
    }
    el.textContent = out;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = text;
  })(start);
}
document.querySelectorAll("[data-scramble]").forEach((el) => {
  scramble(el, el.getAttribute("data-scramble"));
});

/* ---------- Game host API ---------- */
function resizeCanvas() {
  const stage = canvas.parentElement;
  const w = stage.clientWidth;
  const h = Math.max(360, stage.clientHeight || window.innerHeight * 0.7);
  canvas.width = Math.floor(w * devicePixelRatio);
  canvas.height = Math.floor(h * devicePixelRatio);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return { w, h, ctx };
}

function setStats(parts) {
  stats.innerHTML = parts.map((p) => `<span>${p}</span>`).join("");
}

function showOverlay(title, body, primaryLabel, onPrimary) {
  overlay.hidden = false;
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayPrimary.textContent = primaryLabel;
  overlayPrimary.onclick = () => {
    overlay.hidden = true;
    onPrimary?.();
  };
  overlaySecondary.onclick = () => {
    overlay.hidden = true;
    exitGame();
  };
}

function hideOverlay() {
  overlay.hidden = true;
}

const host = {
  canvas,
  hud,
  beep,
  setStats,
  showOverlay,
  hideOverlay,
  saveScore,
  resizeCanvas,
  reduced,
  get muted() {
    return muted;
  },
};

function exitGame() {
  if (current) {
    current.destroy?.();
    current = null;
  }
  currentId = null;
  hud.innerHTML = "";
  hideOverlay();
  gameView.hidden = true;
  hub.hidden = false;
  renderHubScores();
}

function enterGame(id) {
  const mode = MODES[id];
  if (!mode) return;
  if (current) current.destroy?.();
  currentId = id;
  hub.hidden = true;
  gameView.hidden = false;
  gameTitle.textContent = mode.title;
  hud.innerHTML = "";
  hideOverlay();
  scramble(gameTitle, mode.title);
  beep(520, 0.08, "triangle", 0.04);
  const { w, h, ctx } = resizeCanvas();
  current = mode.create(host, { w, h, ctx, scoreKey: mode.key });
  current.start?.();
}

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => enterGame(btn.getAttribute("data-mode")));
});

document.getElementById("backBtn")?.addEventListener("click", exitGame);

window.addEventListener("resize", () => {
  if (!current) return;
  const size = resizeCanvas();
  current.resize?.(size);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) current?.pause?.();
  else if (currentId && current && overlay.hidden) current.resume?.();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentId) exitGame();
});
