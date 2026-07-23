import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import authMagicRouter from "./auth-magic";
import storiesRouter from "./stories";
import meRouter from "./me";
import adminRouter from "./admin";
import growthRouter from "./growth";
import sitemapRouter from "./sitemap";
import billingRouter from "./billing";
import referralsRouter from "./referrals";
import ratingsRouter from "./ratings";
import voicesRouter from "./voices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(authMagicRouter);
router.use(storiesRouter);
router.use(meRouter);
router.use(adminRouter);
router.use(growthRouter);
router.use(sitemapRouter);
router.use(billingRouter);
router.use(referralsRouter);
router.use(ratingsRouter);
router.use(voicesRouter);

export default router;
