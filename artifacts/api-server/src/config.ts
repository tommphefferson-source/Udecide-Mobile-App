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
  legacyWsBaseUrl: process.env.LEGACY_WS_BASE_URL ?? "http://52.45.60.139/WS",
  legacyWsAuthToken: process.env.LEGACY_WS_AUTHTOKEN,
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
};
