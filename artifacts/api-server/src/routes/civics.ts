import { Router, type IRouter } from "express";
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
import { questionnaires } from "../data/questionnaires";
import { terminology } from "../data/terminology";
import { parties } from "../data/parties";

const router: IRouter = Router();

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

router.get("/questionnaires", (_req, res): void => {
  res.json(ListQuestionnairesResponse.parse({ questionnaires }));
});

router.get("/terminology", (_req, res): void => {
  res.json(ListTerminologyResponse.parse({ terms: terminology }));
});

router.get("/parties", (_req, res): void => {
  res.json(ListPartiesResponse.parse({ parties }));
});

export default router;
