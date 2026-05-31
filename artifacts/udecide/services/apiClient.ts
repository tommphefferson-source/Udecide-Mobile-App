import { getSessionToken, notifyUnauthorized } from "./session";

/**
 * Reusable API client wrapper for the UDecide API Server.
 *
 * The legacy backend (and the API Server that proxies it) authenticates requests
 * with a custom `AUTHTOKEN` header — NOT standard `Authorization: Bearer` auth.
 * The value is the `auth_token` returned by login/signup and held in the session
 * store. Every authenticated call routes through `apiFetch`, which:
 *   1. attaches `AUTHTOKEN: <auth_token>` automatically, and
 *   2. clears the session and bounces the user back to login on a 401.
 *
 * Centralizing this here means any authenticated endpoint — the poll endpoints
 * (proxying legacy /poll_listing, /poll_results, /polling) and any future ones —
 * reuses the exact same token behavior.
 */

export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

/** Custom auth header the legacy backend expects (not bearer auth). */
export const AUTH_HEADER = "AUTHTOKEN";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Thrown on a 401 after the session has been cleared. */
export class UnauthorizedError extends ApiError {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

interface ApiFetchOptions extends RequestInit {
  /**
   * Whether to attach the AUTHTOKEN header (default true). Set false only for
   * endpoints that are explicitly unauthenticated.
   */
  authenticated?: boolean;
}

/**
 * Fetch a path on the API Server with the AUTHTOKEN header attached. On a 401
 * (missing/expired/rejected token) the session is cleared, the user is routed
 * back to login, and an UnauthorizedError is thrown to the caller.
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { authenticated = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (authenticated) {
    const token = getSessionToken();
    // Legacy backend keys off the custom AUTHTOKEN header, not bearer auth.
    if (token) finalHeaders.set(AUTH_HEADER, token);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (res.status === 401) {
    notifyUnauthorized();
    throw new UnauthorizedError();
  }

  return res;
}
