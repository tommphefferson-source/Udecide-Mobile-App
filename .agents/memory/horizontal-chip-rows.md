---
name: Horizontal chip/filter rows in UDecide
description: How horizontal filter/category chip rows must scroll on web and native
---

UDecide filter/category chip rows (issue questionnaire categories, poll topics,
fact-checker suggested prompts, representatives level filter) must use the shared
**`components/HorizontalScroller.tsx`** wrapper, not a bare `ScrollView horizontal`,
a horizontal `FlatList`, or a `flexWrap` View.

**Why:**
- On React Native Web a horizontal `ScrollView`/`FlatList` only scrolls with a
  *horizontal* gesture (trackpad swipe / shift+wheel). A desktop user with a plain
  vertical mouse wheel cannot reach overflowing chips even though a real scroll
  region exists — the row looks "stuck". This was the actual user-reported bug; a
  prior fix that just switched FlatList→ScrollView did NOT solve it.
- `HorizontalScroller` is a `ScrollView horizontal` that adds a web-only `wheel`
  listener (via `getScrollableNode()`) translating vertical wheel delta into
  `scrollLeft`, while leaving real horizontal trackpad gestures alone. No-op on
  native (touch already scrolls).
- A plain `View` with `flexWrap:"wrap"` wraps onto multiple lines instead of
  scrolling; these chip sets are tiny so virtualization (FlatList) buys nothing.

**How to apply:** `<HorizontalScroller contentContainerStyle={{ gap, paddingHorizontal }}>`
then map the chips inside. Keep horizontal padding + gap on the content style (not
the outer container) so the first/last chip get spacing.
