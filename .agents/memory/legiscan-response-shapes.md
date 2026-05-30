---
name: LegiScan API response shapes
description: LegiScan ops return bills under different container keys and field names; one mapper must handle all
---

# LegiScan response shapes differ by `op`

LegiScan (`api.legiscan.com`) returns bills in **different structures depending on the operation**, which silently breaks a mapper written for only one:

- `op=getMasterList` → bills under `data.masterlist` (plus a non-bill `session` entry). Each bill uses field **`number`**, a **numeric `status`** progress code, **no `state`** field, but includes `description`. A full session is ~5000 bills.
- `op=getSearch` → bills under `data.searchresult` (plus a non-bill `summary` entry). Each uses **`bill_number`** and includes `state`; no `description`.
- `op=getBill` → single bill under `data.bill` (numeric `status`, `bill_number`).

**Lesson:** a single mapper must read `masterlist ?? searchresult`, filter non-bill metadata by checking for `bill_id`, accept both `number`/`bill_number`, and translate the numeric status code (0 Prefiled,1 Introduced,2 Engrossed,3 Enrolled,4 Passed,5 Vetoed,6 Failed). Thread the queried state abbr through since masterlist bills omit `state`.

**Why:** "State Bills are not being found" was caused by the mapper reading only `searchresult` — getMasterList's `masterlist` container was ignored, yielding an empty list even though the API call returned 200 with thousands of bills.

**How to apply:** getMasterList returns the entire session; sort by `last_action_date` desc and slice (~50) before display, mirroring the federal "recent bills" view, or rendering chokes on thousands of rows.
