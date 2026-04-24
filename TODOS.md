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

---

## T3 — Stock snapshot to bound unbounded Firestore reads (retail ERP)

**What:** Introduce a `stockSnapshots/{ownerId}` document (or subcollection) storing a periodic snapshot of current stock per item, plus the timestamp it was taken. The BoutiqueERP `loadData` query then fetches only sales since the last snapshot, not all-time sales.

**Why:** BoutiqueERP currently loads ALL sales docs with `where('ownerId', '==', uid)` — no date bound, no limit. Stock is correctly derived from initialStock minus all sales. This is correct but grows linearly: at 3 sessions/day × 365 days = ~1,000 sessions/year. Each page load reads all of them. At year 2, that's 2,000 Firestore reads per owner view. Multiply by catalog item count for client-side iteration.

**Pros:** Bounds Firestore read costs. Keeps stock derivation correct. No change to the sales write path.

**Cons:** Adds snapshot write logic (triggered manually or on initialStock edit). Needs careful design to avoid snapshot/sales race condition.

**Context:** v1 is correct for a boutique with <6 months of data. Revisit when the boutique has been running for several months and the owner notices slow load or Firestore costs. The stock derivation approach (never stored as counter) remains the right choice — snapshots just bound how far back the query needs to go.

**Depends on:** T4 (stockIn events) is a prerequisite if we ever want to replace initialStock edits with append-only events.

---

## T4 — stockIn event collection to replace initialStock mutation (retail ERP)

**What:** Append-only `stockIn/{eventId}` collection recording each restock event: `{ ownerId, assetId, itemId, quantity, date, note }`. Replace the ItemForm's initialStock edit with a "Réapprovisionner" flow that writes a stockIn event. The `currentStock` formula becomes `initialStock + sum(stockIn events) - sum(sales)`.

**Why:** When the owner edits `initialStock` today, all derived stock calculations shift retroactively with no audit trail. A restock of 50 units looks identical in the data to a data correction. The patriarch cannot tell whether a stock number changed because of sales or because an initialStock edit was made.

**Pros:** Full audit trail. Owner can see exact restock history. currentStock formula remains purely derived (no mutable counter). Correct in the face of concurrent edits.

**Cons:** Bigger scope — new UI flow, new collection, new Firestore rules. Requires removing initialStock edit capability once stockIn events are the source of truth.

**Context:** The design doc flagged this as a "v2 consideration." Build after T3 (snapshots) is in place, since snapshots will need to account for stockIn events in their calculation.

**Depends on:** T3 preferred first. Significant scope — plan as a standalone feature sprint.

---

## T5 — Firestore rules unit tests for retail ERP (catalog + sales)

**What:** Add `@firebase/rules-unit-testing` + Firebase emulator to the test suite. Cover: (a) manager reads only their owner's catalog (not another owner's), (b) manager cannot create a sale for an unassigned asset, (c) manager cannot set managerId to someone else's UID, (d) direct `getDoc` on a sale doc is owner-scoped, (e) legacy manager (ownerId=null in roles) still reads catalog.

**Why:** The security rules for the retail ERP are currently untested in CI. A regression in `isManagerOf()` or the sales create rule could expose cross-owner data or allow unauthorized sales writes. Manual testing in the Firebase Console is not repeatable.

**Pros:** Security model verifiable in CI. Regressions caught before deployment.

**Cons:** Requires Firebase emulator setup (~30 min). Adds `@firebase/rules-unit-testing` to devDependencies.

**Context:** High-value as the number of owners and managers grows. Start with the 5 cases above as a baseline. Firebase emulator must be running for these tests (`firebase emulators:start --only firestore`). Add to CI pipeline once emulator is reliable.

**Depends on:** Nothing. Can build independently.
