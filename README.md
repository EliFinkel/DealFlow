# Dealflow

The firm's internal dealflow pipeline. A card per deal on the board
([index.html](index.html)); click one to open its own page
([deal.html](deal.html)) to view, edit, or create, then Save to return to the
board. Deals are archived, never deleted, and every change is logged.

**Right now this runs in local mode**: data is saved only in your own
browser, nothing is shared with the team yet. A shared Firebase database and
per-teammate sign-in are fully built but switched off — see
[SETUP.md](SETUP.md) for how to turn them on when you're ready.

- **Hosting:** GitHub Pages (free, static, nothing to maintain).
- **Database (once connected):** Firestore (Google Firebase) — free tier,
  doesn't sleep or expire, locked down so only accounts you create can
  read or write.
- **Files (once connected):** Firebase Storage, one folder per deal.
- **Sign-in (once connected):** email + password, accounts created by
  whoever administers the pipeline — no public sign-up.

**To set it up or fix something, read [SETUP.md](SETUP.md).**
The only file that ever needs editing is `config.js`.
