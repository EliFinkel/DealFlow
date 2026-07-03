// index.html — the whole app. The board lists and filters deals; clicking
// a card (or "+ New deal") opens the deal drawer over the board for
// viewing, editing, or creating.

const ICONS = {
  archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="3.5" rx="1.2"/><path d="M3.5 6.5V11.6A1.9 1.9 0 0 0 5.4 13.5h5.2a1.9 1.9 0 0 0 1.9-1.9V6.5M6.4 9.3h3.2"/></svg>',
  restore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 8a5.3 5.3 0 1 1 1.5 3.7M2.7 8V4.7M2.7 8H6"/></svg>',
  trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 4.2h10.4M6.4 4V3a.9.9 0 0 1 .9-.9h1.4a.9.9 0 0 1 .9.9v1M4.2 4.4l.6 8.1a1.5 1.5 0 0 0 1.5 1.4h3.4a1.5 1.5 0 0 0 1.5-1.4l.6-8.1M6.6 7v4M9.4 7v4"/></svg>',
};

function iconBtn(kind, label, onClick, danger) {
  const b = el("button", "icon-btn" + (danger ? " danger" : ""));
  b.type = "button";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.innerHTML = ICONS[kind];
  b.onclick = onClick;
  return b;
}

// Styled replacement for window.confirm(). Resolves true only if the
// user explicitly confirms; backdrop click, Cancel, and Esc all decline.
function confirmDialog(opts) {
  return new Promise((resolve) => {
    $("confirm-title").textContent = opts.title;
    $("confirm-msg").textContent = opts.message || "";
    const box = $("confirm-box");
    const ok = $("confirm-ok");
    ok.textContent = opts.confirmLabel || "Confirm";
    ok.className = "btn " + (opts.danger ? "danger" : "primary");
    box.classList.add("open");
    const done = (v) => {
      box.classList.remove("open");
      document.removeEventListener("keydown", onKey, true);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); done(false); }
      if (e.key === "Enter") { e.stopPropagation(); done(true); }
    };
    document.addEventListener("keydown", onKey, true);
    ok.onclick = () => done(true);
    $("confirm-cancel").onclick = () => done(false);
    box.onclick = (e) => { if (e.target === box) done(false); };
    ok.focus();
  });
}

const state = {
  store: null,
  deals: [],
  view: "active",       // "active" | "archived"
  statusFilter: null,   // status name, or null = all
  query: "",
  userName: "You",      // default owner for new deals
  isAdmin: false,
};

function visibleDeals() {
  const q = state.query.trim().toLowerCase();
  return state.deals
    .filter((d) => d.archived === (state.view === "archived"))
    .filter((d) => !state.statusFilter || d.status === state.statusFilter)
    .filter((d) => !q || [d.company, d.oneLiner, d.founders, d.sector, d.source, d.owner, d.notes, d.questions]
      .concat((d.actionItems || []).map((i) => i.text))
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
        ? "Nothing archived yet."
        : "No deals in the pipeline. Add the first one.";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
  }

  deals.forEach((d) => {
    const card = el("div", "card" + (d.archived ? " archived" : ""));
    card.dataset.dealId = d.id;
    card.tabIndex = 0;
    card.style.setProperty("--spine", statusColor(d.status));
    // The whole card opens the deal overlay, except clicks on the
    // controls that edit in place (status pill, checkboxes, add input).
    card.onclick = (e) => {
      if (e.target.closest("a, button, input, label, .status-menu")) return;
      openDeal(d.id).catch(() => {});
    };
    card.onkeydown = (e) => {
      if (e.key === "Enter" && e.target === card) openDeal(d.id).catch(() => {});
    };

    const top = el("div", "card-top");
    top.append(el("h3", "card-company", d.company), statusPill(d));
    card.appendChild(top);

    if (d.oneLiner) card.appendChild(el("p", "card-oneliner", d.oneLiner));
    if (d.founders) card.appendChild(el("p", "card-founders", d.founders));

    card.appendChild(actionItemsSection(d));

    const meta = el("div", "card-meta");
    meta.appendChild(el("span", "mono", (d.owner || "—") + " · " + fmtWhen(d.updated)));
    const acts = el("div", "card-acts");
    if (d.archived) {
      acts.appendChild(iconBtn("restore", "Restore to pipeline", () => { restoreDeal(d); }));
      acts.appendChild(iconBtn("trash", "Delete forever", () => { askDelete(d); }, true));
    } else {
      acts.appendChild(iconBtn("archive", "Archive deal", () => { askArchive(d); }));
    }
    meta.appendChild(acts);
    card.appendChild(meta);

    wrap.appendChild(card);
  });
}

async function askArchive(d) {
  const yes = await confirmDialog({
    title: "Archive " + d.company + "?",
    message: "It moves to the Archive tab and can be restored anytime.",
    confirmLabel: "Archive",
  });
  if (yes) await setArchived(d, true);
}

async function restoreDeal(d) {
  await setArchived(d, false);
}

async function setArchived(deal, archived) {
  const before = { archived: deal.archived, updated: deal.updated };
  deal.archived = archived;
  deal.updated = new Date().toISOString();
  try {
    await action(archived ? "Archiving…" : "Restoring…", async () => {
      await state.store.updateDeal(deal);
      await state.store.log(archived ? "Archived" : "Restored", deal.company, "");
    });
  } catch (e) {
    deal.archived = before.archived;
    deal.updated = before.updated;
  }
  render();
}

async function askDelete(d) {
  const yes = await confirmDialog({
    title: "Delete " + d.company + " forever?",
    message: "This permanently removes the deal from the pipeline. It can't be undone.",
    confirmLabel: "Delete forever",
    danger: true,
  });
  if (!yes) return;
  try {
    await action("Deleting…", async () => {
      await state.store.deleteDeal(d.id);
      await state.store.log("Deleted", d.company, "");
    });
    state.deals = state.deals.filter((x) => x.id !== d.id);
  } catch (e) { /* toast already shown */ }
  render();
}

// ---- In-place editing from the board: status + action items ----------

function closeStatusMenus() {
  document.querySelectorAll(".status-menu").forEach((m) => m.remove());
}

function statusPill(d) {
  const wrap = el("div", "pill-wrap");
  const pill = el("button", "pill", d.status);
  pill.type = "button";
  pill.title = "Change status";
  pill.style.setProperty("--pc", statusColor(d.status));
  pill.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = wrap.querySelector(".status-menu");
    closeStatusMenus();
    if (wasOpen) return;
    const menu = el("div", "status-menu");
    cfg.statuses.forEach((s) => {
      const b = el("button", s.name === d.status ? "on" : null);
      b.type = "button";
      const dot = el("span", "dot");
      dot.style.background = s.color;
      b.append(dot, document.createTextNode(s.name));
      b.onclick = () => { setStatus(d, s.name); };
      menu.appendChild(b);
    });
    wrap.appendChild(menu);
  };
  wrap.appendChild(pill);
  return wrap;
}

async function setStatus(deal, status) {
  closeStatusMenus();
  if (status === deal.status) return;
  const before = { status: deal.status, updated: deal.updated };
  deal.status = status;
  deal.updated = new Date().toISOString();
  try {
    await action("Updating status…", async () => {
      await state.store.updateDeal(deal);
      await state.store.log("Updated", deal.company, "Status: " + before.status + " → " + status);
    });
  } catch (e) {
    deal.status = before.status;
    deal.updated = before.updated;
  }
  render();
}

function actionItemsSection(d) {
  const sec = el("div", "card-actions");
  (d.actionItems || []).forEach((item) => {
    const row = el("label", "ai-row" + (item.done ? " done" : ""));
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = item.done;
    cb.onchange = () => { toggleItem(d, item, cb.checked); };
    row.append(cb, el("span", "ai-text", item.text));
    sec.appendChild(row);
  });
  const add = el("input", "ai-add");
  add.type = "text";
  add.placeholder = "+ Add action item…";
  add.autocomplete = "off";
  add.onkeydown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const text = add.value.trim();
    if (text) addItem(d, text);
  };
  sec.appendChild(add);
  return sec;
}

// Ticking a box deliberately doesn't touch `updated`, so the card
// doesn't jump around the grid mid-checkoff.
async function toggleItem(deal, item, done) {
  item.done = done;
  try {
    await action("Saving…", async () => {
      await state.store.updateDeal(deal);
      await state.store.log("Updated", deal.company,
        "Action item " + (done ? "done" : "reopened") + ": " + item.text);
    });
  } catch (e) {
    item.done = !done;
  }
  renderCards();
}

async function addItem(deal, text) {
  const before = deal.updated;
  deal.actionItems = deal.actionItems || [];
  deal.actionItems.push({ id: "A-" + Date.now().toString(36), text, done: false });
  deal.updated = new Date().toISOString();
  try {
    await action("Saving…", async () => {
      await state.store.updateDeal(deal);
      await state.store.log("Updated", deal.company, "Action item added: " + text);
    });
  } catch (e) {
    deal.actionItems.pop();
    deal.updated = before;
  }
  render();
  const again = document.querySelector('[data-deal-id="' + deal.id + '"] .ai-add');
  if (again) again.focus();
}

// ---- Deal overlay: view, edit, or create without leaving the board ----

const FIELDS = ["company", "oneLiner", "founders", "status", "sector", "source", "owner", "notes", "questions"];
const FIELD_LABELS = {
  company: "Company", oneLiner: "One-liner", founders: "Founders", status: "Status",
  sector: "Sector", source: "Source", owner: "Owner", notes: "Notes", questions: "Open questions",
};

let current = null; // the deal as loaded/created; null while the overlay is closed
let editItems = []; // working copy of its action items, saved with the form

function fieldInput(name) {
  return $("f-" + name.toLowerCase());
}

function readForm() {
  const d = { ...current };
  FIELDS.forEach((f) => { d[f] = fieldInput(f).value.trim(); });
  d.actionItems = editItems
    .map((i) => ({ ...i, text: i.text.trim() }))
    .filter((i) => i.text);
  return d;
}

// Human-readable summary of what changed, for the log.
function describeChanges(before, after) {
  const parts = [];
  FIELDS.forEach((f) => {
    if ((before[f] || "") === (after[f] || "")) return;
    if (f === "status") parts.push("Status: " + before.status + " → " + after.status);
    else parts.push(FIELD_LABELS[f] + " updated");
  });
  if (JSON.stringify(before.actionItems || []) !== JSON.stringify(after.actionItems || []))
    parts.push("Action items updated");
  return parts.join("; ");
}

function populateStatusSelect() {
  const sel = fieldInput("status");
  sel.replaceChildren();
  cfg.statuses.forEach((s) => sel.appendChild(new Option(s.name, s.name)));
}

function renderEditItems() {
  const wrap = $("ai-list");
  wrap.replaceChildren();
  editItems.forEach((item, i) => {
    const row = el("div", "ai-row" + (item.done ? " done" : ""));
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = item.done;
    cb.onchange = () => { item.done = cb.checked; row.classList.toggle("done", item.done); };
    const text = el("input", "ai-text-input");
    text.type = "text";
    text.value = item.text;
    text.autocomplete = "off";
    text.oninput = () => { item.text = text.value; };
    const del = el("button", "ai-del", "✕");
    del.type = "button";
    del.title = "Remove action item";
    del.onclick = () => { editItems.splice(i, 1); renderEditItems(); };
    row.append(cb, text, del);
    wrap.appendChild(row);
  });
}

function paintStatusPill() {
  $("status-pill").style.setProperty("--pc", statusColor(fieldInput("status").value));
}

function fillDrawer(deal) {
  const isNew = !deal.id;
  $("panel-id").textContent = isNew ? "New deal" : deal.id + " · added " + fmtWhen(deal.created);
  FIELDS.forEach((f) => { fieldInput(f).value = deal[f]; });
  paintStatusPill();
  $("ai-new").value = "";
  $("archive-btn").textContent = deal.archived ? "Restore to pipeline" : "Archive";
  $("archive-btn").classList.toggle("hidden", isNew);
  $("delete-btn").classList.toggle("hidden", !(deal.id && deal.archived));
}

function drawerIsOpen() {
  return $("deal-overlay").classList.contains("open");
}

async function openDeal(id) {
  closeStatusMenus();
  if (id) {
    current = await action("Loading deal…", () => state.store.getDeal(id));
  } else {
    current = {
      id: "", company: "", oneLiner: "", founders: "",
      status: cfg.statuses[0].name, sector: "", source: "",
      owner: state.userName, notes: "", questions: "", actionItems: [],
      created: "", updated: "", archived: false,
    };
  }
  editItems = (current.actionItems || []).map((i) => ({ ...i }));
  fillDrawer(current);
  renderEditItems();
  $("deal-overlay").classList.add("open");
  document.body.classList.add("no-scroll");
  if (!id) fieldInput("company").focus();
}

async function closeDrawer(force) {
  if (!current) return;
  if (!force && describeChanges(current, readForm())) {
    const discard = await confirmDialog({
      title: "Discard unsaved changes?",
      message: "Your edits to this deal won't be saved.",
      confirmLabel: "Discard",
    });
    if (!discard) return;
  }
  $("deal-overlay").classList.remove("open");
  document.body.classList.remove("no-scroll");
  current = null;
  editItems = [];
}

async function saveDeal() {
  const deal = readForm();
  if (!deal.company) {
    toast("Give the deal a company name before saving.", true);
    fieldInput("company").focus();
    return;
  }
  const now = new Date().toISOString();
  deal.updated = now;

  if (!current.id) {
    deal.id = "D-" + Date.now().toString(36).toUpperCase();
    deal.created = now;
    await action("Saving…", async () => {
      await state.store.addDeal(deal);
      await state.store.log("Added", deal.company, deal.status);
    });
  } else {
    const changes = describeChanges(current, deal);
    if (changes) {
      await action("Saving…", async () => {
        await state.store.updateDeal(deal);
        await state.store.log("Updated", deal.company, changes);
      });
    }
  }
  await closeDrawer(true);
  await reload();
}

async function drawerArchive() {
  const deal = readForm();
  if (!deal.archived) {
    const yes = await confirmDialog({
      title: "Archive " + (deal.company || "this deal") + "?",
      message: "It moves to the Archive tab and can be restored anytime.",
      confirmLabel: "Archive",
    });
    if (!yes) return;
  }
  deal.archived = !deal.archived;
  deal.updated = new Date().toISOString();
  await action(deal.archived ? "Archiving…" : "Restoring…", async () => {
    await state.store.updateDeal(deal);
    await state.store.log(deal.archived ? "Archived" : "Restored", deal.company, "");
  });
  await closeDrawer(true);
  await reload();
}

async function drawerDelete() {
  const yes = await confirmDialog({
    title: "Delete " + (current.company || "this deal") + " forever?",
    message: "This permanently removes the deal from the pipeline. It can't be undone.",
    confirmLabel: "Delete forever",
    danger: true,
  });
  if (!yes) return;
  const deal = current;
  await action("Deleting…", async () => {
    await state.store.deleteDeal(deal.id);
    await state.store.log("Deleted", deal.company, "");
  });
  await closeDrawer(true);
  await reload();
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
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pill-wrap")) closeStatusMenus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeStatusMenus();
    if ($("admin-overlay").classList.contains("open")) { closeAdmin(); return; }
    if (drawerIsOpen()) closeDrawer().catch(() => {});
  });
  $("refresh-btn").onclick = () => reload();
  $("search").oninput = (e) => { state.query = e.target.value; renderCards(); };
  document.querySelectorAll(".view-toggle button").forEach((b) => {
    b.onclick = () => { state.view = b.dataset.view; state.statusFilter = null; render(); };
  });

  // Deal drawer
  $("new-deal-btn").onclick = () => openDeal(null).catch(() => {});
  $("deal-close").onclick = () => closeDrawer().catch(() => {});
  $("deal-overlay").onclick = (e) => { if (e.target === $("deal-overlay")) closeDrawer().catch(() => {}); };
  $("save-btn").onclick = () => saveDeal().catch(() => {});
  $("archive-btn").onclick = () => drawerArchive().catch(() => {});
  $("delete-btn").onclick = () => drawerDelete().catch(() => {});
  fieldInput("status").onchange = () => paintStatusPill();

  // Admin drawer
  $("admin-btn").onclick = () => openAdmin().catch(() => {});
  $("admin-close").onclick = () => closeAdmin();
  $("admin-overlay").onclick = (e) => { if (e.target === $("admin-overlay")) closeAdmin(); };
  $("ai-new").onkeydown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const t = $("ai-new").value.trim();
    if (!t) return;
    editItems.push({ id: "A-" + Date.now().toString(36), text: t, done: false });
    $("ai-new").value = "";
    renderEditItems();
  };
}

function signOutAndReload() {
  Auth.signOut().then(() => window.location.reload());
}

async function enterApp(resolved) {
  state.store = resolved.store;
  state.userName = resolved.local ? "You" : resolved.userName;

  if (resolved.local) {
    $("local-banner").classList.remove("hidden");
  } else {
    // The gate: no allowedUsers doc means the security rules block all
    // data, so park on the pending screen. (The rules enforce this even
    // if this check were bypassed — see SETUP.md.)
    const access = await action("Checking access…", () => FirebaseStore.myAccess());
    if (!access.allowed) {
      await FirebaseStore.requestAccess().catch(() => {}); // already requested = fine
      $("signin-screen").classList.add("hidden");
      $("pending-email").textContent = Auth.userEmail();
      $("pending-screen").classList.remove("hidden");
      $("pending-signout").onclick = () => signOutAndReload();
      return;
    }
    state.isAdmin = access.role === "admin";
    $("admin-btn").classList.toggle("hidden", !state.isAdmin);
    $("user-chip").classList.remove("hidden");
    $("user-name").textContent = resolved.userName;
    $("signout-btn").onclick = () => signOutAndReload();
  }

  $("signin-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  await reload();
}

// ---- Sign in / request access ----------------------------------------

let signinMode = "signin"; // "signin" | "register"

function setSigninMode(mode) {
  signinMode = mode;
  const reg = mode === "register";
  $("signin-title").textContent = reg ? "Request access." : "The pipeline, in one place.";
  $("signin-sub").textContent = reg
    ? "Create an account with your work email. An admin on the team approves you before any deals are visible."
    : "Sign in with your team account.";
  $("signin-submit").textContent = reg ? "Create account & request access" : "Sign in";
  $("mode-btn").textContent = reg ? "Have an account? Sign in" : "New here? Request access";
  $("forgot-btn").classList.toggle("hidden", reg);
  $("signin-password").setAttribute("autocomplete", reg ? "new-password" : "current-password");
  $("signin-error").classList.add("hidden");
}

async function trySignIn() {
  const email = $("signin-email").value.trim();
  const password = $("signin-password").value;
  $("signin-error").classList.add("hidden");
  try {
    if (signinMode === "register") {
      await action("Creating your account…", () => Auth.register(email, password));
    } else {
      await action("Signing in…", () => Auth.signIn(email, password));
    }
    await action("Opening the pipeline…", () => FirebaseStore.init());
    await enterApp({ store: FirebaseStore, local: false, userName: Auth.userEmail() });
  } catch (e) {
    $("signin-error").textContent = e.message;
    $("signin-error").classList.remove("hidden");
  }
}

// ---- Admin: approve requests, manage the team -------------------------

async function loadAdminLists() {
  const [reqs, users] = await action("Loading team…", () =>
    Promise.all([state.store.listAccessRequests(), state.store.listAllowedUsers()]));
  renderAdminLists(reqs, users);
}

function renderAdminLists(reqs, users) {
  const rw = $("req-list");
  rw.replaceChildren();
  if (!reqs.length) rw.appendChild(el("p", "admin-empty", "No one is waiting."));
  reqs.forEach((r) => {
    const row = el("div", "admin-row");
    const info = el("div", "admin-info");
    info.append(el("span", "admin-email", r.email), el("span", "admin-sub mono", "asked " + fmtWhen(r.requested)));
    const acts = el("div", "admin-acts");
    const decline = el("button", "btn ghost small", "Decline");
    decline.type = "button";
    decline.onclick = () => declineRequest(r).catch(() => {});
    const approve = el("button", "btn primary small", "Approve");
    approve.type = "button";
    approve.onclick = () => approveRequest(r).catch(() => {});
    acts.append(decline, approve);
    row.append(info, acts);
    rw.appendChild(row);
  });

  const uw = $("user-list");
  uw.replaceChildren();
  users.forEach((u) => {
    const row = el("div", "admin-row");
    const info = el("div", "admin-info");
    info.append(el("span", "admin-email", u.email), el("span", "admin-sub mono", u.role));
    row.appendChild(info);
    if (u.uid === Auth.userId()) {
      row.appendChild(el("span", "admin-sub mono", "you"));
    } else {
      const acts = el("div", "admin-acts");
      const isAdminUser = u.role === "admin";
      const roleBtn = el("button", "btn ghost small", isAdminUser ? "Remove admin" : "Make admin");
      roleBtn.type = "button";
      roleBtn.onclick = () => toggleAdminRole(u).catch(() => {});
      const rm = el("button", "btn ghost danger-ghost small", "Remove");
      rm.type = "button";
      rm.onclick = () => removeMember(u).catch(() => {});
      acts.append(roleBtn, rm);
      row.appendChild(acts);
    }
    uw.appendChild(row);
  });
}

async function toggleAdminRole(u) {
  const promote = u.role !== "admin";
  const yes = await confirmDialog(promote
    ? {
        title: "Make " + u.email + " an admin?",
        message: "They'll be able to approve and remove teammates, and make more admins.",
        confirmLabel: "Make admin",
      }
    : {
        title: "Remove admin from " + u.email + "?",
        message: "They keep normal access to deals but lose the Admin panel.",
        confirmLabel: "Remove admin",
      });
  if (!yes) return;
  await action("Saving…", () => state.store.setUserRole(u.uid, promote ? "admin" : "member"));
  toast(promote ? u.email + " is now an admin." : u.email + " is now a member.");
  await loadAdminLists();
}

async function approveRequest(r) {
  await action("Approving…", () => state.store.approveUser(r.uid, r.email));
  toast(r.email + " can now use the pipeline.");
  await loadAdminLists();
}

async function declineRequest(r) {
  const yes = await confirmDialog({
    title: "Decline " + r.email + "?",
    message: "They keep their account but can't see any deals. They can ask again by signing in.",
    confirmLabel: "Decline",
  });
  if (!yes) return;
  await action("Declining…", () => state.store.declineRequest(r.uid));
  await loadAdminLists();
}

async function removeMember(u) {
  const yes = await confirmDialog({
    title: "Remove " + u.email + "?",
    message: "They immediately lose access to all deals. You can approve them again later.",
    confirmLabel: "Remove",
    danger: true,
  });
  if (!yes) return;
  await action("Removing…", () => state.store.removeUser(u.uid));
  await loadAdminLists();
}

async function openAdmin() {
  await loadAdminLists();
  $("admin-overlay").classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeAdmin() {
  $("admin-overlay").classList.remove("open");
  document.body.classList.remove("no-scroll");
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
  populateStatusSelect();
  wireEvents();

  const resolved = await initStore();

  if (resolved.needsSignIn) {
    $("signin-screen").classList.remove("hidden");
    $("signin-form").onsubmit = (e) => { e.preventDefault(); trySignIn().catch(() => {}); };
    $("forgot-btn").onclick = () => tryReset().catch(() => {});
    $("mode-btn").onclick = () => setSigninMode(signinMode === "signin" ? "register" : "signin");
    return;
  }

  await enterApp(resolved);
}

boot().catch((e) => {
  console.error(e);
  setBusy(false);
  toast(e.message || "The app couldn't start. Check config.js and SETUP.md.", true);
});
