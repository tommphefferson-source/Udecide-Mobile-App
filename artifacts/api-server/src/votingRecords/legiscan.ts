import { TtlCache } from "./fetchCache";

/**
 * LegiScanService — the only place that talks to api.legiscan.com.
 *
 * Operations used (verified against the LegiScan API manual and the response
 * shapes already handled by the app's bills feature):
 *   getSessionList   ?state=GA          → sessions[] {session_id, session_name, year_start, year_end, prior, special}
 *   getSessionPeople ?id={session_id}   → sessionpeople.people[] {people_id, name, first/last, party, role, district, bioguide_id?}
 *   getMasterList    ?id={session_id}   → masterlist {"0..n": {bill_id, number, last_action_date, status, change_hash}}
 *   getBill          ?id={bill_id}      → bill {number, title, description, url, state_link, session, votes[] {roll_call_id, date, desc, chamber, yea, nay, nv, absent, total, passed}}
 *   getRollCall      ?id={roll_call_id} → roll_call {..., votes[] {people_id, vote_id, vote_text}}
 * Every response carries {"status":"OK"|"ERROR"} — treated as a schema guard.
 *
 * The key lives ONLY in the server env (LEGISCAN_API_KEY); it is never
 * bundled into the mobile apps. Usage is treated as a limited resource:
 * per-op caching, a concurrency throttle, exponential backoff, and metrics
 * counters (logged by callers) keep the free-tier monthly query budget safe.
 */

const BASE = "https://api.legiscan.com/";

export const legiscanMetrics = {
  requests: 0,
  cacheHits: 0,
  failures: 0,
  rateLimitEvents: 0,
};

export function legiscanKey(): string | undefined {
  return process.env.LEGISCAN_API_KEY || undefined;
}

// Response caches. Roll calls and bills are effectively immutable → long TTL;
// session/people/masterlist change during active sessions → shorter TTL
// (configurable via env, hours).
const hours = (envVar: string, fallback: number) =>
  (Number.parseFloat(process.env[envVar] ?? "") || fallback) * 60 * 60 * 1000;
const sessionCache = new TtlCache<unknown>(hours("LEGISCAN_SESSION_TTL_HOURS", 24), 60);
const peopleCache = new TtlCache<unknown>(hours("LEGISCAN_PEOPLE_TTL_HOURS", 24), 60);
const masterListCache = new TtlCache<unknown>(hours("LEGISCAN_MASTERLIST_TTL_HOURS", 6), 60);
const billCache = new TtlCache<unknown>(hours("LEGISCAN_BILL_TTL_HOURS", 24), 500);
const rollCallCache = new TtlCache<unknown>(hours("LEGISCAN_ROLLCALL_TTL_HOURS", 24), 500);

// Simple concurrency throttle (LegiScan asks for polite usage).
let inFlight = 0;
const queue: (() => void)[] = [];
const MAX_CONCURRENT = 4;
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    queue.shift()?.();
  }
}

async function call<T>(op: string, params: Record<string, string>): Promise<T> {
  const key = legiscanKey();
  if (!key) throw new Error("LEGISCAN_API_KEY is not configured");
  const qs = new URLSearchParams({ key, op, ...params });
  let delay = 1000;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json = await withSlot(async () => {
        legiscanMetrics.requests++;
        const res = await fetch(`${BASE}?${qs.toString()}`, {
          signal: AbortSignal.timeout(15_000),
        });
        if (res.status === 429) {
          legiscanMetrics.rateLimitEvents++;
          throw new Error("legiscan_rate_limited");
        }
        if (!res.ok) throw new Error(`legiscan HTTP ${res.status}`);
        return (await res.json()) as Record<string, unknown>;
      });
      if (json.status !== "OK") {
        // Schema/API guard: ERROR responses (bad key, bad id) are not retried.
        const alert = (json.alert as { message?: string } | undefined)?.message;
        throw new Error(`legiscan ${op} error: ${alert ?? "unknown"}`);
      }
      return json as T;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("error:")) break; // API-level error — retrying won't help
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2; // exponential backoff for network/rate-limit failures
    }
  }
  legiscanMetrics.failures++;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function cached<T>(
  cache: TtlCache<unknown>,
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(cacheKey);
  if (hit !== undefined) {
    legiscanMetrics.cacheHits++;
    return hit as T;
  }
  const value = await fetcher();
  cache.set(cacheKey, value);
  return value;
}

// ── Typed slices of the responses (only the fields we consume) ──────────────

export interface LsSession {
  session_id: number;
  session_name?: string;
  year_start?: number;
  year_end?: number;
  prior?: number; // 0 = current
  special?: number;
}
export interface LsPerson {
  people_id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  suffix?: string;
  party?: string;
  role?: string; // "Rep" | "Sen"
  district?: string; // "HD-058" / "SD-042"
  bioguide_id?: string;
}
export interface LsMasterListEntry {
  bill_id: number;
  number?: string;
  last_action_date?: string;
  last_action?: string;
  status?: number | string;
  change_hash?: string;
}
export interface LsBillVoteRef {
  roll_call_id: number;
  date?: string;
  desc?: string;
  chamber?: string;
  yea?: number;
  nay?: number;
  nv?: number;
  absent?: number;
  total?: number;
  passed?: number;
  url?: string;
  state_link?: string;
}
export interface LsBill {
  bill_id: number;
  state?: string;
  bill_number?: string;
  number?: string;
  title?: string;
  description?: string;
  url?: string; // LegiScan page
  state_link?: string; // official legislature page
  status_date?: string;
  session?: { session_id?: number; session_name?: string };
  votes?: LsBillVoteRef[];
}
export interface LsRollCallVote {
  people_id: number;
  vote_id: number; // 1 Yea, 2 Nay, 3 NV, 4 Absent
  vote_text?: string;
}
export interface LsRollCall {
  roll_call_id: number;
  bill_id: number;
  date?: string;
  desc?: string;
  chamber?: string; // "H" | "S"
  yea?: number;
  nay?: number;
  nv?: number;
  absent?: number;
  total?: number;
  passed?: number;
  votes?: LsRollCallVote[];
}

// ── Public operations ───────────────────────────────────────────────────────

export async function getSessionList(state: string): Promise<LsSession[]> {
  return cached(sessionCache, state, async () => {
    const json = await call<{ sessions?: LsSession[] }>("getSessionList", { state });
    if (!Array.isArray(json.sessions)) throw new Error("legiscan getSessionList: unexpected shape");
    return json.sessions;
  });
}

export async function getSessionPeople(sessionId: number): Promise<LsPerson[]> {
  return cached(peopleCache, String(sessionId), async () => {
    const json = await call<{ sessionpeople?: { people?: LsPerson[] } }>("getSessionPeople", {
      id: String(sessionId),
    });
    const people = json.sessionpeople?.people;
    if (!Array.isArray(people)) throw new Error("legiscan getSessionPeople: unexpected shape");
    return people;
  });
}

export async function getMasterList(sessionId: number): Promise<LsMasterListEntry[]> {
  return cached(masterListCache, String(sessionId), async () => {
    const json = await call<{ masterlist?: Record<string, unknown> }>("getMasterList", {
      id: String(sessionId),
    });
    if (!json.masterlist || typeof json.masterlist !== "object")
      throw new Error("legiscan getMasterList: unexpected shape");
    // The masterlist object mixes numbered bill entries with a `session` entry.
    return Object.values(json.masterlist).filter(
      (v): v is LsMasterListEntry =>
        typeof v === "object" && v !== null && "bill_id" in (v as object),
    );
  });
}

export async function getBill(billId: number): Promise<LsBill> {
  return cached(billCache, String(billId), async () => {
    const json = await call<{ bill?: LsBill }>("getBill", { id: String(billId) });
    if (!json.bill || typeof json.bill.bill_id !== "number")
      throw new Error("legiscan getBill: unexpected shape");
    return json.bill;
  });
}

export async function getRollCall(rollCallId: number): Promise<LsRollCall> {
  return cached(rollCallCache, String(rollCallId), async () => {
    const json = await call<{ roll_call?: LsRollCall }>("getRollCall", {
      id: String(rollCallId),
    });
    if (!json.roll_call || !Array.isArray(json.roll_call.votes))
      throw new Error("legiscan getRollCall: unexpected shape");
    return json.roll_call;
  });
}
