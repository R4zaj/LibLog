---
name: LibLog Mobile (CCC LIB APP)
description: The student/faculty self-service library companion — soft lavender on white, calm and quietly precise.
colors:
  primary: "#6C48C5"
  lavender-mist: "#faf9fe"
  lavender-tint: "#f4f1fa"
  lavender-border: "#ede9f6"
  lavender-border-alt: "#f0eef5"
  ink: "#1e1e2e"
  slate-muted: "#9ca3af"
  slate-secondary: "#7c7c8a"
  slate-dark: "#4b5563"
  hairline: "#f3f4f6"
  white: "#ffffff"
  success: "#10b981"
  danger: "#ef4444"
  amber: "#fbbf24"
typography:
  display:
    fontFamily: "System default (Roboto on Android, San Francisco on iOS)"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.1
  headline:
    fontFamily: "System default"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "System default"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "System default"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "System default"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "18px 24px"
    height: "52px"
  card-default:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.lavender-mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
    height: "48px"
---

# Design System: LibLog Mobile (CCC LIB APP)

## Overview

**Creative North Star: "The Reading Room"**

LibLog Mobile is the student and faculty companion for a college library — a calmer counterpart to the desktop librarian station. The system reads as a quiet reading room rather than a generic productivity tool: white space dominates, a single muted lavender accent does the pointing, and nothing on screen competes for attention with the actual task (present a QR code, check a due date, find a book). Character is **Muted Lavender / soft & calm** — the purple is a gentle signal, not a shout — and components are **clean and quietly precise**: soft palette, but tight, deliberate spacing and edges rather than looseness.

This is the current shipped system, formalized as-is; no visual direction has been rejected. Elevation is trending toward flatter over time (see Elevation & Depth) even though the present build still leans on soft ambient shadows for a few key moments.

**Key Characteristics:**
- One accent color (muted lavender `#6C48C5`) carries all brand and interactive meaning; everything else is neutral or functional status color.
- White cards on a near-white canvas, separated by soft 1px hairlines rather than heavy borders.
- System typeface throughout (no custom font loaded) — hierarchy comes from size and weight, not typeface changes.
- Icons are line-style (`lucide-react-native`) everywhere; no filled/duotone icon sets mixed in.
- The QR code is the app's signature interaction — a dedicated circular "fab" tab, brand-colored glow, and a live-refreshing code component.

## Colors

A single accent on a near-white neutral field, with a small functional status vocabulary for search filters and states.

### Primary
- **Muted Lavender** (`#6C48C5`): the one brand/interactive color — buttons, active tab icon and dot, the QR fab, section accents (e.g. the left-border stripe on the borrow-reminder card), focus/active states in search filters.

### Neutral
- **Ink** (`#1e1e2e`): primary text — headings, body copy, QR code fill.
- **Slate Muted** (`#9ca3af`): secondary/placeholder text, inactive tab icons, captions (e.g. the QR "Refreshes in Ns" caption).
- **Slate Secondary** (`#7c7c8a`) / **Slate Dark** (`#4b5563`): intermediate secondary-text weights where pure ink is too heavy and slate-muted is too light.
- **Hairline** (`#f3f4f6`): card borders, list-row dividers, tab bar top border.
- **Lavender Mist** (`#faf9fe`) / **Lavender Tint** (`#f4f1fa`) / **Lavender Border** (`#ede9f6`, `#f0eef5`): tinted backgrounds and borders for inputs, search chips, and soft brand-adjacent surfaces — these keep the lavender presence felt without using the full-strength accent.
- **White** (`#ffffff`): card and tab-bar surfaces, text-on-primary.

### Status (functional, not brand)
- **Success** (`#10b981`, with `#22c55e` also seen — standardize on `#10b981` going forward): availability, scan-success confirmation.
- **Danger** (`#ef4444`): the Borrowed-tab badge count, destructive/error states.
- **Amber** (`#fbbf24`): star ratings only.
- Search-filter category chips additionally use one-off blue/orange/violet accents; these are functional category tags, not part of the brand palette — don't extend them into buttons, nav, or brand surfaces.

### Named Rules
**The One Accent Rule.** Muted Lavender is the only color allowed to mean "this is interactive/brand." Status colors mean their status and nothing else; they never substitute for the primary action color.

## Typography

**Display/Body/Label Font:** System default (Roboto on Android, San Francisco on iOS) — no custom typeface is loaded.

**Character:** Hierarchy is carried entirely by size and weight on a single system face, which keeps the reading-room feel quiet — nothing about the type itself calls attention to itself.

### Hierarchy
- **Display** (800, 32px, 1.1 line-height): screen-level hero moments, e.g. auth screen titles.
- **Headline** (800, 24px, 1.15): section/page headers (e.g. "Search Catalog").
- **Title** (600, 18px, 1.2): card and list-item titles, profile name.
- **Body** (500, 14px, 1.4): primary reading text, descriptions.
- **Label** (500, 12px, 1.3): captions, badges, timestamps, the QR refresh countdown.

### Named Rules
**The Weight-Not-Face Rule.** Never introduce a second typeface for emphasis; step weight and size instead.

## Layout

Screens compose with `YStack`/`XStack` for structure and plain React Native `View`/`StyleSheet` for finer control, mixed by screen rather than fully unified. The de facto spacing rhythm is `16px` as the base unit (screen and card padding), stepping down to `12px`/`8px` for tighter groupings and up to `20px`/`24px` for section separation. Gaps inside Tamagui stacks mostly use the stock `$1`–`$3` scale rather than a project-specific token.

Safe-area handling is currently inconsistent — only the home screen uses `SafeAreaView`; other screens hand-tune top padding (e.g. `paddingTop: 52`) to clear the status bar. Treat this as a known gap to close, not a pattern to repeat in new screens: use `SafeAreaView` (or safe-area insets) everywhere going forward.

## Elevation & Depth

The shipped system uses soft, deliberate shadows rather than staying flat — but the intended direction is to flatten over time, so new work should reach for shadow only where it is already load-bearing (the QR fab, scan-success feedback) and prefer flatter treatments elsewhere.

### Shadow Vocabulary
- **Card ambient** (`shadowOpacity: 0.05, shadowRadius: 2–8, elevation: 1–2`, paired with a `{colors.hairline}` border): the default "card on white" lift — keep, it's subtle enough to stay quiet.
- **Tab bar top shadow** (`shadowColor: #000, shadowOpacity: 0.05, shadowRadius: 4, elevation: 10`): separates the bar from content below.
- **Brand glow** (`shadowColor: {colors.primary}, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5`): reserved for the QR fab — the app's signature action. Don't spend this glow on secondary buttons.
- **Success glow** (`shadowColor: {colors.success}, shadowOpacity: 0.35, shadowRadius: 28`): scan-success confirmation only.

### Named Rules
**The Earned-Glow Rule.** Colored ambient shadows (brand or success) are reserved for the QR fab and the scan-success moment — the two places elevation is doing real communicative work. Everything else gets the plain neutral card shadow or, preferably, no shadow at all.

## Shapes

Corners lean rounded and fall into a de facto scale rather than a strictly enforced one: `4px` for tiny chips/dots, `8–14px` (with `12–16px` the closest thing to a standard) for inputs, buttons, badges, and cards, `16–24px` for larger cards and modals, and full circles for the QR fab, avatars, and status dots. No sharp corners appear anywhere in the sampled screens — treat rounded-by-default as an invariant.

## Components

### Buttons
- **Shape:** rounded (`16px`, `{rounded.lg}`).
- **Primary:** solid Muted Lavender fill (`{colors.primary}`), white bold text, generous padding (`18px`, `{spacing.lg}`-ish vertical).
- **Disabled:** same fill at `opacity: 0.7` — don't swap to a gray fill, dim the brand color instead.
- **Pressed/Focus:** no distinct hover state exists on mobile; rely on RN's native touch feedback (opacity/ripple) rather than inventing a custom pressed style.

### Cards
- **Corner Style:** `12–16px` (`{rounded.md}`–`{rounded.lg}`).
- **Background:** white (`{colors.white}`).
- **Shadow Strategy:** card-ambient shadow (see Elevation & Depth) plus a `{colors.hairline}` 1px border — the shadow and the hairline work together, don't use one without the other.
- **Border:** `1px`, `{colors.hairline}` or `{colors.lavender-border}` depending on context.
- **Internal Padding:** `16px` (`{spacing.base}`).
- **Signature variant:** the home-screen borrow-reminder card adds a `4px` `{colors.primary}` left-border accent stripe to flag "needs attention" — reserve that stripe for genuinely time-sensitive cards, not decoration.

### Inputs / Fields
- **Style:** tinted lavender-mist background (`{colors.lavender-mist}`), `1px` `{colors.lavender-border}` border, `16px` radius, `48px` height, leading `lucide` icon.
- **Placeholder:** Slate Muted (`{colors.slate-muted}`).
- **Focus/Error:** not yet distinctly styled in the sampled screens — when adding these, keep them in the existing lavender/status-color vocabulary rather than introducing new hues.

### Navigation (Tab Bar)
- White background, `{colors.hairline}` top border plus the tab-bar top shadow.
- Active icon/label: `{colors.primary}`, with a small `4px` primary dot beneath the active tab.
- Inactive icon/label: `{colors.slate-muted}`.
- Center **QR tab** is a raised circular fab (`56px`, `{colors.primary}` fill, white `3px` ring, brand-glow shadow) — the one tab that breaks the flat row, matching its role as the app's primary action.
- Borrowed tab carries a small danger-red badge dot (`{colors.danger}`) for outstanding-item counts.

### QR Code Display (signature component)
`DynamicQrCode` renders via `react-native-qrcode-svg`, ink-colored (`{colors.ink}`) on a transparent background, with a small Slate Muted caption below ("Refreshes in Ns") — it auto-refreshes every 30s against a signed token endpoint and falls back to the raw `student_id` on failure. This is the app's most important surface; keep it visually undecorated (no card chrome, no extra border) so the code itself stays maximally scannable.

## Do's and Don'ts

### Do:
- **Do** keep Muted Lavender (`#6C48C5`) as the only color that means "interactive/brand" — one accent, used deliberately.
- **Do** use rounded corners everywhere (`12–16px` for most components); no sharp corners.
- **Do** pair card shadows with a hairline border rather than shadow alone.
- **Do** keep the QR code display undecorated and maximally legible — it's the app's core job.
- **Do** use `SafeAreaView`/safe-area insets on every new screen, closing the inconsistency in the current build.

### Don't:
- **Don't** introduce a second accent color for "extra emphasis" — dim or lighten the existing lavender instead.
- **Don't** spend the brand-glow or success-glow shadow treatment on anything but the QR fab and scan-success respectively.
- **Don't** load a second typeface; carry hierarchy with size and weight on the system face.
- **Don't** use the search-filter category colors (blue/orange/violet/etc.) outside of category tagging — they're functional, not brand.
