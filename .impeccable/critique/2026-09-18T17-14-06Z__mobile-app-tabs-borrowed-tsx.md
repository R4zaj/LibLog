---
target: mobile/app/(tabs)/borrowed.tsx
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/borrowed.tsx"
target_fingerprint: "sha256:d9cce7da2dc22b771d862f02c4ecf9ddc42ac76c780ffa3df9abbf3ae8de9e1c"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/borrowed.tsx
timestamp: 2026-09-18T17-14-06Z
slug: mobile-app-tabs-borrowed-tsx
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Loading spinner exists, but a failed fetch looks identical to "nothing borrowed" |
| 2 | Match System / Real World | 3/4 | Labels fit the mental model; "Due For -3 days" copy reads as a formula leak |
| 3 | User Control and Freedom | 1/4 | Return action has no onPress at all — tapping it does nothing |
| 4 | Consistency and Standards | 1/4 | Emoji icon vs lucide elsewhere; no SafeAreaView vs sibling screens; overdue logic disagrees with the home screen |
| 5 | Error Prevention | 2/4 | No double-submit hazard since Return fires nothing, but no confirmation either |
| 6 | Recognition Rather Than Recall | 3/4 | Color-coded left border + badge chip gives at-a-glance status |
| 7 | Flexibility and Efficiency | 2/4 | Active/History tabs useful; no sort/filter by due date |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean, restrained card layout |
| 9 | Error Recovery | 0/4 | Fetch failures swallowed to console.log; nothing shown to recover from |
| 10 | Help and Documentation | 2/4 | Empty-state copy tells you what to do next |
| **Total** | | **19/40** | **Poor (47.5%)** |

## Design Specificity Verdict

LLM assessment: partially authored, partially generic-with-veneer. Due-date math, left-border urgency stripe, and red-tinted overdue treatment show real thought. But a dead Return button, an emoji where lucide is used elsewhere, a hardcoded status-bar offset, and drifted font sizes undercut it — reads like a first pass that never got the harmonization pass scan.tsx and search.tsx already received.

Deterministic scan: detector ran clean on borrowed.tsx, zero findings, despite the design review flagging undocumented colors (#1e3a8a, #22c55e) — apparently within detector tolerance. Directory context found 28 findings elsewhere, none in borrowed.tsx.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Weakest screen critiqued so far in this codebase. The primary action (Return) is dead code, and a fetch failure renders the same reassuring empty-state copy as a genuinely empty list — the worst possible misinformation for a student checking whether they're overdue. Both are the third occurrence of issue classes already fixed twice elsewhere in this app.

## What's Working

1. Left-border-stripe + tinted-card overdue treatment is legible and low-noise, matching DESIGN.md's signature-variant pattern.
2. Active/Due/Returned dot-legend header gives a scannable summary before the list renders.
3. Tab counts embedded in labels remove a lookup step.

## Priority Issues

[P0] The Return button is dead code
- Why it matters: no onPress prop at all — every non-returned book shows a tappable-looking Return pill that does nothing, sitting exactly on the anxious overdue-book action path.
- Fix: wire it to the actual return flow, or replace with informational copy if returns are in-person-scan-only by design.
- Suggested command: /impeccable harden

[P0] No error state — a failed fetch is indistinguishable from "nothing borrowed"
- Why it matters: fetchBorrows catches to console.log with no error flag; ListEmptyComponent only branches on isLoading. Third occurrence of a gap already fixed twice on sibling screens.
- Fix: add an error state and a distinct "Couldn't load your borrows — tap to retry" card, matching scan.tsx/search.tsx's pattern.
- Suggested command: /impeccable harden

[P1] Raw emoji glyph instead of a lucide icon
- Why it matters: empty-state emoji in a file that already imports Book/Clock/RotateCcw/AlertCircle from lucide-react-native — third occurrence of an already-fixed violation.
- Fix: replace with a lucide icon (e.g. Book, already imported).
- Suggested command: /impeccable polish

[P1] No SafeAreaView — hardcoded status-bar offset
- Why it matters: paddingTop={52} while both sibling screens now use SafeAreaView; will clip or float wrong on different devices. Third occurrence of an already-fixed gap.
- Fix: swap to SafeAreaView, matching scan.tsx/search.tsx's convention.
- Suggested command: /impeccable adapt

[P2] Overdue cutoff logic disagrees with the home screen's own model
- Why it matters: this screen treats a book as overdue the instant its due-date midnight passes, while index.tsx distinguishes Due Today (orange) from actually overdue (red). Same record can show different status on two screens — a real cross-screen data-consistency bug.
- Fix: extract a shared due-date-status utility so both screens agree.
- Suggested command: /impeccable harden

## Persona Red Flags

Jordan (Confused First-Timer): "Due For -3 days" isn't self-explanatory — may misread the dash as time remaining rather than being late.

Sam (Accessibility-Dependent): emoji has no accessibilityLabel; Return button also has no explicit accessibilityRole/Label though its visible text softens the gap.

Riley (Stress Tester): network-failure-while-returning is unobservable since the button fires nothing regardless of network state. With several overdue books, every card renders identically "loud" with no way to triage.

## Minor Observations

- Return button touch target (~28-32px) sits well under the 48dp Android minimum, on the control a stressed student most needs to hit reliably.
- Font sizes across the file drift from DESIGN.md's 5 roles, same class of issue already corrected on scan.tsx/search.tsx.
- refreshing={isLoading && borrows.length > 0} means pull-to-refresh never visually engages when the current tab's list is empty.
- #1e3a8a and #22c55e are one-off colors not in DESIGN.md's documented palette.
- RotateCcw for "Return" reads more like undo/retry than hand-back semantics.

## Provocative Questions

1. Was the Return button ever wired up, or is this screen mid-migration to a different return flow?
2. The server computes real penalty amounts and a suspension threshold — why doesn't this screen surface that number?
3. Was the divergent due-date-status math between this screen and the home screen intentional, or just two authors solving the same problem separately?
