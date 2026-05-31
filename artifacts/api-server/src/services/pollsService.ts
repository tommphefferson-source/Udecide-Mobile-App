import { polls as seedPolls, type SeedPoll } from "../data/polls";
import { AppError } from "../lib/errors";

/**
 * In-memory vote store seeded from the mock poll data. Votes accumulate for the
 * lifetime of the process. Swap this for a persistent store (e.g. the shared
 * @workspace/db) when durable storage is needed.
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

export function listPolls() {
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

function buildResults(pollId: string) {
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
        totalVotes === 0
          ? 0
          : Math.round((o.votes / totalVotes) * 1000) / 10,
    })),
  };
}

export function getResults(pollId: string) {
  return buildResults(pollId);
}

export function recordVote(pollId: string, optionId: string) {
  const seed = findSeed(pollId);
  const counted = counts(pollId);
  if (!seed.options.some((o) => o.id === optionId)) {
    throw new AppError(404, `Option "${optionId}" not found in poll "${pollId}"`);
  }
  counted.set(optionId, (counted.get(optionId) ?? 0) + 1);
  return buildResults(pollId);
}
