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

  return { init, listDeals, getDeal, addDeal, updateDeal, deleteDeal, log };
})();
