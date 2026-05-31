---
name: Legacy /edit_profile partial response
description: The legacy UDecide /edit_profile endpoint returns a partial user; do not adopt it wholesale or you wipe saved fields.
---

The legacy CodeIgniter `/edit_profile` response is partial — it omits `last_name`
and `state_id` (and possibly others), which `mapAuthUser` then maps to empty
strings.

**Why:** Adopting that response wholesale on the client (overwriting the stored
user with `toUserProfile(legacyUser)`) silently wiped Last Name and State right
after a *successful* save — the classic "my edits don't persist" bug. The values
were actually saved upstream; only the local copy got clobbered by the partial
echo.

**How to apply:** After a successful profile save in `AuthContext.persistProfile`,
start from the optimistic `merged` user and overlay canonical server values only
when they are non-empty (fall back to what was just sent otherwise). This is safe
because every edited field is sent upstream first (state as a valid numeric
`state_id` via the complete `US_STATE_CODE_TO_ID` map), so keeping the sent value
stays consistent with what the backend stored. Same caution applies to any future
client that consumes a legacy edit/update echo — treat it as partial, never as the
full authoritative record.
