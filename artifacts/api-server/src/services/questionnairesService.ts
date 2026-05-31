import { config } from "../config";
import { questionnaires as seed } from "../data/questionnaires";
import * as legacy from "../providers/legacyWs";

/**
 * Issue questionnaires are served live from the legacy web service when a token
 * is available — either a per-user token forwarded by an authenticated client or
 * the shared app token (config.legacyWsAuthToken). Otherwise they fall back to
 * local mock data. In live mode, no-result/error paths surface empty rather than
 * mixing mock data into a live response.
 */

interface ApiQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface ApiQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: ApiQuestion[];
}

// Platform UI affordances returned by the legacy service that are not genuine
// stance options — filtered out so the questionnaire shows only real stances.
const AFFORDANCE_ANSWERS = new Set([
  "add your own stance",
  "read more stances submitted by users",
  "this question is no longer relevant and should be removed",
]);

function isAffordance(answer: string): boolean {
  return AFFORDANCE_ANSWERS.has(answer.trim().toLowerCase());
}

function isLive(token?: string): boolean {
  return Boolean(token ?? config.legacyWsAuthToken);
}

async function listLive(token?: string): Promise<ApiQuestionnaire[]> {
  const categories = await legacy.fetchIssueCategories(token);
  const built = await Promise.all(
    categories.map(async (cat) => {
      // A failing category should not sink the whole list — it yields no
      // questions and is dropped below.
      const questions = await legacy
        .fetchIssueQuestions(cat.categoryId, token)
        .catch(() => [] as legacy.LegacyIssueQuestion[]);
      const mapped = questions
        .map((q) => ({
          id: q.questionId,
          prompt: q.question,
          options: q.answers
            .map((a) => a.answer)
            .filter((a) => !isAffordance(a)),
        }))
        .filter((q) => q.options.length > 0);
      return {
        id: cat.categoryId,
        title: cat.category,
        description: null,
        questions: mapped,
      };
    }),
  );
  return built.filter((qn) => qn.questions.length > 0);
}

function listMock(): ApiQuestionnaire[] {
  return seed.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    questions: q.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
    })),
  }));
}

export async function listQuestionnaires(
  token?: string,
): Promise<ApiQuestionnaire[]> {
  return isLive(token) ? listLive(token) : listMock();
}
