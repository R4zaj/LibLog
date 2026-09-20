# Activity Log

Dev progress notes for LibLog. Newest entries at the top.
Format: YYYY-MM-DD - what happened / what's next

## 2026-09-20
- Enforced light theme lock across `mobile/components/useColorScheme.ts`, `mobile/app/_layout.tsx`, and `mobile/app/+html.tsx` to prevent theme auto-reverting to dark mode when rendering in web preview tools such as WebFrame Pro.
- Fixed `ERR_QUIC_PROTOCOL_ERROR` sign-in failures by ensuring local development environment defaults to localhost API instead of the production backend (updated `mobile/app.json` and `mobile/api/index.ts`).
- Fixed a layout bug in the custom bottom tab bar (`mobile/app/(tabs)/_layout.tsx`) where labels were collapsing horizontally instead of wrapping under icons.
- Conducted a UX & Visual Character Overhaul for `mobile/app/(tabs)/search.tsx` and `mobile/app/(tabs)/borrowed.tsx` per `DESIGN.md`:
  - Consolidated Search filter UI into a unified scrolling chip row.
  - Rebuilt card architectures across both screens with a consistent pure white surface, soft shadows, and a 3:4 aspect ratio for book covers.
  - Implemented conversational headers in Borrowed Log for a more humanized summary of active / overdue loans.
  - Docked a full-width actionable instruction banner with a QR code to the bottom of active borrow cards.
- Master UX Polish & Reading Room consistency check completed: removed redundant borders and shadows, implemented mobile-native Bottom Sheet pattern for Notifications, standardized all screen return headers to a single `ArrowLeft` icon with no native headers, and disabled the right-side vertical scrollbar on all mobile app screens.

## 2026-09-19
- Implemented dynamic bottom dock visibility across all mobile tab screens (dock hides on scroll down and reveals on scroll up using `Animated.timing` for smoother transitions).
- Replaced the Profile tab in the bottom dock with a new History feed (`history.tsx`). Created an activity feed UI with segmented pill filtering (All, Attendance, Borrows, Penalties) merging data from attendance and borrowing API endpoints. Profile is now accessed via the top right corner avatar in the Dashboard.
- Made the "Due Soon" cards on the Dashboard (`index.tsx`) interactive, routing to `/borrowed` on press, with a trailing `ScanLine` action routing to `/scan`. Implemented clear urgency pills ("Overdue by X days" in red, "Due in X days" in amber).
- Impeccable design pass on mobile (init -> document -> critique/fix loop per screen), all uncommitted:
  - Context: ran /impeccable init (product interview) and /impeccable document (scan mode) to establish PRODUCT.md and mobile/DESIGN.md + mobile/.impeccable/design.json as the durable product/design record - college library app, unreleased, "CCC LIB APP" branding kept as-is, Android as the primary native reference platform, single accent #6C48C5 ("The Reading Room" / One Accent Rule), 5-role type scale.
  - Ran paired design-review + detector critiques (dual-agent) against all 5 mobile tab screens, then fixed the findings and re-critiqued to confirm the score moved:
    - `scan.tsx`      18/36 -> 31/40 (both P0s + all P1s cleared)
    - `search.tsx`    20/40 -> 32/40 (both P0s + all 3 P1s cleared)
    - `borrowed.tsx`  19/40 -> 31/40 (both P0s + P1 cleared)
    - `index.tsx`     18/36 -> 25/36 (P0 + both P1s cleared; a new accent-saturation P1 the color fix introduced was found and fixed in the same pass)
    - `profile.tsx`   21/40 scored, fixed, not yet re-critiqued
  - Recurring fixes applied across screens: added SafeAreaView/edge-to-edge insets (scan, search, borrowed, profile all previously used a hardcoded status-bar offset); replaced silent fetch-failure states with a real error/retry UI on every screen's data fetching (previously a dead backend and an empty account rendered identically); replaced raw emoji/Unicode glyphs with lucide icons everywhere (calendar, clock, checkmark, book, arrow glyphs); remapped drifted font sizes onto DESIGN.md's 5 type roles; added accessibilityLabel/Role and 48dp touch targets to icon-only controls.
  - Screen-specific: fixed search.tsx's category filter tabs (were filtering against the wrong field and silently no-op'ing); stripped search.tsx's undocumented orange/blue per-genre coloring per the One Accent Rule; investigated and fixed borrowed.tsx's dead Return button - found the desktop-only /borrowing/return endpoint has no ownership check, so wiring a self-return from mobile would let a student mark a book returned without physically returning it, and replaced it with an honest "Return at the library" link into the scan tab instead; aligned borrowed.tsx's due-date/overdue math with index.tsx's (previously the same record could show "Due Today" on one screen and "Overdue" on the other); found and fixed an accent-oversaturation regression on index.tsx (Today's Highlight card and every Recommended book cover had collapsed onto one full-strength solid-purple fill during the color cleanup, losing the covers' alternation - both reworked to a tinted/contained treatment); added a logout confirmation dialog and de-saturated the solid-purple profile header on profile.tsx; fixed index.tsx's hardcoded "Good afternoon" greeting to compute from actual time of day.
  - Consolidated ~20 undocumented one-off hex colors across index.tsx and profile.tsx onto DESIGN.md's documented tokens (incl. two independent undocumented greens that were each competing with the documented success token for the same meaning).
- Next: re-run /impeccable critique on profile.tsx to confirm its fix pass; manually QA on an Android emulator/device per the checklist covering all 5 screens (SafeAreaView insets and 48dp touch targets don't render correctly in the web preview); decide whether search.tsx's Books/Research/Magazines category taxonomy should be formalized as a real DESIGN.md token set instead of icon/label-only; then commit and push.

## 2026-09-18
- Mobile audit + fixes, all uncommitted: hardened mobile/api/index.ts (config'd base URL via app.json extra.apiUrl, GET retry/backoff, split auth:logout from api:network-error so offline no longer forces logout); added mobile/types/api.ts contracts; replaced static QR with mobile/components/DynamicQrCode.tsx (30s signed qr-token, countdown, fallback to student_id) in profile.tsx/scan.tsx; guarded index.tsx dashboard poll behind useFocusEffect + auth check; converted borrowed.tsx/search.tsx catalog lists to FlatList; fixed server/src/index.js CORS to allow any localhost port instead of a hardcoded list.
- Ran a full Playwright E2E pass against the live Render backend (throwaway DB user, deleted after) - login, dashboard, QR refresh, search, borrowed, notifications, offline resilience, and invalid-token redirect all confirmed working; caught a real (harmless) instance of a token-removal race in AuthContext.signOut.
- Next: commit these changes; verify sign-up OTP and forgot-password manually (no server console access from automation); fix the signOut token-removal race if it recurs with real impact.

## 2026-09-14
- Created this log. In progress: uncommitted changes in server/src/controllers/borrowingController.js (not yet described/committed).

## Older Commits
- 2026-09-?? - a159eb8 feat(mobile): add forgot password screen and link in sign-in
- 2026-09-?? - c07cb3d feat(auth): add forgot password and reset password endpoints
- 2026-09-?? - 89f096d feat(mobile): update branding to CCC LIB APP
- 2026-09-?? - 566f9b9 fix: make attendance stats public and prevent 403 on null/expired tokens
- 2026-09-?? - 6faeb19 fix: completely remove is_archived from reports and literature controllers
