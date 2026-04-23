# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

No test runner is configured.

## Architecture

This is a single-page React app with no routing. All application logic lives in one large file: **`src/App.jsx`** (~1500+ lines). It contains:
- Top-level constants: `SECTORS`, `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, `CURRENCIES`, `STATUS_OPTIONS`, `DEFAULT_SETTINGS`
- Helper functions (`uid`, `convert`, `formatMoney`, `formatDate`)
- `buildDemoData()` — seeds demo assets/transactions/personnel for first-time users (DRC/Kivu context)
- Inline `GLOBAL_STYLES` string injected via `<style>` tag (Google Fonts + CSS variables)
- All React components and state in the default export

**`src/storage.js`** — Storage abstraction. Auto-detects backend:
- If `VITE_FIREBASE_*` env vars are set and non-placeholder: uses `firebaseStorage` (async) + `localStorage` as backup
- Otherwise: `localStorage` only
- Exposes sync `get`/`set` and async `getAsync`/`setAsync`. Sync path always reads from localStorage; async path reads from Firebase when configured.
- User data isolation: Firestore documents use `auth.currentUser.uid` as the document ID within each collection.

**`src/firebase.js`** — Firebase setup. Exports:
- `authService` — email/password and Google sign-in
- `dbService` — generic Firestore CRUD + `subscribeToCollection`
- `COLLECTIONS` — collection name constants (`assets`, `transactions`, `personnel`, `settings`)

## Firebase / Environment Setup

Copy `.env.example` to `.env.local` and fill in:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Without these vars the app runs fully offline using localStorage. Firebase Firestore requires an authenticated user before any read/write — unauthenticated state returns `null` from storage.

## Domain Context

The app targets heritage asset management in the DRC/Kivu region. UI labels are bilingual (French primary). Currencies supported: USD, CDF (Franc congolais), EUR, with configurable exchange rates stored in settings. Asset sectors: `retail`, `warehouse`, `apartment`, `agribusiness`, `equipment`, `other`.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, save state, save my work → invoke context-save
- Resume, where was I, pick up where I left off → invoke context-restore
- Code quality, health check → invoke health
