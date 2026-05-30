---
name: Cicero / paid external APIs must be proxied through the API Server
description: Why UDecide reps data goes through api-server, not direct from the Expo client
---

Direct browser/Expo-web calls to the Cicero API (`app.cicerodata.com/v3.1/official`) fail: it sends no `Access-Control-Allow-Origin`, so the browser blocks the request. It works on a native device (no CORS), but the canvas/web preview is web — so "works on my phone" hides a broken web preview.

**Rule:** route paid/no-CORS external APIs through the `api-server` artifact (`/api/*`), not the client.
**Why:** (1) server-to-server has no CORS; (2) the paid key stays server-side instead of being shipped in the public app bundle.
**How to apply:**
- Add an Express route in `artifacts/api-server/src/routes/` and mount it in `routes/index.ts`. `cors()` and `express.json()` are already global. Use `req.log`, never `console.log`.
- The Expo client reaches the proxy at `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/...` (EXPO_PUBLIC_DOMAIN = the shared-proxy domain, set in the udecide dev script). Don't call service ports directly.
- Cicero `/official` needs a full street address (state-only returns 0 officials). Response shape: `response.results.candidates[].officials[]` (~40 across all levels in one call). Level via `office.district.district_type` (NATIONAL_*→federal, STATE_*→state) and LOCAL/LOCAL_EXEC split by `district.subtype` (COUNTY/CITY). Cicero also returns the full federal cabinet + statewide execs — faithful but noisy.

**40-result cap gotcha:** Cicero `/official` defaults to **40 results per candidate**. It lists the full federal cabinet + statewide executives first, which can fill the window and silently truncate county/city officials — the exact "local reps not showing" symptom. Pass `max=200` on the proxy request so local officials always come through (confirmed: a suburban address went 5→9 city officials with `max` set). Note county coverage is still genuinely sparse in Cicero (many addresses return 0 county), and a state-only / no-street address returns 0 officials of any level.

**EXPO_PUBLIC_ key-exposure gotcha:** Expo inlines *every* `EXPO_PUBLIC_*` env var into the client bundle, even ones the client code never reads. A paid key must NOT be named `EXPO_PUBLIC_*`. Store it as a plain secret (e.g. `CICERO_API_KEY`) read only by the server. Deleting the old `EXPO_PUBLIC_*` secret must be done by the user in the Secrets tab — the agent cannot delete secrets programmatically.
