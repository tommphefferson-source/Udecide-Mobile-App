---
name: Expo web in-app browser & X-Frame-Options
description: Why external sites can't be shown in-app on Expo web, and the platform-split approach used in web-view.tsx
---

# In-app browser on Expo web vs native

`react-native-webview` has NO web implementation, so on `Platform.OS === "web"` the in-app browser must use a DOM `<iframe>`. But most real external sites (party/official/news sites — democrats.org, gop.com, lp.org, etc.) send `X-Frame-Options: SAMEORIGIN|DENY` and/or CSP `frame-ancestors`, which make the browser **refuse to render the iframe**. Symptom: the in-app browser stalls on a spinner or shows a blank/broken frame; console logs "Refused to display '<url>' in a frame because it set 'X-Frame-Options'...".

**Key fact:** X-Frame-Options/CSP framing restrictions are **browser-enforced only**. The native `WebView` in Expo Go / a real device build is NOT subject to them, so those same sites open fine in-app on the actual mobile product.

**Approach in `web-view.tsx`:**
- Native (`!isWeb`): render `WebView` in-app (works for blocked sites too).
- Web (`isWeb`): do NOT render an iframe — show an "Opening in a new tab" info screen with Go Back / Open Website buttons, and auto-attempt `window.open(url, "_blank", "noopener,noreferrer")` once.
  - Guard the auto-open with a `useRef` keyed by url so React 18 Strict Mode (dev) doesn't open duplicate tabs.
  - Hide the bottom refresh nav bar on web (it called `webRef.reload()`, a no-op with no WebView mounted).

**Why not detect-and-fallback within an iframe:** you can't reliably detect an XFO/CSP block from JS — for cross-origin frames `onLoad` may fire even when blocked, and you can't read the frame contents either way. So a timeout-only fallback just produces a long stall. Opening a new tab on web is the robust choice.
