---
target: mobile/app/(tabs)/borrowed.tsx
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/borrowed.tsx"
target_fingerprint: "sha256:8e80c99f8e2299eb050bed28a5bb945ea7a976c6395556621abd92d572d09dc4"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/borrowed.tsx
timestamp: 2026-09-18T17-24-03Z
slug: mobile-app-tabs-borrowed-tsx
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Loading, pull-to-refresh, and error state cover real gaps; no "last refreshed" indicator |
| 2 | Match System / Real World | 4/4 | "Overdue by 3 days"/"Due Today"/"Due Tomorrow" map directly to how a student thinks about a due date |
| 3 | User Control and Freedom | 3/4 | Pull-to-refresh and tabs give control; no sort/filter, minor given a bounded list |
| 4 | Consistency and Standards | 2/4 | Due-date math now matches index.tsx, but the visual due-today/due-tomorrow treatment diverges from it — a new cross-screen color disagreement |
| 5 | Error Prevention | 4/4 | No destructive actions remain reachable now that the button is inert |
| 6 | Recognition Rather Than Recall | 4/4 | Status badges are self-contained (color + icon + text) |
| 7 | Flexibility and Efficiency | 2/4 | No shortcut from an overdue item to the scan tab where it could actually be resolved |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean and consistent; docked for unresolved font drift and the #1e3a8a outlier |
| 9 | Error Recovery | 4/4 | Error card cleanly distinguishes "couldn't load" from "truly empty" with a working retry — the biggest P0, cleanly resolved |
| 10 | Help and Documentation | 2/4 | "Return at the library" is the closest thing to inline help and stops short of being actionable |
| **Total** | | **31/40** | **Good (77.5%)** |

## Design Specificity Verdict

LLM assessment: now reads as authored for a library due-dates screen. The Return-button decision (informational copy instead of a fake self-return) was the right fraud-prevention call, backed by real investigation into the endpoint's missing ownership check. But it creates a separate UX gap: "Return at the library" has zero next step, no deep-link to the scan tab where return processing actually happens.

Deterministic scan: detector ran clean on borrowed.tsx, zero findings, including on the #1e3a8a color flagged by the design review. Directory context found 28 findings elsewhere, none in borrowed.tsx.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Real, verified fixes. The dead button is now honest non-interactive copy with a sound rationale, the error state is cleanly resolved, the emoji is gone, SafeAreaView is in place, and due-date logic matches the dashboard. Score moved from 19/40 (Poor, 47.5%) to 31/40 (Good, 77.5%). Held back by the Return-flow dead end, font-role drift now a cross-screen outlier, and an undocumented color that survived the exact block this pass touched.

## What's Working

1. The daysLeftFor helper with its inline comment names the bug class it prevents.
2. The three-way ListEmptyComponent branch (loading/error/true-empty) is a clean, correct pattern with proper state management.
3. The overdue card treatment is restrained and One-Accent-Rule compliant.

## Priority Issues

[P1] "Return at the library" is a dead end with no next step
- Why it matters: honest but insufficient for an anxious student in an app whose whole point is self-service, at the exact moment a next step matters most.
- Fix: add a router.push('/scan') affordance or library address/hours text alongside the informational copy.
- Suggested command: /impeccable clarify

[P2] Font sizes still don't map to the 5 DESIGN.md type roles — now a cross-screen outlier
- Why it matters: same class of drift already fixed on scan.tsx/search.tsx, making this screen the remaining exception.
- Fix: remap to the nearest documented role.
- Suggested command: /impeccable typeset

[P2] #1e3a8a undocumented color survives in the exact block this pass touched
- Why it matters: not in DESIGN.md's palette, competes with lavender as a second brand-ish color.
- Fix: replace with a documented neutral or the brand accent.
- Suggested command: /impeccable colorize

[P3] The "Return at the library" row visually implies interactivity it doesn't have
- Why it matters: structurally identical to the real tappable badges beside it — no onPress stops it lying, but it still looks tappable.
- Fix: visually distinguish it from interactive badges (reduced opacity, no background chip).
- Suggested command: /impeccable polish

[P3] Retry button touch target is borderline under 48dp
- Why it matters: text-only TouchableOpacity with hitSlop reaches roughly 40-44px, smaller than this screen's own tab-switcher buttons.
- Fix: add vertical padding directly to the TouchableOpacity.
- Suggested command: /impeccable adapt

## Persona Red Flags

Casey (Novice/First-Timer): previous flag resolved (failed request no longer looks like "no books"). New minor flag: may not understand why the Return row looks like a badge but doesn't respond to taps.

Jordan (Rushed/Stressed): previous flag resolved (isOverdue now correctly requires daysLeft < 0). New flag: if a book is genuinely overdue, no in-app next step exists.

Sam (Accessibility-Sensitive): SafeAreaView fix is a real accessibility-adjacent win. Font drift remains a latent legibility concern, unresolved.

## Minor Observations

- Green standardization confirmed complete, no stray #22c55e/#059669 remain.
- Overdue card's layered border/background pairing is a good severity example without overdoing elevation.
- Single amber bucket for due-today/due-tomorrow under-differentiates what index.tsx treats as two severities.

## Provocative Questions

1. Should "Return at the library" also surface library hours?
2. Which screen should change now that borrowed.tsx and index.tsx disagree on due-today/due-tomorrow color?
3. Does the desktop return endpoint need a server-side ownership check?
