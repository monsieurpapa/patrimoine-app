# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-04-24

### Added

- **Retail ERP — Boutique module** (`src/BoutiqueERP.jsx`): Owner-facing catalog management with CRUD for items (name, sector, unit, initial stock, price), per-item sales history, and low-stock alerts. Catalog stored in `catalog/{ownerId}` Firestore collection.
- **Manager sales entry** (`src/ManagerApp.jsx` — Ventes tab): Mobile-first sales grid for assigned retail assets. Managers tap items, set quantities, and submit sales sessions. Derived stock (`initialStock - sum(sales)`) shown per item.
- **Offline queue** (`localStorage:heritage_sales_queue`): Sales submitted while offline are queued and replayed with `setDoc` + UUID for idempotent delivery on reconnect.
- **Firestore rules for retail ERP** (`firestore.rules`): `catalog` read scoped to owner + assigned managers; `sales` create requires `isRetailManagerOf()` (non-null ownerId, explicit asset assignment, managerId match); manager reads only own sales.
- **`isRetailManagerOf()` Firestore CEL function**: Rejects legacy null-ownerId manager roles from creating retail sales, preventing cross-owner sale injection.
- **Composite Firestore indexes** (`firestore.indexes.json`): `managerId + assetId + submittedAt` for manager history query; `ownerId + assetId + submittedAt` for owner view.
- **`src/utils.js`**: Extracted pure helpers `fmtDate`, `fmtMoney`, `currentStock(item, sales)` for testability.
- **Vitest test suite** (`src/boutique.test.js`, `src/storage.test.js`): 18 tests covering stock derivation, formatting, and storage abstraction (100% coverage of pure functions).
- **TODOS T6, T7**: Documented sales payload server-side validation and offline queue double-submit for follow-up.

### Fixed

- `getDocs` missing from Firestore import in `BoutiqueERP.jsx` (would crash Ventes tab on mount).
- `ItemForm` submit button invisible due to missing `btn-primary` modifier class.
- `--warning` CSS variable undefined, causing amber badges to fall back to Tailwind's `#f59e0b` instead of palette `#C89B3C`.
- `loadHistory` queried `sales` by `ownerId` — Firestore rule checks `managerId`, so the entire query was rejected. Fixed to filter by `managerId == user.uid`.
- Sales create rule used `isManagerOf()` (accepts null ownerId) — tightened to `isRetailManagerOf()`.

### UX / Design

- Safe-area padding (`env(safe-area-inset-bottom)`) on SalesScreen sticky footer for iPhone notch.
- Item names in sales grid truncate to 2 lines via `-webkit-line-clamp: 2` preventing layout overflow.
- QtyModal backdrop tap-to-dismiss + event propagation guard.

---

## [0.0.0] — initial

Project bootstrapped with React + Vite. Firebase Auth (email/password + Google), Firestore multi-user storage, owner/manager/superadmin roles, manager invites, reports inbox, PWA installability, localStorage migration on first Firebase login.
