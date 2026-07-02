// Data layer: reads and writes deals through Firestore, and deal files
// through Firebase Storage. This is the real, shared, multi-user database —
// every signed-in teammate reads and writes the same data.
//
//   - "deals" collection: one document per deal (never deleted, only
//     archived, so history survives forever)
//   - "logs" collection: append-only history of every change
//   - Storage path "deal-files/<deal id>/<filename>": attachments

const FirebaseStore = (() => {
  let db = null;
  let storage = null;

  async function init() {
    db = firebase.firestore();
    storage = firebase.storage();
  }

  function dealFromDoc(doc) {
    const d = doc.data();
    return {
      id: doc.id,
      company: d.company || "", oneLiner: d.oneLiner || "", founders: d.founders || "",
      status: d.status || "", sector: d.sector || "", source: d.source || "", owner: d.owner || "",
      notes: d.notes || "", questions: d.questions || "",
      created: d.created || "", updated: d.updated || "", archived: Boolean(d.archived),
    };
  }

  function dealToData(deal) {
    return {
      company: deal.company, oneLiner: deal.oneLiner, founders: deal.founders, status: deal.status,
      sector: deal.sector, source: deal.source, owner: deal.owner,
      notes: deal.notes, questions: deal.questions,
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

  async function log(action, company, details) {
    await db.collection("logs").add({
      timestamp: new Date().toISOString(),
      user: Auth.userEmail(),
      company, action,
      details: details || "",
    });
  }

  // ---- Attached files ----------------------------------------------------

  function dealFolder(deal) {
    return storage.ref("deal-files/" + deal.id);
  }

  async function listFiles(deal) {
    const res = await dealFolder(deal).listAll();
    return Promise.all(res.items.map(async (item) => {
      const [meta, url] = await Promise.all([item.getMetadata(), item.getDownloadURL()]);
      return { name: item.name, size: meta.size, webUrl: url };
    }));
  }

  async function uploadFile(deal, file) {
    await dealFolder(deal).child(file.name).put(file);
  }

  return { init, listDeals, getDeal, addDeal, updateDeal, log, listFiles, uploadFile };
})();
