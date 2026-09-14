(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Warp toggle ---------- */
  const warpToggle = document.getElementById("warpToggle");
  let warpOn = !reduced;
  if (reduced) document.body.classList.add("warp-off");

  warpToggle?.addEventListener("click", () => {
    warpOn = !warpOn;
    document.body.classList.toggle("warp-off", !warpOn);
    warpToggle.setAttribute("aria-pressed", String(warpOn));
  });

  /* ---------- Custom cursor + magnetics ---------- */
  const cursor = document.getElementById("cursor");
  const cursorRing = document.getElementById("cursorRing");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: mouse.x, y: mouse.y };

  if (finePointer && cursor && cursorRing) {
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      const hud = document.getElementById("hudCoords");
      if (hud) {
        hud.textContent = `x:${String(Math.round(mouse.x)).padStart(3, "0")} y:${String(Math.round(mouse.y)).padStart(3, "0")}`;
      }
    });

    const magnets = document.querySelectorAll("[data-magnet]");
    magnets.forEach((el) => {
      el.addEventListener("pointerenter", () => {
        cursor.classList.add("is-hot");
        cursorRing.classList.add("is-hot");
      });
      el.addEventListener("pointerleave", () => {
        cursor.classList.remove("is-hot");
        cursorRing.classList.remove("is-hot");
        el.style.transform = "";
      });
      el.addEventListener("pointermove", (e) => {
        if (!warpOn) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
      });
    });

    (function ringLoop() {
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;
      cursorRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      requestAnimationFrame(ringLoop);
    })();
  }

  /* ---------- Scroll progress ---------- */
  const scrollProgress = document.getElementById("scrollProgress");
  window.addEventListener(
    "scroll",
    () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? (scrollY / max) * 100 : 0;
      if (scrollProgress) scrollProgress.style.width = `${p}%`;
    },
    { passive: true }
  );

  /* ---------- Text scramble ---------- */
  const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<#>✱✦";

  function scrambleText(el, finalText, duration = 900) {
    if (!el || reduced || !warpOn) {
      if (el) el.textContent = finalText;
      return;
    }
    const start = performance.now();
    const len = finalText.length;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      let out = "";
      for (let i = 0; i < len; i++) {
        if (finalText[i] === " " || finalText[i] === "·") {
          out += finalText[i];
          continue;
        }
        if (t > i / len) out += finalText[i];
        else out += glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  document.querySelectorAll("[data-scramble]").forEach((el, i) => {
    const text = el.getAttribute("data-scramble") || el.textContent;
    setTimeout(() => scrambleText(el, text, 1100 + i * 120), 200 + i * 180);
  });

  /* ---------- Boot line ---------- */
  const bootLine = document.getElementById("bootLine");
  const bootMsgs = [
    "booting neural control plane…",
    "linking aws · gcp providers…",
    "hydrating terraform graph…",
    "calibrating k8s schedulers…",
    "ai architect online ✓",
  ];
  let bootIdx = 0;
  if (bootLine && !reduced) {
    setInterval(() => {
      bootIdx = (bootIdx + 1) % bootMsgs.length;
      bootLine.style.opacity = "0";
      setTimeout(() => {
        bootLine.textContent = bootMsgs[bootIdx];
        bootLine.style.opacity = "1";
      }, 220);
    }, 2600);
    bootLine.style.transition = "opacity 0.22s ease";
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            const scramble = entry.target.querySelector("[data-scramble]");
            if (scramble && !scramble.dataset.done) {
              scramble.dataset.done = "1";
              scrambleText(scramble, scramble.getAttribute("data-scramble"), 800);
            }
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Tilt cards ---------- */
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (!warpOn || reduced) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-2px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  /* ---------- Neural field canvas ---------- */
  const neural = document.getElementById("neuralField");
  const nctx = neural?.getContext("2d");
  const nodes = [];
  let nodeCount = 48;

  function resizeNeural() {
    if (!neural) return;
    neural.width = innerWidth * devicePixelRatio;
    neural.height = innerHeight * devicePixelRatio;
    neural.style.width = `${innerWidth}px`;
    neural.style.height = `${innerHeight}px`;
    nctx?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function initNodes() {
    nodes.length = 0;
    nodeCount = Math.min(70, Math.floor((innerWidth * innerHeight) / 22000));
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
      });
    }
    const hudNodes = document.getElementById("hudNodes");
    if (hudNodes) hudNodes.textContent = `nodes:${nodeCount}`;
  }

  function drawNeural() {
    if (!nctx || !neural) return;
    nctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!warpOn && reduced) return;

    const mx = mouse.x;
    const my = mouse.y;

    for (const n of nodes) {
      if (warpOn && !reduced) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > innerWidth) n.vx *= -1;
        if (n.y < 0 || n.y > innerHeight) n.vy *= -1;
        const dx = mx - n.x;
        const dy = my - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16000) {
          n.vx -= dx * 0.00002;
          n.vy -= dy * 0.00002;
        }
      }

      nctx.beginPath();
      nctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      nctx.fillStyle = "rgba(61, 224, 200, 0.75)";
      nctx.fill();
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          const alpha = (1 - dist / 140) * 0.35;
          nctx.strokeStyle = `rgba(61, 224, 200, ${alpha})`;
          nctx.lineWidth = 1;
          nctx.beginPath();
          nctx.moveTo(a.x, a.y);
          nctx.lineTo(b.x, b.y);
          nctx.stroke();
        }
      }
      const dx = nodes[i].x - mx;
      const dy = nodes[i].y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < 180) {
        nctx.strokeStyle = `rgba(224, 138, 60, ${(1 - dist / 180) * 0.45})`;
        nctx.beginPath();
        nctx.moveTo(nodes[i].x, nodes[i].y);
        nctx.lineTo(mx, my);
        nctx.stroke();
      }
    }

    const hudLatency = document.getElementById("hudLatency");
    if (hudLatency) {
      hudLatency.textContent = `latency:${8 + ((performance.now() / 200) % 9 | 0)}ms`;
    }

    requestAnimationFrame(drawNeural);
  }

  if (neural && nctx) {
    resizeNeural();
    initNodes();
    drawNeural();
    window.addEventListener("resize", () => {
      resizeNeural();
      initNodes();
    });
  }

  /* ---------- Skill orbit (draggable physics) ---------- */
  const orbitCanvas = document.getElementById("orbitCanvas");
  const octx = orbitCanvas?.getContext("2d");
  const skills = [
    { id: "tf", label: "Terraform", body: "Reusable modules, remote state, and drift-resistant multi-account provisioning across AWS and GCP." },
    { id: "k8s", label: "Kubernetes", body: "EKS/GKE platforms with Helm, HPA, GitOps, and progressive delivery that aborts on bad signals." },
    { id: "aws", label: "AWS", body: "EKS, ECS, VPC, IAM, RDS, Lambda, OIDC federation — production landing zones that scale." },
    { id: "gcp", label: "GCP", body: "GKE, Cloud Run, Workload Identity, Cloud Build — Google Cloud platforms with clean IAM." },
    { id: "argo", label: "Argo CD", body: "Git as source of truth. Sync, drift detect, promote environments without SSH snowflakes." },
    { id: "gha", label: "GitHub Actions", body: "OIDC to cloud, matrix builds, security gates — CI that never stores long-lived keys." },
    { id: "helm", label: "Helm", body: "Chart contracts so every microservice deploys the same way — boring in the best sense." },
    { id: "prom", label: "Prometheus", body: "Metrics that feed SLOs, canaries, and AI-assisted anomaly hints before pages explode." },
    { id: "ai", label: "AI Ops", body: "Copilot-ready pipelines, runbook automation, and control-plane UX that feels alive." },
    { id: "vault", label: "Vault / OIDC", body: "Secrets and identity done right — short-lived credentials, policy-bound access." },
  ];

  const particles = [];
  let drag = null;
  let selected = skills[0];
  let orbitW = 900;
  let orbitH = 520;

  function layoutOrbit() {
    if (!orbitCanvas) return;
    const rect = orbitCanvas.getBoundingClientRect();
    orbitW = Math.max(640, Math.floor(rect.width));
    orbitH = Math.max(380, Math.floor(rect.width * 0.55));
    orbitCanvas.width = orbitW * devicePixelRatio;
    orbitCanvas.height = orbitH * devicePixelRatio;
    orbitCanvas.style.height = `${orbitH}px`;
    octx?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    if (!particles.length) {
      skills.forEach((s, i) => {
        const ang = (i / skills.length) * Math.PI * 2;
        particles.push({
          ...s,
          x: orbitW / 2 + Math.cos(ang) * orbitW * 0.28,
          y: orbitH / 2 + Math.sin(ang) * orbitH * 0.28,
          vx: 0,
          vy: 0,
          r: 28 + (s.label.length > 8 ? 6 : 0),
        });
      });
    }
  }

  function updateOrbitDetail() {
    const title = document.getElementById("orbitTitle");
    const body = document.getElementById("orbitBody");
    const tag = document.querySelector(".orbit-detail__tag");
    if (title) title.textContent = selected.label;
    if (body) body.textContent = selected.body;
    if (tag) tag.textContent = `NODE · ${selected.id.toUpperCase()}`;
  }

  function pointerPos(e) {
    const r = orbitCanvas.getBoundingClientRect();
    const x = (("touches" in e ? e.touches[0].clientX : e.clientX) - r.left) * (orbitW / r.width);
    const y = (("touches" in e ? e.touches[0].clientY : e.clientY) - r.top) * (orbitH / r.height);
    return { x, y };
  }

  function hitTest(x, y) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (Math.hypot(p.x - x, p.y - y) < p.r + 6) return p;
    }
    return null;
  }

  if (orbitCanvas && octx) {
    layoutOrbit();
    updateOrbitDetail();
    window.addEventListener("resize", layoutOrbit);

    const onDown = (e) => {
      const { x, y } = pointerPos(e);
      const hit = hitTest(x, y);
      if (hit) {
        drag = hit;
        selected = hit;
        updateOrbitDetail();
        scrambleText(document.getElementById("orbitTitle"), hit.label, 500);
        e.preventDefault();
      }
    };
    const onMove = (e) => {
      if (!drag) return;
      const { x, y } = pointerPos(e);
      drag.x = x;
      drag.y = y;
      drag.vx = 0;
      drag.vy = 0;
      e.preventDefault();
    };
    const onUp = () => {
      drag = null;
    };

    orbitCanvas.addEventListener("mousedown", onDown);
    orbitCanvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    orbitCanvas.addEventListener("touchstart", onDown, { passive: false });
    orbitCanvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    (function orbitLoop() {
      octx.clearRect(0, 0, orbitW, orbitH);

      // soft grid
      octx.strokeStyle = "rgba(61,224,200,0.05)";
      octx.lineWidth = 1;
      for (let x = 0; x < orbitW; x += 40) {
        octx.beginPath();
        octx.moveTo(x, 0);
        octx.lineTo(x, orbitH);
        octx.stroke();
      }
      for (let y = 0; y < orbitH; y += 40) {
        octx.beginPath();
        octx.moveTo(0, y);
        octx.lineTo(orbitW, y);
        octx.stroke();
      }

      const cx = orbitW / 2;
      const cy = orbitH / 2;

      // physics
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p !== drag) {
          const dx = cx - p.x;
          const dy = cy - p.y;
          p.vx += dx * 0.0008;
          p.vy += dy * 0.0008;
          p.vx += Math.sin(performance.now() / 900 + i) * 0.02;
          p.vy += Math.cos(performance.now() / 1100 + i) * 0.02;
          for (let j = 0; j < particles.length; j++) {
            if (i === j) continue;
            const q = particles[j];
            const ddx = p.x - q.x;
            const ddy = p.y - q.y;
            const d = Math.hypot(ddx, ddy) || 1;
            const min = p.r + q.r + 18;
            if (d < min) {
              const f = ((min - d) / d) * 0.05;
              p.vx += ddx * f;
              p.vy += ddy * f;
            }
          }
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.x += p.vx;
          p.y += p.vy;
          p.x = Math.max(p.r, Math.min(orbitW - p.r, p.x));
          p.y = Math.max(p.r, Math.min(orbitH - p.r, p.y));
        }
      }

      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 200) {
            octx.strokeStyle = `rgba(61,224,200,${(1 - d / 200) * 0.35})`;
            octx.beginPath();
            octx.moveTo(a.x, a.y);
            octx.lineTo(b.x, b.y);
            octx.stroke();
          }
        }
      }

      // core
      const pulse = 18 + Math.sin(performance.now() / 400) * 4;
      octx.beginPath();
      octx.arc(cx, cy, pulse, 0, Math.PI * 2);
      octx.fillStyle = "rgba(224,138,60,0.35)";
      octx.fill();
      octx.beginPath();
      octx.arc(cx, cy, 8, 0, Math.PI * 2);
      octx.fillStyle = "#e08a3c";
      octx.fill();

      // nodes
      for (const p of particles) {
        const active = p === selected;
        octx.beginPath();
        octx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        octx.fillStyle = active ? "rgba(61,224,200,0.25)" : "rgba(15,23,34,0.9)";
        octx.fill();
        octx.strokeStyle = active ? "#3de0c8" : "rgba(61,224,200,0.45)";
        octx.lineWidth = active ? 2 : 1;
        octx.stroke();
        octx.fillStyle = active ? "#e7eef6" : "#8fa3b8";
        octx.font = "600 11px JetBrains Mono, monospace";
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillText(p.label, p.x, p.y);
      }

      requestAnimationFrame(orbitLoop);
    })();
  }

  /* ---------- AI Architect console ---------- */
  const consoleLog = document.getElementById("consoleLog");
  const consoleForm = document.getElementById("consoleForm");
  const consoleInput = document.getElementById("consoleInput");
  let thinking = false;

  function addLine(text, cls) {
    if (!consoleLog) return;
    const line = document.createElement("p");
    line.className = `line ${cls}`;
    line.textContent = text;
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function typeLine(text, cls, speed = 12) {
    return new Promise((resolve) => {
      if (!consoleLog) return resolve();
      const line = document.createElement("p");
      line.className = `line ${cls}`;
      consoleLog.appendChild(line);
      let i = 0;
      const tick = () => {
        line.textContent = text.slice(0, i);
        consoleLog.scrollTop = consoleLog.scrollHeight;
        i++;
        if (i <= text.length) setTimeout(tick, reduced ? 0 : speed);
        else resolve();
      };
      tick();
    });
  }

  async function architectReply(prompt) {
    if (thinking) return;
    thinking = true;
    addLine(`› ${prompt}`, "line--user");

    const lower = prompt.toLowerCase();
    const steps = [
      "parsing intent vectors…",
      "scoring aws vs gcp fit…",
      "composing terraform graph…",
      "simulating k8s blast radius…",
    ];

    for (const s of steps) {
      await typeLine(`sys · ${s}`, "line--sys", 8);
      await new Promise((r) => setTimeout(r, reduced ? 40 : 280));
    }

    let blueprint;
    if (lower.includes("gke") || (lower.includes("gcp") && lower.includes("autopilot"))) {
      blueprint = [
        "ai · blueprint locked",
        "  cloud     → GCP",
        "  runtime   → GKE Autopilot + Helm",
        "  identity  → Workload Identity Federation",
        "  iac       → Terraform modules (VPC, GKE, IAM, SQL)",
        "  delivery  → Argo CD GitOps + Cloud Build/Actions",
        "  observe   → Cloud Monitoring + Prometheus/Grafana",
      ];
    } else if (lower.includes("multi") || (lower.includes("aws") && lower.includes("gcp"))) {
      blueprint = [
        "ai · blueprint locked",
        "  cloud     → AWS + GCP (parity via Terraform)",
        "  runtime   → EKS + GKE with shared Helm contracts",
        "  identity  → GitHub OIDC → AWS · WIF → GCP",
        "  delivery  → Argo CD per cluster · matrix CI",
        "  secure    → no static keys · policy-as-code",
      ];
    } else if (lower.includes("canary") || lower.includes("ai-assisted") || lower.includes("rollback")) {
      blueprint = [
        "ai · blueprint locked",
        "  delivery  → Progressive / canary (Argo Rollouts)",
        "  signals   → Prometheus SLOs → auto-abort",
        "  ci        → GitHub Actions + Trivy/Sonar gates",
        "  ai layer  → anomaly hints before human pages",
        "  iac       → Terraform for blast-radius limited envs",
      ];
    } else {
      blueprint = [
        "ai · blueprint locked",
        "  cloud     → AWS (EKS primary)",
        "  iac       → Terraform · S3/Dynamo remote state",
        "  cluster   → EKS · Helm · IRSA · HPA/Karpenter",
        "  delivery  → Argo CD GitOps · OIDC Actions",
        "  observe   → Prometheus · Grafana · CloudWatch",
        "  ai layer  → runbook assist + deploy risk scoring",
      ];
    }

    for (const row of blueprint) {
      await typeLine(row, row.startsWith("ai") ? "line--ai" : "line--out", 7);
    }
    await typeLine("sys · ready for uplink · #contact", "line--sys", 8);
    thinking = false;
  }

  addLine("sys · neural architect v2.4 online", "line--sys");
  addLine("ai · describe a platform. i’ll emit a stack.", "line--ai");

  consoleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = consoleInput.value.trim();
    if (!value) return;
    consoleInput.value = "";
    architectReply(value);
  });

  document.querySelectorAll("[data-prompt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.getAttribute("data-prompt");
      if (prompt) architectReply(prompt);
    });
  });

  /* ---------- Contact mailto ---------- */
  const form = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(`DevOps uplink — ${name}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}\n\n— neural-ops portfolio`);
    window.location.href = `mailto:rizwanmuhammad4444@gmail.com?subject=${subject}&body=${body}`;
    if (formNote) formNote.hidden = false;
  });
})();
