// ============================================================
// Pipeline configuration — this is the ONLY file you need to edit.
// ============================================================

window.PIPELINE_CONFIG = {
  // Shown in the header.
  firmName: "Amiti",

  // From your Firebase project (SETUP.md, step 2 — "Project settings").
  // While apiKey is empty, the app runs in local mode: no sign-in, data
  // saved only in this browser. Fill these in to switch on the real,
  // shared, sign-in-protected database.
  firebase: {
    apiKey: "AIzaSyAOPcP5dtKRPru4H5Mm752jKSDokSMwZDc",
    authDomain: "dealflow-58bc4.firebaseapp.com",
    projectId: "dealflow-58bc4",
    storageBucket: "dealflow-58bc4.firebasestorage.app",
    messagingSenderId: "312430429461",
    appId: "1:312430429461:web:0b46ab4c32a382baba951c"
  },

  // Pipeline stages. Edit freely — order here is the order of the
  // filter chips. `color` is the tab color on each deal card.
  statuses: [
    { name: "New", color: "#6E7FB2" },
    { name: "In Review", color: "#B08A45" },
    { name: "Diligence", color: "#8A5FA0" },
    { name: "Term Sheet", color: "#3E8A7A" },
    { name: "Invested", color: "#4C8A55" },
    { name: "Passed", color: "#98939E" },
    { name: "AION", color: "#A64E79" },
  ],
};
