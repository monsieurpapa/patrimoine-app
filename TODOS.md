# TODOS

## T1 — Pending-invite collection for manager onboarding

**What:** Firestore `invites/{email}` collection. When a manager signs up, check for a pending invite, read the assetId, write roles/{uid} automatically.

**Why:** Without this, the invite flow only works if the manager already has an account. Patriarch sends invite, manager signs up, app has no memory of the invite — manager sees WelcomeScreen.

**Pros:** Seamless onboarding for new managers. Patriarch doesn't need to coordinate "create account first, then I'll invite you."

**Cons:** Adds one Firestore collection. Invite email must match signup email exactly.

**Context:** Required for Step 4 (manager invite flow). The data model should plan for `invites/{email}` as early as Step 1 (Firestore security rules must cover it). Current state: not built.

**Depends on:** Step 1 (roles/{uid}) must exist first. Build when implementing Step 4.

---

## T2 — localStorage → Firestore migration on first Firebase login

**What:** On first Firebase login, if Firestore data is empty but localStorage has data, offer to upload localStorage data to Firestore.

**Why:** If the patriarch has been using the app in localStorage-only mode during development, enabling Firebase + roles will show him WelcomeScreen — his data is still in localStorage but the app doesn't look for it.

**Pros:** Preserves real usage data. No "start over" moment for the patriarch.

**Cons:** One-time migration logic. Edge case if Firestore and localStorage both have data.

**Context:** Affects the patriarch specifically. Run once on first successful Firebase auth when Firestore is empty. Show a toast: "Données locales trouvées — importer vers le cloud?" Current state: not built.

**Depends on:** Firebase Auth + Firestore rules (Step 1).
