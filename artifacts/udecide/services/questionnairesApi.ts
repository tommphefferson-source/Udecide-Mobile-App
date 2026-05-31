// Issue questionnaires are served by the API Server, which proxies the legacy
// web service live when an auth token is forwarded (and falls back to mock data
// otherwise). Mirrors the quiz/polls service pattern.
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface IssueQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface IssueQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: IssueQuestion[];
}

export async function getQuestionnaires(
  token?: string | null,
): Promise<IssueQuestionnaire[]> {
  const res = await fetch(`${API_BASE}/questionnaires`, {
    headers: token ? { AUTHTOKEN: token } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to load questionnaires (${res.status})`);
  }
  const data = (await res.json()) as { questionnaires: IssueQuestionnaire[] };
  return data.questionnaires;
}
