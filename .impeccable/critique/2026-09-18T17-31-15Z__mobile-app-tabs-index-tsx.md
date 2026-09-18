---
target: mobile/app/(tabs)/index.tsx
total_score: 18
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/index.tsx"
target_fingerprint: "sha256:4cb8cd86516cee2db30cda8188d3c7d1dc5d40d0a418cf5688d9f013c557fb9c"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/index.tsx
timestamp: 2026-09-18T17-31-15Z
slug: mobile-app-tabs-index-tsx
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Initial load is coherent, but the 30s background poll gives zero indication of failure or staleness |
| 2 | Match System / Real World | 3/4 | "Currently Inside," "day streak," "Due Today!" fit a physical library well |
| 3 | User Control and Freedom | 2/4 | Notification modal items are inert Views — no dismiss, act, or drill-down |
| 4 | Consistency and Standards | 2/4 | Raw hex/StyleSheet while sibling screens hardened this session use Tamagui + documented tokens |
| 5 | Error Prevention | 3/4 | No destructive actions, low-risk surface |
| 6 | Recognition Rather Than Recall | 3/4 | Icons + labels throughout quick actions are clear |
| 7 | Flexibility and Efficiency | 2/4 | No pull-to-refresh despite a 30s poll already existing |
| 8 | Aesthetic and Minimalist Design | 1/4 | Up to 7 stacked sections with no collapsing — weakest score on the screen |
| 9 | Error Recovery | 0/4 | Every fetch failure across 5 parallel data sources swallowed to console.error, no user-facing state |
| 10 | Help and Documentation | n/a | No help affordances anywhere in the app; not this screen's job |
| **Total** | | **18/36** | **Acceptable (50%)** |

## Design Specificity Verdict

LLM assessment: mixed. Genuine product thought in the overdue-to-notification synthesis and live occupancy strip, and internally-consistent due-date logic. But Highlight/Recommended/Trending are the same unsorted book list sliced three ways with zero personalization signal. Most damaging: the greeting is hardcoded to "Good afternoon" with no time-of-day logic, and renders fake-looking fallback personalization before real user data loads.

Deterministic scan: 26 findings on index.tsx, ~93% of the directory total. Some are legitimate semantic-status false positives, but a second undocumented purple shade-ramp is confirmed real drift, not status semantics. #1e3a8a, already fixed on borrowed.tsx, is unresolved here. #111827 (10 occurrences) should be the documented Ink token.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Densest, least-DESIGN.md-compliant, most fetch-fragile screen in the app, and the first thing every student sees. Silent-failure gap is worse than any sibling screen: 5 parallel data sources, zero user-facing error state. Real undocumented color drift plus two more emoji-as-icon violations, the fourth occurrence of a pattern already fixed three times this session.

## What's Working

1. Synthesized overdue notifications fold overdue records into the announcement feed, sorted first.
2. The due-date threshold logic is correct and is the confirmed reference implementation borrowed.tsx was aligned to.
3. Graceful section-level empty handling — sections only render when data exists.

## Priority Issues

[P0] Silent failure across all 5 parallel data sources
- Why it matters: every Promise.all call silently catches, outer try/catch only logs to console, no fetchError state anywhere in 646 lines, unlike three sibling screens hardened this session. Dead backend is indistinguishable from empty account.
- Fix: add a screen-level error state with a distinct retry treatment, matching the pattern already built three times this session.
- Suggested command: /impeccable harden

[P1] Real, undocumented color drift — a second purple shade-ramp parallel to the brand accent
- Why it matters: five undocumented purple hex values used interchangeably for tags/borders/backgrounds, not semantic status tinting — a competing accent family. #1e3a8a unresolved here despite being fixed on borrowed.tsx.
- Fix: consolidate into DESIGN.md's sanctioned lavender surfaces, replace #1e3a8a and #111827 with documented tokens.
- Suggested command: /impeccable colorize

[P1] Two more emoji-as-icon violations
- Why it matters: calendar and clock emoji used despite Calendar being already imported and correctly used elsewhere on this exact screen — fourth occurrence of a pattern fixed three times this session.
- Fix: replace with lucide Calendar/Clock icons.
- Suggested command: /impeccable polish

[P2] Top-bar icon buttons fail the 48dp Android touch-target minimum
- Why it matters: Bell/Settings buttons, the most-used nav controls on the busiest screen, have no padding or hitSlop, while decorative favorite hearts elsewhere do.
- Fix: add padding or hitSlop to reach 48dp.
- Suggested command: /impeccable adapt

[P3] Hardcoded greeting and stale-personalization flash
- Why it matters: "Good afternoon" has no time-of-day branch at all; fallback fake-looking personalized content renders before real data loads.
- Fix: compute the greeting from actual time of day; use a neutral loading state instead of fake fallback values.
- Suggested command: /impeccable clarify

## Persona Red Flags

Jordan (Confused First-Timer): sees fake-looking fallback content and a wrong-time-of-day greeting on their very first screen; no way to know Recommended/Trending aren't personalized.

Sam (Accessibility-Dependent): sub-48dp Bell/Settings targets; notification modal items have no accessibilityRole.

Riley (Stress Tester): "all empty" handled gracefully; "all overdue" only shows the first overdue borrow; "backend down" shows an indefinite spinner with no error/retry transition.

## Minor Observations

- Several notification-modal styles are defined but never referenced in JSX — evidence of a half-removed feature.
- closeModalBtn is positioned outside the modal card's own bounds.
- daysLeft calculation duplicated verbatim in two places rather than computed once.
- notifTitleUnread styling applied unconditionally despite implying a read/unread distinction that doesn't exist.

## Provocative Questions

1. Is shipping three fake-personalized sections worse for trust than one honest "Browse the Catalog" section?
2. Should "Current Borrow" become plural given this screen handles overdue status better than borrowed.tsx's list for a single record?
3. Was a notification filter/read-state feature cut mid-build, and should the dead styles be removed?
