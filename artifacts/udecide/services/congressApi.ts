import { MOCK_REPRESENTATIVES, MOCK_BILLS } from "./mockData";
import type { Representative, Bill } from "@/types/politics";

const API_KEY = process.env.EXPO_PUBLIC_CONGRESS_GOV_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";

function isMockMode() {
  return !API_KEY;
}

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
 */
export async function getMembers(state?: string): Promise<Representative[]> {
  if (isMockMode()) {
    console.warn("[Congress.gov] No API key – using mock data");
    await new Promise((r) => setTimeout(r, 600));
    let reps = MOCK_REPRESENTATIVES.filter((r) => r.level === "federal");
    if (state) {
      reps = reps.filter(
        (r) =>
          r.district.toUpperCase().includes(state.toUpperCase()) ||
          r.source?.includes(state)
      );
    }
    return reps;
  }

  try {
    // Congress.gov /member?currentMember=true&state=XX returns current members for a state
    const stateParam = state ? `&state=${state.toUpperCase()}` : "";
    const res = await fetch(
      `${BASE_URL}/member?api_key=${API_KEY}&limit=50&currentMember=true${stateParam}`
    );
    if (!res.ok) throw new Error(`Congress.gov responded ${res.status}`);
    const data = (await res.json()) as { members?: CongressMemberItem[] };
    return mapCongressMembers(data.members ?? []);
  } catch (err) {
    console.error("[Congress.gov] getMembers failed:", err);
    // Fall back to mock federal data so the screen is never empty
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

function mapCongressMembers(members: CongressMemberItem[]): Representative[] {
  return members.map(mapCongressMember).filter(
    (r): r is Representative => r !== null
  );
}

function mapCongressMember(m: CongressMemberItem): Representative {
  // The most recent term entry determines current chamber
  const latestTerm = m.terms?.item?.at(-1);
  const chamber = latestTerm?.chamber ?? "";

  // Congress.gov uses "House of Representatives" or "Senate"
  const isHouse =
    chamber.toLowerCase().includes("house") ||
    chamber.toLowerCase().includes("representative");
  const office = isHouse ? "U.S. Representative" : "U.S. Senator";

  // Build a human-readable district string
  const districtStr =
    isHouse && m.district != null
      ? `${m.state ?? ""} – District ${m.district}`
      : (m.state ?? "At-Large");

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
  if (lower.includes("independent") || lower.includes("id")) return "Independent";
  if (lower.includes("green")) return "Green";
  return raw || "Unknown";
}
