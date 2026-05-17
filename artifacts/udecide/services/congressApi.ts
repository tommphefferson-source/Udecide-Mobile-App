import { MOCK_REPRESENTATIVES, MOCK_BILLS } from "./mockData";
import type { Representative, Bill } from "@/types/politics";

const API_KEY = process.env.CONGRESS_GOV_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";

function isMockMode() {
  return !API_KEY;
}

export async function getMembers(state?: string): Promise<Representative[]> {
  if (isMockMode()) {
    console.warn("[Congress.gov] No API key found - using mock data");
    await new Promise((resolve) => setTimeout(resolve, 600));
    let reps = MOCK_REPRESENTATIVES.filter((r) => r.level === "federal");
    if (state) reps = reps.filter((r) => r.district.includes(state));
    return reps;
  }
  try {
    const stateParam = state ? `&state=${state}` : "";
    const res = await fetch(
      `${BASE_URL}/member?api_key=${API_KEY}&limit=50${stateParam}`
    );
    const data = await res.json();
    return mapCongressMembers(data.members ?? []);
  } catch {
    return MOCK_REPRESENTATIVES.filter((r) => r.level === "federal");
  }
}

export async function getMemberById(id: string): Promise<Representative | null> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_REPRESENTATIVES.find((r) => r.id === id) ?? null;
  }
  try {
    const res = await fetch(`${BASE_URL}/member/${id}?api_key=${API_KEY}`);
    const data = await res.json();
    return mapCongressMember(data.member);
  } catch {
    return null;
  }
}

export async function getRecentBills(): Promise<Bill[]> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_BILLS.filter((b) => b.state === "US");
  }
  try {
    const res = await fetch(
      `${BASE_URL}/bill?api_key=${API_KEY}&limit=20&sort=updateDate+desc`
    );
    const data = await res.json();
    return mapCongressBills(data.bills ?? []);
  } catch {
    return [];
  }
}

export async function searchCongressBills(query: string): Promise<Bill[]> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const q = query.toLowerCase();
    return MOCK_BILLS.filter(
      (b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    );
  }
  try {
    const res = await fetch(
      `${BASE_URL}/bill?api_key=${API_KEY}&query=${encodeURIComponent(query)}&limit=20`
    );
    const data = await res.json();
    return mapCongressBills(data.bills ?? []);
  } catch {
    return [];
  }
}

type MemberData = Record<string, unknown>;
type BillData = Record<string, unknown>;

function mapCongressMembers(members: MemberData[]): Representative[] {
  return members.map(mapCongressMember).filter(Boolean) as Representative[];
}

function mapCongressMember(m: MemberData): Representative {
  return {
    id: String(m.bioguideId ?? m.id ?? ""),
    name: String(m.name ?? ""),
    office: String(m.terms?.item?.[0]?.chamber === "House" ? "U.S. Representative" : "U.S. Senator"),
    party: String(m.partyName ?? m.party ?? ""),
    district: String(m.district ?? m.state ?? ""),
    level: "federal",
    website: String(m.officialWebsiteUrl ?? ""),
    source: "Congress.gov",
  };
}

function mapCongressBills(bills: BillData[]): Bill[] {
  return bills.map((b) => ({
    id: String(b.number ?? ""),
    billId: String(b.number ?? ""),
    number: String(b.number ?? ""),
    title: String(b.title ?? ""),
    description: String(b.title ?? ""),
    status: String(b.latestAction?.text ?? ""),
    state: "US",
    session: String(b.congress ?? ""),
    lastAction: String(b.latestAction?.text ?? ""),
    lastActionDate: String(b.latestAction?.actionDate ?? ""),
    sponsors: [],
    source: "Congress.gov",
  }));
}
