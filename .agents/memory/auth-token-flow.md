---
name: UDecide AUTHTOKEN auth flow
description: How the per-user legacy auth_token flows from login through to authenticated requests, and the 401 redirect contract
---

The legacy backend authenticates with a custom **`AUTHTOKEN`** request header (NOT
`Authorization: Bearer`). The header value is the **`auth_token`** field returned
by the legacy login/signup responses.

**Frontend (Expo) contract:**
- All authenticated requests must go through the shared `apiFetch` wrapper
  (services/apiClient.ts), which pulls the token from the non-React session store
  (services/session.ts) and attaches the `AUTHTOKEN` header automatically. Do NOT
  add ad-hoc `fetch` + manual header in service modules — route through `apiFetch`
  so 401 handling stays uniform.
- `AuthContext` is the only writer of the session store: it calls `setSessionToken`
  on load/login/signup/logout, and registers the unauthorized handler.
- On HTTP 401, `apiFetch` calls the registered unauthorized handler (logout +
  `router.replace("/(auth)/login")`) and throws `UnauthorizedError`.

**Backend (api-server) contract:**
- Routes read the forwarded token via `tokenFromRequest(req)` and thread it down
  to the provider (`wsPost(path, params, tokenOverride)`), which sends it as the
  `AUTHTOKEN` header to legacy.
- `LegacyAuthError extends AppError(401)` — so an uncaught auth rejection from ANY
  route returns 401, which the frontend wrapper turns into a re-login. `wsPost`
  raises it on HTTP 401/403 or an explicit token/session-auth failure message.

**Why:** matches the legacy mobile app; lets the whole app share one centralized
re-login path. **Gotcha:** keep the auth-failure message regex in `wsPost` narrow
(explicit token/session phrases only) so a generic business error like "this poll
has expired" is not misread as an auth rejection and force-logs-out the user.
