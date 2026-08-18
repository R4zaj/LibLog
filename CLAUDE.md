# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Three independent npm projects (no workspace/monorepo tooling — install and run each separately):

| Dir                                  | What it is                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `server/`                            | Express + Prisma REST API (CommonJS, Node) — the only thing that touches the database                     |
| `desktop/`                           | Vite + React 19 + Electron librarian station (JS, no TypeScript)                                          |
| `mobile/`                            | Expo Router + React Native + Tamagui student app (TypeScript)                                             |
| `liblog_schema.sql`                  | Raw SQL source of truth for the Postgres schema (tables, views, triggers, `fn_mark_overdue_and_penalize`) |
| `System UI/`, `Mobile UI/`, `ICONS/` | Screenshot design references for desktop and mobile screens                                               |

## Commands

```bash
# server (port 5000; needs server/.env with DATABASE_URL, DIRECT_URL, JWT_SECRET)
cd server && npm run dev            # nodemon src/index.js
cd server && npx prisma generate    # after editing prisma/schema.prisma
cd server && npx prisma db pull     # schema is DB-first; pull instead of authoring migrations

# desktop
cd desktop && npm run dev           # Vite browser dev server (localhost:5173)
cd desktop && npm run lint          # eslint
cd desktop && ELECTRON=true npx vite            # Electron dev on macOS/Linux
cd desktop && ELECTRON=true npx vite build && npx electron-builder   # packaged build

# mobile
cd mobile && npm start              # expo start
cd mobile && npx expo run:android   # / run:ios — native build
```

Note the `dev:electron` and `build:electron` scripts in [desktop/package.json](desktop/package.json) use Windows `set VAR=x&&` syntax and fail on macOS/zsh — use the `ELECTRON=true …` forms above instead.

There is no test framework in any project. `server/test_*.js`, `server/check.js`, and `server/perf.js` are one-off scripts run directly with `node`.

## Architecture

**Data flow.** Both clients are thin — all business logic (penalty computation, borrow limits, suspension checks, attendance toggling) lives in `server/src/controllers/`. Routes in `server/src/routes/` are mounted under `/api/<domain>` in [server/src/index.js](server/src/index.js): `auth`, `literatures`, `dashboard`, `announcements`, `borrowing`, `attendance`, `reports`, `settings`, `notifications`.

**API base URLs are hardcoded, and the two clients point at different backends:**

- Desktop reads `import.meta.env.VITE_API_URL` at every call site, falling back to the deployed Render backend. There is no shared API client, so the expression is inlined per call — set `VITE_API_URL` in `desktop/.env` to point at a local server.
- Mobile reads `Constants.expoConfig.extra.apiUrl` from [app.json](mobile/app.json) via the single axios instance in [mobile/api/index.ts](mobile/api/index.ts), with the same Render fallback.

**Auth.** JWT signed in [server/src/controllers/authController.js](server/src/controllers/authController.js), verified by `verifyToken`/`isAdmin` in [server/src/middleware/authMiddleware.js](server/src/middleware/authMiddleware.js). `auth`, `settings` and `attendance` routes enforce `verifyToken` (settings additionally requires `isAdmin`); `literatures`, `dashboard` and `borrowing` are still open — check the route file before assuming a request is authenticated. Desktop stores the token in `localStorage`; mobile stores it via `expo-secure-store` behind [mobile/utils/Storage.ts](mobile/utils/Storage.ts) (falls back to `localStorage` on web). Mobile's axios response interceptor emits a `auth:logout` DeviceEventEmitter event on 401, which [mobile/context/AuthContext.tsx](mobile/context/AuthContext.tsx) listens for; that context also drives the `(auth)` ⇄ `(tabs)` redirect.

**Desktop offline mode.** [desktop/src/contexts/NetworkContext.jsx](desktop/src/contexts/NetworkContext.jsx) + [desktop/src/hooks/useOfflineApi.js](desktop/src/hooks/useOfflineApi.js) form the offline layer: GETs cache to `localStorage` under `liblog_cache_<key>`, and mutations while offline are pushed onto a persisted `liblog_sync_queue` and replayed on `online`. A queued mutation returns a fake `{ success: true, offlineQueued: true }` response, so any caller must handle a response with no real payload (see how `AttendanceScannerContext` fakes the scan result). Use `fetchWithOfflineSupport` rather than bare `fetch` for anything that should survive a dropped connection.

**Webcam scanning (desktop).** The camera stream lives in app-level providers — `AttendanceScannerContext` and `BorrowingContext` in [desktop/src/context/](desktop/src/context/) — and is portaled into the current page, so the stream survives route changes. Scanner UI changes usually belong in the context, not the page.

**Attendance toggle.** `POST /api/attendance/scan` looks up the user's most recent `attendance_logs` row (not just today's) and emits `CHECK_OUT` if the last action was `CHECK_IN`, otherwise `CHECK_IN`, computing `duration_minutes` on checkout. "Currently inside" counts are derived in JS by folding the day's logs per user, not from the SQL views.

## Conventions and gotchas

- **Prisma models are camelCase, DB tables snake_case** via `@@map`. Field names stay snake_case (`first_name`, `due_date`, `available_copies`). Enums are Postgres enums (`UserRole`, `BorrowStatus`, `PenaltyStatus`, …) — see [server/prisma/schema.prisma](server/prisma/schema.prisma).
- Controllers use the Prisma query API only; no `$queryRaw` anywhere. The shared client is [server/src/db.js](server/src/db.js).
- `library_settings` is a single row read with `prisma.librarySettings.findFirst()`; borrow duration, max books, penalty rate, and suspension threshold all come from there — never hardcode those values.
- Contrary to the README, `available_copies` is adjusted explicitly in [server/src/controllers/borrowingController.js](server/src/controllers/borrowingController.js) (`increment`/`decrement` inside the transaction), not by DB triggers. Don't add a second adjustment.
- The QR a student presents is their raw `student_id` (format `CCC-{year}-{0001}`, generated on register), not the `USR-…`/`BK-…` formats described in the README. `scanQR` also accepts a JWT and a `CCC-`-stripped fallback.
- README.md documents the intended design; several sections (route map, trigger-managed copies, QR formats, `USR-`/`BK-` prefixes) describe the plan rather than the shipped code. Verify against the source before relying on it.
- Mobile: **read the versioned Expo docs at https://docs.expo.dev/versions/v56.0.0/ before writing Expo code** (see [mobile/AGENTS.md](mobile/AGENTS.md)) — this project is on Expo 56 / RN 0.85 / React 19, where many older recipes are wrong. UI is Tamagui (`YStack`/`XStack`/`Text`), styled inline; routes are file-based under `mobile/app/` with `(auth)` and `(tabs)` groups and `typedRoutes` enabled.
- Desktop is plain JS with Tailwind v4 (via `@tailwindcss/postcss`), `react-router-dom` routes declared in [desktop/src/App.jsx](desktop/src/App.jsx), and `@` aliased to `desktop/src`. Electron runs with `nodeIntegration: true` / `contextIsolation: false` and no preload bridge.
- `desktop/*.cjs` and `desktop/*_dash.txt` are stale one-off codemods and dashboard backups — ignore them.

## Developer Notes

- The `library_settings` table is always a single row. Use `UPDATE` not `INSERT` when changing config values from the Settings page.
- `report_snapshots.payload` stores the full aggregated JSON of a generated report so the Reports page can reload the last report instantly without re-querying.
- Notifications are created server-side after each major event (borrow, return, check-in, check-out, penalty). Clients poll; there is no WebSocket.
