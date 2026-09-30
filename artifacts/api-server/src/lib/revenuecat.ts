/**
 * Server-side RevenueCat entitlement verification.
 *
 * Used to gate paid features (the Fact Checker's `ai_access`) so the paywall
 * can't be bypassed by calling the API directly. Reads the subscriber from the
 * RevenueCat REST API with the SECRET key (server-only — never shipped in the
 * app), and checks that the requested entitlement is currently active.
 *
 * Fails CLOSED: any misconfiguration, network error, or unknown subscriber
 * results in "not entitled".
 *
 * HARDENING NOTE (see docs/SUBSCRIPTIONS.md): the app user id arrives in a
 * client header (X-RC-User-Id = the app's user id). Before enabling billing in
 * production, bind that id to the authenticated session (derive it server-side
 * from the AUTHTOKEN) or verify RevenueCat webhooks, so a client can't present
 * another subscriber's id. The check below is correct; only the id's
 * provenance needs tightening.
 */

const SECRET = process.env.REVENUECAT_SECRET_KEY;
const API = "https://api.revenuecat.com/v1/subscribers";

// Short-lived cache so repeated Fact Checker calls don't hit RevenueCat every
// time. Entitlement changes propagate within the TTL.
const TTL_MS = 60_000;
const cache = new Map<string, { entitlements: Record<string, number>; fetchedAt: number }>();

interface RcSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null }>;
  };
}

/** Returns a map of active-entitlement → expiry epoch ms (Infinity if no expiry). */
async function loadEntitlements(appUserId: string): Promise<Record<string, number>> {
  const cached = cache.get(appUserId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.entitlements;

  const res = await fetch(`${API}/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`revenuecat HTTP ${res.status}`);
  const data = (await res.json()) as RcSubscriberResponse;

  const now = Date.now();
  const active: Record<string, number> = {};
  for (const [key, ent] of Object.entries(data.subscriber?.entitlements ?? {})) {
    const exp = ent.expires_date ? Date.parse(ent.expires_date) : Number.POSITIVE_INFINITY;
    if (Number.isNaN(exp) || exp > now) active[key] = exp;
  }
  cache.set(appUserId, { entitlements: active, fetchedAt: now });
  return active;
}

/**
 * True when `appUserId` currently holds `entitlement`. Fails closed on any
 * error or when the secret key / user id is missing.
 */
export async function hasEntitlement(
  appUserId: string | undefined | null,
  entitlement: string,
): Promise<boolean> {
  if (!SECRET || !appUserId) return false;
  try {
    const active = await loadEntitlements(appUserId);
    return entitlement in active;
  } catch {
    return false;
  }
}

/** Whether entitlement enforcement is configured on this server. */
export function revenueCatConfigured(): boolean {
  return !!SECRET;
}
