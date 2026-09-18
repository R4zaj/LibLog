---
target: mobile/app/(tabs)/search.tsx
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/Users/rico/LibLog/LibLog/mobile/app/(tabs)/search.tsx"
target_fingerprint: "sha256:a6120ccdbbf6575f6036f4d05bec658c627fe9a4b137d5432bf06fda880f36fe"
target_path: /Users/rico/LibLog/LibLog/mobile/app/(tabs)/search.tsx
timestamp: 2026-09-18T16-26-12Z
slug: mobile-app-tabs-search-tsx
closed: true
---
**Method: dual-agent (A: design-review agent · B: detector agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1/4 | Loading is bare text, no spinner; a failed fetch renders the identical "No books found" state as a real empty search |
| 2 | Match System / Real World | 3/4 | Field names and the QR-to-borrow instruction match real library workflow |
| 3 | User Control and Freedom | 2/4 | No clear/x in the search input; modal backdrop doesn't dismiss on outside-tap |
| 4 | Consistency and Standards | 1/4 | No SafeAreaView unlike sibling screens; emoji/Unicode glyph instead of lucide icons; font sizes don't map to DESIGN.md's 5 roles; success color drifts from the documented token |
| 5 | Error Prevention | 3/4 | Favorite toggle and tab selection are reversible, low-risk actions |
| 6 | Recognition Rather Than Recall | 4/4 | Popular tags, recent items, and live suggestions are all tap-to-fill |
| 7 | Flexibility and Efficiency | 2/4 | Only 3 category filters, no sort, no shortcut to the scan tab |
| 8 | Aesthetic and Minimalist Design | 2/4 | Clean layout, but an ad-hoc orange/blue category-color system and inconsistent type sizes add noise |
| 9 | Error Recovery | 0/4 | Fetch failure is silently swallowed to console.error; fallback UI misrepresents a failed load as "no results" |
| 10 | Help and Documentation | 2/4 | No inline guidance, not heavily penalized for a task this simple |
| **Total** | | **20/40** | **Acceptable (50%)** |

## Design Specificity Verdict

LLM assessment: partially authored, internally inconsistent. Content is genuinely library-specific (live Popular Searches from catalog tag frequency, library-specific borrow instruction, correct catalog metadata). But interaction chrome is generic marketplace-search shape, out of sync with sibling screens: missing SafeAreaView (present on index.tsx and the just-fixed scan.tsx), emoji/Unicode glyph where DESIGN.md mandates lucide icons (exact violation class just fixed on scan.tsx), and an undocumented orange/blue category-color system found nowhere else in the token set.

Deterministic scan: detector ran clean on search.tsx with zero findings — surprising given the design review's color findings (#22c55e, #f97316, #3b82f6), likely inside detector tolerance for one-off tints. Directory-level context found 28 findings elsewhere (index.tsx/profile.tsx/scan.tsx), none in search.tsx.

Visual overlays: not applicable, native RN screen, correctly skipped.

## Overall Impression

Real, specific content underneath (live tag-frequency Popular Searches, persisted Recently Viewed shelf, cross-field suggestions) — good bones. But this is the least system-compliant screen reviewed so far: missing the SafeAreaView fix, repeats the emoji/glyph violation, introduces an undocumented color axis. Most damaging: a network failure and a genuine empty search render byte-for-byte the same UI.

## What's Working

1. Popular Searches computed from real catalog data (genre/tag frequency), not hardcoded.
2. Recently Viewed carousel persisted via AsyncStorage with cover-color and type badge gives an actual "library shelf" feel.
3. Suggestion dropdown searches title, author, and genre together, tap-to-fill into the search box.

## Priority Issues

[P0] Fetch failures are indistinguishable from "no results"
- Why it matters: catch{console.error} with no error state means a network failure and a real empty search render the identical "No books found" card.
- Fix: track an error state; render a distinct "Couldn't load the catalog — tap to retry" state with a retry action.
- Suggested command: /impeccable harden

[P0] No SafeAreaView — same gap just fixed on the sibling scan screen
- Why it matters: root is a bare YStack with hardcoded paddingTop={52}, while index.tsx and scan.tsx both use SafeAreaView; will misrender under the status bar on real devices.
- Fix: swap root YStack for SafeAreaView (or useSafeAreaInsets().top), matching scan.tsx's convention.
- Suggested command: /impeccable adapt

[P1] Emoji and Unicode glyph in place of lucide icons
- Why it matters: same violation class just fixed on scan.tsx (3 emoji + 1 checkmark glyph), meaning that fix wasn't applied consistently across the app.
- Fix: replace book emoji with a lucide icon, and the arrow glyph with a lucide TrendingUp/Flame.
- Suggested command: /impeccable polish

[P1] Category colors drift off the documented palette and break the One Accent Rule
- Why it matters: availColor uses #22c55e not the documented success token #10b981, and an orange/blue "category" axis is invented for book type, used nowhere else in the app.
- Fix: formalize a genre/category color token in DESIGN.md if intentional, or collapse to icon/label only and correct availability color.
- Suggested command: /impeccable colorize

[P2] Typography drift from the 5 canonical DESIGN.md roles
- Why it matters: six distinct one-off sizes across list items, modal title, and badges — none map onto Display/Headline/Title/Body/Label.
- Fix: remap list-item titles to Title, author/meta text to Body/Label consistently.
- Suggested command: /impeccable typeset

## Persona Red Flags

Jordan (Confused First-Timer): 5 stacked sections visible before typing anything, no scaffolding. A failed initial fetch reads as "library has nothing indexed," no retry offered.

Sam (Accessibility-Dependent): favorite-heart and modal-close buttons carry no accessibilityLabel/Role. Condition and Availability use the same two colors for two different meanings in the modal.

Riley (Stress Tester): rapid typing triggers unmemoized double-computation every keystroke. No pull-to-refresh or refetch-on-focus means new books never appear in an already-open session.

## Minor Observations

- Recently Viewed stored under a global key, not scoped per-user like Favorites — browse history can leak across users on a shared device.
- Copy: "Kindly find the book to scan its qr to borrow" — informal phrasing, lowercase "qr."
- Filter tabs, Popular chips, and modal buttons land under the 48dp Android touch-target minimum.
- filteredBooks and getSuggestions() run unmemoized full scans on every keystroke and unrelated re-render — wrap in useMemo.

## Provocative Questions

1. The catalog is fetched once and searched client-side — what happens at 5,000 titles instead of a few dozen?
2. Should the orange/blue category system become a formally adopted token, or be pulled back to the One Accent Rule?
3. Is "No books found" on a network failure a deliberate simplification, or worth fixing given how easily it could mislead a student?
