import { config } from "../config";
import { polls as seedPolls, type SeedPoll } from "../data/polls";
import { AppError } from "../lib/errors";
import * as legacy from "../providers/legacyWs";

/**
 * Polls are served live from the legacy web service when a token is available —
 * either a per-user token forwarded by an authenticated client (the AUTHTOKEN
 * header) or the shared app token (config.legacyWsAuthToken). Otherwise they
 * fall back to local mock data. In live mode, no-result and error paths surface
 * empty/upstream errors — mock data is never shown alongside live data.
 */
function isLive(token?: string): boolean {
  return Boolean(token ?? config.legacyWsAuthToken);
}

interface ApiPollOption {
  id: string;
  label: string;
  votes: number;
}

interface ApiPoll {
  id: string;
  question: string;
  description: string | null;
  category: string | null;
  totalVotes: number;
  options: ApiPollOption[];
}

interface ApiResultOption extends ApiPollOption {
  percentage: number;
}

interface ApiResults {
  pollId: string;
  question: string;
  totalVotes: number;
  options: ApiResultOption[];
}

// ── Live (legacy web service) ────────────────────────────────────────────────

function votesFromPercent(percent: number, total: number): number {
  return Math.round((percent / 100) * total);
}

function resultToApi(r: legacy.LegacyPollResult): ApiResults {
  return {
    pollId: r.pollId,
    question: r.question,
    totalVotes: r.totalVotes,
    options: [
      {
        id: "option1",
        label: r.option1,
        votes: votesFromPercent(r.option1Perc, r.totalVotes),
        percentage: r.option1Perc,
      },
      {
        id: "option2",
        label: r.option2,
        votes: votesFromPercent(r.option2Perc, r.totalVotes),
        percentage: r.option2Perc,
      },
    ],
  };
}

async function listPollsLive(token?: string): Promise<ApiPoll[]> {
  const [list, results] = await Promise.all([
    legacy.fetchPolls(token),
    // Results enrich the list with real vote totals; if unavailable the list
    // still renders with zero counts rather than failing entirely.
    legacy.fetchPollResults(token).catch(() => [] as legacy.LegacyPollResult[]),
  ]);
  const byId = new Map(results.map((r) => [r.pollId, r]));

  return list.map((p) => {
    const r = byId.get(p.pollId);
    const total = r?.totalVotes ?? 0;
    return {
      id: p.pollId,
      question: p.question,
      description: null,
      category: null,
      totalVotes: total,
      options: [
        {
          id: "option1",
          label: p.option1,
          votes: r ? votesFromPercent(r.option1Perc, total) : 0,
        },
        {
          id: "option2",
          label: p.option2,
          votes: r ? votesFromPercent(r.option2Perc, total) : 0,
        },
      ],
    };
  });
}

async function getResultsLive(
  pollId: string,
  token?: string,
): Promise<ApiResults> {
  const results = await legacy.fetchPollResults(token);
  const found = results.find((r) => r.pollId === pollId);
  if (!found) throw new AppError(404, `Poll "${pollId}" not found`);
  return resultToApi(found);
}

async function listResultsLive(token?: string): Promise<ApiResults[]> {
  const results = await legacy.fetchPollResults(token);
  return results.map(resultToApi);
}

async function recordVoteLive(
  pollId: string,
  optionId: string,
  token?: string,
): Promise<ApiResults> {
  if (optionId !== "option1" && optionId !== "option2") {
    throw new AppError(
      404,
      `Option "${optionId}" not found in poll "${pollId}"`,
    );
  }
  const result = await legacy.votePoll(pollId, optionId, token);
  return result ? resultToApi(result) : getResultsLive(pollId, token);
}

// ── Mock (local in-memory) ───────────────────────────────────────────────────

/**
 * In-memory vote store seeded from the mock poll data. Votes accumulate for the
 * lifetime of the process. Used only when no legacy AUTHTOKEN is configured.
 */
const voteCounts = new Map<string, Map<string, number>>();
for (const poll of seedPolls) {
  const counts = new Map<string, number>();
  for (const option of poll.options) counts.set(option.id, option.votes);
  voteCounts.set(poll.id, counts);
}

function findSeed(pollId: string): SeedPoll {
  const seed = seedPolls.find((p) => p.id === pollId);
  if (!seed) throw new AppError(404, `Poll "${pollId}" not found`);
  return seed;
}

function counts(pollId: string): Map<string, number> {
  const map = voteCounts.get(pollId);
  if (!map) throw new AppError(404, `Poll "${pollId}" not found`);
  return map;
}

function listPollsMock(): ApiPoll[] {
  return seedPolls.map((poll) => {
    const counted = counts(poll.id);
    const options = poll.options.map((o) => ({
      id: o.id,
      label: o.label,
      votes: counted.get(o.id) ?? 0,
    }));
    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
    return {
      id: poll.id,
      question: poll.question,
      description: poll.description,
      category: poll.category,
      totalVotes,
      options,
    };
  });
}

function listResultsMock(): ApiResults[] {
  return seedPolls.map((poll) => buildResultsMock(poll.id));
}

function buildResultsMock(pollId: string): ApiResults {
  const seed = findSeed(pollId);
  const counted = counts(pollId);
  const tallied = seed.options.map((o) => ({
    id: o.id,
    label: o.label,
    votes: counted.get(o.id) ?? 0,
  }));
  const totalVotes = tallied.reduce((sum, o) => sum + o.votes, 0);
  return {
    pollId: seed.id,
    question: seed.question,
    totalVotes,
    options: tallied.map((o) => ({
      ...o,
      percentage:
        totalVotes === 0 ? 0 : Math.round((o.votes / totalVotes) * 1000) / 10,
    })),
  };
}

function recordVoteMock(pollId: string, optionId: string): ApiResults {
  const seed = findSeed(pollId);
  const counted = counts(pollId);
  if (!seed.options.some((o) => o.id === optionId)) {
    throw new AppError(
      404,
      `Option "${optionId}" not found in poll "${pollId}"`,
    );
  }
  counted.set(optionId, (counted.get(optionId) ?? 0) + 1);
  return buildResultsMock(pollId);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listPolls(token?: string): Promise<ApiPoll[]> {
  return isLive(token) ? listPollsLive(token) : listPollsMock();
}

export async function getResults(
  pollId: string,
  token?: string,
): Promise<ApiResults> {
  return isLive(token)
    ? getResultsLive(pollId, token)
    : buildResultsMock(pollId);
}

export async function listResults(token?: string): Promise<ApiResults[]> {
  return isLive(token) ? listResultsLive(token) : listResultsMock();
}

export async function recordVote(
  pollId: string,
  optionId: string,
  token?: string,
): Promise<ApiResults> {
  return isLive(token)
    ? recordVoteLive(pollId, optionId, token)
    : recordVoteMock(pollId, optionId);
}
