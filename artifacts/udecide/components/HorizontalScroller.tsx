import React, { useEffect, useRef } from "react";
import { Platform, ScrollView, type ScrollViewProps } from "react-native";

/**
 * A horizontal ScrollView that ALSO scrolls with a vertical mouse wheel on web.
 *
 * Why this exists: React Native Web only scrolls a horizontal ScrollView in
 * response to a horizontal gesture (trackpad swipe or shift+wheel). Desktop
 * users with a plain mouse wheel scroll vertically, so overflowing items (e.g.
 * the category chips) appear "stuck" and unreachable even though there is a
 * real scroll region. On native this is a no-op — touch already scrolls the row.
 *
 * It translates vertical wheel delta into horizontal scrolling on web while
 * leaving genuine horizontal trackpad gestures untouched.
 */
export function HorizontalScroller({ children, ...props }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = (
      ref.current as unknown as { getScrollableNode?: () => HTMLElement } | null
    )?.getScrollableNode?.();
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      // Ignore pure-horizontal input (real trackpad swipe) — let it scroll natively.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.deltaY === 0) return;
      // Nothing to scroll horizontally — let the wheel scroll the page/list as usual.
      const maxScroll = node.scrollWidth - node.clientWidth;
      if (maxScroll <= 0) return;
      const next = Math.max(0, Math.min(maxScroll, node.scrollLeft + e.deltaY));
      if (next === node.scrollLeft) return; // already at an edge in this direction
      node.scrollLeft = next;
      e.preventDefault();
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} {...props}>
      {children}
    </ScrollView>
  );
}
