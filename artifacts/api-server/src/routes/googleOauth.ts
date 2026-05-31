import { Router, type IRouter } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ExchangeGoogleCodeBody,
  ExchangeGoogleCodeResponse,
  RegisterGoogleUserBody,
  RegisterGoogleUserResponse,
} from "@workspace/api-zod";
import { config } from "../config";
import { AppError } from "../lib/errors";
import {
  LegacyAuthError,
  SocialAccountNotLinkedError,
  socialLogin,
  socialSignup,
  type LegacyAuthUser,
} from "../providers/legacyWs";

/**
 * Server-mediated "Sign in with Google" (OAuth 2.0 authorization-code flow).
 *
 * The app cannot run the native Google flow inside Expo Go (the client config
 * and Expo proxy don't match an arbitrary bundle id), so the server drives the
 * whole dance instead and the app only opens a browser:
 *
 *   1. App opens `/auth/google/start?return_uri=<app deep link>`.
 *   2. We 302 to Google with our own https callback as the redirect_uri.
 *   3. Google calls `/auth/google/callback`; we exchange the code for tokens
 *      using the client secret (kept here, never shipped to the app), fetch the
 *      verified profile, sign the user in against the legacy backend, mint a
 *      short-lived single-use code, and 302 back to the app's deep link.
 *   4. App posts that code to `/auth/google/exchange` to get its session.
 *
 * Because the identity is verified with Google server-side, the app can never
 * forge an identity by posting an arbitrary email/provider id.
 */

const router: IRouter = Router();

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPE = "openid email profile";

/** How long the signed `state` (and thus the whole sign-in attempt) is valid. */
const STATE_TTL_MS = 10 * 60 * 1000;
/** How long the one-time exchange code lives before the app must redeem it. */
const EXCHANGE_TTL_MS = 2 * 60 * 1000;
const HTTP_TIMEOUT_MS = 12_000;

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateSecret: string;
}

/**
 * Returns the resolved Google config, or null when any required value is
 * missing so callers can fail loudly instead of starting a broken flow.
 */
function getGoogleConfig(): GoogleConfig | null {
  const { googleOAuthClientId, googleOAuthClientSecret, publicOrigin, sessionSecret } =
    config;
  if (!googleOAuthClientId || !googleOAuthClientSecret || !publicOrigin || !sessionSecret) {
    return null;
  }
  return {
    clientId: googleOAuthClientId,
    clientSecret: googleOAuthClientSecret,
    redirectUri: `${publicOrigin}/api/auth/google/callback`,
    stateSecret: sessionSecret,
  };
}

/**
 * Only allow the app's own deep links (or our own web origin) as a return
 * target so the OAuth endpoint can't be abused as an open redirector.
 */
function isAllowedReturnUri(value: string): boolean {
  if (/^(exp|udecide|exp\+udecide):/i.test(value)) return true;
  // On web, makeRedirectUri returns the app's own https origin (the main proxy
  // domain or the Expo web subdomain) instead of a deep link.
  const allowedOrigins = [config.publicOrigin, config.expoWebOrigin].filter(
    (o): o is string => Boolean(o),
  );
  return allowedOrigins.some(
    (origin) => value === origin || value.startsWith(`${origin}/`),
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signState(returnUri: string, secret: string): string {
  const payload = base64url(JSON.stringify({ r: returnUri, t: Date.now(), n: randomBytes(8).toString("hex") }));
  const sig = base64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verify a signed state and return its return URI, or null when invalid/expired. */
function verifyState(state: string, secret: string): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = base64url(createHmac("sha256", secret).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as { r?: unknown; t?: unknown };
    if (typeof decoded.r !== "string" || typeof decoded.t !== "number") return null;
    if (Date.now() - decoded.t > STATE_TTL_MS) return null;
    return decoded.r;
  } catch {
    return null;
  }
}

/** Append query params to a deep link or URL without assuming a parseable scheme. */
function appendParams(uri: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${uri}${uri.includes("?") ? "&" : "?"}${query}`;
}

interface PendingSession {
  user: LegacyAuthUser;
  expiresAt: number;
}

/**
 * Single-use codes handed to the app on its return URL, redeemed once at
 * `/auth/google/exchange`. In-memory is sufficient: the api-server is a single
 * process and the codes live for ~2 minutes.
 */
const pendingSessions = new Map<string, PendingSession>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [code, entry] of pendingSessions) {
    if (entry.expiresAt <= now) pendingSessions.delete(code);
  }
}

function stashSession(user: LegacyAuthUser): string {
  sweepExpired();
  const code = randomBytes(32).toString("hex");
  pendingSessions.set(code, { user, expiresAt: Date.now() + EXCHANGE_TTL_MS });
  return code;
}

/**
 * A Google-verified identity that has no linked account yet, held server-side
 * against a single-use ticket while the app collects the extra fields the
 * legacy backend needs to create the account. The app never sees (or sends)
 * the email/provider id — keeping the identity server-verified end to end.
 */
interface PendingRegistration {
  provider: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

function sweepExpiredRegistrations(): void {
  const now = Date.now();
  for (const [code, entry] of pendingRegistrations) {
    if (entry.expiresAt <= now) pendingRegistrations.delete(code);
  }
}

function stashRegistration(
  identity: Omit<PendingRegistration, "expiresAt">,
): string {
  sweepExpiredRegistrations();
  const code = randomBytes(32).toString("hex");
  pendingRegistrations.set(code, {
    ...identity,
    expiresAt: Date.now() + EXCHANGE_TTL_MS,
  });
  return code;
}

function toAuthResponse(user: LegacyAuthUser) {
  const { authToken, ...rest } = user;
  return { authToken, user: rest };
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

async function exchangeCodeForToken(
  cfg: GoogleConfig,
  code: string,
): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!res.ok || !data.access_token) {
    throw new Error("Google token exchange failed");
  }
  return data.access_token;
}

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as GoogleUserInfo;
  if (!res.ok || !data.sub) {
    throw new Error("Failed to fetch Google profile");
  }
  return data;
}

// Step 1 — kick off the flow: redirect the in-app browser to Google.
router.get("/auth/google/start", (req, res): void => {
  const cfg = getGoogleConfig();
  if (!cfg) {
    throw new AppError(503, "Google sign-in is not configured on the server");
  }
  const returnUri = String(req.query.return_uri ?? "");
  if (!returnUri || !isAllowedReturnUri(returnUri)) {
    throw new AppError(400, "A valid return_uri is required");
  }
  const authUrl = appendParams(AUTH_ENDPOINT, {
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: SCOPE,
    state: signState(returnUri, cfg.stateSecret),
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
  });
  res.redirect(authUrl);
});

// Step 2 — Google redirects here; verify, sign in, and bounce back to the app.
router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const cfg = getGoogleConfig();
  if (!cfg) {
    throw new AppError(503, "Google sign-in is not configured on the server");
  }
  const state = String(req.query.state ?? "");
  const returnUri = verifyState(state, cfg.stateSecret);
  if (!returnUri) {
    // Without a trustworthy return target we cannot safely redirect anywhere.
    throw new AppError(400, "Invalid or expired sign-in state");
  }

  const fail = (message: string): void => {
    res.redirect(appendParams(returnUri, { status: "error", message }));
  };

  if (typeof req.query.error === "string") {
    fail(req.query.error);
    return;
  }
  const code = String(req.query.code ?? "");
  if (!code) {
    fail("missing_code");
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(cfg, code);
    const profile = await fetchUserInfo(accessToken);
    if (!profile.email || profile.email_verified === false) {
      fail("unverified_email");
      return;
    }
    try {
      const user = await socialLogin({
        provider: "google",
        providerId: profile.sub,
        email: profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
      });
      const oneTimeCode = stashSession(user);
      res.redirect(appendParams(returnUri, { status: "success", code: oneTimeCode }));
    } catch (err) {
      // Verified identity but no linked account yet: hand the app a registration
      // ticket so it can collect the remaining required fields and finish signup.
      if (err instanceof SocialAccountNotLinkedError) {
        const ticket = stashRegistration({
          provider: "google",
          providerId: profile.sub,
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
        });
        res.redirect(appendParams(returnUri, { status: "register", code: ticket }));
        return;
      }
      throw err;
    }
  } catch (err) {
    req.log.error({ err }, "Google sign-in callback failed");
    fail(err instanceof LegacyAuthError ? err.message : "signin_failed");
  }
});

// Step 3 — the app redeems its one-time code for the actual session.
router.post("/auth/google/exchange", (req, res): void => {
  const body = ExchangeGoogleCodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  sweepExpired();
  const entry = pendingSessions.get(body.data.code);
  if (!entry) {
    throw new AppError(401, "This sign-in code is invalid or has expired");
  }
  pendingSessions.delete(body.data.code);
  res.json(ExchangeGoogleCodeResponse.parse(toAuthResponse(entry.user)));
});

// Step 3b — for a verified-but-unlinked identity, finish account creation. The
// app supplies the registration ticket plus the minimum legacy-required fields
// (city + ZIP); the Google-verified identity is read from the server-held ticket.
router.post("/auth/google/register", async (req, res): Promise<void> => {
  const body = RegisterGoogleUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  sweepExpiredRegistrations();
  const ticket = pendingRegistrations.get(body.data.code);
  if (!ticket) {
    throw new AppError(401, "This sign-in code is invalid or has expired");
  }
  // Consume the ticket up front so a slow/failed signup can't be retried with
  // the same single-use code.
  pendingRegistrations.delete(body.data.code);

  let user: LegacyAuthUser;
  try {
    user = await socialSignup({
      provider: ticket.provider,
      providerId: ticket.providerId,
      email: ticket.email,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      city: body.data.city,
      zipCode: body.data.zipCode,
    });
  } catch (err) {
    // A rejected signup (e.g. the email already belongs to an account) is a bad
    // request, not an auth failure — mirror /auth/signup and surface it as 400
    // so the app shows the message instead of treating it as a 401 session error.
    if (err instanceof LegacyAuthError) {
      throw new AppError(400, err.message);
    }
    throw err;
  }
  res.json(RegisterGoogleUserResponse.parse(toAuthResponse(user)));
});

export default router;
