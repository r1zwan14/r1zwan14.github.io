(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const stages = {
    assess: {
      title: "Assess",
      body: "Review current AWS/GCP estate, Terraform posture, cluster ops, and CI/CD bottlenecks. Produce a prioritized roadmap with risk, cost, and delivery impact.",
    },
    design: {
      title: "Design",
      body: "Define target architecture: landing zones, EKS/GKE topology, module boundaries, GitOps promotion model, and observability defaults.",
    },
    build: {
      title: "Build",
      body: "Implement Terraform modules, cluster baselines, Helm charts, and pipelines (GitHub Actions / GitLab CI) with OIDC to cloud providers.",
    },
    harden: {
      title: "Harden",
      body: "Lock down IAM, network policies, image scanning, secrets (Vault/cloud KMS), and policy-as-code. Validate rollback and incident paths.",
    },
    handoff: {
      title: "Handoff",
      body: "Document runbooks, train the platform owners, and leave a paved road your teams can extend without a consultant in every PR.",
    },
  };

  const paths = {
    "aws|eks|gitops": {
      title: "AWS · EKS · GitOps",
      items: [
        ["IaC", "Terraform modules · S3/DynamoDB remote state · IAM least privilege"],
        ["Cluster", "EKS · Helm · IRSA · HPA + Karpenter-style node scaling"],
        ["Delivery", "Argo CD sync · Git as source of truth · PR promotion"],
        ["Observe", "Prometheus · Grafana · CloudWatch correlation"],
      ],
      note: "Strong default for product teams that want auditable Kubernetes delivery on AWS.",
    },
    "aws|eks|cicd": {
      title: "AWS · EKS · CI-driven",
      items: [
        ["IaC", "Terraform · environment workspaces · plan-on-PR"],
        ["Cluster", "EKS · ECR scan-on-push · ALB ingress"],
        ["Delivery", "GitHub Actions OIDC · build → push → deploy"],
        ["Secure", "Trivy gates · no long-lived AWS keys"],
      ],
      note: "Fits teams standardizing on GitHub Actions without a full GitOps control plane yet.",
    },
    "aws|eks|progressive": {
      title: "AWS · EKS · Progressive delivery",
      items: [
        ["IaC", "Terraform baselines for EKS + networking"],
        ["Cluster", "EKS · Helm · canary/blue-green targets"],
        ["Delivery", "Argo Rollouts or flag-driven canaries · automated rollback"],
        ["Observe", "SLOs in Grafana · fast MTTR loops"],
      ],
      note: "Best when release risk is high and you need traffic shifting with hard abort criteria.",
    },
    "aws|serverless|gitops": {
      title: "AWS · Containers + serverless · GitOps-ready",
      items: [
        ["Compute", "ECS Fargate / Lambda alongside container services"],
        ["IaC", "Terraform for VPC, IAM, queues, and data"],
        ["Delivery", "Git-managed config · Actions for build artifacts"],
        ["Ops", "CloudWatch + structured logs · alarm routing"],
      ],
      note: "Use when not every workload needs Kubernetes — keep IaC and delivery consistent anyway.",
    },
    "aws|serverless|cicd": {
      title: "AWS · Serverless-leaning · CI/CD",
      items: [
        ["Compute", "Lambda · API Gateway · ECS where needed"],
        ["IaC", "Terraform modules per domain"],
        ["Delivery", "GitHub Actions OIDC · environment protection rules"],
        ["Cost", "Right-size + idle cleanup as part of the paved road"],
      ],
      note: "Lean cloud footprint with the same IaC discipline as a full platform team.",
    },
    "aws|serverless|progressive": {
      title: "AWS · Mixed compute · Progressive",
      items: [
        ["Compute", "Lambda aliases / ECS circuit breakers"],
        ["IaC", "Terraform · staged accounts"],
        ["Delivery", "Weighted traffic · automated rollback hooks"],
        ["Secure", "OIDC · secrets in SSM/Secrets Manager"],
      ],
      note: "Progressive delivery without forcing every service onto Kubernetes day one.",
    },
    "aws|mixed|gitops": {
      title: "AWS · Mixed estate · GitOps where it fits",
      items: [
        ["Platform", "EKS for core services · managed services elsewhere"],
        ["IaC", "Terraform monorepo or module registry"],
        ["Delivery", "Argo CD for cluster apps · Actions for cloud resources"],
        ["Gov", "Account vending · SCPs / guardrails"],
      ],
      note: "Typical enterprise pattern: Kubernetes for product, managed AWS for the rest.",
    },
    "aws|mixed|cicd": {
      title: "AWS · Mixed estate · CI/CD",
      items: [
        ["Platform", "EKS + ECS/Lambda"],
        ["IaC", "Terraform · tagged cost allocation"],
        ["Delivery", "Unified pipeline templates per runtime"],
        ["Observe", "Single pane: metrics, logs, traces"],
      ],
      note: "One delivery vocabulary across runtimes reduces platform cognitive load.",
    },
    "aws|mixed|progressive": {
      title: "AWS · Mixed estate · Progressive",
      items: [
        ["Risk", "Canaries on critical paths first"],
        ["IaC", "Terraform · blast-radius limited modules"],
        ["Delivery", "Traffic shifting + feature flags"],
        ["Handoff", "Runbooks your on-call can actually use"],
      ],
      note: "Prioritize progressive controls on revenue-critical services first.",
    },
    "gcp|eks|gitops": {
      title: "GCP · GKE · GitOps",
      items: [
        ["IaC", "Terraform for VPC, GKE, IAM, Cloud SQL"],
        ["Cluster", "GKE Autopilot or Standard · Workload Identity · Helm"],
        ["Delivery", "Argo CD · environment promotion via Git"],
        ["Observe", "Cloud Monitoring + Prometheus/Grafana"],
      ],
      note: "GKE + GitOps is the GCP equivalent of the EKS paved road.",
    },
    "gcp|eks|cicd": {
      title: "GCP · GKE · CI-driven",
      items: [
        ["IaC", "Terraform · WIF for CI federation"],
        ["Cluster", "GKE · Artifact Registry"],
        ["Delivery", "Cloud Build or GitHub Actions → GKE"],
        ["Secure", "Binary Authorization optional gate"],
      ],
      note: "Federation (WIF) replaces service-account key files in CI.",
    },
    "gcp|eks|progressive": {
      title: "GCP · GKE · Progressive",
      items: [
        ["Cluster", "GKE · Gateway/Ingress · canary backends"],
        ["Delivery", "Rollouts with health-based abort"],
        ["IaC", "Terraform baselines"],
        ["Observe", "SLOs tied to deploy automation"],
      ],
      note: "Pair canaries with clear error-budget policy so rollbacks are automatic, not political.",
    },
    "gcp|serverless|gitops": {
      title: "GCP · Cloud Run lean · Git-managed",
      items: [
        ["Compute", "Cloud Run · Eventarc where async"],
        ["IaC", "Terraform for project foundation"],
        ["Delivery", "Git config + Cloud Build triggers"],
        ["Data", "Cloud SQL / Memorystore as needed"],
      ],
      note: "Fast path for services that do not need a full Kubernetes control plane.",
    },
    "gcp|serverless|cicd": {
      title: "GCP · Cloud Run · CI/CD",
      items: [
        ["Compute", "Cloud Run revisions"],
        ["Delivery", "Cloud Build / Actions · WIF"],
        ["IaC", "Terraform · least-privilege IAM"],
        ["Ops", "Log-based metrics · alert policies"],
      ],
      note: "Revision traffic splitting gives you progressive delivery with minimal ops surface.",
    },
    "gcp|serverless|progressive": {
      title: "GCP · Cloud Run · Progressive",
      items: [
        ["Delivery", "Traffic split across revisions"],
        ["IaC", "Terraform for supporting services"],
        ["Secure", "Secret Manager · WIF"],
        ["Observe", "Request latency / error burn alerts"],
      ],
      note: "Ideal for API workloads where revision rollback is measured in seconds.",
    },
    "gcp|mixed|gitops": {
      title: "GCP · Mixed · GitOps core",
      items: [
        ["Platform", "GKE for stateful product · Cloud Run for edges"],
        ["IaC", "Shared Terraform modules"],
        ["Delivery", "Argo CD on GKE · Actions for serverless"],
        ["Gov", "Folder/project hierarchy + IAM"],
      ],
      note: "Keep one IaC language even when runtimes differ.",
    },
    "gcp|mixed|cicd": {
      title: "GCP · Mixed · CI/CD",
      items: [
        ["Runtime", "GKE + Cloud Run"],
        ["Delivery", "Templated pipelines per runtime"],
        ["IaC", "Terraform · remote state"],
        ["Cost", "Committed use + rightsizing reviews"],
      ],
      note: "FinOps checkpoints belong in the same engagement as platform build-out.",
    },
    "gcp|mixed|progressive": {
      title: "GCP · Mixed · Progressive",
      items: [
        ["Risk", "Canary on GKE; traffic split on Cloud Run"],
        ["IaC", "Terraform · staged projects"],
        ["Secure", "Policy constraints · WIF"],
        ["Handoff", "Platform playbooks for both runtimes"],
      ],
      note: "Document one incident language across GKE and Cloud Run.",
    },
    "multi|eks|gitops": {
      title: "Multi-cloud · K8s · GitOps",
      items: [
        ["Control", "Terraform across AWS + GCP with shared module patterns"],
        ["Clusters", "EKS + GKE · Helm chart parity"],
        ["Delivery", "Argo CD per cloud · same Git promotion model"],
        ["Identity", "OIDC/WIF — no static keys"],
      ],
      note: "Parity of packaging and GitOps beats chasing identical managed services.",
    },
    "multi|eks|cicd": {
      title: "Multi-cloud · K8s · CI/CD",
      items: [
        ["IaC", "Terraform · provider-aware modules"],
        ["Clusters", "EKS / GKE baselines"],
        ["Delivery", "Matrix pipelines deploying to each cloud"],
        ["Observe", "Unified dashboards where possible"],
      ],
      note: "Start with identical Helm contracts so CI stays boring.",
    },
    "multi|eks|progressive": {
      title: "Multi-cloud · K8s · Progressive",
      items: [
        ["Delivery", "Canary independently per cloud region"],
        ["IaC", "Terraform · blast-radius limits"],
        ["Failover", "Documented traffic / DNS runbooks"],
        ["Secure", "Federated CI identity everywhere"],
      ],
      note: "Progressive delivery per cloud reduces correlated failure during dual-region ships.",
    },
    "multi|serverless|gitops": {
      title: "Multi-cloud · Serverless-leaning",
      items: [
        ["Compute", "Cloud Run + Lambda/ECS as needed"],
        ["IaC", "Terraform as the contract between clouds"],
        ["Delivery", "Git-managed config · cloud-native builders"],
        ["Data", "Keep data plane choices explicit per region"],
      ],
      note: "Avoid fake multi-cloud for stateful data — be deliberate.",
    },
    "multi|serverless|cicd": {
      title: "Multi-cloud · CI-first",
      items: [
        ["Delivery", "One Actions/GitLab orthodoxy · many targets"],
        ["IaC", "Terraform · tagged resources"],
        ["Secure", "OIDC to AWS · WIF to GCP"],
        ["Cost", "Per-cloud budgets in the same review cycle"],
      ],
      note: "Identity federation is the first multi-cloud win — before exotic networking.",
    },
    "multi|serverless|progressive": {
      title: "Multi-cloud · Progressive",
      items: [
        ["Risk", "Independent canaries per provider"],
        ["IaC", "Terraform · staged apply"],
        ["Delivery", "Traffic controls native to each runtime"],
        ["Ops", "Shared severity model · local runbooks"],
      ],
      note: "Do not couple release trains across clouds unless the product requires it.",
    },
    "multi|mixed|gitops": {
      title: "Multi-cloud · Mixed · GitOps core",
      items: [
        ["Platform", "K8s where it pays · managed services elsewhere"],
        ["IaC", "Terraform module registry"],
        ["Delivery", "Argo CD + Actions hybrid"],
        ["Gov", "Consistent tagging · IAM patterns"],
      ],
      note: "Most realistic multi-cloud consulting shape for growing product orgs.",
    },
    "multi|mixed|cicd": {
      title: "Multi-cloud · Mixed · CI/CD",
      items: [
        ["Delivery", "Pipeline templates · OIDC/WIF"],
        ["IaC", "Terraform · plan artifacts in PRs"],
        ["Runtime", "EKS/GKE + serverless edges"],
        ["Observe", "Cross-cloud alert routing"],
      ],
      note: "Invest in pipeline templates before building a portal.",
    },
    "multi|mixed|progressive": {
      title: "Multi-cloud · Mixed · Progressive",
      items: [
        ["Delivery", "Canary + flags on critical paths"],
        ["IaC", "Terraform · controlled blast radius"],
        ["Secure", "Policy-as-code · secret hygiene"],
        ["Handoff", "Platform team playbooks"],
      ],
      note: "End state: your team owns the paved road; I step back to advisory.",
    },
  };

  function selected(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function renderPath() {
    const key = `${selected("cloud")}|${selected("runtime")}|${selected("delivery")}`;
    const path = paths[key] || paths["aws|eks|gitops"];
    const title = document.getElementById("pathTitle");
    const list = document.getElementById("pathList");
    const note = document.getElementById("pathNote");
    const readout = document.querySelector(".lab__readout");

    title.textContent = path.title;
    list.innerHTML = path.items
      .map(([label, text]) => `<li><strong>${label}:</strong> ${text}</li>`)
      .join("");
    note.textContent = path.note;

    readout.classList.remove("is-swap");
    void readout.offsetWidth;
    readout.style.animation = "none";
    void readout.offsetWidth;
    readout.style.animation = "";
  }

  document.querySelectorAll('input[name="cloud"], input[name="runtime"], input[name="delivery"]').forEach((el) => {
    el.addEventListener("change", renderPath);
  });
  renderPath();

  const stageButtons = document.querySelectorAll("[data-stage]");
  const stageHeading = document.getElementById("stageHeading");
  const stageBody = document.getElementById("stageBody");
  const stagePanel = document.getElementById("stagePanel");

  stageButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const data = stages[btn.getAttribute("data-stage")];
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

  const items = document.querySelectorAll(".services__list li");
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
      { threshold: 0.2 }
    );
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 80}ms`;
      io.observe(item);
    });
  } else {
    items.forEach((item) => item.classList.add("is-in"));
  }

  const form = document.getElementById("contactForm");
  const formNote = document.getElementById("formNote");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(`DevOps consulting — ${name}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}\n\n— r1zwan14.github.io`);
    window.location.href = `mailto:rizwanmuhammad4444@gmail.com?subject=${subject}&body=${body}`;
    if (formNote) formNote.hidden = false;
  });
})();
