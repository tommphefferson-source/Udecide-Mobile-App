# Subscriptions & Paywall (UDecide)

Two auto-renewable monthly tiers in one subscription group, billed through the
app stores via **RevenueCat**:

| Tier | Price | RevenueCat entitlements | What it unlocks |
|------|-------|--------------------------|-----------------|
| **Standard** | $1.99/mo | `app_access` | Full app (voter tools, reps, elections, legislation, polls, guides) — **no AI** |
| **Plus** | $3.99/mo | `app_access` + `ai_access` | Everything in Standard **plus the AI Fact Checker** |

Using the app requires an active subscription; the AI Fact Checker requires the
Plus tier specifically.

## Master switch — this ships OFF

Everything is gated behind a flag and **inactive until you turn it on**:

- App: `EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED` (build-time env)
- Server: `SUBSCRIPTIONS_ENABLED` (Render env, currently `"false"` in `render.yaml`)

While off, the app behaves exactly as today (free, AI open) and the server
doesn't gate `/fact-check`. This lets the code merge and ship without breaking
the live app before the store-side work is done. **Flip both to `true` only
after every box below is checked.**

## What only a human with store access can do

These cannot be automated and must be done before enabling the flag:

1. **App Store Connect → Agreements** — sign the **Paid Applications** agreement
   and complete banking + tax. Until this is active, no iOS IAP works.
2. **Google Play Console → Payments profile** — create/verify the merchant
   payments profile (banking + tax). Required for Play Billing.
3. **RevenueCat account** (free tier): create a project, add the iOS and Android
   apps, connect App Store Connect (App-Specific Shared Secret) and Play (reuse
   the existing `~/playconsole/play-publisher.json` service account or a new
   one with the correct grants).

## Store product setup (must match the identifiers in code)

Create **one subscription group** ("UDecide") with two auto-renewable products,
in BOTH stores, using these exact product IDs:

- `standard_monthly` — $1.99/mo
- `plus_monthly` — $3.99/mo

App Store Connect also needs, per subscription: a localized display name &
description (English + Spanish), a review screenshot, and the price. Add the
**Terms of Use (EULA)** and **Privacy Policy** links (the paywall shows them;
update `TERMS_URL`/`PRIVACY_URL` in `config/subscriptions.ts` if the real URLs
differ from `udecide.app/terms` and `/privacy`).

## RevenueCat configuration (must match code)

`artifacts/udecide/config/subscriptions.ts` is the single source of truth for
identifiers — set the dashboard to match it:

- **Entitlements:** `app_access`, `ai_access`
- **Products → entitlements:** `standard_monthly` → `app_access`;
  `plus_monthly` → `app_access` + `ai_access`
- **Offering** `default` with two packages whose identifiers are
  `standard_monthly` and `plus_monthly`
- Copy the **public SDK keys** (one per platform) and the **secret key**.

## Keys / env to set

App (EAS build-time, `eas.json` production `env` — the public keys are NOT
secrets):

```
EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED=true
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

Server (Render dashboard — `REVENUECAT_SECRET_KEY` is a secret, `sync:false`):

```
SUBSCRIPTIONS_ENABLED=true
REVENUECAT_SECRET_KEY=sk_xxx
```

## How it works in code

- `context/SubscriptionContext.tsx` configures RevenueCat, identifies the
  subscriber as the app's user id (`Purchases.logIn(user.id)`), and exposes
  `hasAppAccess` / `hasAiAccess`. When the flag is off, or on web / without a
  key, it grants access so nothing breaks.
- `app/_layout.tsx` `useSubscriptionGate()` redirects an authenticated user
  with no `app_access` to `app/paywall.tsx` (the two-tier screen; live prices
  from the store, Restore Purchases, Terms/Privacy links).
- `app/fact-checker.tsx` shows `components/AiPaywallNotice.tsx` (→ paywall
  focused on Plus) when the user lacks `ai_access`.
- `app/profile.tsx` adds a Subscription section (current plan, Upgrade, Manage
  Subscription deep-link, Restore Purchases).
- **Server enforcement:** `routes/factCheck.ts` requires the `ai_access`
  entitlement — verified against RevenueCat's REST API by `lib/revenuecat.ts`
  (fails closed) — before proxying Gemini, so the paywall can't be bypassed by
  calling the API directly. The app sends its RevenueCat user id in the
  `X-RC-User-Id` header.

## Security hardening required before go-live

`X-RC-User-Id` is currently a client-supplied header (the app's user id). A
malicious client could present another subscriber's id. Before enabling billing
in production, do ONE of:
- derive the user id server-side from the authenticated `AUTHTOKEN` instead of
  trusting the header, or
- enable RevenueCat **webhooks** and check entitlement against server-stored
  state keyed to the authenticated session.
The entitlement check itself is correct; only the id's provenance needs
tightening. (`lib/revenuecat.ts` carries the same note.)

## App Review notes

- This reverses the earlier "app is entirely free" answer given under guideline
  3.1.1. Expect subscription scrutiny: the paywall already includes the required
  auto-renew disclosure, price/cadence, Terms (EULA) + Privacy links, and a
  Restore Purchases control.
- A hard paywall (must subscribe to use the app) is allowed but higher-friction
  in review than a free tier; if Apple pushes back, the fastest answer is to let
  some content be viewable before the paywall. The flag architecture makes that
  easy to adjust.
- IAP is mandatory for these unlocks — do not route payment to Stripe/Render.

## Testing before go-live

1. Build a dev/preview client with the keys set and `..._ENABLED=true` (IAP
   needs a native build — it does not work in Expo Go).
2. Use App Store **sandbox** testers and Play **license/closed-track** testers
   to run real purchase, upgrade (Standard→Plus), restore, and cancel flows.
3. Confirm the server denies `/fact-check` with a Standard-only user (402
   `requiresUpgrade`) and allows it for Plus.
