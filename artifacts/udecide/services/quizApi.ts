// The civics quiz is served by the API Server (mock-backed today, live-ready
// behind the same route), mirroring the news/polls service pattern.
import { t } from "@/i18n";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface CivicsQuiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export async function getQuiz(): Promise<CivicsQuiz> {
  const res = await fetch(`${API_BASE}/quiz`);
  if (!res.ok) {
    throw new Error(`${t("Failed to load quiz")} (${res.status})`);
  }
  return (await res.json()) as CivicsQuiz;
}
