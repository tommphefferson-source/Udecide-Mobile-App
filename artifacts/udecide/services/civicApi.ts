import { MOCK_REPRESENTATIVES } from "./mockData";
import type { Representative } from "@/types/politics";

const API_KEY = process.env.EXPO_PUBLIC_CIVIC_API_KEY;
const BASE_URL = "https://www.googleapis.com/civicinfo/v2/representatives";

export function isCivicMockMode() {
  return !API_KEY;
}

// ── Google Civic Information API response shapes ───────────────────────────

interface CivicOffice {
  name: string;
  divisionId: string;
  levels?: string[];
  roles?: string[];
  officialIndices: number[];
}

interface CivicChannel {
  type: string;
  id: string;
}

interface CivicOfficial {
  name: string;
  address?: { line1?: string; city?: string; state?: string; zip?: string }[];
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  channels?: CivicChannel[];
  emails?: string[];
}

interface CivicResponse {
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns all representatives for the given address from Google Civic
 * Information API — covers federal, state, county, and city officials.
 * Falls back to mock data when no API key is configured.
 */
export async function getRepresentatives(addr: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<Representative[]> {
  if (isCivicMockMode()) {
    console.warn("[Civic] No API key – using mock data");
    await new Promise((r) => setTimeout(r, 600));
    return MOCK_REPRESENTATIVES;
  }

  const query = buildAddressQuery(addr);
  if (!query) {
    return MOCK_REPRESENTATIVES;
  }

  try {
    const url = `${BASE_URL}?key=${API_KEY}&address=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Civic API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as CivicResponse;
    return mapCivicResponse(data);
  } catch (err) {
    console.error("[Civic] getRepresentatives failed:", err);
    return MOCK_REPRESENTATIVES;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildAddressQuery(addr: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}): string {
  const parts = [addr.address, addr.city, addr.state, addr.zipCode].filter(Boolean);
  return parts.join(", ");
}

function mapLevel(levels?: string[]): Representative["level"] {
  if (!levels || levels.length === 0) return "city";
  const l = levels[0];
  if (l === "country") return "federal";
  if (l === "administrativeArea1") return "state";
  if (l === "administrativeArea2") return "county";
  return "city";
}

function normaliseParty(raw?: string): string {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("democrat")) return "Democrat";
  if (lower.includes("republican")) return "Republican";
  if (lower.includes("libertarian")) return "Libertarian";
  if (lower.includes("independent")) return "Independent";
  if (lower.includes("green")) return "Green";
  if (lower.includes("nonpartisan") || lower.includes("non-partisan")) return "Nonpartisan";
  return raw;
}

function extractDistrict(divisionId: string, officeName: string): string {
  // ocd-division/country:us/state:ca/cd:12 → "District 12"
  const cdMatch = divisionId.match(/\/cd:(\d+)/);
  if (cdMatch) return `District ${cdMatch[1]}`;

  const slduMatch = divisionId.match(/\/sldu:(.+)$/);
  if (slduMatch) return `State Senate District ${slduMatch[1]}`;

  const sldlMatch = divisionId.match(/\/sldl:(.+)$/);
  if (sldlMatch) return `State Assembly District ${sldlMatch[1]}`;

  const countyMatch = divisionId.match(/\/county:(.+)$/);
  if (countyMatch) return formatSegment(countyMatch[1]) + " County";

  const placeMatch = divisionId.match(/\/place:(.+)$/);
  if (placeMatch) return formatSegment(placeMatch[1]);

  return officeName;
}

function formatSegment(segment: string): string {
  return segment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapCivicResponse(data: CivicResponse): Representative[] {
  const offices = data.offices ?? [];
  const officials = data.officials ?? [];
  const reps: Representative[] = [];

  for (const office of offices) {
    const level = mapLevel(office.levels);
    const district = extractDistrict(office.divisionId, office.name);

    for (const idx of office.officialIndices) {
      const official = officials[idx];
      if (!official) continue;

      const twitter = official.channels?.find((c) => c.type === "Twitter")?.id;
      const facebook = official.channels?.find((c) => c.type === "Facebook")?.id;

      reps.push({
        id: `civic-${office.divisionId}-${idx}`,
        name: official.name,
        office: office.name,
        party: normaliseParty(official.party),
        district,
        level,
        phone: official.phones?.[0],
        email: official.emails?.[0],
        website: official.urls?.[0],
        imageUrl: official.photoUrl,
        twitter: twitter ? `@${twitter.replace(/^@/, "")}` : undefined,
        facebook,
        source: "Google Civic Information API",
      });
    }
  }

  return reps;
}
