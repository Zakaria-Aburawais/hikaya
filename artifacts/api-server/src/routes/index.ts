import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storiesRouter from "./stories";
import meRouter from "./me";
import adminRouter from "./admin";
import growthRouter from "./growth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storiesRouter);
router.use(meRouter);
router.use(adminRouter);
router.use(growthRouter);

export default router;
