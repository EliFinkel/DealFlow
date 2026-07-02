// deal.html — view, edit, or create a single deal. Saving (or archiving)
// takes you back to the pipeline board; the "← Pipeline" link does the
// same without saving.

const params = new URLSearchParams(window.location.search);
const dealId = params.get("id");
const isNew = !dealId;

const FIELDS = ["company", "oneLiner", "founders", "status", "sector", "source", "owner", "notes", "questions"];
const FIELD_LABELS = {
  company: "Company", oneLiner: "One-liner", founders: "Founders", status: "Status",
  sector: "Sector", source: "Source", owner: "Owner", notes: "Notes", questions: "Open questions",
};

let store = null;
let current = null; // the deal as loaded/created, updated in place as the form is edited

function fieldInput(name) {
  return $("f-" + name.toLowerCase());
}

function readForm() {
  const d = { ...current };
  FIELDS.forEach((f) => { d[f] = fieldInput(f).value.trim(); });
  return d;
}

// Human-readable summary of what changed, for the Log sheet.
function describeChanges(before, after) {
  const parts = [];
  FIELDS.forEach((f) => {
    if ((before[f] || "") === (after[f] || "")) return;
    if (f === "status") parts.push("Status: " + before.status + " → " + after.status);
    else parts.push(FIELD_LABELS[f] + " updated");
  });
  return parts.join("; ");
}

function goHome() {
  window.location.href = "index.html";
}

function populateStatusSelect() {
  const sel = fieldInput("status");
  sel.replaceChildren();
  cfg.statuses.forEach((s) => sel.appendChild(new Option(s.name, s.name)));
}

function fillForm(deal) {
  $("panel-title").textContent = isNew ? "New deal" : deal.company;
  $("panel-id").textContent = isNew ? "" : deal.id + " · added " + fmtWhen(deal.created);
  FIELDS.forEach((f) => { fieldInput(f).value = deal[f]; });
  $("archive-btn").textContent = deal.archived ? "Restore to pipeline" : "Archive deal";
  $("archive-btn").classList.toggle("hidden", isNew);
}

async function save() {
  const deal = readForm();
  if (!deal.company) {
    toast("Give the deal a company name before saving.", true);
    fieldInput("company").focus();
    return;
  }
  const now = new Date().toISOString();
  deal.updated = now;

  if (isNew) {
    deal.id = "D-" + Date.now().toString(36).toUpperCase();
    deal.created = now;
    await action("Saving…", async () => {
      await store.addDeal(deal);
      await store.log("Added", deal.company, deal.status);
    });
  } else {
    const changes = describeChanges(current, deal);
    if (changes) {
      await action("Saving…", async () => {
        await store.updateDeal(deal);
        await store.log("Updated", deal.company, changes);
      });
    }
  }
  goHome();
}

async function toggleArchive() {
  const deal = readForm();
  deal.archived = !deal.archived;
  deal.updated = new Date().toISOString();
  await action(deal.archived ? "Archiving…" : "Restoring…", async () => {
    await store.updateDeal(deal);
    await store.log(deal.archived ? "Archived" : "Restored", deal.company, "");
  });
  goHome();
}

function wireEvents() {
  $("save-btn").onclick = () => save().catch(() => {});
  $("archive-btn").onclick = () => toggleArchive().catch(() => {});
}

async function boot() {
  document.querySelectorAll(".firm-name").forEach((n) => { n.textContent = cfg.firmName; });
  populateStatusSelect();
  wireEvents();

  const resolved = await initStore();
  if (resolved.needsSignIn) { goHome(); return; }
  store = resolved.store;

  if (isNew) {
    current = {
      id: "", company: "", oneLiner: "", founders: "",
      status: cfg.statuses[0].name, sector: "", source: "",
      owner: resolved.local ? "You" : resolved.userName,
      notes: "", questions: "", created: "", updated: "", archived: false,
    };
  } else {
    current = await action("Loading deal…", () => store.getDeal(dealId));
  }

  fillForm(current);
  $("deal-shell").classList.remove("hidden");
  fieldInput("company").focus();
}

boot().catch((e) => {
  console.error(e);
  setBusy(false);
  toast(e.message || "Couldn't load this deal.", true);
  $("panel-title").textContent = "Couldn't load this deal";
  $("panel-id").textContent = e.message || "Unknown error — check the browser console for details.";
  $("deal-shell").classList.remove("hidden");
});
