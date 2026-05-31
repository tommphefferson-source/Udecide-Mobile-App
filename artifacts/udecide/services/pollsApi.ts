import type { Poll } from "@/types/politics";

// Polls are proxied through the API Server, which serves live data from the
// legacy web service when configured and mock data otherwise.
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

const DISCLAIMER =
  "Community poll — results reflect app users and are not a scientific sample.";

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

interface ApiPollList {
  polls: ApiPoll[];
}

interface ApiResultOption extends ApiPollOption {
  percentage: number;
}

interface ApiPollResults {
  pollId: string;
  question: string;
  totalVotes: number;
  options: ApiResultOption[];
}

function toPoll(p: ApiPoll): Poll {
  return {
    id: p.id,
    question: p.question,
    topic: p.category ?? "Poll",
    options: p.options.map((o) => ({ id: o.id, text: o.label, votes: o.votes })),
    totalVotes: p.totalVotes,
    createdAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

export async function getPolls(): Promise<Poll[]> {
  const res = await fetch(`${API_BASE}/polls`);
  if (!res.ok) {
    throw new Error(`Failed to load polls (${res.status})`);
  }
  const data = (await res.json()) as ApiPollList;
  return data.polls.map(toPoll);
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  options: { id: string; votes: number }[];
}

export async function votePoll(
  pollId: string,
  optionId: string,
): Promise<PollResults> {
  const res = await fetch(
    `${API_BASE}/polls/${encodeURIComponent(pollId)}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to record vote (${res.status})`);
  }
  const r = (await res.json()) as ApiPollResults;
  return {
    pollId: r.pollId,
    totalVotes: r.totalVotes,
    options: r.options.map((o) => ({ id: o.id, votes: o.votes })),
  };
}
