import creatures from "./data.js";

const listEl = document.getElementById("creature-list");
const toast = document.getElementById("toast");
const filterToggle = document.getElementById("filter-toggle");
const filterPanel = document.getElementById("filter-panel");
const filterTagsEl = document.getElementById("filter-tags");
const filterClear = document.getElementById("filter-clear");

let toastTimeout;
const selectedFilters = new Set();

const VISIBLE_STATS = [
  "Dna Risk",
  "Health",
  "Regeneration",
  "Speed",
  "Swimming Speed",
  "Appetite",
  "FoodStorage"
];

function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function parseNumeric(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const match = value.toString().match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

const TAG_RULES = [
  { id: "fast", label: "Fast", check: (s) => parseNumeric(s.Speed) >= 10 },
  { id: "tank", label: "Tank", check: (s) => parseNumeric(s.Regeneration) >= 8 },
  { id: "high-hp", label: "High HP", check: (s) => parseNumeric(s.Health) >= 45 },
  { id: "high-risk", label: "High Risk", check: (s) => parseNumeric(s["Dna Risk"]) >= 40 },
  { id: "low-risk", label: "Low Risk", check: (s) => { const r = parseNumeric(s["Dna Risk"]); return r >= 0 && r <= 10; } },
  { id: "low-appetite", label: "Low Appetite", check: (s) => { const a = parseNumeric(s.Appetite); return a >= 0.5 && a <= 1; } },
  { id: "low-food", label: "Low Food", check: (s) => { const f = parseNumeric(s.FoodStorage); return f >= 4 && f <= 12; } },
  { id: "high-food", label: "High Food", check: (s) => parseNumeric(s.FoodStorage) >= 32 },
  { id: "high-appetite", label: "High Appetite", check: (s) => parseNumeric(s.Appetite) >= 3 },
  { id: "fast-swimmer", label: "Fast Swimmer", check: (s) => parseNumeric(s["Swimming Speed"]) >= 10 },
  { id: "slow", label: "Slow", check: (s) => { const sp = parseNumeric(s.Speed); return sp >= 1 && sp <= 5; } }
];

function getCreatureTags(stats) {
  return TAG_RULES.filter((rule) => rule.check(stats)).map((rule) => rule.id);
}

const creaturesWithTags = creatures.map((c) => ({
  ...c,
  tags: getCreatureTags(c.stats)
}));

function renderTags(tagIds) {
  if (!tagIds.length) return "";
  const tagsHtml = tagIds
    .map((id) => {
      const rule = TAG_RULES.find((r) => r.id === id);
      return `<li class="tag">${escapeHtml(rule.label)}</li>`;
    })
    .join("");
  return `<ul class="tags-list">${tagsHtml}</ul>`;
}

function renderStats(stats) {
  return Object.entries(stats)
    .filter(([label]) => VISIBLE_STATS.includes(label))
    .map(([label, value]) => `
      <li class="stat-row">
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-value">${escapeHtml(String(value))}</span>
      </li>
    `)
    .join("");
}

function copyCode(code) {
  return async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const temp = document.createElement("textarea");
        temp.value = code;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        temp.setSelectionRange(0, code.length);
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      showToast("Copied!");
    } catch {
      showToast("Copy failed");
    }
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 1500);
}

function renderFilterOptions() {
  const activeTagIds = new Set();
  creaturesWithTags.forEach((c) => c.tags.forEach((t) => activeTagIds.add(t)));

  filterTagsEl.innerHTML = "";
  TAG_RULES.forEach((rule) => {
    if (!activeTagIds.has(rule.id)) return;

    const label = document.createElement("label");
    label.className = `filter-tag${selectedFilters.has(rule.id) ? " active" : ""}`;
    label.dataset.tag = rule.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = rule.id;
    checkbox.checked = selectedFilters.has(rule.id);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedFilters.add(rule.id);
      } else {
        selectedFilters.delete(rule.id);
      }
      renderList();
      renderFilterOptions();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(rule.label));
    filterTagsEl.appendChild(label);
  });
}

function renderList() {
  listEl.innerHTML = "";

  const filtered = creaturesWithTags.filter((c) => {
    if (selectedFilters.size === 0) return true;
    return Array.from(selectedFilters).every((id) => c.tags.includes(id));
  });

  filtered.forEach((c, i) => {
    const li = document.createElement("li");
    li.className = "creature-card";
    li.style.animationDelay = `${i * 0.06}s`;
    li.style.animationDelay = `${i * 0.06}s`;
    li.innerHTML = `
      <div class="card-header">
        <div class="identity">
          <h2>${escapeHtml(c.name)}</h2>
          <span class="build">${escapeHtml(c.build)}</span>
          ${c.creator ? `<span class="creator">${escapeHtml(c.creator)}</span>` : ""}
        </div>
        <span class="dna-badge">${c.dna} DNA</span>
      </div>

      ${renderTags(c.tags)}

      <label class="code-label" for="code-${c.id}">Creature code</label>
      <div class="code-section">
        <input id="code-${c.id}" class="code-input" type="text" readonly value="${escapeHtml(c.code)}">
        <button class="copy-btn" type="button">Copy</button>
      </div>

      <div class="stats-section">
        <h3>Stats</h3>
        <ul class="stats-list">
          ${renderStats(c.stats)}
        </ul>
      </div>
    `;

    const copyBtn = li.querySelector(".copy-btn");
    copyBtn.addEventListener("click", copyCode(c.code));

    listEl.appendChild(li);
  });
}

filterToggle.addEventListener("click", () => {
  const isOpen = filterPanel.classList.contains("open");
  if (isOpen) {
    filterPanel.classList.remove("open");
    filterToggle.setAttribute("aria-expanded", "false");
  } else {
    filterPanel.classList.add("open");
    filterToggle.setAttribute("aria-expanded", "true");
  }
});

filterClear.addEventListener("click", () => {
  selectedFilters.clear();
  renderList();
  renderFilterOptions();
});

renderFilterOptions();
renderList();

// --- Request Modal ---
const requestBtn = document.getElementById("request-btn");
const requestModal = document.getElementById("request-modal");
const modalClose = document.getElementById("modal-close");
const modalFormView = document.getElementById("modal-form-view");
const modalPreviewView = document.getElementById("modal-preview-view");
const reqPreviewBtn = document.getElementById("req-preview-btn");
const reqBackBtn = document.getElementById("req-back-btn");
const reqSendBtn = document.getElementById("req-send-btn");
const reqPreviewText = document.getElementById("req-preview-text");

function openModal() {
  requestModal.classList.add("open");
  requestModal.setAttribute("aria-hidden", "false");
  modalFormView.classList.remove("hidden");
  modalPreviewView.classList.add("hidden");
}

function closeModal() {
  requestModal.classList.remove("open");
  requestModal.setAttribute("aria-hidden", "true");
}

function buildPreview() {
  const get = (id) => document.getElementById(id).value.trim();
  const code = get("req-code");
  const name = get("req-name");
  const dna = get("req-dna");
  const risk = get("req-risk");
  const health = get("req-health");
  const regen = get("req-regen");
  const speed = get("req-speed");
  const swim = get("req-swim");
  const appetite = get("req-appetite");
  const food = get("req-food");

  if (!code || !name) {
    showToast("Code & Roblox name required");
    return null;
  }

  return `Creature Code Request
━━━━━━━━━━━━━━━━━━━━
From:         ${name}

Code:
${code}

Stats
━━━━━━━━━━━━━━━━━━━━
DNA Cost:     ${dna || "—"}
DNA Risk:     ${risk || "—"}
Health:       ${health || "—"}
Regeneration: ${regen || "—"}
Speed:        ${speed || "—"}
Swim Speed:   ${swim || "—"}
Appetite:     ${appetite ? appetite + " food/min" : "—"}
Food Storage: ${food || "—"}`;
}

requestBtn.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
requestModal.addEventListener("click", (e) => {
  if (e.target === requestModal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

reqPreviewBtn.addEventListener("click", () => {
  const preview = buildPreview();
  if (!preview) return;
  reqPreviewText.textContent = preview;
  modalFormView.classList.add("hidden");
  modalPreviewView.classList.remove("hidden");
});

reqBackBtn.addEventListener("click", () => {
  modalFormView.classList.remove("hidden");
  modalPreviewView.classList.add("hidden");
});

reqSendBtn.addEventListener("click", () => {
  const preview = reqPreviewText.textContent;
  const subject = encodeURIComponent("Creature Code Request");
  const body = encodeURIComponent(preview);
  window.location.href = `mailto:requests@weeopwex.uk?subject=${subject}&body=${body}`;
});
