import { Router, type IRouter, type Request } from "express";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, referralsTable, entitlementsTable } from "@workspace/db";
import { RedeemReferralBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAdmin";

const router: IRouter = Router();

const REFERRAL_TRIAL_DAYS = 14;

function getBase(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

// Get (or create) my referral code — the code-holder row has referredUserId null.
router.get("/referrals/code", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  let [row] = await db
    .select()
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerUserId, userId), isNull(referralsTable.referredUserId)));
  if (!row) {
    [row] = await db
      .insert(referralsTable)
      .values({ referrerUserId: userId, code: nanoid(8) })
      .returning();
  }
  res.json({ code: row.code, url: `${getBase(req)}/?ref=${row.code}` });
});

// Redeem a code: both sides get a time-boxed library-wide grant.
router.post("/referrals/redeem", requireAuth, async (req, res): Promise<void> => {
  const parsed = RedeemReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const code = parsed.data.code.trim();

  const [codeRow] = await db
    .select()
    .from(referralsTable)
    .where(and(eq(referralsTable.code, code), isNull(referralsTable.referredUserId)));
  if (!codeRow || codeRow.referrerUserId === userId) {
    res.status(400).json({ error: "invalid_code" });
    return;
  }
  // One redemption per referred user, ever.
  const [already] = await db
    .select()
    .from(referralsTable)
    .where(and(eq(referralsTable.referredUserId, userId), isNotNull(referralsTable.referredUserId)));
  if (already) {
    res.status(400).json({ error: "already_redeemed" });
    return;
  }

  const expires = new Date(Date.now() + REFERRAL_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(entitlementsTable).values([
    { userId, storyId: null, source: "grant", expiresAt: expires },
    { userId: codeRow.referrerUserId, storyId: null, source: "grant", expiresAt: expires },
  ]);
  await db.insert(referralsTable).values({
    referrerUserId: codeRow.referrerUserId,
    code,
    referredUserId: userId,
    rewardStatus: "granted",
  });
  res.json({ ok: true, trialDays: REFERRAL_TRIAL_DAYS });
});

export default router;
