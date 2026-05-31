import { config } from "../config";
import { AppError, UpstreamError } from "../lib/errors";

const BASE_URL = "https://www.googleapis.com/civicinfo/v2";

export interface NormalizedElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string | null;
}

export interface NormalizedVoterInfo {
  address: string;
  electionId: string | null;
  state: {
    name: string | null;
    electionInfoUrl: string | null;
    votingLocationFinderUrl: string | null;
    ballotInfoUrl: string | null;
    correspondenceAddress: {
      line1: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    };
  };
  contests: {
    type: string;
    office: string | null;
    level: string | null;
    districtScope: string | null;
    candidates: {
      name: string;
      party: string | null;
      candidateUrl: string | null;
      phone: string | null;
      email: string | null;
      channels: { type: string; id: string }[];
    }[];
  }[];
  pollingLocations: {
    name: string | null;
    address: string | null;
    hours: string | null;
  }[];
}

interface CivicElectionsRaw {
  elections?: {
    id?: string;
    name?: string;
    electionDay?: string;
    ocdDivisionId?: string;
  }[];
  error?: { message?: string };
}

interface CivicVoterInfoRaw {
  election?: { id?: string };
  state?: {
    name?: string;
    electionAdministrationBody?: {
      electionInfoUrl?: string;
      votingLocationFinderUrl?: string;
      ballotInfoUrl?: string;
      correspondenceAddress?: {
        line1?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    };
  }[];
  contests?: {
    type?: string;
    office?: string;
    level?: string[];
    district?: { scope?: string };
    candidates?: {
      name?: string;
      party?: string;
      candidateUrl?: string;
      phones?: string[];
      emails?: string[];
      channels?: { type?: string; id?: string }[];
    }[];
  }[];
  pollingLocations?: {
    address?: {
      locationName?: string;
      line1?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    pollingHours?: string;
  }[];
  error?: { message?: string };
}

function requireKey(): string {
  if (!config.googleCivicApiKey) {
    throw new UpstreamError("Google Civic API key is not configured");
  }
  return config.googleCivicApiKey;
}

/**
 * Reads a response body as JSON without throwing. Google may return non-JSON
 * (HTML error pages, empty bodies) on edge cases; those must not surface as an
 * unhandled SyntaxError (which would become a 500 instead of a normalized 502).
 */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return {};
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchElections(): Promise<NormalizedElection[]> {
  const key = requireKey();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/elections?key=${encodeURIComponent(key)}`);
  } catch {
    throw new UpstreamError("Failed to reach Google Civic elections endpoint");
  }
  if (!res.ok) {
    const body = (await readJson(res)) as CivicElectionsRaw;
    const message =
      body.error?.message ?? `Google Civic elections returned ${res.status}`;
    throw new UpstreamError(message);
  }
  const data = (await readJson(res)) as CivicElectionsRaw;
  return (data.elections ?? [])
    .filter((e): e is { id: string; name: string; electionDay: string; ocdDivisionId?: string } =>
      typeof e.id === "string" &&
      typeof e.name === "string" &&
      typeof e.electionDay === "string",
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      electionDay: e.electionDay,
      ocdDivisionId: e.ocdDivisionId ?? null,
    }));
}

export async function fetchVoterInfo(
  address: string,
  electionId?: string,
): Promise<NormalizedVoterInfo> {
  const key = requireKey();
  const params = new URLSearchParams({ address, key });
  if (electionId) params.set("electionId", electionId);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/voterinfo?${params.toString()}`);
  } catch {
    throw new UpstreamError("Failed to reach Google Civic voterinfo endpoint");
  }

  const data = (await readJson(res)) as CivicVoterInfoRaw;

  if (!res.ok) {
    const message = data.error?.message ?? `Google Civic voterinfo returned ${res.status}`;
    // 400s here are address/election problems the caller can correct.
    if (res.status === 400) throw new AppError(400, message);
    throw new UpstreamError(message);
  }

  const state = data.state?.[0];
  const admin = state?.electionAdministrationBody;
  const corr = admin?.correspondenceAddress;

  return {
    address,
    electionId: data.election?.id ?? electionId ?? null,
    state: {
      name: state?.name ?? null,
      electionInfoUrl: admin?.electionInfoUrl ?? null,
      votingLocationFinderUrl: admin?.votingLocationFinderUrl ?? null,
      ballotInfoUrl: admin?.ballotInfoUrl ?? null,
      correspondenceAddress: {
        line1: corr?.line1 ?? null,
        city: corr?.city ?? null,
        state: corr?.state ?? null,
        zip: corr?.zip ?? null,
      },
    },
    contests: (data.contests ?? []).map((c) => ({
      type: c.type ?? "General",
      office: c.office ?? null,
      level: c.level?.[0] ?? null,
      districtScope: c.district?.scope ?? null,
      candidates: (c.candidates ?? []).map((cand) => ({
        name: cand.name ?? "",
        party: cand.party ?? null,
        candidateUrl: cand.candidateUrl ?? null,
        phone: cand.phones?.[0] ?? null,
        email: cand.emails?.[0] ?? null,
        channels: (cand.channels ?? [])
          .filter((ch): ch is { type: string; id: string } =>
            typeof ch.type === "string" && typeof ch.id === "string",
          )
          .map((ch) => ({ type: ch.type, id: ch.id })),
      })),
    })),
    pollingLocations: (data.pollingLocations ?? []).map((p) => {
      const a = p.address;
      const parts = [a?.line1, a?.city, a?.state, a?.zip].filter(Boolean);
      return {
        name: a?.locationName ?? null,
        address: parts.length > 0 ? parts.join(", ") : null,
        hours: p.pollingHours ?? null,
      };
    }),
  };
}
