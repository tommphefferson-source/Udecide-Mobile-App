import { getLocales } from "expo-localization";

import { es } from "./es";

/**
 * Lightweight i18n for UDecide.
 *
 * Convention: the ENGLISH string is the key. `t("Sign In")` returns the Spanish
 * translation when the device language is Spanish, and the key itself (the
 * English copy) otherwise — so a missing translation can never render as a raw
 * key, it just falls back to English.
 *
 * The device language is read once at startup (standard RN behavior — the OS
 * restarts the app when the user changes system language).
 */
const deviceLanguage = getLocales()[0]?.languageCode ?? "en";

/** Active translation dictionary, or null when the UI language is English. */
const dict: Record<string, string> | null =
  deviceLanguage === "es" ? es : null;

/** True when the app is rendering in Spanish. */
export const isSpanish = dict !== null;

/** BCP-47 tag for date/number formatting that matches the UI language. */
export const uiLocale = isSpanish ? "es-MX" : "en-US";

/** Translate a UI string (English copy in, localized copy out). */
export function t(english: string): string {
  return dict?.[english] ?? english;
}
