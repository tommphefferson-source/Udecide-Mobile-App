import { Router, type IRouter } from "express";
import { GetNewsResponse } from "@workspace/api-zod";
import { getNews } from "../services/newsService";
import { tokenFromRequest } from "../lib/requestToken";

const router: IRouter = Router();

router.get("/news", async (req, res): Promise<void> => {
  const token = tokenFromRequest(req);
  res.json(GetNewsResponse.parse(await getNews(token)));
});

export default router;
