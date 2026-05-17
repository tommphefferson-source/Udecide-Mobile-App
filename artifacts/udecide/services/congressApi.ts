import { MOCK_REPRESENTATIVES, MOCK_BILLS } from "./mockData";
import type { Representative, Bill } from "@/types/politics";

const API_KEY = process.env.EXPO_PUBLIC_CONGRESS_GOV_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";

function isMockMode() {
  return !API_KEY;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
  PR: "Puerto Rico",
};

// Congress.gov v3 /member response shapes
interface CongressMemberItem {
  bioguideId?: string;
  name?: string;
  partyName?: string;
  state?: string;
  district?: number | string;
  officialWebsiteUrl?: string;
  terms?: {
    item?: Array<{ chamber?: string; startYear?: number; endYear?: number }>;
  };
}

interface CongressBillItem {
  number?: string;
  title?: string;
  congress?: number | string;
  type?: string;
  latestAction?: { text?: string; actionDate?: string };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns federal representatives (Senate + House) for a given U.S. state
 * abbreviation (e.g. "CA", "TX").  Falls back to mock data when no API key
 * is configured.
 *
 * Note: the /member list endpoint returns the state as a full name
 * ("California") so we convert the abbreviation and filter client-side —
 * the API's `state` query param is unreliable for filtering.
 */
export async function getMembers(state?: string): Promise<Representative[]> {
  if (isMockMode()) {
    console.warn("[Congress.gov] No API key – using mock data");
    await new Promise((r) => setTimeout(r, 600));
    return MOCK_REPRESENTATIVES.filter((r) => r.level === "federal");
  }

  try {
    // Fetch all current members in one call (there are ~535 total).
    // We filter client-side because the API's ?state= param uses full names
    // ("California") while callers pass abbreviations ("CA").
    const res = await fetch(
      `${BASE_URL}/member?api_key=${API_KEY}&limit=250&currentMember=true`
    );
    if (!res.ok) throw new Error(`Congress.gov responded ${res.status}`);
    const data = (await res.json()) as { members?: CongressMemberItem[] };
    let members = data.members ?? [];

    if (state) {
      const abbr = state.toUpperCase();
      const fullName = STATE_NAMES[abbr] ?? state;
      members = members.filter(
        (m) =>
          m.state === fullName ||
          m.state?.toUpperCase() === abbr
      );
    }

    return mapCongressMembers(members, state?.toUpperCase());
  } catch (err) {
    console.error("[Congress.gov] getMembers failed:", err);
    return MOCK_REPRESENTATIVES.filter((r) => r.level === "federal");
  }
}

export async function getMemberById(id: string): Promise<Representative | null> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_REPRESENTATIVES.find((r) => r.id === id) ?? null;
  }
  try {
    const res = await fetch(`${BASE_URL}/member/${id}?api_key=${API_KEY}`);
    if (!res.ok) throw new Error(`Congress.gov responded ${res.status}`);
    const data = (await res.json()) as { member?: CongressMemberItem };
    if (!data.member) return null;
    return mapCongressMember(data.member);
  } catch (err) {
    console.error("[Congress.gov] getMemberById failed:", err);
    return null;
  }
}

export async function getRecentBills(): Promise<Bill[]> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 500));
    return MOCK_BILLS.filter((b) => b.state === "US");
  }
  try {
    const res = await fetch(
      `${BASE_URL}/bill?api_key=${API_KEY}&limit=20&sort=updateDate+desc`
    );
    if (!res.ok) throw new Error(`Congress.gov responded ${res.status}`);
    const data = (await res.json()) as { bills?: CongressBillItem[] };
    return mapCongressBills(data.bills ?? []);
  } catch (err) {
    console.error("[Congress.gov] getRecentBills failed:", err);
    return MOCK_BILLS.filter((b) => b.state === "US");
  }
}

export async function searchCongressBills(query: string): Promise<Bill[]> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 500));
    const q = query.toLowerCase();
    return MOCK_BILLS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }
  try {
    const res = await fetch(
      `${BASE_URL}/bill?api_key=${API_KEY}&query=${encodeURIComponent(query)}&limit=20`
    );
    if (!res.ok) throw new Error(`Congress.gov responded ${res.status}`);
    const data = (await res.json()) as { bills?: CongressBillItem[] };
    return mapCongressBills(data.bills ?? []);
  } catch (err) {
    console.error("[Congress.gov] searchCongressBills failed:", err);
    return [];
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCongressMembers(members: CongressMemberItem[], stateAbbr?: string): Representative[] {
  return members.map((m) => mapCongressMember(m, stateAbbr)).filter(
    (r): r is Representative => r !== null
  );
}

function mapCongressMember(m: CongressMemberItem, stateAbbr?: string): Representative {
  // The most recent term entry determines current chamber
  const latestTerm = m.terms?.item?.at(-1);
  const chamber = latestTerm?.chamber ?? "";

  // Congress.gov uses "House of Representatives" or "Senate"
  const isHouse =
    chamber.toLowerCase().includes("house") ||
    chamber.toLowerCase().includes("representative");
  const office = isHouse ? "U.S. Representative" : "U.S. Senator";

  // Use abbreviation if passed in, otherwise derive from full state name
  const abbr =
    stateAbbr ??
    (m.state
      ? Object.keys(STATE_NAMES).find((k) => STATE_NAMES[k] === m.state) ?? m.state
      : "");

  const districtStr =
    isHouse && m.district != null
      ? `${abbr} – District ${m.district}`
      : `${abbr} – At-Large`;

  return {
    id: m.bioguideId ?? String(Math.random()),
    name: m.name ?? "Unknown",
    office,
    party: normaliseParty(m.partyName ?? ""),
    district: districtStr,
    level: "federal",
    website: m.officialWebsiteUrl ?? "",
    source: "Congress.gov",
  };
}

function mapCongressBills(bills: CongressBillItem[]): Bill[] {
  return bills.map((b) => ({
    id: `${b.type ?? ""}-${b.number ?? ""}`,
    billId: `${b.type ?? ""}-${b.number ?? ""}`,
    number: `${b.type ?? ""} ${b.number ?? ""}`.trim(),
    title: b.title ?? "",
    description: b.title ?? "",
    status: b.latestAction?.text ?? "Introduced",
    state: "US",
    session: String(b.congress ?? ""),
    lastAction: b.latestAction?.text ?? "",
    lastActionDate: b.latestAction?.actionDate ?? "",
    sponsors: [],
    source: "Congress.gov",
  }));
}

/** Normalise Congress.gov party names to our display strings */
function normaliseParty(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("democrat")) return "Democrat";
  if (lower.includes("republican")) return "Republican";
  if (lower.includes("libertarian")) return "Libertarian";
  if (lower.includes("independent")) return "Independent";
  if (lower.includes("green")) return "Green";
  return raw || "Unknown";
}
