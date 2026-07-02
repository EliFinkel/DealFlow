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
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },

  // Pipeline stages. Edit freely — order here is the order of the
  // filter chips. `color` is the tab color on each deal card.
  statuses: [
    { name: "New",        color: "#5B6ABF" },
    { name: "In Review",  color: "#B27A2B" },
    { name: "Diligence",  color: "#7A5BA6" },
    { name: "Term Sheet", color: "#2B8A78" },
    { name: "Invested",   color: "#3D7A3D" },
    { name: "Passed",     color: "#8A8578" },
  ],
};
