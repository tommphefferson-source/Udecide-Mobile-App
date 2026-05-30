import { Router, type IRouter } from "express";
import healthRouter from "./health";
import representativesRouter from "./representatives";

const router: IRouter = Router();

router.use(healthRouter);
router.use(representativesRouter);

export default router;
