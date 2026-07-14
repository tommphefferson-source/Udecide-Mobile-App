---
name: Legacy WS over HTTPS (self-signed)
description: How the api-server talks HTTPS to the legacy EC2 IP with a self-signed cert
---
- The legacy CodeIgniter backend serves HTTPS at the raw EC2 IP with a **self-signed cert**; Node's default fetch rejects it.
- **Why:** operator wanted HTTPS instead of plain HTTP; no domain/valid cert exists (api-legacy.udecide.app has no DNS record as of Jul 2026).
- **How to apply:** legacy calls go through `legacyFetch` in the api-server legacy provider — undici package `fetch` + `Agent({connect:{rejectUnauthorized:false}})`, enabled only when the base URL is the known IP or `LEGACY_WS_ALLOW_SELF_SIGNED=1`. Gotcha: an undici-package Agent passed to Node's *built-in* fetch fails with "invalid onRequestStart method" — must use undici's own fetch.
