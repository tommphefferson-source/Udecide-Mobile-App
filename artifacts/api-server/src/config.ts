/**
 * Centralized environment-variable configuration.
 *
 * The Google Civic key is read from GOOGLE_CIVIC_API_KEY (the name used by the
 * legacy app's spec) and falls back to the existing CIVIC_API_KEY secret so the
 * service works without renaming secrets.
 */
export interface AppConfig {
  appName: string;
  environment: string;
  googleCivicApiKey: string | undefined;
  /** OAuth 2.0 Web client id for "Sign in with Google". */
  googleOAuthClientId: string | undefined;
  /** OAuth 2.0 Web client secret (kept server-side, never sent to the app). */
  googleOAuthClientSecret: string | undefined;
  /**
   * Public https origin the app is reached at (no trailing slash). Used to
   * build the Google OAuth redirect URI, which must exactly match an entry in
   * the Google console. Derived from the Replit domains.
   */
  publicOrigin: string | undefined;
  /**
   * Public https origin of the Expo **web** build (the `*.expo.*` subdomain),
   * which differs from `publicOrigin`. Used to allow the web client's OAuth
   * return_uri, since on web `makeRedirectUri` returns this origin rather than a
   * `udecide://` deep link.
   */
  expoWebOrigin: string | undefined;
  /** Secret used to sign the OAuth `state` parameter (HMAC). */
  sessionSecret: string | undefined;
  /** Base URL of the legacy UDecide web service (CodeIgniter backend). */
  legacyWsBaseUrl: string;
  /**
   * AUTHTOKEN for the legacy web service. When set, the polls endpoints serve
   * live data proxied from the legacy server; when absent, they fall back to
   * local mock data.
   */
  legacyWsAuthToken: string | undefined;
  host: string;
  port: number;
}

export const config: AppConfig = {
  appName: process.env.APP_NAME ?? "UDecide Civic API",
  environment: process.env.NODE_ENV ?? "development",
  googleCivicApiKey:
    process.env.GOOGLE_CIVIC_API_KEY ?? process.env.CIVIC_API_KEY,
  googleOAuthClientId: process.env.GOOGLE_CLIENT_ID,
  googleOAuthClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  publicOrigin: (() => {
    // Explicit override for non-Replit hosts (e.g. Render): set PUBLIC_ORIGIN to
    // the full https origin, e.g. https://udecide-api.onrender.com. Falls back to
    // the Replit domain derivation when running on Replit.
    const explicit = process.env.PUBLIC_ORIGIN?.trim().replace(/\/+$/, "");
    if (explicit) return explicit;
    const domain =
      process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ??
      process.env.REPLIT_DEV_DOMAIN;
    return domain ? `https://${domain}` : undefined;
  })(),
  expoWebOrigin: process.env.REPLIT_EXPO_DEV_DOMAIN
    ? `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`
    : undefined,
  sessionSecret: process.env.SESSION_SECRET,
  legacyWsBaseUrl: process.env.LEGACY_WS_BASE_URL ?? "https://52.45.60.139/WS",
  legacyWsAuthToken: process.env.LEGACY_WS_AUTHTOKEN,
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
};
