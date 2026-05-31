---
name: Legacy static_pages CMS endpoint
description: How the legacy WS serves About/Privacy/Terms CMS content and how to classify its responses.
---

The legacy WS `/static_pages` endpoint serves CMS pages keyed by a `page_code`
form field. Confirmed codes: `aboutus`, `privacypolicy`, `termsconditions`.
Success rows carry `{ page_title, page_content }` where `page_content` is raw
HTML.

**No AUTHTOKEN required** — unlike most legacy endpoints, this one works with a
plain form POST and no token. Do NOT route it through the token-requiring
`wsPost` helper.

**Error classification:** an unknown code returns HTTP 200 with
`settings.success === "0"` and `message === "Page not found"`. Map ONLY
not-found-style messages to a 404; throw `UpstreamError` for any other
`success !== "1"` so genuine upstream failures aren't misreported as 404.

**Why:** the legacy backend signals "missing" and "broke" the same way (success
"0" + 200), so a blanket "success!=1 → 404" hides real outages behind a
"page not found" — confusing to debug.

Rendering: in the Expo app the HTML is converted to text blocks
(headings/bullets/paragraphs) by a dependency-free converter rather than an HTML
renderer, to avoid a Metro restart and keep web+native identical. Guard numeric
HTML entities (`&#NNN;`) against out-of-range code points or `String.fromCodePoint`
throws `RangeError` and crashes the page.
