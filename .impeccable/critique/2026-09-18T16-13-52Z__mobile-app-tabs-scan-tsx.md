---
target: mobile/app/(tabs)/scan.tsx
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/scan.tsx"
target_fingerprint: "sha256:fb6c9e83f5aa062d7bcd1e05b3b206bd8a9936435df61afb6d590d35d9dc8a2e"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/scan.tsx
timestamp: 2026-09-18T16-13-52Z
slug: mobile-app-tabs-scan-tsx
closed: true
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Countdown, retry banner, and success overlay all give status now; Retry has no in-flight/pending indicator |
| 2 | Match System / Real World | 4/4 | Natural library vocabulary throughout |
| 3 | User Control and Freedom | 3/4 | Retry exists; no way to manually dismiss the error banner |
| 4 | Consistency and Standards | 3/4 | Matches SafeAreaView and lucide-icon conventions now, except the checkmark glyph |
| 5 | Error Prevention | 3/4 | No form to prevent errors on, but a stale screen no longer looks falsely trustworthy |
| 6 | Recognition Rather Than Recall | 4/4 | ID, history, and status all visible together |
| 7 | Flexibility and Efficiency | 3/4 | Appropriately simple for the persona |
| 8 | Aesthetic and Minimalist Design | 3/4 | Nested double-card QR chrome still adds a redundant layer |
| 9 | Error Recovery | 3/4 | State-aware banner copy is a real fix from 0/4; docked for inconsistent grammar vs. the QR fallback banner |
| 10 | Help and Documentation | 2/4 | Still no "ask a librarian" guidance if failures persist |
| **Total** | | **31/40** | **Good (77.5%)** |

## Design Specificity Verdict

LLM assessment: closer to authored, with generic residue now more visible for having enforced discipline everywhere else — the nested double-card QR chrome and the raw checkmark glyph now stand out more than before.

Deterministic scan: detector ran clean on scan.tsx (1 advisory, same false-positive candidate as before) and on the newly modified DynamicQrCode.tsx (0 findings, clean). No regressions from the three fix passes.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Genuine, verified improvement. Both P0s are closed for real, one P1 (SafeAreaView) fully resolved. Score moved from 18/36 (Acceptable, 50%) to 31/40 (Good, 77.5%). The emoji-removal pass surfaced a bigger version of the same problem: the checkmark glyph is now the most visible icon inconsistency on the screen's highest-emotion moment.

## What's Working

1. State-aware error copy branches on whether history already has data, rather than a generic error message.
2. The first-poll fix is correct and verified safe against the server controller (filters by authenticated user_id, no cross-user false positive possible).
3. The QR fallback story is honest — explains why falling back to the raw student_id is safe rather than silently swallowing the failure.

## Priority Issues

[P1] The success overlay's checkmark is still a raw Unicode glyph, not a lucide icon
- Why it matters: contradicts the icon rule the polish pass just enforced elsewhere, on a larger and more central element.
- Fix: replace with lucide Check icon sized to match, inside the existing white circle.
- Suggested command: /impeccable polish

[P2] Two different failure states use inconsistent visual grammar for the same root cause
- Why it matters: DynamicQrCode's "Connection lost" state and scan.tsx's history-error banner can both appear during a real outage, looking like two unrelated warnings instead of one.
- Fix: give the QR fallback state the same card treatment and Retry affordance, or unify into one shared component.
- Suggested command: /impeccable harden

[P2] Nested double-card QR chrome, unchanged from the original critique
- Why it matters: two bordered/rounded containers for one visual object reads as unresolved layout and contradicts DESIGN.md's "keep the QR undecorated" rule.
- Fix: drop the inner tray, let the QR sit directly on the outer card.
- Suggested command: /impeccable polish

[P2] Type-scale drift from DESIGN.md's documented tokens
- Why it matters: header/title/row-title font sizes don't map onto the documented Headline/Title/Body/Label scale.
- Fix: snap each text element to the nearest documented role.
- Suggested command: /impeccable typeset

[P3] Retry gives no in-flight feedback
- Why it matters: no pending/disabled state risks repeated taps on a slow connection that look like they did nothing.
- Fix: track isRetrying state, disable button and show a spinner while in flight.
- Suggested command: /impeccable harden

## Persona Red Flags

Jordan (rushed, low patience): the previously-reported bug is fixed. New minor risk if Jordan opens the app more than ~15s after scanning — no checkmark and no relative timestamp to explain why.

Sam (careful, anxious): calm banner copy is well-matched, but the missing in-flight retry feedback lands hardest here.

Casey (skeptical, verifies twice): would trust the new QR fallback banner, but is also most likely to notice the checkmark glyph and double-card chrome as signs of an unfinished product.

## Minor Observations

- Success overlay says only "Scan Successful" regardless of check-in vs check-out, even though log.action is already available nearby.
- QR-fallback and history-error states can co-occur under total network loss — worth testing that combined layout explicitly.

## Provocative Questions

1. If icon discipline matters enough to fix three small emoji, does it matter enough to fix the one glyph four times their size?
2. Should the two failure states be the same component instead of two independently-built banners?
3. Is the double-card QR chrome protecting anything that would break if removed, or is it just inherited scaffolding?
