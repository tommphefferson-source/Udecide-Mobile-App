---
name: Mock-fallback honesty in live mode
description: Mock-first API services must not show fabricated data while signalling "live"; fall back to empty/honest state when a key is present
---

# Mock-first services must stay honest in live mode

UDecide's API services (elections, legislation, representatives, etc.) are "mock-first": each falls back to rich hardcoded mock data. The trap: falling back to mock **when an API key IS configured** shows fabricated records (fake candidates, outdated dates) while the UI displays a "live data" badge — users read fiction as fact.

**Rule:** mock data may only be returned when there is genuinely no API key / mock mode is on. In live mode (key present), a no-results or error path must return an empty list so the UI shows its honest empty state ("No Upcoming Elections", etc.) — never substitute mock.

**Why:** "Elections & ballots information is incorrect" was caused by Google Civic `/elections` returning no election for the user's state (the feed only lists elections close to their date, state-by-state), so the code returned MOCK_ELECTIONS (fake 2025 CA races) while still flagging the data as live.

**How to apply:** when editing any `*Api.ts` service here, gate mock fallback strictly on the no-key check; in the live try/catch and empty-result branches return `[]` (or the empty shape), not the MOCK_* constant.
