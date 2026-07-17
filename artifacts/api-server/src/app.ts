import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { config } from "./config";
import { errorHandler } from "./lib/errors";

const app: Express = express();

// Behind Render's (and Replit's) proxy, the socket peer is an internal LB
// address that varies per request. Trust the proxy chain so req.ip resolves to
// the client IP from X-Forwarded-For — the /fact-check rate limiter keys
// anonymous callers by it. Best-effort: XFF is spoofable, but authenticated
// traffic (the real app) is keyed by AUTHTOKEN instead.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Plain liveness probe (the documented health endpoint is /api/healthz).
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: config.appName, environment: config.environment });
});

app.use("/api", router);

app.use(errorHandler);

export default app;
