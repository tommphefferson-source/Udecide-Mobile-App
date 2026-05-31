import { Router, type IRouter } from "express";
import { GetHomeResponse } from "@workspace/api-zod";
import { config } from "../config";
import { homeContent } from "../data/home";

const router: IRouter = Router();

router.get("/home", (_req, res): void => {
  res.json(
    GetHomeResponse.parse({
      appName: config.appName,
      environment: config.environment,
      newsUrl: homeContent.newsUrl,
      lastUpdated: new Date().toISOString(),
      sections: homeContent.sections,
    }),
  );
});

export default router;
