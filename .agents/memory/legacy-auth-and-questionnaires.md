---
name: Legacy WS auth & questionnaires endpoints
description: Shapes/quirks of legacy backend auth (login/signup) and questionaires_listing, behind the api-server proxy
---

# Legacy auth endpoints (`/user_login`, `/user_sign_up`)

- **Transport differs from data endpoints**: auth is `application/json` POST with **NO `AUTHTOKEN` header** (the token is what you receive back). Data endpoints (polls, home_data, questionaires_listing, etc.) are `application/x-www-form-urlencoded` + `AUTHTOKEN` header.
- **Envelope** (all WS endpoints): `{settings:{success:"1"/"0",message,fields}, data:[ ... ]}`. Treat `success !== "1"` as failure and surface `settings.message`.
- **Signup required fields**: `first_name`, `last_name`, `user_email`, `user_password`, `state_id`, `city`, `zipcode` (note spelling `zipcode`). `city`/`zipcode` are required even in the simplified flow — empty/omitted → "Please enter a value for the city field."
- **state_id placeholder**: there is no country-aware "US → optional" rule. The simplified/social signup path uses **`state_id="0"`** as a placeholder, which is accepted and returns an Active, email_verified user with an `auth_token`. No state-list endpoint is needed for this path.
- **Signup is SLOW**: it sends a confirmation email and can take ~12s+. The default ~12s fetch timeout times out → 502. Signup must use a longer timeout (~30s); login is fast on the normal timeout.
- **Why:** these are upstream behaviors not visible in our code — getting transport/header/timeout wrong silently fails (502 / empty data).

# `questionaires_listing` (opinion questionnaires, NOT a knowledge quiz)

- form-urlencoded + `AUTHTOKEN`; **requires `category_id`** (omit → "Please enter a value for the category_id field.").
- Returns stance/opinion questions: each row has `question_id`, `question`, and an `answers[]` array of `{answer_id, answer}`. There is **no correct answer and no explanation**, and some answer rows are UI affordances (e.g. "Add your own stance", "Read more stances submitted by users").
- **Implication:** this is the app's *questionnaires* feature (issue categories from `/quiz_menu_list`), NOT the Civics-101 knowledge quiz (which needs answerIndex + explanation). Do not force this data into the Civics-101 quiz UI.
- `/quiz_menu_list` (categories) needs `AUTHTOKEN`, NO body. Rows: `category_id`, `category` (display name), `status`. Live questionnaires = N+1 (one questions call per category); run them in parallel and drop categories that yield no questions.

# Per-user token forwarding for live data (decision)

- Data endpoints can be served live using the **logged-in user's** legacy `auth_token` forwarded from the Expo client, instead of (or in addition to) the shared app-level `LEGACY_WS_AUTHTOKEN` secret. The client sends `AUTHTOKEN: <token>`; the api-server route reads it (`AUTHTOKEN` header or `Authorization: Bearer`) and passes it to `wsPost(..., tokenOverride)`. `tokenOverride ?? requireToken()` so the shared token still works when no per-user token is present.
- **Why:** `LEGACY_WS_AUTHTOKEN` is a missing secret in this env, so the shared-token path serves only mock. Forwarding the user token makes features genuinely live without that secret, reusing the token we already get at login.
- **How to apply:** when adding a new live legacy-backed feature, prefer forwarding the user token. Guard against empty tokens: trim header values and treat `""` as undefined, or an `Authorization: Bearer ` with no value suppresses the shared-token fallback and silently forces mock mode.
