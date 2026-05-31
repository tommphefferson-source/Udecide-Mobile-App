---
name: Legacy /home_data link fields
description: Shape and quirks of the legacy /home_data endpoint used for app reference links (news, etc.)
---

Legacy `/home_data` (form-urlencoded POST + AUTHTOKEN, no body) returns one row of
reference links: `news_url`, `political_system_link`, `voter_status_link`,
`president_cabinet_link`, `presidential_election`, `town_url`, social urls, etc.

**Quirk:** these URLs frequently lack a scheme (e.g. `news_url` = `"www.c-span.org/"`).
Any consumer that opens them (web view) must prepend `https://` first, or the URL
is treated as relative/invalid.

**How to apply:** the api-server `newsService` already normalizes the scheme before
returning. If you wire up another `/home_data` link (town/voter-status/etc.), apply
the same `ensureScheme` step. `/home_data` carries NO article list — Political News
is a single CTA opening `news_url`, not a feed.
