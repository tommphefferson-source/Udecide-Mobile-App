/**
 * Central, non-React session token store.
 *
 * `auth_token` is the field the legacy backend returns from its login/signup
 * responses (surfaced as `authToken` by services/authApi.ts). AuthContext owns
 * persistence (AsyncStorage) and mirrors the current value here so that plain,
 * non-React service modules — most importantly the API client wrapper — can read
 * it synchronously while building requests.
 *
 * `AUTHTOKEN` is the custom HTTP header name the legacy backend expects on every
 * later authenticated request. The API client attaches the saved token under
 * that header (see services/apiClient.ts).
 */

let currentToken: string | null = null;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Update the in-memory token. Called by AuthContext when the session is loaded
 * from storage, after a successful login/signup, and on logout (with null).
 */
export function setSessionToken(token: string | null): void {
  currentToken = token;
}

/** Read the current token for attaching the AUTHTOKEN header. */
export function getSessionToken(): string | null {
  return currentToken;
}

/**
 * Register the callback invoked when an authenticated request is rejected
 * because the token is missing, expired, or invalid. AuthContext registers a
 * handler that clears the session and routes the user back to login.
 */
export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

/** Invoked by the API client on a 401 to trigger logout + redirect. */
export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
