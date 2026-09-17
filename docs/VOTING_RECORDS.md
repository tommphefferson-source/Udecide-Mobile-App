# Elected Official Voting Records

Feature: an official's profile → **Voting Record** → chronological roll-call
votes → vote detail → original government source.

Strictly informational and politically neutral: what was voted on → how the
official voted → what happened → where the information came from. No scores,
rankings, good/bad labels, ideology ratings, or motive inference exist
anywhere in this feature, and official titles/descriptions are shown
verbatim — never AI-rewritten. (Distinct from "voter history" — citizen
participation — which is a separate feature with separate legal constraints;
see VOTER_HISTORY.md on its own branch.)

## Architecture

```text
            LegiScan API (primary: federal + all 50 states)
                 │            House Clerk XML / Senate LIS XML
                 │            (official keyless federal fallback)
                 ▼                          ▼
        LegiScanProvider          houseProvider / senateProvider
                 └──────────────┬───────────┘
                                ▼
                      VotingRecordService          artifacts/api-server/src/votingRecords/
                 (normalization · caching · identity
                  resolution · filters · pagination)
                                ▼
            GET /api/officials/voting-record       (Udecide-owned API)
                                ▼
                     iOS / Android (shared RN)
        RepresentativeCard → Voting Record screen → Vote Detail
```

- The mobile apps never call LegiScan or government APIs; they only talk to
  the Udecide backend, and they never know which provider served a record.
- The **normalized data layer is Udecide-owned** (`LegislativeVote` in
  `types.ts`); LegiScan is an ingestion detail behind `VotingRecordProvider`.
  Adding Open States or a local-government source is one new provider file
  plus one line in `service.ts` — zero mobile changes.
- No database exists in this repo's api-server (stateless proxy on Render),
  so the "normalized database" tier is an in-memory TTL cache today and a
  ready-to-wire Postgres schema for tomorrow:
  [lib/db/src/schema/votingRecords.ts](../lib/db/src/schema/votingRecords.ts)
  (`legislator`, `roll_call`, `legislator_vote`, with `(provider,
  source_record_id)` unique indexes making re-ingestion idempotent at the DB
  level). When a DB + scheduled sync are provisioned, the service reads the
  tables instead of calling providers per request.

## Providers

### LegiScanProvider (primary — needs `LEGISCAN_API_KEY`)

Operations used (current LegiScan API, single GET endpoint
`https://api.legiscan.com/?key=&op=`):

| Op | Why |
|---|---|
| `getSessionList` (state, or `US` for Congress) | find the current regular session (`prior=0, special=0`) |
| `getSessionPeople` (session_id) | legislator roster: `people_id`, name, role, district, `bioguide_id` — identity resolution |
| `getMasterList` (session_id) | bills ranked by `last_action_date` — bounded discovery of recently acted-on bills |
| `getBill` (bill_id) | official title/description, LegiScan `url`, **`state_link` (official legislature page)**, roll-call refs |
| `getRollCall` (roll_call_id) | individual positions: `people_id` + `vote_id` (1 Yea, 2 Nay, 3 NV, 4 Absent) + `vote_text` |

Normalization: `vote_id` → `Yea/Nay/Not Voting` (Absent → Not Voting) with
the original `vote_text` preserved in `sourceVoteValue` for audit.
Provenance per record: `sourceProvider: "LegiScan"`, `sourceRecordId`
(roll_call_id), `sourceUrl` (LegiScan page), `officialGovernmentSourceUrl`
(`state_link` → the state legislature's own record), `retrievedAt`,
`sourceUpdatedAt`. The UI shows *"Source: <legislature> — Data provided
through LegiScan — View Official Record"*.

Rate-limit discipline (§ API budget): every op response cached (TTLs
configurable via `LEGISCAN_*_TTL_HOURS` env vars; bills/roll calls 24h,
masterlist 6h), max 4 concurrent requests, exponential backoff on 429/network
errors, API-level errors never retried, and `legiscanMetrics` counters
(requests, cacheHits, failures, rateLimitEvents) exposed for logging. Cold
per-official cost ≈ 2 + ≤40 getBill + ≤60 getRollCall, amortized across all
users by the caches.

### House Clerk / Senate LIS (official keyless fallback)

Live-verified fixed formats (2026-09): `clerk.house.gov/evs/{year}/roll{N}.xml`
(bioguide `name-id` per vote; latest roll found by binary-searching 404s) and
`senate.gov .../vote_menu_{congress}_{session}.xml` + per-vote XML. These
keep **federal records working with no key at all** and remain the official
verification path. Purpose-built parsers fail closed on any shape change.

## Identity resolution

Never name-only when avoidable: `legiscanId` → `bioguide_id` → name +
chamber (+ first initial, + district number e.g. "42nd Senate District" ↔
"SD-042"). Anything still ambiguous is **refused** (`MATCH_AMBIGUOUS`) and
surfaced as "records not available" — a wrong person's record is worse than
none. Cicero (the app's officials source) ids aren't LegiScan ids, so v1
resolves via name+chamber+district from the profile; storing per-official
`legiscanId`/`bioguideId` mappings is the DB-tier upgrade.

## API

`GET /api/officials/voting-record?name=&state=&level=&office=&district=&bioguideId=&legiscanId=&page=&category=&q=&from=&to=`

Returns `{ status, officialName, votes[], page, hasMore }` — normalized
Udecide objects only, never raw provider responses. `status` ∈ `OK |
JURISDICTION_UNSUPPORTED | OFFICIAL_NOT_MATCHED | MATCH_AMBIGUOUS |
NO_VOTES_FOUND | SOURCE_UNAVAILABLE`; the app maps each to a friendly
message ("Voting records are not currently available for this official."),
never a raw error. Backend filtering: category (bill / amendment /
resolution / nomination / procedural / other — derived from the official
vote question, shown as filters, never as judgment), text search, date
range; 20 per page. The vote-detail screen renders from the normalized
record itself (every field is already in the list payload), so no second
endpoint is needed.

## Mobile

- `services/votingRecordsApi.ts` — backend client + `officeHasVotingRecord`
  gate (legislators at federal/state level only, so governors don't get a
  dead-end link).
- `RepresentativeCard` → **Voting Record** row → `app/voting-record.tsx`
  (filter chips, debounced search, infinite scroll, pull-to-refresh,
  loading/empty/error states) → `app/vote-detail.tsx` (official's vote,
  result, chamber tally incl. Present/Absent/Not Voting, the actual vote
  question — because not every roll call is final passage — and the source
  block with the official-record link).
- Fully localized (English + es-MX).
- Analytics: the app currently has **no analytics framework**, so the spec's
  events (`voting_record_viewed`, …) have nowhere to go; when one is added,
  instrument the two screens and the source-link press, and never use these
  events to infer a user's political affiliation.

## Configuration

| Env (api-server) | Purpose |
|---|---|
| `LEGISCAN_API_KEY` | activates LegiScanProvider (register free: https://legiscan.com/legiscan). Server-side ONLY — never `EXPO_PUBLIC_*`, never in the mobile bundle |
| `LEGISCAN_SESSION_TTL_HOURS` / `_PEOPLE_` / `_MASTERLIST_` / `_BILL_` / `_ROLLCALL_` | cache/refresh tuning (defaults 24/24/6/24/24) — the configurable sync knobs |

Without the key: federal officials are served by the official House/Senate
providers; state officials return `JURISDICTION_UNSUPPORTED` until the key
is set. Note the legacy `EXPO_PUBLIC_LEGISCAN_API_KEY` (bills tab) is a
separate, client-side legacy path — do not reuse one key for both; the bills
tab should eventually migrate behind the server too.

## Verification performed (2026-09-17)

- 30 automated tests pass (`pnpm --filter @workspace/api-server run test`):
  parsers against live-captured House/Senate XML, fail-closed schema guards,
  vote/date normalization, category rules (incl. the federal-"H.R." vs
  state-"HR" distinction), LegiScan identity resolution (id > name; district
  disambiguation; ambiguity refused), service statuses, filters, pagination,
  stable idempotent ids.
- Live end-to-end (official flow): Jon Ossoff (Senate) → 20 real votes with
  correct positions/tallies/questions/source URLs; Hank Johnson (House) →
  20 real votes incl. votes cast the previous day.
- LegiScan path: blocked on the API key by design (no fabricated access);
  run `node scripts/src/voting-records/smoke-legiscan.mjs GA <lastName>`
  after setting `LEGISCAN_API_KEY` to verify the full chain
  (session → people → masterlist → bill → roll call → member position).

## Adding a provider / jurisdiction

1. Implement `VotingRecordProvider` (`supportsOfficial`, `getVotes`) in
   `src/votingRecords/yourProvider.ts`, emitting normalized
   `LegislativeVote`s with full provenance.
2. Append it to `PROVIDERS` in `service.ts` (order = priority).
3. Add parser tests with captured fixtures; fail closed on shape changes.
No mobile changes required.

## Troubleshooting

- `SOURCE_UNAVAILABLE` → upstream (LegiScan/senate.gov/clerk.house.gov) down
  or rate-limited; check server logs and `legiscanMetrics`.
- `MATCH_AMBIGUOUS` → two legislators share name/chamber; supply
  `district`/`legiscanId`/`bioguideId` query params (or store the mapping).
- State official returns `JURISDICTION_UNSUPPORTED` → `LEGISCAN_API_KEY`
  missing, or the office isn't a legislator (governors have no roll calls).
- Empty after a schema change upstream → parsers/`status:"OK"` guards fail
  closed by design; capture the new format, update the parser + fixture.
