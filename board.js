// index.html — the pipeline board. Each card links to deal.html for
// viewing, editing, or creating; this page only lists and filters.

const state = {
  store: null,
  deals: [],
  view: "active",       // "active" | "archived"
  statusFilter: null,   // status name, or null = all
  query: "",
};

function visibleDeals() {
  const q = state.query.trim().toLowerCase();
  return state.deals
    .filter((d) => d.archived === (state.view === "archived"))
    .filter((d) => !state.statusFilter || d.status === state.statusFilter)
    .filter((d) => !q || [d.company, d.oneLiner, d.founders, d.sector, d.source, d.owner, d.notes, d.questions]
      .join(" ").toLowerCase().includes(q))
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
}

function renderChips() {
  const wrap = $("status-chips");
  wrap.replaceChildren();
  const counts = {};
  state.deals.filter((d) => d.archived === (state.view === "archived"))
    .forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });

  const all = el("button", "chip" + (state.statusFilter === null ? " on" : ""), "All");
  all.onclick = () => { state.statusFilter = null; render(); };
  wrap.appendChild(all);

  cfg.statuses.forEach((s) => {
    const chip = el("button", "chip" + (state.statusFilter === s.name ? " on" : ""));
    const dot = el("span", "dot");
    dot.style.background = s.color;
    chip.append(dot, document.createTextNode(s.name), el("span", "chip-count", String(counts[s.name] || 0)));
    chip.onclick = () => { state.statusFilter = state.statusFilter === s.name ? null : s.name; render(); };
    wrap.appendChild(chip);
  });
}

function renderCards() {
  const wrap = $("cards");
  wrap.replaceChildren();
  const deals = visibleDeals();

  const empty = $("empty-state");
  if (deals.length === 0) {
    empty.textContent = state.query || state.statusFilter
      ? "No deals match — clear the search or filters."
      : state.view === "archived"
        ? "Nothing archived yet. Archived deals stay here forever."
        : "No deals in the pipeline. Add the first one.";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
  }

  deals.forEach((d) => {
    const card = el("a", "card" + (d.archived ? " archived" : ""));
    card.href = "deal.html?id=" + encodeURIComponent(d.id);
    card.style.setProperty("--spine", statusColor(d.status));

    const top = el("div", "card-top");
    top.appendChild(el("h3", "card-company", d.company));
    const pill = el("span", "pill", d.status);
    pill.style.setProperty("--pc", statusColor(d.status));
    top.appendChild(pill);
    card.appendChild(top);

    if (d.oneLiner) card.appendChild(el("p", "card-oneliner", d.oneLiner));
    if (d.founders) card.appendChild(el("p", "card-founders", d.founders));

    const meta = el("div", "card-meta mono");
    meta.appendChild(el("span", null, d.owner || "—"));
    meta.appendChild(el("span", null, fmtWhen(d.updated)));
    card.appendChild(meta);

    wrap.appendChild(card);
  });
}

function render() {
  document.querySelectorAll(".view-toggle button").forEach((b) =>
    b.classList.toggle("on", b.dataset.view === state.view));
  renderChips();
  renderCards();
}

async function reload() {
  state.deals = await action("Loading pipeline…", () => state.store.listDeals());
  render();
}

function wireEvents() {
  $("refresh-btn").onclick = () => reload();
  $("search").oninput = (e) => { state.query = e.target.value; renderCards(); };
  document.querySelectorAll(".view-toggle button").forEach((b) => {
    b.onclick = () => { state.view = b.dataset.view; state.statusFilter = null; render(); };
  });
}

async function enterApp(resolved) {
  state.store = resolved.store;
  if (resolved.local) {
    $("local-banner").classList.remove("hidden");
  } else {
    $("user-chip").classList.remove("hidden");
    $("user-name").textContent = resolved.userName;
    $("signout-btn").onclick = () => Auth.signOut();
  }
  $("signin-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  await reload();
}

async function trySignIn() {
  const email = $("signin-email").value.trim();
  const password = $("signin-password").value;
  $("signin-error").classList.add("hidden");
  try {
    await action("Signing in…", () => Auth.signIn(email, password));
    await action("Opening the pipeline…", () => FirebaseStore.init());
    await enterApp({ store: FirebaseStore, local: false, userName: Auth.userEmail() });
  } catch (e) {
    $("signin-error").textContent = e.message;
    $("signin-error").classList.remove("hidden");
  }
}

async function tryReset() {
  const email = $("signin-email").value.trim();
  $("signin-error").classList.add("hidden");
  if (!email) {
    $("signin-error").textContent = "Enter your email above first, then click Forgot password.";
    $("signin-error").classList.remove("hidden");
    return;
  }
  try {
    await action("Sending reset email…", () => Auth.sendPasswordReset(email));
    toast("Password reset email sent to " + email + ".");
  } catch (e) {
    $("signin-error").textContent = e.message;
    $("signin-error").classList.remove("hidden");
  }
}

async function boot() {
  document.querySelectorAll(".firm-name").forEach((n) => { n.textContent = cfg.firmName; });
  wireEvents();

  const resolved = await initStore();

  if (resolved.needsSignIn) {
    $("signin-screen").classList.remove("hidden");
    $("signin-form").onsubmit = (e) => { e.preventDefault(); trySignIn().catch(() => {}); };
    $("forgot-btn").onclick = () => tryReset().catch(() => {});
    return;
  }

  await enterApp(resolved);
}

boot().catch((e) => {
  console.error(e);
  setBusy(false);
  toast(e.message || "The app couldn't start. Check config.js and SETUP.md.", true);
});
