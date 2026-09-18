---
target: mobile/app/(tabs)/profile.tsx
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/profile.tsx"
target_fingerprint: "sha256:ab6281006e74a0dccb797348b40f30281df5370c4596f0334e3f68ed95305756"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/profile.tsx
timestamp: 2026-09-18T17-57-18Z
slug: mobile-app-tabs-profile-tsx
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | DynamicQrCode handles live state well, but logout/programs-fetch/edit-profile give no loading indicator |
| 2 | Match System / Real World | 3/4 | Library-specific fields fit well; Year Level free text vs picker-driven Program is inconsistent |
| 3 | User Control and Freedom | 2/4 | No confirmation on Logout |
| 4 | Consistency and Standards | 1/4 | No SafeAreaView, emoji icons, extensive undocumented color drift |
| 5 | Error Prevention | 1/4 | Logout has zero confirmation; no client-side validation on edit form |
| 6 | Recognition Rather Than Recall | 3/4 | Menu sub-labels and Program picker support recognition well |
| 7 | Flexibility and Efficiency | 3/4 | QR modal, favorites detail, direct catalog deep-link are efficient shortcuts |
| 8 | Aesthetic and Minimalist Design | 2/4 | Individually clean modals, but a heavy solid-accent header dominates first-screen real estate |
| 9 | Error Recovery | 1/4 | Some paths use Alert.alert for errors, but logout and programs fetch swallow errors to console only |
| 10 | Help and Documentation | 3/4 | Help & Support and About exist and are reachable |
| **Total** | | **21/40** | **Acceptable (52.5%)** |

## Design Specificity Verdict

LLM assessment: reads as a generic account-settings template with library-flavored labels bolted on. Header/menu skeleton is the exact shape of a stock RN profile tutorial, with hardcoded fallback identity data that looks like leftover seed data. DynamicQrCode and the favorites book-detail sub-modal are genuinely well-built and domain-specific, but surrounded by boilerplate.

Deterministic scan: detector reports only 1 finding, but manual review found 18 distinct undocumented hex values, including a second undocumented green competing with the documented success token for the same meaning, on exactly the known "two colors on one line" detector blind spot.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Least system-compliant screen this session by a wide margin: no SafeAreaView, emoji icons (5th occurrence), 18 undocumented colors mostly invisible to the detector, and the most accent-saturated screen yet. Most concerning functionally: Logout has zero confirmation, and fallback placeholder identity data renders identically to real data.

## What's Working

1. DynamicQrCode is genuinely well-engineered — live token rotation, graceful fallback, explicit user-facing "Connection lost" state.
2. The favorites empty state follows the proper pattern: icon, headline, copy, clear CTA.
3. The favorite book detail sub-modal is authored, not templated.

## Priority Issues

[P0] No confirmation on Logout
- Why it matters: a single un-confirmed tap ends the session immediately, less friction than this same screen's "Remove favorite" action.
- Fix: add an Alert.alert confirmation step before calling signOut().
- Suggested command: /impeccable harden

[P0] Missing SafeAreaView — the 5th occurrence of an already-fixed pattern
- Why it matters: roots in a plain ScrollView with a hardcoded paddingTop={60} instead of SafeAreaView, unlike all four sibling screens fixed this session.
- Fix: swap to SafeAreaView.
- Suggested command: /impeccable adapt

[P1] Emoji-as-icon violates the lucide-only rule — 5th occurrence
- Why it matters: raw envelope and graduation-cap glyphs stand in for icons in a file that already imports and uses lucide elsewhere.
- Fix: replace with lucide Mail/GraduationCap.
- Suggested command: /impeccable polish

[P1] Accent over-concentration and extensive undocumented color drift
- Why it matters: full-width solid-accent header plus 5+ more solid-accent fills make this the most accent-saturated screen this session. Separately, 18 undocumented hex values exist, including a second undocumented green competing with the documented success token.
- Fix: apply the same restraint pattern used to fix index.tsx; consolidate colors onto documented tokens.
- Suggested command: /impeccable colorize

[P2] Silent failure on the programs fetch — the systemic gap's 5th occurrence
- Why it matters: a failed/slow fetch opens the Course/Program picker to a plain empty list, indistinguishable from "zero programs exist."
- Fix: add loading/error states, matching the established pattern.
- Suggested command: /impeccable harden

## Persona Red Flags

Jordan (Confused First-Timer): no required/optional field indication; inconsistent input paradigm between free-text Year Level and picker-driven Program.

Casey (Distracted Mobile User): Logout is a single un-confirmed tap with nothing warning of consequence.

Riley (Stress Tester): fallback placeholder identity data renders identically to real data during a slow/partial load.

## Minor Observations

- Icon-only close buttons across 7 modals lack accessibility labels and mostly sit under 48dp with no hitSlop compensation.
- Alert.alert is used for feedback in some places while DynamicQrCode uses inline UI — inconsistent within the same screen.
- The QR modal shows the raw scannable student ID with no privacy framing.
- #f0eef5 is a near-duplicate rounding-error variant of the documented #f3f4f6.

## Provocative Questions

1. Should Logout really have less confirmation friction than removing a single favorited book?
2. Should the "Show ID QR" modal get more deliberate privacy framing given the QR is the literal scannable credential?
3. Was profile.tsx excluded from this session's four-screen hardening pass, or edited afterward and not re-reviewed?
