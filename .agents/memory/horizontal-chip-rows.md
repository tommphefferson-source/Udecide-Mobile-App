---
name: Horizontal chip/filter rows in UDecide
description: Why horizontal filter/category chip rows must use ScrollView, not FlatList or flexWrap
---

UDecide filter/category chip rows (issue questionnaire categories, poll topics,
fact-checker suggested prompts, representatives level filter) must be a
**`ScrollView horizontal`**, not a horizontal `FlatList` and not a `flexWrap` View.

**Why:**
- A horizontal `FlatList` (VirtualizedList) does not reliably enable horizontal
  drag-scroll on React Native Web — chips past the right edge become unreachable.
- A plain `View` with `flexWrap:"wrap"` wraps onto multiple lines instead of
  scrolling. These chip sets are tiny, so virtualization buys nothing.

**How to apply:** render chips by mapping inside `<ScrollView horizontal
showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:"row",
gap, paddingHorizontal}}>`. Put horizontal padding + gap on the content style, not
the outer container, so the first/last chip get spacing and scrolling works.
