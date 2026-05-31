---
name: Legacy WS edit_profile quirks
description: Behaviors of the legacy WS /edit_profile endpoint that the api-server must compensate for.
---

# Legacy WS `/edit_profile` behavior

The UDecide api-server proxies profile writes to the legacy WS backend (form-urlencoded
+ per-user `AUTHTOKEN` header). Non-obvious behaviors discovered by probing:

- **State is numeric `state_id`, not a code.** The WS stores states via `/states_list`
  ids (e.g. NY=3656, TX=3670, CA derived, DC=3629). The api-server keeps a 2-char
  code ⇄ id map and converts both directions. Input field named `state` (2-char) is
  ignored by the WS; you must send `state_id`. Response `state` comes back as the full
  NAME, so derive the 2-char code from the returned `state_id`.
- **Unknown state codes are silently dropped, and the call still returns 200.** If you
  forward a profile update with an unmappable state, the WS succeeds and leaves state
  unchanged — giving false confidence. **The api-server must validate the state code up
  front and reject unknown codes with 400** before forwarding.
- **`location` is the street address field.** `address` in our schema maps to WS
  `location`; `city`→`city`, `zipcode`→`zip_code`.
- **`/edit_profile` response omits `auth_token`.** `editProfile()` must preserve the
  caller's token rather than expecting one back.
- **Tokens go stale.** A token that worked earlier can later return 401 after other
  edits/time; just re-login to get a fresh one when testing.

**Why:** these are external-API contract facts not visible in our code; without the
up-front state validation, profile saves appear to succeed while silently discarding the
state change.

**How to apply:** any new profile/field write that targets the legacy WS must map codes
to ids server-side and reject unmappable values rather than trusting the WS 200.
