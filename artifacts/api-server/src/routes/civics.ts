import { Router, type IRouter, type Request } from "express";
import {
  GetQuizResponse,
  ListQuizzesResponse,
  ListQuestionnairesResponse,
  ListTerminologyResponse,
  ListPartiesResponse,
  SubmitQuizProgressBody,
  SubmitQuizProgressResponse,
} from "@workspace/api-zod";
import { civicsQuiz } from "../data/quiz";
import { quizzes } from "../data/quizzes";
import { terminology } from "../data/terminology";
import { parties } from "../data/parties";
import { listQuestionnaires } from "../services/questionnairesService";

const router: IRouter = Router();

/** Read a forwarded legacy auth token from the request, if present. */
function tokenFromRequest(req: Request): string | undefined {
  const authToken = req.header("AUTHTOKEN")?.trim();
  if (authToken) return authToken;
  const auth = req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }
  return undefined;
}

router.get("/quiz", (_req, res): void => {
  res.json(GetQuizResponse.parse(civicsQuiz));
});

router.get("/quizzes", (_req, res): void => {
  res.json(ListQuizzesResponse.parse({ quizzes }));
});

router.post("/quizzes/progress", (req, res): void => {
  const body = SubmitQuizProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  res.json(
    SubmitQuizProgressResponse.parse({
      success: true,
      quizId: body.data.quizId,
      recordedAt: new Date().toISOString(),
    }),
  );
});

router.get("/questionnaires", async (req, res): Promise<void> => {
  const token = tokenFromRequest(req);
  res.json(
    ListQuestionnairesResponse.parse({
      questionnaires: await listQuestionnaires(token),
    }),
  );
});

router.get("/terminology", (_req, res): void => {
  res.json(ListTerminologyResponse.parse({ terms: terminology }));
});

router.get("/parties", (_req, res): void => {
  res.json(ListPartiesResponse.parse({ parties }));
});

export default router;
