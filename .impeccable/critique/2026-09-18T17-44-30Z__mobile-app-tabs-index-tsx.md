---
target: mobile/app/(tabs)/index.tsx
total_score: 25
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 1
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/index.tsx"
target_fingerprint: "sha256:32e6bf5231cbff85afebdedfb8d63e168a4047dd2a845e3a0ad40fdce327ddae"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/index.tsx
timestamp: 2026-09-18T17-44-30Z
slug: mobile-app-tabs-index-tsx
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Loading spinner, status pill, error banner present; 30s poll still fully silent |
| 2 | Match System / Real World | 3/4 | Natural-language status framing, unchanged |
| 3 | User Control and Freedom | 3/4 | Modal has explicit close and tap-outside dismiss |
| 4 | Consistency and Standards | 3/4 | Emoji/color-drift violations gone; new internal inconsistency between Announcements' restrained tint and Highlight's full solid fill |
| 5 | Error Prevention | 3/4 | Read-only view, single well-placed retry tap |
| 6 | Recognition Rather Than Recall | 4/4 | Every icon paired with a text label |
| 7 | Flexibility and Efficiency | 2/4 | Unchanged, out of scope |
| 8 | Aesthetic and Minimalist Design | 1/4 | Unchanged, out of scope; accent-concentration change works against this heuristic |
| 9 | Error Recovery | 3/4 | Verified end-to-end, genuinely fixed and self-healing; docked for a pre-existing !user?.id edge case that can spin forever |
| 10 | Help and Documentation | n/a | Not applicable to this screen |
| **Total** | | **25/36** | **Acceptable (69%)** |

## Design Specificity Verdict

LLM assessment: a real, confirmed risk — this fix pass traded a hex-drift violation for a saturation violation. Two originally weaker treatments were funneled into full-strength #6C48C5, and the Recommended covers lost their alternation entirely. Across one scroll a user now encounters 8+ discrete solid-accent instances. DESIGN.md's own language describes exactly what this no longer is. The codebase already knows how to do this correctly (rankCircle alternates solid/tinted) — that restraint wasn't applied to the two largest surfaces touched by this fix.

Deterministic scan: 26 to 8 findings, all matching established false-positive patterns. The over-saturation issue is invisible to the detector by nature since it concerns concentration of a documented color, not an undocumented one.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

The P0 and both P1s are genuinely resolved — the error-recovery implementation is complete and self-healing. Score moved from 18/36 (Acceptable, 50%) to 25/36 (Acceptable, 69%). What's holding it back: a new subtle over-saturation issue traded for the color-drift fix, plus pre-existing out-of-scope density/touch-target/greeting issues.

## What's Working

1. The error-recovery fix is implementation-complete, not decorative — 5 parallel per-source fallbacks preserve graceful degradation while surfacing a shared failure state.
2. Semantic status colors stay correctly separate from the brand accent throughout.
3. Icon discipline is now total — no emoji anywhere, both new lucide icons correctly sized/stroked/colored.

## Priority Issues

[P1] One Accent over-saturation — a new regression traded for the color-drift fix
- Why it matters: the Highlight card and every Recommended book cover are now full-strength solid #6C48C5 at large scale, on top of 5+ smaller solid-accent circles. Technically compliant, spiritually louder than DESIGN.md's "gentle signal, not a shout."
- Fix: tinted/duotone treatment for highlightCard matching announcementCard's restraint; documented alternation for recCover.
- Suggested command: /impeccable quieter

[P2] Lost book-cover distinction hurts scannability
- Why it matters: identical solid-purple covers are harder to tell apart at a glance, a functional regression for a quick-scan screen.
- Fix: restore visual distinction via a documented approach.
- Suggested command: /impeccable quieter

[P2] Top-bar touch targets confirmed still unaddressed
- Why it matters: Bell/Settings have no hitSlop/padding, ~24x24pt effective target, under 48dp, while retry links and favorite hearts elsewhere do use hitSlop.
- Fix: add padding or hitSlop to iconBtn.
- Suggested command: /impeccable adapt

[P3] #fcfaff — a fourth undocumented-adjacent lavender tint that slipped past this cleanup
- Why it matters: not in DESIGN.md's documented surface list, wasn't in this pass's scope, wasn't caught by the detector either.
- Fix: fold into #faf9fe or #f4f1fa.
- Suggested command: /impeccable colorize

[P3] Hardcoded greeting confirmed still unaddressed
- Why it matters: "Good afternoon" has no time-of-day branching. Fake-personalization flash is now largely avoided incidentally, but the time-of-day logic itself is still absent.
- Fix: compute the greeting from actual time of day.
- Suggested command: /impeccable clarify

## Persona Red Flags

Bad-connection persona: previous flag fully resolved, self-clearing banner-plus-retry flow.

Brand-consistency persona: previous flag resolved on paper, but would immediately notice the new over-saturation issue.

Quick-glance persona: partially resolved; identical Recommended covers work against fast scanning.

## Minor Observations

- daysLeftBadge's default tint+accent-text pattern is exactly what highlightCard/recCover should have followed instead of a full solid fill.
- Retry banner copy is generic across all 5 possible failing sources.
- closeModalBtn positioned outside the modal's own bounds, worth a notch/status-bar QA pass.

## Provocative Questions

1. Has pixel coverage actually been measured post-fix, or was "no undocumented hex" treated as a proxy for "not oversaturated"?
2. Was losing recCover's alternation a conscious trade-off or a side effect of mechanical hex-to-token mapping?
3. Should the error-recovery banner also cover "auth never loaded" as a distinct failure mode?
