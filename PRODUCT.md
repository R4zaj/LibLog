# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Two distinct personas, served by two separate client apps sharing one backend:

- **Librarians/staff** (desktop app): operate the front desk of a college library — scan patron QR codes, manage the book catalog, process borrows/returns, monitor real-time occupancy, and configure library settings.
- **Students and faculty** (mobile app): self-service — view the catalog, present their own QR code for check-in/out, track borrowed books and due dates, and receive notifications.

## Product Purpose

LibLog (shipped under the working title "CCC LIB APP") is a library logbook and circulation management system for a college library: QR-based attendance check-in/out, book borrowing/return, penalty tracking, and analytics, replacing manual sign-in sheets and paper circulation records.

## Positioning

Undecided — this is a personal/school project, not yet deployed at a real institution, so there is no confirmed market position or competitive claim to preserve. Do not invent one.

## Operating Context

- Desktop app runs at a physical library front desk (Electron-wrapped web app), used by staff processing walk-in patrons via webcam QR scanning.
- Mobile app is carried by students/faculty for self-service QR presentation and catalog browsing.
- Both apps talk to a shared Express/Prisma REST API; desktop also supports an offline mode (cached GETs + queued mutations replayed on reconnect).
- Attendance and borrowing are logged as an audit trail ("logbook") of who entered/exited and who holds which books, not just current-state records.

## Capabilities and Constraints

- Roles: STUDENT, FACULTY, ADMIN. Student QR is the raw `student_id` (format `CCC-{year}-{0001}`).
- Borrow duration, max books, penalty rate, and suspension threshold are configurable via a single-row `library_settings` record — never hardcoded.
- Penalties (overdue/damage/lost) accrue to a per-user penalty balance and can trigger account suspension.
- Notifications are server-generated after major events (borrow, return, check-in/out, penalty); clients poll — no real-time push/WebSocket.
- No test framework in any project; scripts under `server/` are one-off diagnostic tools.
- README.md documents intended design in places the shipped code has diverged from (e.g. DB triggers vs. controller-side logic, QR ID formats) — treat README claims as aspirational unless verified against source.

## Brand Commitments

- Deployment status: personal/school project, not yet deployed at a real institution. "CCC" (student ID prefix, desktop window title "CCC LIB APP", mobile app name "CCC LIB APP Mobile") is the currently committed institution-specific branding, kept as-is per the user rather than genericized. "LibLog" is the project/system codename used in README and code but is not the confirmed user-facing product name.
- Android is the primary reference platform for the mobile app's native design guidance; iOS ships from the same Expo/Tamagui codebase but is secondary.

## Evidence on Hand

- No real college partnership, logos, testimonials, or case studies exist — none should be fabricated.
- Visual references exist only as screenshots in `System UI/`, `Mobile UI/`, and `ICONS/` (design references, not written docs).
- No PRODUCT.md or DESIGN.md existed prior to this file.

## Product Principles

1. Business logic lives entirely server-side (`server/src/controllers/`); both clients are thin — design work should not assume client-side computation of penalties, limits, or suspension logic.
2. Configuration (borrow durations, penalty rates, capacity) is data-driven from `library_settings`, never hardcoded in UI copy or logic.
3. Desktop is a staff operational tool (Operate mode: scanability, speed, front-desk usability); mobile is a student self-service tool (also Operate mode, but for a less expert, occasional user).
4. The system is an audit logbook first — attendance and borrowing history matter as much as current state.
5. Since this is unreleased, prefer honest placeholder/institution-specific content ("CCC") over invented generic branding or fabricated evidence.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established.
