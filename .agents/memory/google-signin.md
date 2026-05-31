---
name: Google Sign-In (server-mediated OAuth)
description: How UDecide's "Sign in with Google" is wired and what config it requires to work.
---

UDecide's Google Sign-In is a **server-mediated OAuth 2.0 authorization-code flow** in api-server (`routes/googleOauth.ts`), NOT a native Expo Google flow and NOT a Replit Google connector.

**Why not the Replit Google connectors:** those (Gmail/Sheets/Drive/etc.) authorize the repl owner's Google account to call Google APIs. They cannot power "sign in with Google" for arbitrary app end-users, and you can't point their redirect URI at the app's deep links.

**How it works:** app opens `/auth/google/start?return_uri=<udecide:// deep link>` → server 302s to Google → Google calls `/auth/google/callback` → server exchanges code (client secret stays server-side), fetches profile, calls legacy `socialLogin` (`/user_login` with `social_login_type`/`social_login_id`), mints a one-time code, 302s back to the app deep link → app posts code to `/auth/google/exchange` for the session.

**Required config (else `/auth/google/start` returns 503 "not configured"):**
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` secrets (user creates an OAuth 2.0 **Web** client in Google Cloud Console).
- The Google client's **Authorized redirect URI must exactly equal** `${publicOrigin}/api/auth/google/callback`, where `publicOrigin = https://${REPLIT_DOMAINS[0]}` (see `config.ts`).
- `SESSION_SECRET` (signs the OAuth `state`).

**On deploy:** the production domain changes, so the prod `/api/auth/google/callback` URL must also be added to the same Google OAuth client's redirect URIs, or sign-in breaks in production.

**Web vs native return_uri gotcha:** on native, `makeRedirectUri` returns a `udecide://`/`exp://` deep link; on **web** it returns the Expo web origin, which is the `*.expo.*` subdomain (`REPLIT_EXPO_DEV_DOMAIN`) — NOT `publicOrigin` (`REPLIT_DOMAINS[0]`, no `.expo.`). The server's `isAllowedReturnUri` allowlist must therefore accept BOTH `config.publicOrigin` and `config.expoWebOrigin`, or web sign-in fails with 400 "A valid return_uri is required" while native works. Keep that allowlist strict (exact origin or `origin/` prefix) — it's the open-redirect guard.

**How to apply:** if Google Sign-In fails, first curl `localhost:80/api/auth/google/start?return_uri=udecide://` — a 302 to accounts.google.com means server config is good and the problem is in Google Console (redirect URI mismatch / consent screen / test users) or the legacy `socialLogin`.
