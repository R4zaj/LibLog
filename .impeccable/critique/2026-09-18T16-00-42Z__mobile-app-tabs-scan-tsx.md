---
target: mobile/app/(tabs)/scan.tsx
total_score: 18
max_score: 36
na_heuristics: 10
p0_count: 2
p1_count: 2
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/scan.tsx"
target_fingerprint: "sha256:8abae170125ae92827f327e4453b1282e9e3147bc184afccdc7ce699e63b7600"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/scan.tsx
timestamp: 2026-09-18T16-00-42Z
slug: mobile-app-tabs-scan-tsx
closed: true
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Success overlay confirms *something* happened, not which action (in/out) or resulting state; QR refresh countdown is buried at 12px |
| 2 | Match System / Real World | 3/4 | "Checked In"/"Checked Out" + timestamps match a real ID-badge mental model well |
| 3 | User Control and Freedom | 2/4 | Success overlay is timer-only dismiss (Animated.delay(2000)); no manual refresh for QR or history |
| 4 | Consistency and Standards | 2/4 | Raw emoji (📋📥📤) break the app-wide lucide-icon standard; font sizes (26/17/15/13) don't map to DESIGN.md's scale |
| 5 | Error Prevention | 1/4 | No retry/distinction between "loading" and "failed" for the QR slot; unguarded 10s poll |
| 6 | Recognition Rather Than Recall | 3/4 | ID, name, and recent scans all visible without requiring recall |
| 7 | Flexibility and Efficiency | 2/4 | Purely passive — no pull-to-refresh, no tap-to-enlarge QR |
| 8 | Aesthetic and Minimalist Design | 3/4 | Generally clean; QR card's nested white→lavender-mist→white layering is slightly more ornamental than the "undecorated QR" rule allows |
| 9 | Error Recovery | 0/4 | Zero error state anywhere — fetch failures are silently swallowed to console.error |
| 10 | Help and Documentation | n/a | Reasonable n/a for a single self-service badge screen |
| **Total** | | **18/36** | **Acceptable (50%)** |

## Design Specificity Verdict

**LLM assessment**: Partially specific, partially generic. The QR badge card (purple accent stripe, tracked-out student ID, name) is authored specifically for a library-ID moment. But the success overlay is generic boilerplate ("Scan Successful") that doesn't say what happened or where — at the exact moment specificity would reassure a real student, it reverts to a template checkmark. The emoji icons also read as placeholder, not shipped polish — this is the one screen in the app that breaks its own lucide-react-native icon standard.

**Deterministic scan**: Detector ran clean (exit 0) on scan.tsx and found 1 advisory finding: rgba(34, 197, 94, 0.12) (line 276) — a literal color outside DESIGN.md's documented palette, used as a translucent success-tint on the full-screen blur overlay. Both agents independently flagged this as a plausible false positive — a semantic one-off derived from the documented success green (#10b981), not drift toward an undocumented brand color. Directory-level context found 26 more instances of the same pattern in index.tsx, suggesting a systemic "one-off status tints aren't tokenized" gap worth a future extract pass.

**Visual overlays**: Not applicable — scan.tsx is a native React Native/Expo screen, not a browser-renderable page, so no live overlay was attempted (correctly skipped, not a failed step).

## Overall Impression

This screen ("My Library ID" — a passive QR-badge display + confirmation feed; it does not contain a camera, the desktop station owns that) gets the celebratory half of the moment right and misses the anxious half entirely. The success state is genuinely on-brand — Earned-Glow-compliant green shadow, haptic buzz, restrained QR presentation. But there's no failure state at all.

## What's Working

1. The success overlay is correctly Earned-Glow compliant — green glow shadow matches DESIGN.md's documented success color (#10b981), reserved for this one moment, reinforced with haptic feedback.
2. The QR card mostly respects "undecorated QR" restraint — ink-colored code on transparent background, purple accent stripe as the only real decoration.
3. DynamicQrCode's rotating-token-with-fallback design is a thoughtful security/UX tradeoff — 30s signed token, graceful fallback to raw student_id so the badge is never unusable.

## Priority Issues

[P0] No error or failure state anywhere in the fetch logic
- Why it matters: fetchHistory's catch block does console.error and nothing else — production users see nothing. Combined with the QR token's silent fallback, a student on a bad connection gets zero signal anything is degraded, at the app's highest-trust moment.
- Fix: Surface an inline banner/snackbar on fetch failure; distinguish loading vs. failed vs. empty for the QR slot.
- Suggested command: /impeccable harden

[P0] First poll after screen focus suppresses the success checkmark
- Why it matters: the confirmation logic only arms on the second poll — a student who scans then opens the app to double-check gets silence instead of confirmation.
- Fix: On first load, if the latest log's timestamp is within a recent window (<15s), treat it as fresh and show the checkmark.
- Suggested command: /impeccable harden

[P1] Emoji icons break the app-wide icon standard
- Why it matters: DESIGN.md mandates lucide-react-native line icons everywhere; this screen uses raw emoji, which render inconsistently across Android OEM skins.
- Fix: Swap to LogIn/LogOut (lucide-react-native) at matching size/color.
- Suggested command: /impeccable polish

[P1] No SafeAreaView; hardcoded paddingTop={56}
- Why it matters: DESIGN.md already flags inconsistent safe-area handling as a known gap; this screen repeats it while index.tsx does it correctly. Android edge-to-edge is the primary target platform.
- Fix: Wrap in SafeAreaView matching index.tsx's pattern, or use useSafeAreaInsets().
- Suggested command: /impeccable adapt

[P2] Font sizes and QR card chrome drift from DESIGN.md tokens
- Why it matters: fontSize={26} is a third, undocumented heading size; several grays aren't in the documented neutral palette; the QR gets a nested double-card treatment DESIGN.md says to avoid.
- Fix: Consolidate secondary text to documented tokens; drop the inner bordered tray around the QR.
- Suggested command: /impeccable polish

## Persona Red Flags

Jordan (Confused First-Timer): nothing distinguishes "this code gets scanned" from "this list is just a log"; if nothing happens after presenting the code, there's no guidance at all.

Riley (Stress Tester): in airplane mode, both the QR fallback and history fetch fail silently — screen looks normal with zero signal the network is down. Two scans within one 10s poll window can produce zero or one confirmation for two real actions.

Sam (Accessibility-Dependent): no accessibilityLabel/Role anywhere; the success overlay (visual + haptic only) is likely to go unannounced to a screen reader, meaning a user could miss confirmation of their own check-in.

## Minor Observations

- letterSpacing={3} on the student ID is a nice authenticity touch — fine as an intentional one-off.
- Unbounded history.map inside a plain ScrollView (no FlatList, no cap) will grow indefinitely over a semester.
- Directory-level scan surfaced 26 more untokenized one-off colors in index.tsx — same root cause; a future extract pass could tokenize the "status tint" pattern once.

## Provocative Questions

1. If the desktop scanner is the real camera and source of truth, is a 10-second poll the right model for the app's most time-sensitive moment?
2. The QR badge card carries its own ambient purple-glow shadow — does that quietly violate the Earned-Glow Rule?
3. Is the silent-fail network layer intentional for a first release, or simply unbuilt?
