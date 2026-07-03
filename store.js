// Data layer: reads and writes deals through Firestore. This is the real,
// shared, multi-user database — every signed-in teammate reads and writes
// the same data.
//
//   - "deals" collection: one document per deal (archived rather than
//     deleted in day-to-day use; permanent delete only from the Archive)
//   - "logs" collection: append-only history of every change

const FirebaseStore = (() => {
  let db = null;

  async function init() {
    db = firebase.firestore();
  }

  function dealFromDoc(doc) {
    const d = doc.data();
    return {
      id: doc.id,
      company: d.company || "", oneLiner: d.oneLiner || "", founders: d.founders || "",
      status: d.status || "", sector: d.sector || "", source: d.source || "", owner: d.owner || "",
      notes: d.notes || "", questions: d.questions || "",
      actionItems: Array.isArray(d.actionItems)
        ? d.actionItems.map((i) => ({ id: i.id || "", text: i.text || "", done: !!i.done }))
        : [],
      created: d.created || "", updated: d.updated || "", archived: Boolean(d.archived),
    };
  }

  function dealToData(deal) {
    return {
      company: deal.company, oneLiner: deal.oneLiner, founders: deal.founders, status: deal.status,
      sector: deal.sector, source: deal.source, owner: deal.owner,
      notes: deal.notes, questions: deal.questions,
      actionItems: (deal.actionItems || []).map((i) => ({ id: i.id, text: i.text, done: !!i.done })),
      created: deal.created, updated: deal.updated, archived: !!deal.archived,
    };
  }

  async function listDeals() {
    const snap = await db.collection("deals").get();
    return snap.docs.map(dealFromDoc);
  }

  async function getDeal(id) {
    const doc = await db.collection("deals").doc(id).get();
    if (!doc.exists) throw new Error("This deal isn't in the database anymore — it may have been removed by a teammate.");
    return dealFromDoc(doc);
  }

  async function addDeal(deal) {
    await db.collection("deals").doc(deal.id).set(dealToData(deal));
  }

  async function updateDeal(deal) {
    await db.collection("deals").doc(deal.id).set(dealToData(deal), { merge: true });
  }

  async function deleteDeal(id) {
    await db.collection("deals").doc(id).delete();
  }

  async function log(action, company, details) {
    await db.collection("logs").add({
      timestamp: new Date().toISOString(),
      user: Auth.userEmail(),
      company, action,
      details: details || "",
    });
  }

  // ---- Access control -------------------------------------------------
  // Approval lives in the "allowedUsers" collection (one doc per uid);
  // registration requests land in "accessRequests". The security rules
  // in SETUP.md are what actually enforce this — deals and logs are
  // unreadable until an allowedUsers doc for your uid exists.

  async function myAccess() {
    const doc = await db.collection("allowedUsers").doc(Auth.userId()).get();
    return doc.exists
      ? { allowed: true, role: doc.data().role || "member" }
      : { allowed: false };
  }

  async function requestAccess() {
    await db.collection("accessRequests").doc(Auth.userId()).set({
      email: Auth.userEmail(),
      requested: new Date().toISOString(),
    });
  }

  async function listAccessRequests() {
    const snap = await db.collection("accessRequests").get();
    return snap.docs
      .map((d) => ({ uid: d.id, email: d.data().email || "", requested: d.data().requested || "" }))
      .sort((a, b) => (a.requested || "").localeCompare(b.requested || ""));
  }

  async function listAllowedUsers() {
    const snap = await db.collection("allowedUsers").get();
    return snap.docs
      .map((d) => ({ uid: d.id, email: d.data().email || "", role: d.data().role || "member" }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  async function approveUser(uid, email) {
    await db.collection("allowedUsers").doc(uid).set({
      email,
      role: "member",
      added: new Date().toISOString(),
      addedBy: Auth.userEmail(),
    });
    await db.collection("accessRequests").doc(uid).delete();
  }

  async function declineRequest(uid) {
    await db.collection("accessRequests").doc(uid).delete();
  }

  async function removeUser(uid) {
    await db.collection("allowedUsers").doc(uid).delete();
  }

  return {
    init, listDeals, getDeal, addDeal, updateDeal, deleteDeal, log,
    myAccess, requestAccess, listAccessRequests, listAllowedUsers,
    approveUser, declineRequest, removeUser,
  };
})();
