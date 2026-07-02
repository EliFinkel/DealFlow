# Dealflow — Setup Guide

A dealflow pipeline for the firm. One page, a card per deal. There is **no
server, nothing to pay for, and nothing to maintain**.

**Right now, the shared database is switched off.** Double-click
`index.html` and the app just works, with sample deals to try — but data is
saved only in that one browser and isn't shared with the rest of the team.
That's Step 0 below.

When you're ready for the whole firm to work off one shared, sign-in
protected pipeline, do Steps 1–5: they put the app online, create a free
Firebase project (Google's app backend service) to hold the data, and give
each teammate their own login. About 30 minutes, all clicking, no coding.
Nothing is lost by waiting — deals you add in local mode just stay in that
browser until then.

---

## Step 0 — Try it right now (optional, 10 seconds)

Double-click `index.html` in this folder. The app opens with sample deals —
add, edit, and archive freely. Data is saved only in your own browser via
`localStorage`, and clearing your browser data clears it too.

---

## Step 1 — Put the app online with GitHub Pages (free)

1. Create a free account at **github.com** (if you don't have one).
2. Top-right **+** → **New repository**. Name it `dealflow`, leave it
   **Public** (required for free hosting — the files are just this generic app
   code; none of your deal data or anything secret ever goes in here), click
   **Create repository**.
3. On the new repo page click **uploading an existing file**, then drag in
   **everything in this folder** (including the `vendor` folder). Click
   **Commit changes**.
4. Go to **Settings → Pages** (left sidebar). Under *Branch* choose `main` and
   `/ (root)`, click **Save**.
5. After a minute the page shows your site address, like
   `https://YOURNAME.github.io/dealflow/` — **copy it, you'll need it below.**
   Opening it now shows the same local-only app as Step 0.

---

## Step 2 — Create a Firebase project (free)

Firebase is Google's app-backend service — it's what will actually hold the
deals, once connected. It runs on the same Google Cloud infrastructure as
Gmail, so it's a mainstream, audited platform (SOC 2/3, ISO 27001/27017/27018
certified) — safe for confidential deal data, as long as it's locked down to
your team, which the rules below do.

1. Go to **console.firebase.google.com**, sign in with any Google account
   (a personal Gmail is fine — this doesn't need to be a work account), and
   click **Create a project**. Name it `dealflow`, and you can skip Google
   Analytics (not needed).
2. Once the project opens, click the **`</>`** (web) icon on the project
   overview page to register a web app. Nickname it `dealflow`, and skip
   Firebase Hosting (you're already using GitHub Pages).
3. Firebase shows you a `firebaseConfig` object with values like `apiKey`,
   `authDomain`, `projectId`, etc. **Copy the whole block somewhere** — you'll
   paste these into `config.js` in Step 5.

---

## Step 3 — Turn on Authentication, Firestore, and Storage

In the left sidebar of the Firebase console:

1. **Build → Authentication** → **Get started** → under *Sign-in method*,
   enable **Email/Password** (the first option in the list) → **Save**.
2. **Build → Firestore Database** → **Create database** → choose a location
   close to your team → start in **production mode** → **Enable**.
3. **Build → Storage** → **Get started** → keep the defaults → **Done**.
   (This is where deal file attachments live.)

### Lock the data down to your team

By default a fresh database denies everyone — you need to explicitly allow
signed-in users. This is the step that makes the app **secure**: only people
you've created an account for (Step 4) can read or write anything.

4. Still in **Firestore Database**, click the **Rules** tab, replace
   everything with this, and click **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
5. In **Storage**, click the **Rules** tab, replace everything with this,
   and click **Publish**:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## Step 4 — Create a login for each teammate

There's no sign-up screen in the app on purpose — you create accounts, so
only people you've actually added can ever get in.

1. **Build → Authentication → Users** tab → **Add user**.
2. Enter each teammate's email and a temporary password, and click **Add
   user**. Repeat for everyone who needs access (including yourself).
3. Send each person their email + temporary password. The sign-in screen has
   a **Forgot password?** link they can use to set their own password on
   first login (it emails them a reset link — no setup needed, Firebase
   handles this automatically).

---

## Step 5 — Connect everything in config.js

1. On your GitHub repo page, click **`config.js`**, then the **pencil icon**
   (Edit this file).
2. Paste your six values from Step 2 into the `firebase` block:
   ```js
   firebase: {
     apiKey: "PASTE apiKey",
     authDomain: "PASTE authDomain",
     projectId: "PASTE projectId",
     storageBucket: "PASTE storageBucket",
     messagingSenderId: "PASTE messagingSenderId",
     appId: "PASTE appId",
   },
   ```
   (You can also rename the pipeline stages in the `statuses` list — now or
   any time later.)
3. Click **Commit changes**. GitHub republishes the site in about a minute.
   The site now requires sign-in for everyone, and whatever was in
   local-only mode stays in that one browser — it doesn't carry over.
4. Open your site address and sign in with one of the accounts from Step 4.
   Add a test deal — then check the Firebase console's **Firestore Database**
   tab and watch the document appear. That's the database, and it's shared:
   anyone who signs in sees the same pipeline.

---

## How it stays simple

- **History is permanent.** Deals are archived, never deleted — the Archive
  tab keeps everything searchable forever, and (once connected) the **logs**
  collection in Firestore records every change (who, when, what).
- **Nothing to maintain.** GitHub Pages hosting is free and static; Firebase's
  free tier (Spark plan) doesn't expire or pause a low-traffic internal tool
  like this — no bill, nothing to renew.
- **Locked down, not locked out.** Only accounts you create in Step 4 can
  sign in at all, and the rules in Step 3 mean nobody else can read or write
  the data even if they somehow got the site URL.

## If something goes wrong

| Symptom | Fix |
|---|---|
| **"Email or password is incorrect"** | Double-check the account exists under Authentication → Users, and the password matches. Use **Forgot password?** to reset it. |
| Sign-in screen never finishes loading | The values in `config.js`'s `firebase` block don't match a real project — re-copy them from Step 2 (Project settings → your web app → SDK setup and configuration). |
| **"Missing or insufficient permissions"** when saving | The Firestore/Storage rules in Step 3 weren't published, or don't match exactly — re-check both Rules tabs. |
| A teammate can't sign in | They don't have an account yet — add one under Authentication → Users (Step 4). |
| Changed `config.js` but nothing happened | GitHub takes ~1 minute to republish; hard-refresh the page (Cmd/Ctrl+Shift+R). |
