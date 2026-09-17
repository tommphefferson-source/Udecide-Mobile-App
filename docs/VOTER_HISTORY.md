# Elected Official Voter History (Election Participation)

Feature: show, on an elected official's profile, whether they **participated**
in past elections — never whom they voted for. U.S. ballots are secret;
voter-history data establishes participation only, and every layer of this
feature (schema, API, UI copy) enforces that distinction.

**Status: BUILT, LEGALLY GATED OFF.** The pipeline, API, and UI ship in this
repo and work end-to-end against fictitious fixtures. No real voter data is
served: every jurisdiction's legal gate is closed in code
([jurisdictions.ts](../artifacts/api-server/src/voterHistory/jurisdictions.ts))
until the legal checklist at the bottom of this document is signed off.

---

## 1. Research: where voter participation history can come from

Research date 2026-09-16. Full source URLs inline; items marked UNVERIFIED
could not be confirmed against an authoritative page.

### 1.1 The pilot source: Georgia Secretary of State (official)

| | Voter History File | Voter Registration List |
|---|---|---|
| Provider | GA Secretary of State, Elections Division | GA Secretary of State (online store / mail form) |
| What it has | One row per voter per election: county, registration #, date, election-type code, primary ballot party (D/R/NP), absentee/provisional/supplemental flags. **No names.** | Identity: name, **birth year (year only)**, county, residential/mailing address, districts, race/gender, `Last Vote Date`/`Last Party Voted` |
| API / File | No API. Free web download per election (fixed-width flat file): <https://mvp.sos.ga.gov/s/voter-history-files> | No API. **$485 statewide** (county $70, etc.), ~2-week fulfillment, emailed: <https://sos.ga.gov/page/order-voter-registration-lists-and-files> |
| Historical depth | **2004–present** (election-year dropdown verified) | Point-in-time snapshot per order |
| Update frequency | Counties post credit within **60 days** of each election (O.C.G.A. § 21-2-215(i)) | Per order; no subscription product |
| Cost | Free | $485 statewide, non-refundable |
| Commercial use | **Prohibited — criminal.** O.C.G.A. § 21-2-225(c) ("may not be used by any person for commercial purposes"); § 21-2-601 makes intentional commercial use a **misdemeanor** | Same |
| Public display | No statutory publication/redisclosure ban found (unlike PA/CA/AZ). The open question is whether display in this app is "commercial use" | Same |
| Confidential fields | Month+day of birth, SSN, DL#, email are never released (§ 21-2-225(b)); protected persons may have addresses suppressed (§ 21-2-225.1) — never backfill these | Same |

Verified fixed-width history layout (reproduced on the official download page):
`County#(3) RegistrationNumber(8) ElectionDate(8,yyyymmdd) ElectionType(3) Party(2) Absentee(1) Provisional(1) Supplemental(1)`.
Election-type codes: 001 General Primary, 002 General Primary Runoff, 003
General, 004 General Election Runoff, 005 Special, 006 Special Runoff, 007
Non-Partisan, 008 Special/Non-Partisan, 009 Recall, 010 Presidential
Preference Primary. The absentee flag covers both mail and advance in-person
voting (they are not distinguishable in this file).

Precedent for republication: [georgiavotes.com](https://georgiavotes.com/about.php)
(aggregates, AJC-licensed) and [VoteRef](https://voteref.com) (individual GA
records, free lookup, expressly "noncommercial") both operate without Georgia
enforcement action. Neither is a monetized consumer app, so neither settles
our question.

### 1.2 Commercial / licensed providers (national coverage)

| Provider | Voter history? | Realistic for a consumer app? |
|---|---|---|
| [L2](https://l2-data.com/) | Yes (2.3B history records, 50 states) | **Most plausible.** Sells to nonpartisan/commercial buyers; file exports + DataMapping + Snowflake. Public-display rights are NOT in public terms — needs a negotiated rider. Pricing not public (~$0.025/record per third-party blogs, UNVERIFIED) |
| [Aristotle](https://www.aristotle.com/data/) | Yes | Plausible; order forms pass through per-state statutory limits |
| [TargetSmart](https://targetsmart.com/data/voter-file/) | Yes (files + REST APIs) | **No** under standard terms — [addendum](https://help.actblue.com/hc/en-us/targetsmart-data-use-addendum) prohibits any third-party disclosure; Democratic-aligned |
| [Catalist](https://catalist.us/data/) | Yes (20+ yrs) | **No** — Democrats/progressives/nonprofits only; "never sells data for commercial use" |
| [Data Trust](https://thedatatrust.com/) | Yes (RNC exchange) | **No** — Republican-ecosystem clearinghouse |
| [i360](https://www.i-360.com/political-products/i360-voter-consumer-data/) | Yes | Unlikely — conservative-market vendor; public terms unclear |
| [BallotReady](https://organizations.ballotready.org/data-products) | **No** (officeholders/elections only) | n/a |

**No free API for individual voter participation exists.** Do not confuse
"voter history" (citizen participation, from state voter files) with a
legislator's "voting record" (roll-call votes — Vote Smart, OpenStates,
Congress.gov; the app's existing Recent Votes feature).

### 1.3 State variability (why the architecture is per-jurisdiction)

Anchor: NCSL, [Access to and Use of Voter Registration Lists](https://www.ncsl.org/elections-and-campaigns/access-to-and-use-of-voter-registration-lists).

| State | Obtainable? | Key restriction |
|---|---|---|
| GA | Free download + $485 list | Commercial use = misdemeanor (undefined for apps) |
| NC | [Free public download](https://www.ncsbe.gov/results-data/voter-history-data), weekly, 10+ yrs | Among the most open |
| FL | [Public record, monthly extract](https://dos.fl.gov/elections/data-statistics/voter-registration-statistics/voter-extract-request/) | Very permissive |
| OH | [Free weekly downloads](https://data.ohiosos.gov/voter) | Statutory "non-commercial purposes" |
| PA | $20 export | **Internet publication prohibited — criminal** (upheld 2026) |
| CA | Qualified requesters only | Political/scholarly/journalistic/governmental use only; **no internet republication** |
| TX | Any person (affidavit) | Commercial use = Class A misdemeanor ([§ 18.009](https://statutes.capitol.texas.gov/Docs/EL/htm/EL.18.htm)) |
| NY | "Elections purpose" attestation | Non-election use prohibited ([ELN § 3-103](https://www.nysenate.gov/legislation/laws/ELN/3-103)) |
| AZ | Restricted | No internet posting of any portion of the file |
| IN/ME/MA | Parties/candidates only | Effectively closed to an app vendor |

Litigation is unsettled: the 10th Circuit held the NVRA preempts New Mexico's
publication restrictions ([VRF v. Torrez](https://law.justia.com/cases/federal/appellate-courts/ca10/24-2133/24-2133-2025-11-25.html)),
while a 2026 Pennsylvania federal decision upheld PA's internet ban. Do not
generalize either.

### 1.4 Compliance risks specific to a consumer app

1. State use restrictions travel with the data — a vendor license does not
   launder CA/PA/AZ/TX/NY limits. A 50-state individual-lookup feature is not
   lawfully assemblable; plan a per-state allowlist (GA/NC/FL/OH/CO end).
2. "Commercial use" bans (20+ states) may cover a monetized app even when the
   content is civic; GA and TX make it criminal.
3. Vendor contracts (esp. TargetSmart-style) treat showing a record to an app
   user as prohibited "disclosure" — any license needs an explicit
   consumer-display rider.
4. Harassment/intimidation optics; protected-person suppressions must be
   honored on every refresh.
5. Stale data → never display absence as "did not vote"; always "no record as
   of `file date`". (Enforced in code: `NO_PARTICIPATION_RECORDED` ≠ non-voting,
   and unknowns render nothing.)

---

## 2. Architecture

```text
                     OFFLINE (operator machine — raw files never reach servers)
  GA SoS Voter History File (free, fixed-width, per election)
  GA SoS Voter Registration List ($485 CSV — identity join)
        │
        ▼
  scripts/src/voter-history/ingest-ga.mjs          ← state adapter (one per state)
    schema guard → normalization → election matching
    → identity resolution (conservative) → validation
        │                                   │
        ▼                                   ▼
  dataset.json (normalized,          review-queue.json (AMBIGUOUS matches,
  MATCHED+PROBABLE, provenance)      human review only — never published)
        │
        ▼ (deployed as a file; VOTER_HISTORY_DATASET=/path)
────────────────────────────────────────────────────────────────────────
  api-server  src/voterHistory/{types,jurisdictions,matching,store}.ts
    boot-time load → per-request gates:
      1. jurisdiction legal gate (closed by default, code-reviewed change to open)
      2. match-confidence gate (MATCHED only; PROBABLE → MATCH_UNCERTAIN)
    GET /api/officials/voter-history            (controlled view, no raw fields)
    GET /api/officials/voter-history/config     (availability, no personal data)
────────────────────────────────────────────────────────────────────────
  mobile (iOS + Android, same RN code)
    services/voterHistoryApi.ts → RepresentativeCard "Election Participation"
    renders ONLY status=OK; neutral copy; source + as-of date; EN + es-MX
```

Why no database: the api-server is a stateless proxy (no DB, no
`DATABASE_URL` on Render), and the normalized dataset is tiny (only officials
shown in the app — dozens of rows, not the 7M-row statewide file). The store
loads a JSON file read-only at boot, matching the existing `src/data/*`
pattern. The target relational schema is already written for when volume
justifies it: [lib/db/src/schema/voterHistory.ts](../lib/db/src/schema/voterHistory.ts)
(`elected_official`, `election`, `voter_history` — provenance columns, unique
official+election index, no candidate-choice column ever).

Scaling to more states = one new adapter per state emitting the same
normalized dataset (the `VoterHistoryProvider` interface in
[types.ts](../artifacts/api-server/src/voterHistory/types.ts)) plus one
`JurisdictionConfig` entry. No state-specific logic exists outside adapters
and config.

### Identity resolution (the hard part)

GA's history file has no names — identity comes from joining the registration
list on registration number. Matching an official to a registration row uses
normalized name + corroborating attributes (birth **year**, county — full DOB
is never released). Rules
([matching.ts](../artifacts/api-server/src/voterHistory/matching.ts), mirrored
in the CLI):

| Situation | Result |
|---|---|
| No name hit | `NO_MATCH` |
| Unique name + birth year or county corroboration | `MATCHED` (publishable) |
| Unique name, no corroboration | `PROBABLE_MATCH` — retained for audit, **withheld** (`MATCH_UNCERTAIN` to clients) |
| Multiple hits, exactly one birth-year match | `MATCHED` |
| Multiple hits otherwise | `AMBIGUOUS` → review-queue.json, never published |

Matching attributes live only server-side/offline; the API response contains
no birth year, county, registration number, or `sourceRecordId` (tested).

### Missing-data semantics (never "did not vote")

`PARTICIPATED` / `NO_PARTICIPATION_RECORDED` / `DATA_NOT_AVAILABLE` /
`DATA_NOT_PUBLIC` / `MATCH_UNCERTAIN` are distinct in the types, the API, and
the UI. The mobile card renders the section only for affirmative
`status: "OK"` records; every other status renders nothing at all, so absence
of data can never read as abstention.

---

## 3. API

`GET /api/officials/voter-history?name=Jordan+Sample&state=GA&office=State+Senator`

```json
{
  "status": "OK",
  "jurisdiction": "GA",
  "officialName": "Jordan Sample",
  "fixture": true,
  "attribution": "Georgia Secretary of State",
  "history": [
    {
      "electionDate": "2024-11-05",
      "electionName": "2024 General Election",
      "electionType": "GENERAL",
      "participated": true,
      "votingMethod": "ABSENTEE_OR_EARLY",
      "source": "Georgia Secretary of State — Voter History File",
      "recordedAt": "2026-09-16"
    }
  ]
}
```

- `status` ∈ `OK | DATA_NOT_AVAILABLE | DATA_NOT_PUBLIC | MATCH_UNCERTAIN`.
- `fixture: true` marks demo data (fictitious people); clients must label it.
- 503 when a configured dataset fails to load (fail closed, never guess).
- `GET /api/officials/voter-history/config?state=GA` → `{ state, available,
  publicDisplayAllowed, attribution }` (no personal data).

Server env: `VOTER_HISTORY_DATASET=/path/dataset.json` (real, ingested) or
`VOTER_HISTORY_FIXTURES=true` (fictitious demo). Neither set → feature
reports `DATA_NOT_AVAILABLE` everywhere.

---

## 4. Operating runbook (Georgia)

1. **Legal sign-off first** — see checklist below. Do not download files for
   app use before it.
2. Buy the statewide Voter Registration List ($485) and download the Voter
   History File(s) for the elections you want (free).
3. Fill `scripts/src/voter-history/officials-ga.seed.json` with the officials
   shown in the app (public biographical birth year + county strengthen
   matches to `MATCHED`).
4. Run the adapter (schema guard aborts on any layout change):
   ```bash
   node scripts/src/voter-history/ingest-ga.mjs \
     --voters /secure/ga/voter-list.csv \
     --history /secure/ga/2024-11-05.txt --history /secure/ga/2024-05-21.txt \
     --officials scripts/src/voter-history/officials-ga.seed.json \
     --out /secure/ga/out
   ```
5. Review `report.json` (counts, validation) and `review-queue.json`
   (ambiguous identities — add corroborating attributes and re-run; never
   hand-promote an ambiguous match).
6. Deploy `dataset.json` to the server host and set `VOTER_HISTORY_DATASET`.
   Raw statewide files stay on the secure operator machine (encrypted disk),
   are never committed, and are deleted when no longer needed.
7. Refresh after each election (60-day county reporting lag) and re-purchase
   the registration list when officials change.
8. Corrections: a wrong-person report ⇒ immediately remove the official from
   the seed, re-run, redeploy (removes the records), then re-investigate.

Fixtures rehearsal (fictitious people, safe anywhere):
```bash
node scripts/src/voter-history/ingest-ga.mjs \
  --voters scripts/src/voter-history/fixtures/ga-voters.sample.csv \
  --history scripts/src/voter-history/fixtures/ga-history.sample.txt \
  --officials scripts/src/voter-history/fixtures/officials-ga.sample.json \
  --out /tmp/vh-out
```

Tests: `pnpm --filter @workspace/api-server run test` (12 tests: matching
rules, publication gates, missing-data semantics, PII non-leakage).

---

## 5. Security

- Raw voter files: offline operator machine only; never committed (fixtures
  are fictitious); delete per retention policy.
- Registration numbers are hashed (`sha256`, truncated) into an opaque
  provenance id; the raw number exists nowhere in the served dataset.
- Server-side matching attributes (birth year, county) never cross the API
  (regression-tested).
- Transport: HTTPS via Render; dataset file readable by the service user only.
- § 21-2-225.1 protected-address records: never enrich or backfill.

## 6. Legal checklist — must be signed off before opening any jurisdiction gate

Flipping `permittedUseConfirmed` / `publicDisplayAllowed` to `true` in
[jurisdictions.ts](../artifacts/api-server/src/voterHistory/jurisdictions.ts)
requires ALL of, in writing, from counsel licensed in that state:

- [ ] Is UDecide's display of participation data "use for commercial
      purposes" under the state statute (GA: O.C.G.A. § 21-2-225(c) /
      § 21-2-601 — criminal)? Consider monetization now and planned.
- [ ] Any publication/redisclosure restriction beyond commercial use?
- [ ] Any click-through terms at file purchase/download (GA online-store
      checkout terms UNVERIFIED — capture them at purchase)?
- [ ] Protected-person suppression obligations and our refresh procedure.
- [ ] Defamation/false-light exposure for misattributed records and the
      correction procedure above.
- [ ] Retention/deletion policy for raw files.
- [ ] Attribution string approved.

Until then the feature is demonstrable with fixtures (`VOTER_HISTORY_FIXTURES=true`)
and everything else stays dark. **Never fabricate voter-history records** —
fixtures contain fictitious people only, and are labeled as sample data
end-to-end.
