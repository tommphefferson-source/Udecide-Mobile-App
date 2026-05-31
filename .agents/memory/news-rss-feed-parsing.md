---
name: News RSS feed parsing
description: How UDecide turns the legacy news_url RSS feed into in-app readable articles, and the gotchas.
---

# News RSS feed parsing

The legacy `news_url` (from `/home_data`) points at an RSS 2.0 feed (e.g. NPR politics
`https://feeds.npr.org/1014/rss.xml`). It is fetched and parsed **server-side** in the
api-server (`getNewsLive`) into a structured article list; the Expo client never handles XML.

**Why server-side, no XML lib:** RSS items are regular and rich bodies arrive in CDATA, so a
small regex parser (`api-server/src/lib/rss.ts`) is enough — avoids a heavy XML/HTML-render
dependency on the client. The client just renders title/byline/image/paragraphs natively.

**Gotchas (each cost real investigation):**
- **User-Agent is required.** NPR's feed returns **403 Access Denied** to any request without a
  `User-Agent` header. Always send one when fetching external feeds from the server.
- **Feeds carry teaser-length bodies, not full articles.** NPR `description`/`content:encoded` is
  ~150–240 chars. "Read within the app" therefore shows the teaser + image + byline + date, plus a
  "Read full story" external link. Full article text is NOT in the feed; scraping the article page
  is out of scope/fragile.
- **Mock-fallback honesty applies.** In live mode (token present), any fetch/parse failure or unsafe
  URL must return an empty `articles[]` (keeping `newsUrl` for the external CTA) — never mock data.
  Parser is wrapped in try/catch and entity-decoding never throws (guards out-of-range code points).
- **SSRF guard:** the server only fetches https feed URLs and rejects localhost/private-IP hosts,
  since the URL originates from the (trusted but external) legacy upstream.
