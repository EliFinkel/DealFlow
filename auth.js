// Firebase Authentication wrapper. Accounts are created for teammates by
// whoever administers the Firebase project (SETUP.md) — there is no
// self-signup in the app itself, so only people the admin has added can
// ever sign in.

const Auth = (() => {
  let auth = null;

  function isConfigured() {
    const c = window.PIPELINE_CONFIG.firebase;
    return Boolean(c && c.apiKey && c.projectId && c.appId);
  }

  // Resolves once Firebase has checked for an existing session; returns
  // the signed-in user, or null if sign-in is still needed.
  function init() {
    firebase.initializeApp(window.PIPELINE_CONFIG.firebase);
    auth = firebase.auth();
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  function friendlyError(err) {
    switch (err.code) {
      case "auth/invalid-email": return "That doesn't look like a valid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Email or password is incorrect.";
      case "auth/too-many-requests": return "Too many attempts — wait a bit and try again.";
      default: return err.message || "Couldn't sign in.";
    }
  }

  async function signIn(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  async function signOut() {
    await auth.signOut();
  }

  async function sendPasswordReset(email) {
    try {
      await auth.sendPasswordResetEmail(email);
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }

  function userEmail() {
    return auth.currentUser ? auth.currentUser.email : "Unknown";
  }

  return { isConfigured, init, signIn, signOut, sendPasswordReset, userEmail };
})();
