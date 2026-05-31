import { Router, type IRouter } from "express";
import { GetNewsResponse } from "@workspace/api-zod";
import { newsContent } from "../data/news";

const router: IRouter = Router();

router.get("/news", (_req, res): void => {
  res.json(GetNewsResponse.parse(newsContent));
});

export default router;
