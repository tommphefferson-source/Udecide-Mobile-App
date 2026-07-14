import { Router, type IRouter } from "express";
import healthRouter from "./health";
import representativesRouter from "./representatives";
import electionsRouter from "./elections";
import pollsRouter from "./polls";
import homeRouter from "./home";
import newsRouter from "./news";
import civicsRouter from "./civics";
import authRouter from "./auth";
import googleOauthRouter from "./googleOauth";
import pagesRouter from "./pages";
import factCheckRouter from "./factCheck";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(googleOauthRouter);
router.use(representativesRouter);
router.use(electionsRouter);
router.use(pollsRouter);
router.use(homeRouter);
router.use(newsRouter);
router.use(civicsRouter);
router.use(pagesRouter);
router.use(factCheckRouter);

export default router;
