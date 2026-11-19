const profile = {
  strong: [
    "sql", "sas", "ifrs 9", "ecl", "expected credit loss",
    "credit risk", "portfolio analysis", "portfolio analytics",
    "risk reporting", "regulatory reporting", "management reporting",
    "data quality", "reconciliation", "oracle", "db2", "power query",
    "banking", "provisioning", "npe", "forbearance", "stakeholder",
    "business analysis", "data controls"
  ],
  supporting: [
    "python", "power bi", "data analytics", "dashboard",
    "data requirements", "process improvement", "testing",
    "rwa", "pd", "rating", "stage"
  ]
};

const $ = id => document.getElementById(id);

let jobs = [];
let sourceStatuses = [];

let seen = new Set(JSON.parse(localStorage.getItem("bjt_seen") || "[]"));
let saved = new Set(JSON.parse(localStorage.getItem("bjt_saved") || "[]"));
let firstSeen = JSON.parse(localStorage.getItem("bjt_first_seen") || "{}");

function scoreJob(job) {
  const skills = Array.isArray(job.skills) ? job.skills.join(" ") : "";
  const text = `${job.title || ""} ${job.description || ""} ${skills}`.toLowerCase();
  const max = profile.strong.length * 5 + profile.supporting.length * 2;
  let earned = 0;
  const matched = [];

  for (const term of profile.strong) {
    if (text.includes(term)) {
      earned += 5;
      matched.push(term);
    }
  }

  for (const term of profile.supporting) {
    if (text.includes(term)) {
      earned += 2;
      matched.push(term);
    }
  }

  let penalty = 0;
  if (/credit risk model|model development|quantitative model validation|advanced python|machine learning engineer/.test(text)) penalty += 15;
  if (/dutch.{0,25}(required|mandatory)|native dutch|fluent dutch/.test(text)) penalty += 10;

  return {
    score: Math.max(0, Math.min(99, Math.round(earned / max * 100) - penalty)),
    matched: matched.slice(0, 7)
  };
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T23:59:59` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function jobState(job) {
  const deadline = dateValue(job.deadline);
  if (deadline && deadline < new Date()) return "expired";
  if (deadline && (deadline - new Date()) / 86400000 <= 7) return "soon";
  return "active";
}

function isNew(job) {
  return !firstSeen[job.id];
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function persist() {
  localStorage.setItem("bjt_seen", JSON.stringify([...seen]));
  localStorage.setItem("bjt_saved", JSON.stringify([...saved]));
  localStorage.setItem("bjt_first_seen", JSON.stringify(firstSeen));
}

function renderSources() {
  const labels = {
    ok: "Podaci uspješno dohvaćeni",
    no_structured_jobs_found: "Nema strukturiranih oglasa",
    fetch_error: "Dohvat nije uspio",
    api_error: "Greška API izvora",
    not_found_in_public_feed: "Nije pronađen u javnom feedu"
  };

  const container = $("sourceStatus");
  if (!container) return;

  if (!sourceStatuses.length) {
    container.innerHTML = "<p>Nema podataka o izvorima u jobs.json.</p>";
    return;
  }

  container.innerHTML = sourceStatuses.map(source => {
    const status = labels[source.status] || source.status || "Nepoznat status";
    const count = Number(source.count || 0);
    const details = source.detail ? `<small>${esc(source.detail)}</small>` : "";
    const content = `
      <span class="source-name">${esc(source.bank)}</span>
      <span class="source-state ${source.status === "ok" ? "ok" : "warn"}">${esc(status)}</span>
      <small>${count} oglasa</small>
      ${details}
    `;

    if (source.source && /^https:\/\//i.test(source.source)) {
      return `<a class="source-item" href="${esc(source.source)}" target="_blank" rel="noopener">${content}</a>`;
    }
    return `<div class="source-item">${content}</div>`;
  }).join("");
}

function render() {
  const scored = jobs.map(job => ({ ...job, ...scoreJob(job) }));

  $("totalCount").textContent = scored.length;
  $("newCount").textContent = scored.filter(isNew).length;
  $("strongCount").textContent = scored.filter(job => job.score >= 80 && jobState(job) !== "expired").length;
  $("expiringCount").textContent = scored.filter(job => jobState(job) === "soon").length;
  $("expiredCount").textContent = scored.filter(job => jobState(job) === "expired").length;

  let list = scored.filter(job => {
    const filter = $("newFilter").value;
    const bank = $("bankFilter").value;
    const minimum = Number($("matchFilter").value);

    if (bank !== "all" && job.bank !== bank) return false;
    if (job.score < minimum) return false;
    if (filter === "new" && !isNew(job)) return false;
    if (filter === "unseen" && seen.has(job.id)) return false;
    if (filter === "saved" && !saved.has(job.id)) return false;
    if (filter === "active" && !["active", "soon"].includes(jobState(job))) return false;
    if (filter === "expired" && jobState(job) !== "expired") return false;
    return true;
  });

  const sort = $("sortBy").value;
  list.sort((a, b) => {
    if (sort === "match") return b.score - a.score;
    if (sort === "deadline") {
      return (dateValue(a.deadline) || new Date("2999-01-01")) -
             (dateValue(b.deadline) || new Date("2999-01-01"));
    }
    return new Date(b.published || 0) - new Date(a.published || 0);
  });

  $("resultLabel").textContent = `${list.length} rezultata`;

  $("jobs").innerHTML = list.length ? list.map(job => {
    const status = jobState(job);
    const deadline = dateValue(job.deadline);
    const days = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null;
    let deadlineText = "Rok nije objavljen";
    if (status === "expired") deadlineText = "Istekao rok";
    else if (status === "soon") deadlineText = `Rok za ${days} dana`;
    else if (job.deadline) deadlineText = `Rok: ${esc(job.deadline)}`;

    return `
      <article class="job">
        <div class="job-top">
          <div>
            <div class="bank">${esc((job.bank || "").toUpperCase())} ${isNew(job) ? '<span class="new-pill">● NEW</span>' : ""}</div>
            <h3>${esc(job.title || "Pozicija bez naziva")}</h3>
            <div class="meta">
              <span>⌖ ${esc(job.location || "Netherlands")}</span>
              <span>▣ ${esc(job.level || "Professional")}</span>
              <span>◷ Objavljen: ${esc(job.published || "Nepoznato")}</span>
            </div>
          </div>
          <div class="match">${job.score}%<small>MATCH</small></div>
        </div>
        <div class="tags">${job.matched.map(term => `<span class="tag">${esc(term)}</span>`).join("")}</div>
        <div class="job-foot">
          <div class="deadline ${status}">${deadlineText}</div>
          <div class="job-actions">
            <button data-action="seen" data-id="${esc(job.id)}">${seen.has(job.id) ? "Pregledano" : "Označi viđeno"}</button>
            <button data-action="save" data-id="${esc(job.id)}">${saved.has(job.id) ? "★" : "☆"}</button>
            <a href="${esc(job.url)}" target="_blank" rel="noopener">Otvori ↗</a>
          </div>
        </div>
      </article>
    `;
  }).join("") : `
    <div class="empty">
      <strong>Trenutačno nema oglasa za odabrane filtre.</strong>
      <p>Promijeni filtre ili pričekaj sljedeće automatsko ažuriranje.</p>
    </div>
  `;
}

["newFilter", "bankFilter", "matchFilter", "sortBy"].forEach(id => {
  $(id).addEventListener("change", render);
});

$("jobs").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  if (button.dataset.action === "seen") {
    seen.add(id);
    firstSeen[id] = firstSeen[id] || new Date().toISOString();
  } else if (button.dataset.action === "save") {
    saved.has(id) ? saved.delete(id) : saved.add(id);
  }

  persist();
  render();
});

async function loadFeed() {
  $("lastSync").textContent = "Učitavanje…";

  try {
    const response = await fetch(`./jobs.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    jobs = Array.isArray(data.jobs) ? data.jobs : [];
    sourceStatuses = Array.isArray(data.sources) ? data.sources : [];

    if (data.updatedAt) {
      const date = new Date(data.updatedAt);
      $("lastSync").textContent = "Ažurirano " + date.toLocaleString("hr-HR", {
        dateStyle: "short", timeStyle: "short"
      });
    } else {
      $("lastSync").textContent = "Čeka se prvo ažuriranje";
    }

    renderSources();
    render();
  } catch (error) {
    $("lastSync").textContent = "Feed nije dostupan";
    $("sourceStatus").innerHTML = `<p>Ne mogu učitati jobs.json: ${esc(error.message)}</p>`;
    $("jobs").innerHTML = '<div class="empty">Ne mogu učitati popis oglasa. Provjeri GitHub Pages objavu.</div>';
    console.error("Bank Job Tracker feed error:", error);
  }
}

$("refreshBtn").addEventListener("click", loadFeed);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => console.error(error));
  });
}

let deferredPrompt;
$("installBtn").hidden = true;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  $("installBtn").hidden = false;
});

$("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("installBtn").hidden = true;
});

loadFeed();
