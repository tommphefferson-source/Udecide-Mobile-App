---
name: Doc screenshots & PDF pipeline
description: How to capture app screenshots for documentation and render HTML to PDF in this workspace
---
- The testing subagent (`runTest`) only persists screenshots as *failure evidence*; successful runs return an empty `screenshotPaths`. Don't use it to harvest documentation screenshots.
- **Why:** two full runs came back with zero usable images despite explicit [Screenshot] steps.
- **How to apply:** for doc/marketing captures, drive the Expo web build yourself with `puppeteer-core` + system `chromium` (nix package). Pattern in `scripts/src/capture-screens.mjs`: 400x870 viewport, deviceScaleFactor 2, resumable (skips existing PNGs) because the bash tool kills any command after ~2 min and background/`setsid` processes are killed when the shell exits — run the script repeatedly in the foreground instead.
- RN-web click gotcha: text like "Sign In" appears both as a title and a button; pick the match with a pointer-cursor ancestor (prefer the last one) and click via real mouse coordinates, not `.click()`.
- HTML→PDF: `chromium --headless --no-sandbox --print-to-pdf=out.pdf --no-pdf-header-footer file.html` works well; style with `page-break-after` per section.
