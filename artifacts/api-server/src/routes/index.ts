import { Router, type IRouter } from "express";
import healthRouter from "./health";
import representativesRouter from "./representatives";
import electionsRouter from "./elections";
import pollsRouter from "./polls";
import homeRouter from "./home";
import newsRouter from "./news";
import civicsRouter from "./civics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(representativesRouter);
router.use(electionsRouter);
router.use(pollsRouter);
router.use(homeRouter);
router.use(newsRouter);
router.use(civicsRouter);

export default router;
