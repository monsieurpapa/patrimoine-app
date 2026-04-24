# TODOS

## T1 — Pending-invite collection for manager onboarding

**What:** Firestore `invites/{email}` collection. When a manager signs up, check for a pending invite, read the assetId, write roles/{uid} automatically.

**Why:** Without this, the invite flow only works if the manager already has an account. Patriarch sends invite, manager signs up, app has no memory of the invite — manager sees WelcomeScreen.

**Pros:** Seamless onboarding for new managers. Patriarch doesn't need to coordinate "create account first, then I'll invite you."

**Cons:** Adds one Firestore collection. Invite email must match signup email exactly.

**Context:** Required for Step 4 (manager invite flow). The data model should plan for `invites/{email}` as early as Step 1 (Firestore security rules must cover it). Current state: not built.

**Depends on:** Step 1 (roles/{uid}) must exist first. Build when implementing Step 4.

---

## ~~T2~~ — localStorage → Firestore migration on first Firebase login ✓ DONE

Shipped in commit `20a2d95`. On first Firebase login, if Firestore returns empty but localStorage has data, the app prompts "Données locales trouvées — importer vers le cloud?" and runs the migration.

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

---

## T6 — Sales payload server-side validation (Firestore rules)

**What:** The `sales` create rule currently validates `ownerId`, `managerId`, and asset assignment but does not validate the `items` array, individual quantities, or subtotals. A malicious client could write a sale with negative quantities, zero-price items, or mismatched subtotals (e.g., `quantity: 1, subtotal: 999999`).

**Why:** Client-side validation only protects honest users. A crafted request to the Firestore REST API bypasses the React UI entirely.

**Fix options:**
- Option A (Firestore rules CEL): Validate `items.size() > 0` and that each item has `quantity > 0` in the create rule. Full subtotal validation is impractical in CEL without iteration over the array.
- Option B (Cloud Function trigger): `onDocumentCreated('sales/{id}')` validates the full payload and deletes or flags invalid docs. More flexible but adds latency and infra.

**Recommended:** Option A for quantity/item-count guard (low friction), Option B deferred to when the sales pipeline has an audit requirement.

---

## T7 — Offline queue double-submit on network flap

**What:** In `SalesScreen` (`ManagerApp.jsx`), when `addDoc` succeeds server-side but the response is lost in transit (network drops after write, before client receives acknowledgment), the sale is queued in `heritage_sales_queue`. On reconnect, `replayQueue` calls `setDoc` with `_id` as the document ID — which correctly deduplicates if the original `addDoc` used a generated ID. However, the original `addDoc` generates a *random* Firestore doc ID that is not stored, so the queued `setDoc` creates a second document.

**Fix:** Before calling `addDoc`, generate a UUID and use `setDoc(doc(db, 'sales', uuid), ...)` instead. Store that same UUID in the queue entry as `_id`. The replay `setDoc` then hits the same document ID and is a no-op if the original write succeeded.

**Note:** The UUID+setDoc pattern is already the intended approach (see queue push code using `crypto.randomUUID()` for `_id`), but the initial submit still uses `addDoc`. The two need to be unified.

**Effort:** ~10 min. Change `addDoc(collection(db, 'sales'), ...)` → `setDoc(doc(db, 'sales', crypto.randomUUID()), ...)` in the submit handler.

**Context:** High-value as the number of owners and managers grows. Start with the 5 cases above as a baseline. Firebase emulator must be running for these tests (`firebase emulators:start --only firestore`). Add to CI pipeline once emulator is reliable.

**Depends on:** Nothing. Can build independently.
