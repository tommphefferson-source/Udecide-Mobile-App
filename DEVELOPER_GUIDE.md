# UDecide — Developer Guide

> Onboarding documentation for engineers inheriting the UDecide application. Covers architecture, the mobile app (UI + design system), the backend API server, every external API, the build/release pipeline, and the known issues you'll hit first.

**What UDecide is:** a free, **nonpartisan** U.S. civic-engagement app. Users see who represents them (federal → city), track elections and legislation, check voter/registration info, browse party platforms, take civics quizzes, vote in community polls, and ask an AI "fact checker." The product's guiding constraint is neutrality — no endorsements, no rankings.

---

## 1. Repository layout (pnpm monorepo)

The repo root is `/Users/andersonlawson/Claude/Projects/Udecide/Udecide-Mobile-App`. It's a **pnpm workspace** (`pnpm-workspace.yaml`, `packages: artifacts/*`, `lib/*`, `lib/integrations/*`). Uses `catalog:` for shared dep versions and a `minimumReleaseAge` supply-chain guard (do not disable).

```
Udecide-Mobile-App/
├── artifacts/
│   ├── udecide/          # THE MOBILE APP (Expo / React Native) — @workspace/udecide
│   ├── api-server/       # THE BACKEND (Node/Express proxy) — @workspace/api-server
│   └── mockup-sandbox/   # design/mockup sandbox (not shipped)
├── lib/                  # shared workspace packages (api-spec/openapi.yaml, api-zod, api-client-react, …)
├── eas.json              # (root, legacy) — the ACTIVE one is artifacts/udecide/eas.json
├── mobile/               # blank Expo template — NOT the product (ignore)
└── pnpm-workspace.yaml
```

> ⚠️ Two decoy directories: `mobile/` is an empty Expo starter, and the **root** `eas.json` is stale. The real app is `artifacts/udecide/` and the real EAS config is `artifacts/udecide/eas.json`. Run all `eas`/`expo` commands from `artifacts/udecide/`.

Install everything from the repo root: `pnpm install`.

---

## 2. Architecture overview

Three tiers. The mobile app never talks to the database or paid APIs directly for sensitive paths — the **api-server** proxies them so keys stay server-side.

```
┌─────────────────────────┐     HTTPS      ┌──────────────────────────┐
│   UDecide mobile app     │  AUTHTOKEN     │      api-server           │
│  (Expo / React Native)   │ ─────────────▶ │  (Node + Express proxy)   │
│                          │  /api/*        │                          │
│  services/ split:        │                │  routes/ → providers/     │
│   • api-server-proxied   │                │                          │
│   • direct-to-external   │                └───────────┬──────────────┘
└───────────┬──────────────┘                            │
            │ direct (EXPO_PUBLIC_* keys)                │ server-side keys
            ▼                                            ▼
  Congress.gov · LegiScan            Legacy UDecide WS (CodeIgniter, http://52.45.60.139/WS)
  Google Civic                       Cicero · Google Civic · Gemini · Google OAuth · RSS news feeds
```

**Two request families in the app's `services/`:**
- **API-server-proxied** (`auth`, `civic`/representatives, `quiz`, `news`, `polls`, `questionnaires`, `pages`) — go to `${EXPO_PUBLIC_DOMAIN}/api` with the custom `AUTHTOKEN` header. Real upstream keys live on the server.
- **Direct-to-external** (`congressApi`, `legiscanApi`, `electionsApi`) — call third-party APIs straight from the client with an `EXPO_PUBLIC_*` key, and **fall back to bundled mock data whenever the key is missing.** (The Fact Checker's Gemini calls used to be here but were moved server-side — see `/fact-check` in §6.2.)

**Auth model:** the legacy backend authenticates with a custom `AUTHTOKEN` header (NOT `Authorization: Bearer`). Login/signup return an `auth_token`; the app stores it and the api-server forwards it upstream. A `401` anywhere clears the session and bounces to login.

---

## 3. Tech stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 54 (`expo ~54.0.35`), React Native 0.81.5, React 19, **New Architecture on** |
| Routing | `expo-router` 6 (file-based, typed routes) |
| Server state | TanStack React Query |
| Local state/persist | React Context + `@react-native-async-storage/async-storage` |
| UI libs | `expo-linear-gradient`, `expo-blur`, `expo-glass-effect` (liquid-glass tabs), `expo-haptics`, `expo-symbols`, `react-native-reanimated` 4, `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-webview`, `@expo/vector-icons` |
| Fonts | Inter (400/500/600/700) via `@expo-google-fonts/inter` |
| Backend | Node + **Express 5** + TypeScript (ESM), bundled with **esbuild**; `pino` logging; **Zod** validation from `@workspace/api-zod` (generated from `lib/api-spec/openapi.yaml`) |
| Build/release | **EAS Build** (cloud) for the store binaries; a separate Replit `scripts/build.js` path for web/dev |
| Identifiers | Bundle ID `com.udecide.app` (iOS + Android); scheme `udecide` |

---

## 4. Mobile app (`artifacts/udecide/`)

### 4.1 Routing structure (expo-router, file-based)

**Root layout — `app/_layout.tsx`.** Provider tree (outer → inner):

```
SafeAreaProvider → ErrorBoundary → QueryClientProvider → GestureHandlerRootView
  → KeyboardProvider → AuthProvider → RootLayoutNav (mounts AddressProvider + Stack)
```

- Loads four Inter weights via `useFonts`; holds the native splash (`SplashScreen.preventAutoHideAsync()`) until fonts resolve.
- One `QueryClient` at module scope.
- On web only, `completeGoogleWebPopupIfNeeded()` runs at module load (handles the OAuth popup window).
- `RootLayoutNav` seeds `AddressProvider` from the signed-in user's address and declares the root `Stack` (`headerShown: false`). Top-level screens use `presentation: "card"` (most) or `"modal"` (`web-view`).

**Auth layout — `app/(auth)/_layout.tsx`:** `login`, `register`, `forgot-password`, `google-setup`, `profile-setup` (slide animation).

**Tabs layout — `app/(tabs)/_layout.tsx`:** chooses at runtime via `isLiquidGlassAvailable()`:
- **`NativeTabLayout`** — iOS 26+ liquid-glass `NativeTabs` with SF Symbols.
- **`ClassicTabLayout`** — fallback; absolute-positioned bar, `BlurView` frosted background on iOS, solid on web. Five tabs: **Home** (`index`), **Reps** (`representatives`), **Elections** (`elections`), **Bills** (`legislation`), **More** (`more`).

**Full route inventory:**

| Route | File | Purpose |
|---|---|---|
| `/` | `app/index.tsx` | Auth gate → `/(tabs)` or `/(auth)/login` |
| `*` | `app/+not-found.tsx` | 404 |
| `/(auth)/login` | `login.tsx` | Email/password + Google sign-in |
| `/(auth)/register` | `register.tsx` | Account creation (name/email/password/city/ZIP) |
| `/(auth)/forgot-password` | `forgot-password.tsx` | Reset request (UI-only success; no live call) |
| `/(auth)/google-setup` | `google-setup.tsx` | Collect city+ZIP for a verified-but-unlinked Google identity |
| `/(auth)/profile-setup` | `profile-setup.tsx` | Post-signup address capture ("Skip" defaults state to `CA`) |
| `/(tabs)/` | `index.tsx` | Dashboard: greeting, news card, 9-tile quick access |
| `/(tabs)/representatives` | `representatives.tsx` | Officials for the effective address, filterable by level |
| `/(tabs)/elections` | `elections.tsx` | Elections → offices → candidates |
| `/(tabs)/legislation` | `legislation.tsx` | Federal/State bill tracker + search + detail |
| `/(tabs)/more` | `more.tsx` | Grouped menu + Sign Out |
| `/voter-tools` | `voter-tools.tsx` | Registration/polling/early/absentee/ID by state |
| `/parties` | `parties.tsx` | Party list + platform detail |
| `/political-guide` | `political-guide.tsx` | Civic-education accordion → article |
| `/civics-quiz` | `civics-quiz.tsx` | Multiple-choice quiz with scoring |
| `/issue-questionnaire` | `issue-questionnaire.tsx` | Topic questionnaire; device-local stance |
| `/polls` | `polls.tsx` | Community polls, votable |
| `/poll-results` | `poll-results.tsx` | Aggregate poll outcomes |
| `/fact-checker` | `fact-checker.tsx` | Gemini AI nonpartisan chat |
| `/profile` | `profile.tsx` | View/edit profile, photo, subscription, delete account |
| `/address-override` | `address-override.tsx` | Browse another location's data |
| `/article` | `article.tsx` | In-app news reader |
| `/web-view` | `web-view.tsx` | In-app WebView (modal); new tab on web |
| `/static-page` | `static-page.tsx` | Legacy CMS pages (About/Privacy/Terms) |

### 4.2 Screen highlights

- **Home** — navy `LinearGradient` header, time-of-day greeting, live date, override chip, "Nonpartisan" chip; `NewsCard` + 9 accent-colored `CardButton` tiles + neutrality disclaimer.
- **Representatives** — `getRepresentatives(effectiveAddress)`, level filter, live-vs-sample badge ("Live · Cicero API"), expandable cards, contextual empty states.
- **Elections** — election list (dates, quick links, offices) → candidate detail; badge "Live · Google Civic".
- **Legislation** — Federal (Congress.gov) / State (LegiScan) toggle, state picker, search, bill detail with history timeline + votes.
- **Fact Checker** — inverted `FlatList` chat, suggested prompts, `sendGeminiMessage(history)` → api-server `/fact-check`; demo banner shown when the server replies with `mock:true` (no server Gemini key).
- **Profile** — avatar photo upload (`expo-image-picker` → `uploadProfilePhoto`), optimistic profile edits, subscription label, support links (`/static-page`, `mailto:`), delete account (native `Alert` / web `confirm`).
- Full per-screen detail lives in the code; every data screen reads location from `AddressContext.effectiveAddress`.

### 4.3 Shared components (`components/`)

`AddressOverrideBanner`, `BillCard`, `CandidateCard`, `CardButton` (reanimated press-scale + haptics), `ErrorBoundary` (class), `ErrorFallback` (dev stack modal), `ErrorState`, `HorizontalScroller` (web wheel→horizontal), `KeyboardAwareScrollViewCompat`, `LoadingState` (shimmer skeletons), `NewsCard`, `PollCard`, `RepresentativeCard`.

### 4.4 Contexts

**`context/AuthContext.tsx`** — `user`, `authToken`, `isLoading`; `isAuthenticated = !!user && !!authToken`.
- AsyncStorage keys: `@udecide_user`, `@udecide_user_<userId>`, `@udecide_auth_token`. On boot, mirrors the token into the non-React session store (`setSessionToken`) so services can attach `AUTHTOKEN` immediately.
- Exposes `login`, `signInWithGoogleCode`, `registerWithGoogleCode`, `register`, `setupProfile`, `updateProfile` (optimistic + reconcile), `uploadProfilePhoto`, `deleteAccount`, `logout`.
- Registers `setUnauthorizedHandler` → any 401 triggers `logout()` + redirect to login. Consume via `useAuth()`.

**`context/AddressContext.tsx`** — `override` + derived **`effectiveAddress`** (override when active, else the signed-in user's address; state defaults to `CA`). Persisted at `@udecide_address_override`. Exposes `setOverride`, `clearOverride`, `isOverrideActive`. This is the single source of truth for the data screens. Consume via `useAddress()`.

### 4.5 Hooks & utils

- `hooks/useColors.ts` — theme entry point; returns the light/dark token set + `radius`.
- `utils/constants.ts` — `US_STATES` (51), `PARTY_COLORS`, `POLL_TOPICS`, `REP_LEVELS`, disclaimer strings, `SUPPORT_EMAIL = udecidemobileapplication@gmail.com`, `GEMINI_SYSTEM_PROMPT`.
- `utils/formatters.ts` — dates, phone, percent, number abbreviation, party short names.
- `utils/validation.ts` — email/password(min 8)/name/ZIP/state validators.
- `utils/googleWebAuth.ts` — web-only OAuth popup helper (guarded `Platform.OS !== "web"` → no-op on native).

### 4.6 UI design system (real values)

**Palette — `constants/colors.ts`** (patriotic navy/red/gold; light + dark):

| Token | Light | Dark |
|---|---|---|
| `background` | `#F5F6F8` | `#080E17` |
| `card` | `#FFFFFF` | `#1F3E63` |
| `text`/`primary`/`navy` | `#1F3E63` | `#F5F6F8` (text) |
| `secondary`/`navyLight` | `#2A4E7A` | `#355F8E` |
| `accent`/`red`/`destructive` | `#C41E3A` | `#C41E3A` |
| `gold` | `#D4AF37` | `#D4AF37` |
| `mutedForeground` | `#6B7A8D` | `#8892A0` |
| `border`/`input` | `#DDE1E7` | `#1E2F42` |

`radius = 12`. Party colors: Democrat `#1A4A8A`, Republican `#C41E3A`, Libertarian `#D4AF37`, Green `#2E7D32`, Independent `#6B7A8D`. Live/sample badges: green `#16a34a` / amber `#d97706`. Google blue `#4285F4`. Login gradient `#2A405E`.

**Typography:** Inter — 400 body, 500 labels/chips/tabs, 600 card/section titles, 700 screen/hero titles & numbers. Screen title 24, card title 15–17, body 13–16, labels 11–13.

**Recurring patterns:** navy gradient headers (`#1F3E63 → #2A4E7A`, white title + 60% subtitle); cards (`colors.card`, 1px `colors.border`, radius 14–16, soft shadow `0/1/0.05/4`); pill badges with hex-alpha tint fills (`color + "20"`); iOS liquid-glass/`BlurView` tab bar; splash = `icon.png` on `#1F3E63`. Heavy `Platform.OS === "web"` branching (padding, OAuth popup, WebView new-tab, `window.confirm` vs `Alert`).

---

## 5. Mobile services & data layer (`artifacts/udecide/services/`)

### 5.1 API client core

- **`apiClient.ts`** — `API_BASE = EXPO_PUBLIC_DOMAIN ? \`https://<domain>/api\` : "/api"`. `AUTH_HEADER = "AUTHTOKEN"`. `apiFetch(path, {authenticated=true})` attaches the token from `getSessionToken()`; on `401` calls `notifyUnauthorized()` and throws `UnauthorizedError`. Error types: `ApiError{status}`, `UnauthorizedError` (401). (The `API_BASE` expression is duplicated in `authApi.ts`, `civicApi.ts`, `quizApi.ts`.)
- **`session.ts`** — non-React token store: `setSessionToken`, `getSessionToken`, `setUnauthorizedHandler`, `notifyUnauthorized`. Wired by `AuthContext`.

### 5.2 Per-service reference

| Service | Talks to | Key/auth | Mock fallback |
|---|---|---|---|
| `authApi.ts` | api-server `/auth/*` (login, signup, google/{start,exchange,register}, profile, profile/photo, DELETE account) | `AUTHTOKEN` (profile routes) | none — always live |
| `civicApi.ts` | api-server `/representatives` (Cicero proxy) | server-side `CICERO_API_KEY` | rich per-state samples when `live:false` or error |
| `quizApi.ts` | api-server `/quiz` | none | server-owned |
| `newsApi.ts` | api-server `/news` (`apiFetch`) | `AUTHTOKEN` | server-owned |
| `pollsApi.ts` | api-server `/polls`, `/polls/results`, `/polls/:id/vote` | `AUTHTOKEN` | server-owned |
| `questionnairesApi.ts` | api-server `/questionnaires` | `AUTHTOKEN` | server-owned |
| `pagesApi.ts` | api-server `/pages/:code` (aboutus/privacypolicy/termsconditions) | `AUTHTOKEN` | server-owned |
| `electionsApi.ts` | **Google Civic v2** directly | client `EXPO_PUBLIC_CIVIC_API_KEY` | `MOCK_ELECTIONS` when key absent; empty (honest) on live error |
| `legiscanApi.ts` | **LegiScan** directly | client `EXPO_PUBLIC_LEGISCAN_API_KEY` | `MOCK_BILLS` |
| `congressApi.ts` | **Congress.gov v3** directly | client `EXPO_PUBLIC_CONGRESS_GOV_API_KEY` | `MOCK_REPRESENTATIVES`/`MOCK_BILLS` |
| `geminiApi.ts` | api-server `/fact-check` (Gemini proxy) | server-side `GEMINI_API_KEY` | server returns `mock:true` demo responses |
| `voterApi.ts` | none (static) | — | fully mock; returns official gov URLs |
| `mockData.ts` | — | — | shared mock dataset |

### 5.3 Client environment variables (`EXPO_PUBLIC_*`)

| Variable | Configures | Absent → |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | api-server origin | relative `/api` (broken on native) |
| `EXPO_PUBLIC_CONGRESS_GOV_API_KEY` | Congress.gov | mock |
| `EXPO_PUBLIC_LEGISCAN_API_KEY` | LegiScan | mock |
| `EXPO_PUBLIC_CIVIC_API_KEY` | Google Civic (elections) | mock |

> `EXPO_PUBLIC_GEMINI_API_KEY` was **removed** (2026): the Fact Checker now calls the api-server `/fact-check` proxy and the Gemini key lives server-side as `GEMINI_API_KEY`, so it is never bundled into the app.

In dev, `package.json`'s `dev` script maps host secrets into these (incl. `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`). **See §8 for how production builds differ — this is the source of the current login failures.**

---

## 6. Backend — `api-server` (`artifacts/api-server/`)

Node + Express 5 + TypeScript (ESM, esbuild-bundled). Exists to (1) hide paid keys, (2) proxy the legacy CodeIgniter backend at `http://52.45.60.139/WS` and translate its `{settings:{success,message},data}` envelope into clean Zod-validated REST, (3) avoid CORS (`app.use(cors())` for all origins).

**Key files:** `src/app.ts` (assembly + `/health`), `src/index.ts` (bootstrap; **throws if `PORT` unset**), `src/config.ts`, `src/routes/*`, `src/providers/*` (`legacyWs.ts`, `googleCivic.ts`), `src/services/*` (`pollsService`, `newsService`, `questionnairesService`), `src/lib/*` (`errors`, `logger`, `rss`, `requestToken`).

### 6.1 Configuration (`src/config.ts`)

| Env var | Purpose |
|---|---|
| `PORT` | **Mandatory** (server throws without it); default 8080 |
| `HOST` | bind host, default `0.0.0.0` |
| `NODE_ENV` | `development`/`production` |
| `GOOGLE_CIVIC_API_KEY` / `CIVIC_API_KEY` | Google Civic key (former preferred) |
| `CICERO_API_KEY` | Cicero (read in `routes/representatives.ts`); absent → `/representatives` returns `live:false` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini key for `/fact-check` (read in `routes/factCheck.ts`); absent → demo responses. `GEMINI_MODEL` optionally overrides the model (default `gemini-3.5-flash`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client |
| `SESSION_SECRET` | HMAC-signs the OAuth `state` |
| `LEGACY_WS_BASE_URL` | legacy backend; default `http://52.45.60.139/WS` |
| `LEGACY_WS_AUTHTOKEN` | shared app-level token; absent → polls/news/questionnaires serve mock |
| `REPLIT_DOMAINS` / `REPLIT_DEV_DOMAIN` | → `publicOrigin` (OAuth redirect + return_uri allowlist) |
| `REPLIT_EXPO_DEV_DOMAIN` | → `expoWebOrigin` (web build's OAuth return) |

> Google sign-in needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `SESSION_SECRET` + a Replit domain, else `/api/auth/google/*` returns `503`.

### 6.2 Routes (all under `/api`)

- **`auth.ts`** — `POST /auth/login` → legacy `/user_login`; `POST /auth/signup` → `/user_sign_up`; `POST /auth/profile` → `/edit_profile`; `DELETE /auth/account` → `/delete_account`; `POST /auth/profile/photo` → `/edit_profile` (multipart `user_profile`, 8 MB cap).
- **`googleOauth.ts`** — `GET /auth/google/start` (→ Google), `GET /auth/google/callback` (token+userinfo, then legacy `/user_login`), `POST /auth/google/exchange` (redeem one-time code), `POST /auth/google/register` (→ `/user_sign_up`).
- **`representatives.ts`** — `GET /representatives` → **Cicero** `https://app.cicerodata.com/v3.1/official`. `{live, officials}`; `502` on upstream failure.
- **`elections.ts`** — `GET /elections`, `GET /elections/voter-info` → **Google Civic** `https://www.googleapis.com/civicinfo/v2`.
- **`polls.ts`** — `GET /polls`, `POST /polls/:id/vote`, `GET /polls/results`, `GET /polls/:id/results` → legacy `/poll_listing`, `/poll_results`, `/polling` (live-or-mock).
- **`news.ts`** — `GET /news` → legacy `/home_data` `news_url` RSS (parsed server-side) or mock.
- **`factCheck.ts`** — `POST /fact-check` → **Google Gemini** (`generativelanguage.googleapis.com/v1beta`), server-side `GEMINI_API_KEY`, holds the nonpartisan system prompt; returns `{ text, mock }` (`mock:true` demo answer when unkeyed; generic 502 on upstream failure — never leaks Google's error body).
- **`civics.ts`** — `GET /quiz`, `/quizzes`, `POST /quizzes/progress` (echo only), `GET /questionnaires` (legacy `/quiz_menu_list` + `/questionaires_listing`), `/terminology`, `/parties` (mostly mock).
- **`pages.ts`** — `GET /pages/:code` → legacy `/static_pages` (`aboutus`/`privacypolicy`/`termsconditions`).
- **`home.ts`** — `GET /home`; **`health.ts`** — `GET /api/healthz` (+ non-`/api` `GET /health`).

### 6.3 Auth flows

- **Email/password:** proxy to legacy `/user_login` / `/user_sign_up` (JSON). Legacy returns `auth_token`; failures map to 401/400. Signup falls back to login if the token is missing.
- **Google OAuth (server-mediated):** app opens `/auth/google/start?return_uri=<deep link>` → HMAC `state` → Google → `/auth/google/callback` (verifies state, exchanges code with the **secret**, fetches verified profile, requires verified email) → legacy `socialLogin`. If linked → 302 back to `return_uri` with `status=success&code=<one-time>`; if unlinked → `status=register&code=<ticket>`. App then `POST /auth/google/exchange` (or `/register`). Identity is verified server-side (can't be forged). `return_uri` allowlist: `exp|udecide|exp+udecide:` schemes, or `publicOrigin`/`expoWebOrigin`.

### 6.4 Providers

- **`legacyWs.ts`** — all POST; form-urlencoded + `AUTHTOKEN` (`wsPost`) or JSON no-token (`wsPostJson` for auth). `{settings:{success,message},data}` envelope; `success==="1"` = ok. HTTP 401/403 → `LegacyAuthError` (401); only auth-phrase messages force re-login (business errors stay 502). Handles legacy field quirks (`location`=street, `zipcode`, numeric `state_id` via `US_STATE_CODE_TO_ID`, `user_profile` photo).
- **`googleCivic.ts`** — Civic v2 wrapper; normalizes elections/voter-info; tolerates non-JSON bodies.
- **`newsService.ts`** — RSS fetch + parse (`lib/rss.ts`), SSRF guard (https only, blocks private IPs), 25-article cap, custom User-Agent.

### 6.5 Deployment/runtime

- **Build:** `pnpm --filter @workspace/api-server run build` → esbuild bundle to `dist/index.mjs`. **Start:** `node --enable-source-maps ./dist/index.mjs`.
- **Replit artifact** (`.replit-artifact/artifact.toml`): `kind="api"`, `localPort=8080`, `paths=["/api"]`, health `/api/healthz`. Served over HTTPS on `$REPLIT_DOMAINS`.
- **Mandatory:** `PORT`. Feature-gating vars listed in §6.1.

---

## 7. External API inventory (consolidated)

| API | Provides | Called from | Key location |
|---|---|---|---|
| **Legacy UDecide WS** (`http://52.45.60.139/WS`) | Auth, profile, polls, questionnaires, quiz, static pages, home/news data | client → api-server → legacy | server (`LEGACY_WS_AUTHTOKEN` + per-user token) |
| **Cicero** (`app.cicerodata.com/v3.1/official`) | All-levels officials by address | client `civicApi` → api-server | server `CICERO_API_KEY` |
| **Google Civic v2** (`googleapis.com/civicinfo/v2`) | Elections + voter info | (a) client `electionsApi`; (b) api-server `/elections` | (a) client `EXPO_PUBLIC_CIVIC_API_KEY`; (b) server `GOOGLE_CIVIC_API_KEY` |
| **Congress.gov v3** (`api.congress.gov/v3`) | Federal members + bills | client `congressApi` | client `EXPO_PUBLIC_CONGRESS_GOV_API_KEY` |
| **LegiScan** (`api.legiscan.com`) | State bills | client `legiscanApi` | client `EXPO_PUBLIC_LEGISCAN_API_KEY` |
| **Google Gemini** (`generativelanguage.googleapis.com`) | Fact-checker chat | client `geminiApi` → **api-server `/fact-check`** | **server** `GEMINI_API_KEY` |
| **Google OAuth 2.0** | "Sign in with Google" | client → api-server `googleOauth` | server `GOOGLE_CLIENT_ID/SECRET` + `SESSION_SECRET` |

---

## 8. Build, release & environments

### 8.1 Two divergent build pipelines (important!)

| | **EAS Build** (store binaries) | **Replit `scripts/build.js`** (web/dev) |
|---|---|---|
| Produces | `.ipa` / `.aab` for App Store & Play | web bundle / dev artifact |
| `EXPO_PUBLIC_DOMAIN` | **not set** (EAS "production" env is empty) → `API_BASE = "/api"` | **set to `$REPLIT_DEV_DOMAIN`** |
| External API keys | not injected → mock mode | not injected (only DOMAIN + REPL_ID) |

**Consequence — this is the root cause of the current login problems:**
- A **Replit-built** TestFlight binary points at your **dev domain**, which serves browsers but **403s native clients** → the "login works on desktop, 403 on TestFlight" symptom.
- An **EAS-built** binary has **no** domain → login calls resolve to a dead relative `/api`.
- **Neither pipeline points at a real production backend.** Fixing release requires deploying the api-server to a stable public HTTPS URL and setting `EXPO_PUBLIC_DOMAIN` (via `eas env:create`) to it.

### 8.2 EAS config (`artifacts/udecide/eas.json`)

- Profiles: `development` (dev client), `preview` (internal APK), `production` (`autoIncrement`, Android `app-bundle`, iOS store, remote `appVersionSource`).
- `submit.production.ios`: uses an App Store Connect API key (`ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId`), `appleTeamId DG74FTMU5Y`, `ascAppId 6783990826`.
- EAS project: `@udecide-apps-organization/udecide` (projectId `164677c7-6539-4eae-ab59-fb5c6a999c3a`).

### 8.3 App config (`artifacts/udecide/app.json`)

`name "UDecide App"`, `slug udecide`, `version 1.0.0`, `newArchEnabled true`, iOS `ITSAppUsesNonExemptEncryption:false`, plugins: expo-router (origin `https://replit.com/`), expo-font, expo-web-browser, expo-image-picker (photos permission). `reactCompiler` is **disabled** (see §9).

### 8.4 Commands (run from `artifacts/udecide/`)

```bash
# dev
pnpm --filter @workspace/udecide run dev      # (or restart the "udecide: expo" Replit workflow)
# checks
pnpm --filter @workspace/udecide run typecheck
npx expo-doctor
# store builds
eas build --platform ios --profile production
eas build --platform android --profile production
# submit (iOS lands in TestFlight → then Submit for Review in App Store Connect)
eas submit --platform ios --profile production --latest
```

---

## 9. Known issues & gotchas (read this first)

1. **No production backend / login broken in the shipped app.** See §8.1. The single most important fix: deploy `api-server` to a stable production URL (Replit Reserved-VM/Autoscale or custom domain like `api.udecide.app` — NOT the `*.replit.dev` dev domain, which 403s native traffic) and set `EXPO_PUBLIC_DOMAIN` in EAS. Then rebuild.
2. **External data keys absent in production builds.** The three remaining client-side services (Congress.gov, LegiScan, Google Civic elections) silently serve **mock data** in prod (keys aren't injected). Add those `EXPO_PUBLIC_*` keys as EAS env vars if live data is wanted. (Gemini is no longer in this list — it's server-side now; see #3.)
3. **Fact Checker is now server-side.** As of 2026 the Fact Checker calls the api-server `/fact-check` proxy, and the Gemini key lives only on the server (`GEMINI_API_KEY`) — it is no longer bundled in the app. The model is set by `GEMINI_MODEL` (default `gemini-3.5-flash`); **verify that model id is valid for your Google account** and, if not, change it via the `GEMINI_MODEL` env var — no code change or app rebuild needed.
4. **App Store launch-crash history.** v1.0 build 4 was rejected for crashing on launch. Two mitigations applied: `reactCompiler` disabled (experimental, production-only transform), and the Google login path hardened to reject scheme-less URLs before calling `WebBrowser.openAuthSessionAsync` (a relative URL hard-crashes `ASWebAuthenticationSession`, which a JS `try/catch` can't catch). Always verify a production binary in **TestFlight** before submitting for review.
5. **Concurrent file churn.** A background Replit/agent process periodically re-adds an unused Android `RECORD_AUDIO` permission and other edits to `app.json`. Re-check `git diff` before each build.
6. **Monorepo / pnpm.** Install from the root; `pnpm-workspace.yaml` enforces a `minimumReleaseAge` supply-chain delay (don't disable). Decoys: `mobile/` and the root `eas.json` are not the product.
7. **Legacy backend is HTTP.** `http://52.45.60.139/WS` is plain HTTP — fine because only the (HTTPS) api-server calls it server-side; the app must never call it directly.

---

## 10. Getting started (new developer)

1. **Clone & install:** `pnpm install` from the repo root.
2. **Run the app:** from `artifacts/udecide/`, `pnpm run dev` (or restart the Replit "udecide: expo" workflow) and open in a dev build / Expo Go via the QR code. Set `EXPO_PUBLIC_*` keys/`.env` for live data (see `.env.example`).
3. **Run the backend:** from `artifacts/api-server/`, `pnpm run dev` (needs `PORT`, plus the secrets in §6.1 for live features).
4. **Typecheck:** `pnpm run typecheck` (root, all packages).
5. **Where things live:** UI/screens → `artifacts/udecide/app/`; data → `artifacts/udecide/services/`; theming → `constants/colors.ts` + `hooks/useColors.ts`; backend routes → `artifacts/api-server/src/routes/`; the API contract → `lib/api-spec/openapi.yaml` (regenerate `@workspace/api-zod` after edits).
6. **Before shipping:** fix the production backend URL (§9.1), decide on live vs mock data keys (§9.2), verify in TestFlight, then submit.

### Release status snapshot
- **iOS:** App Store Connect app created (Apple ID `6783990826`); builds uploaded to TestFlight; v1.0 build 4 rejected for launch crash; build 5 (+ crash guard) is the current fix candidate. Store listing assets generated in `~/Udecide_Assets/`.
- **Android:** production `.aab` built via EAS; not yet submitted (needs Play Console app record + Google service-account JSON).
- **Blocking both:** a production backend URL and public **Privacy Policy** + **Support** URLs.
