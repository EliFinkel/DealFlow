// Firebase Authentication wrapper. Teammates can register themselves from
// the sign-in screen, but a new account can't see any data until an admin
// approves it (the Firestore security rules in SETUP.md check the
// allowedUsers collection on every read and write — approval is enforced
// by the database, not by this page).

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
      case "auth/email-already-in-use": return "An account with this email already exists — sign in instead.";
      case "auth/weak-password": return "Password is too weak — use at least 6 characters.";
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

  // Creates the account and signs it in. Access to data still requires
  // admin approval — see the security rules.
  async function register(email, password) {
    try {
      await auth.createUserWithEmailAndPassword(email, password);
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

  function userId() {
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  return { isConfigured, init, signIn, register, signOut, sendPasswordReset, userEmail, userId };
})();
