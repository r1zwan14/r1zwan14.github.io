(() => {
  const labels = {
    cadence: ["Rare releases", "Cautious", "Balanced", "Frequent", "Continuous"],
    headroom: ["Spartan", "Lean", "Measured", "Comfortable", "Over-provisioned"],
    pairing: ["Solo ops", "Light sync", "Shared ownership", "Deep", "Full co-creation"],
  };

  const stages = {
    intent: {
      title: "Intent",
      body: "Product, SRE, and platform align on outcomes and carbon budgets before a single pipeline runs. Shared ADRs keep decisions visible across timezones.",
    },
    build: {
      title: "Build",
      body: "Paired automation owns the paved road: reproducible images, signed artifacts, and infrastructure as code reviewed like product code.",
    },
    verify: {
      title: "Verify",
      body: "Humans define risk appetite; machines enforce it — policy checks, contract tests, and progressive quality gates that fail loudly and early.",
    },
    ship: {
      title: "Ship",
      body: "Canaries and feature flags land change gently. Deploy windows prefer cleaner grid intensity when the workload can wait.",
    },
    learn: {
      title: "Learn",
      body: "Post-ship reviews are collaborative blameless forums. Telemetry feeds the next platform investment — reliability and efficiency together.",
    },
  };

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const body = document.body;
  const ecoToggle = document.getElementById("ecoToggle");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  body.classList.add("eco-mode");

  ecoToggle?.addEventListener("click", () => {
    const on = body.classList.toggle("eco-mode");
    ecoToggle.setAttribute("aria-pressed", String(on));
    ecoToggle.querySelector(".theme-eco__label").textContent = on ? "Eco mode" : "Full motion";
  });

  if (prefersReduced) {
    body.classList.add("eco-mode");
    ecoToggle?.setAttribute("aria-pressed", "true");
  }

  const cadence = document.getElementById("cadence");
  const headroom = document.getElementById("headroom");
  const pairing = document.getElementById("pairing");
  const meterProgress = document.getElementById("meterProgress");
  const ecoScore = document.getElementById("ecoScore");
  const energyStat = document.getElementById("energyStat");
  const collabStat = document.getElementById("collabStat");
  const deliveryStat = document.getElementById("deliveryStat");
  const labInsight = document.getElementById("labInsight");

  const circumference = 2 * Math.PI * 52;

  function syncLabel(input) {
    const el = document.querySelector(`[data-for="${input.id}"]`);
    if (el && labels[input.id]) {
      el.textContent = labels[input.id][Number(input.value) - 1];
    }
  }

  function windowFactor() {
    const selected = document.querySelector('input[name="window"]:checked');
    if (!selected) return 1;
    if (selected.value === "peak") return 1.18;
    if (selected.value === "green") return 0.78;
    return 1;
  }

  function recompute() {
    const c = Number(cadence.value);
    const h = Number(headroom.value);
    const p = Number(pairing.value);
    const w = windowFactor();

    // Higher cadence slightly raises energy; headroom dominates waste; green windows help.
    let energy = (0.35 + c * 0.08 + h * 0.14) * w;
    energy = Math.max(0.35, Math.min(1.45, energy));

    // Pairing improves safety of frequent delivery without needing over-provisioning.
    const collabBoost = p * 8;
    const efficiency = Math.round(
      Math.max(28, Math.min(98, 108 - energy * 42 + collabBoost * 0.35 - (h - 2) * 4))
    );

    const offset = circumference - (efficiency / 100) * circumference;
    meterProgress.style.strokeDasharray = String(circumference);
    meterProgress.style.strokeDashoffset = String(offset);
    meterProgress.style.stroke = efficiency >= 75 ? "#3a7a55" : efficiency >= 55 ? "#5a8a96" : "#8a6b3d";

    ecoScore.textContent = String(efficiency);
    energyStat.textContent = `${energy.toFixed(2)}× baseline`;

    collabStat.textContent =
      p >= 4 ? "Strong pairing" : p >= 3 ? "Shared ownership" : p >= 2 ? "Light sync" : "Mostly siloed";

    deliveryStat.textContent =
      c >= 4 && p >= 3
        ? "Continuous, co-owned"
        : c >= 3
          ? "Progressive, reviewed"
          : "Deliberate releases";

    const insights = [];
    if (h >= 4) insights.push("Dialing back headroom usually recovers more carbon than slowing releases.");
    if (w > 1) insights.push("Peak-grid deploys inflate the energy bill for the same change set.");
    if (w < 1) insights.push("Greenest-hour windows cut relative energy without touching reliability.");
    if (p >= 4 && c >= 4) insights.push("Deep pairing makes high cadence safe — automation plus humans in the loop.");
    if (p <= 2 && c >= 4) insights.push("Fast shipping without pairing raises coordination risk; invest in co-ownership.");
    if (!insights.length) {
      insights.push("Lean headroom plus shoulder-hour deploys keeps waste low while pairing keeps change safe.");
    }
    labInsight.textContent = insights[0];
  }

  [cadence, headroom, pairing].forEach((input) => {
    if (!input) return;
    syncLabel(input);
    input.addEventListener("input", () => {
      syncLabel(input);
      recompute();
    });
  });

  document.querySelectorAll('input[name="window"]').forEach((radio) => {
    radio.addEventListener("change", recompute);
  });

  recompute();

  // Pipeline tabs
  const stageButtons = document.querySelectorAll("[data-stage]");
  const stageHeading = document.getElementById("stageHeading");
  const stageBody = document.getElementById("stageBody");
  const stagePanel = document.getElementById("stagePanel");

  stageButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-stage");
      const data = stages[key];
      if (!data) return;

      stageButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });

      stagePanel.classList.remove("is-swap");
      void stagePanel.offsetWidth;
      stagePanel.classList.add("is-swap");
      stageHeading.textContent = data.title;
      stageBody.textContent = data.body;
    });
  });

  // Reveal practice items
  const items = document.querySelectorAll(".practice__list li");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 90}ms`;
      io.observe(item);
    });
  } else {
    items.forEach((item) => item.classList.add("is-in"));
  }

  // Collaboration form → mailto (static GitHub Pages friendly)
  const form = document.getElementById("collabForm");
  const formNote = document.getElementById("formNote");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    const subject = encodeURIComponent(`DevOps collaboration — ${name}`);
    const bodyText = encodeURIComponent(
      `From: ${name} <${email}>\n\n${message}\n\n— sent from r1zwan14.github.io`
    );
    window.location.href = `mailto:rizwanmuhammad4444@gmail.com?subject=${subject}&body=${bodyText}`;

    if (formNote) {
      formNote.hidden = false;
    }
  });
})();
