// Shared by both pages (index.html and deal.html): small helpers, the
// local browser-only store, and the switch between it and Firebase.
//
// Firebase mode (auth.js + store.js) switches on automatically once
// config.js's `firebase` block is filled in — see SETUP.md. Until then
// every page just talks to LocalStore.

const cfg = window.PIPELINE_CONFIG;

function $(id) { return document.getElementById(id); }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusColor(name) {
  const s = cfg.statuses.find((x) => x.name === name);
  return s ? s.color : "#98939E";
}

function fmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return days + "d ago";
  const opts = { month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(undefined, opts);
}

let toastTimer = null;
function toast(msg, isError) {
  const t = $("toast");
  t.textContent = msg;
  t.className = isError ? "error" : "";
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), isError ? 6000 : 2500);
}

function setBusy(busy, label) {
  $("loading").classList.toggle("hidden", !busy);
  if (label) $("loading-label").textContent = label;
}

// Wraps store calls: shows the spinner, surfaces errors as a toast.
async function action(label, fn) {
  setBusy(true, label);
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    toast(e.message || "Something went wrong.", true);
    throw e;
  } finally {
    setBusy(false);
  }
}

// ---- Local (browser-only) store --------------------------------------
// Data lives in this browser's localStorage only — nothing is shared with
// teammates until Firebase mode is switched on.

const LocalStore = (() => {
  const KEY = "pipeline-local";

  function seed() {
    const now = new Date().toISOString();
    return {
      deals: [
        {
          id: "D-DEMO1", company: "Northlight Robotics",
          oneLiner: "Warehouse picking arms priced per pick instead of per robot",
          founders: "Maya Chen (CEO), Or Levi (CTO)", status: "Diligence",
          sector: "Robotics", source: "Intro — portfolio founder", owner: "You",
          notes: "Strong pilot data with two 3PLs. Pricing model is the wedge.",
          questions: "What's the real service cost per unit?\nReference calls with pilot customers.",
          actionItems: [
            { id: "A-1", text: "Reference call with pilot 3PL ops lead", done: false, assignee: "You" },
            { id: "A-2", text: "Get unit economics model from Maya", done: true, assignee: "" },
          ],
          created: now, updated: now, archived: false,
        },
        {
          id: "D-DEMO2", company: "Ledgerline",
          oneLiner: "Automated fund admin for emerging VC managers",
          founders: "Sam Peretz", status: "New",
          sector: "Fintech", source: "Cold inbound", owner: "You",
          notes: "", questions: "", actionItems: [], created: now, updated: now, archived: false,
        },
        {
          id: "D-DEMO3", company: "Verdant AI",
          oneLiner: "Crop disease detection from existing irrigation cameras",
          founders: "Dana Ron, Ali Nassar", status: "Passed",
          sector: "AgTech", source: "Conference — AgriNext", owner: "You",
          notes: "Great team, market too small for fund thesis. Revisit if they expand to insurance.",
          questions: "", actionItems: [], created: now, updated: now, archived: true,
        },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted — reseed */ }
    const data = seed();
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  return {
    async init() {},
    async listDeals() { return load().deals; },
    async getDeal(id) {
      const d = load().deals.find((x) => x.id === id);
      if (!d) throw new Error("That deal isn't here — it may have been removed in another tab.");
      return d;
    },
    async addDeal(deal) { const d = load(); d.deals.push(deal); save(d); },
    async updateDeal(deal) {
      const d = load();
      const i = d.deals.findIndex((x) => x.id === deal.id);
      if (i !== -1) d.deals[i] = deal;
      save(d);
    },
    async deleteDeal(id) {
      const d = load();
      d.deals = d.deals.filter((x) => x.id !== id);
      save(d);
    },
    async log() {},
    async listLogs() { return []; },
  };
})();

// ---- Which store is active ------------------------------------------------

// Resolves which store the page should use. Returns:
//   { store, local: true }                            — browser-only mode (default)
//   { store, local: false, userName }                  — signed in to Firebase
//   { store: null, local: false, needsSignIn: true }   — Firebase configured, not signed in yet
async function initStore() {
  if (!Auth.isConfigured()) {
    return { store: LocalStore, local: true };
  }
  setBusy(true, "Checking sign-in…");
  const user = await Auth.init();
  setBusy(false);
  if (!user) return { store: null, local: false, needsSignIn: true };
  await action("Opening the pipeline…", () => FirebaseStore.init());
  return { store: FirebaseStore, local: false, userName: Auth.userEmail() };
}
