import { Platform } from "react-native";

/**
 * Subscription / paywall configuration.
 *
 * MODEL (two tiers in one RevenueCat "offering", both auto-renewable monthly):
 *   • Standard — $1.99/mo → grants entitlement `app_access` (use the app, no AI)
 *   • Plus     — $3.99/mo → grants `app_access` AND `ai_access` (adds the
 *                Fact Checker)
 * Using the app requires an active subscription; the AI Fact Checker requires
 * the Plus tier specifically.
 *
 * MASTER SWITCH: the whole paywall is OFF until `EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED`
 * is "true". While off, the app behaves exactly as it does today (free, AI open)
 * — so this code ships safely before the store-side setup (Paid Apps agreements,
 * RevenueCat account, products) is complete. Flip it on only after
 * docs/SUBSCRIPTIONS.md is fully checked off. See that doc for the activation
 * steps that only a human with store access can do.
 */
export const SUBSCRIPTIONS_ENABLED =
  process.env.EXPO_PUBLIC_SUBSCRIPTIONS_ENABLED === "true";

/**
 * RevenueCat PUBLIC SDK keys. These are safe to ship in the client — they are
 * not secrets (unlike the server-side REVENUECAT_SECRET_KEY). One key per
 * platform, from the RevenueCat dashboard → Project → API keys.
 */
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

/** The platform SDK key, or null on web / when unconfigured (can't bill there). */
export function revenueCatApiKey(): string | null {
  if (Platform.OS === "ios") return REVENUECAT_IOS_KEY || null;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_KEY || null;
  return null;
}

// RevenueCat entitlement identifiers (defined in the RevenueCat dashboard and
// attached to the products below).
export const ENTITLEMENT_APP = "app_access"; // granted by both tiers
export const ENTITLEMENT_AI = "ai_access"; // granted by Plus only

// RevenueCat offering + package identifiers (dashboard → Offerings). The
// packages map to the store products created in App Store Connect / Play.
export const OFFERING_ID = "default";
export const PACKAGE_STANDARD = "standard_monthly";
export const PACKAGE_PLUS = "plus_monthly";

// Shown on the paywall. Apple requires functional Terms (EULA) + Privacy links
// on any screen that sells an auto-renewable subscription.
export const TERMS_URL = "https://udecide.app/terms";
export const PRIVACY_URL = "https://udecide.app/privacy";

/** Static copy for each tier (prices come live from the store via RevenueCat). */
export const TIERS = [
  {
    packageId: PACKAGE_STANDARD,
    name: "Standard",
    fallbackPrice: "$1.99",
    tagline: "Full access to UDecide",
    includesAI: false,
  },
  {
    packageId: PACKAGE_PLUS,
    name: "Plus",
    fallbackPrice: "$3.99",
    tagline: "Everything in Standard, plus the AI Fact Checker",
    includesAI: true,
  },
] as const;
