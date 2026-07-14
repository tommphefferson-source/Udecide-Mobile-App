# UDecide Civic API

A single backend service that consolidates the civic-information app's backend
dependencies. It replaces:

1. Direct Google Civic API calls the iOS app made from the client, and
2. The legacy backend at `https://52.45.60.139/WS` (self-signed certificate; see `LEGACY_WS_ALLOW_SELF_SIGNED` handling in `src/providers/legacyWs.ts`).

It exposes a clean REST API under `/api`, validated end-to-end with Zod schemas
generated from the OpenAPI contract.

## Stack

- **Express 5** + **Node** (TypeScript, ESM, bundled with esbuild)
- **OpenAPI-first**: the contract lives in `lib/api-spec/openapi.yaml`; Zod
  schemas (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`)
  are generated from it.
- **pino** structured logging
- Mock-backed data for endpoints that have no live provider yet

## Project structure

```
artifacts/api-server/src/
├── app.ts                 # Express app: middleware, /health, /api router, error handler
├── index.ts               # Server bootstrap (reads PORT)
├── config.ts              # Environment-variable configuration
├── lib/
│   ├── logger.ts          # pino singleton
│   └── errors.ts          # AppError/UpstreamError + error-handler middleware
├── providers/
│   └── googleCivic.ts     # Google Civic API wrapper + response normalization
├── services/
│   └── pollsService.ts    # Poll logic + in-memory vote store
├── data/                  # Mock content (polls, home, news, quizzes, etc.)
└── routes/                # Thin route handlers (validate → call service → respond)
```

Route handlers stay thin: they validate input with generated Zod schemas, call a
service/provider, and parse the response before sending it.

## Running in Replit

The service runs via its workflow (build + start). It is not started with
`pnpm dev` directly.

- Restart: restart the `artifacts/api-server: API Server` workflow.
- Typecheck: `pnpm --filter @workspace/api-server run typecheck`
- Regenerate API types after editing the spec:
  `pnpm --filter @workspace/api-spec run codegen`

All traffic goes through the shared proxy. Use `localhost:80/api/...` for local
requests (never the service port directly). In production, the app is served over
HTTPS on the domains in `$REPLIT_DOMAINS`.

## Environment variables

See `.env.example`. Configure these as Replit Secrets:

| Variable               | Purpose                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `APP_NAME`             | Display name returned by `/api/home` and `/health`            |
| `NODE_ENV`             | `development` or `production`                                  |
| `HOST` / `PORT`        | Network binding (`PORT` is injected by the workflow)          |
| `GOOGLE_CIVIC_API_KEY` | Google Civic key for elections/voter-info (falls back to `CIVIC_API_KEY`) |
| `CICERO_API_KEY`       | Cicero key for representatives (server-side only)             |

## Endpoints

Base path: `/api`. Health probe also at `/health` (for direct liveness checks).

### Health

- `GET /health` — liveness probe (direct port; not proxied under `/api`)
- `GET /api/healthz` — proxy-facing health check

### Elections — **live (Google Civic)**

- `GET /api/elections` — list available elections
  ```bash
  curl localhost:80/api/elections
  ```
- `GET /api/elections/voter-info?address=<addr>&electionId=<id>` — voter info
  ```bash
  curl "localhost:80/api/elections/voter-info?address=100%20N%204th%20St,%20Bismarck,%20ND%2058501&electionId=9422"
  ```
  Returns normalized state election administration info, contests, candidates
  (with social channels) and polling locations.

### Polls — **mock-backed** (in-memory vote store)

- `GET /api/polls` — list polls
- `POST /api/polls/{pollId}/vote` — submit a vote
  ```bash
  curl -X POST localhost:80/api/polls/poll-voter-turnout/vote \
    -H 'Content-Type: application/json' -d '{"optionId":"opt-critical"}'
  ```
- `GET /api/polls/{pollId}/results` — results with vote counts and percentages

### Home — **mock-backed**

- `GET /api/home` — app metadata including `newsUrl` and home sections

### News — **mock-backed**

- `GET /api/news` — `newsUrl`, `title`, `description`, `source`, plus an
  expandable `articles` list

### Civics — **mock-backed**

- `GET /api/quizzes` — quiz menu
- `POST /api/quizzes/progress` — record quiz progress
  ```bash
  curl -X POST localhost:80/api/quizzes/progress \
    -H 'Content-Type: application/json' -d '{"quizId":"quiz-branches","completed":true,"score":7}'
  ```
- `GET /api/questionnaires` — questionnaires with questions
- `GET /api/terminology` — political terminology glossary
- `GET /api/parties` — nonpartisan party reference data

### Representatives — **live (Cicero)**

- `GET /api/representatives?address=&city=&state=&zip=` — officials by address

## Live vs mock-backed

| Endpoint group   | Source                        |
| ---------------- | ----------------------------- |
| Elections        | Live — Google Civic API       |
| Representatives  | Live — Cicero API             |
| Polls            | Mock data + in-memory votes   |
| Home             | Mock data + runtime config    |
| News             | Mock data                     |
| Civics           | Mock data                     |

## Errors

All errors return a consistent JSON shape:

```json
{ "error": "message" }
```

- `400` — invalid query/body, or an address/election Google Civic can't resolve
- `404` — unknown poll or option
- `502` — upstream provider failure (e.g. Google Civic unreachable)
- `500` — unexpected server error

## Legacy endpoint mapping

| Legacy (old app)                         | New endpoint                          |
| ---------------------------------------- | ------------------------------------- |
| Google Civic `/elections`                | `GET /api/elections`                  |
| Google Civic `/voterinfo`                | `GET /api/elections/voter-info`       |
| `/poll_listing`                          | `GET /api/polls`                      |
| `/polling`                               | `POST /api/polls/{pollId}/vote`       |
| `/poll_results`                          | `GET /api/polls/{pollId}/results`     |
| `/home_data`                             | `GET /api/home`                       |
| (`news_url` from home data)              | `GET /api/news`                       |
| `/quiz_menu_list`                        | `GET /api/quizzes`                    |
| `update_quiz_log`                        | `POST /api/quizzes/progress`          |
| `questionaires_listing`                  | `GET /api/questionnaires`             |
| `/political_terminology_list`            | `GET /api/terminology`                |
| `/get_parties`                           | `GET /api/parties`                    |

## Extending

- Add or change endpoints in `lib/api-spec/openapi.yaml`, then run codegen.
- Replace mock data in `src/data/` with live providers under `src/providers/`
  and logic under `src/services/`.
- Swap the in-memory poll vote store for the shared `@workspace/db` when durable
  storage is needed.
