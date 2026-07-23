import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  storiesTable,
  subscriptionsTable,
  entitlementsTable,
  ordersTable,
  processedEventsTable,
} from "@workspace/db";
import { CreateCheckoutBody, PurchaseStoryBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAdmin";
import { stripeProvider as provider } from "../lib/payments/stripe";

const router: IRouter = Router();

const DEFAULT_STORY_PRICE_CENTS = 249;

function getBase(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

// Start a Plus subscription checkout
router.post("/billing/checkout", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const interval = parsed.data.interval;
  const priceId =
    interval === "annual"
      ? process.env.STRIPE_PRICE_PLUS_ANNUAL
      : process.env.STRIPE_PRICE_PLUS_MONTHLY;
  if (!priceId) {
    req.log.error({ interval }, "Stripe price id not configured");
    res.status(503).json({ error: "billing_unavailable" });
    return;
  }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const base = getBase(req);
  const { url } = await provider.createCheckout({
    userId,
    customerId: u?.billingCustomerId,
    mode: "subscription",
    priceId,
    metadata: { userId, kind: "subscription" },
    successUrl: `${base}/shelf?welcome=1`,
    cancelUrl: `${base}/pricing`,
  });
  res.json({ url });
});

// Buy a single story (price comes from the DB, never the client)
router.post("/purchases/story", requireAuth, async (req, res): Promise<void> => {
  const parsed = PurchaseStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, parsed.data.storyId));
  if (!story || story.status !== "published") {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const base = getBase(req);
  const { url } = await provider.createCheckout({
    userId,
    customerId: u?.billingCustomerId,
    mode: "payment",
    amountCents: story.priceCents ?? DEFAULT_STORY_PRICE_CENTS,
    currency: "usd",
    metadata: { userId, kind: "story", storyId: story.id, title: story.title },
    successUrl: `${base}/story/${story.slug}?unlocked=1`,
    cancelUrl: `${base}/story/${story.slug}`,
  });
  res.json({ url });
});

// Customer portal (manage / cancel)
router.post("/billing/portal", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!u?.billingCustomerId) {
    res.status(400).json({ error: "no_customer" });
    return;
  }
  const { url } = await provider.createPortal(u.billingCustomerId, `${getBase(req)}/profile`);
  res.json({ url });
});

/**
 * Stripe webhook. Exported standalone and mounted in app.ts with express.raw
 * BEFORE the global express.json() — signature verification needs raw bytes
 * (CLAUDE.md rule 6).
 */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  let event;
  try {
    event = await provider.verifyAndParseWebhook(
      req.body as Buffer,
      req.headers["stripe-signature"] as string,
    );
  } catch (err) {
    req.log.error({ err }, "webhook verify failed");
    res.status(400).send("bad signature");
    return;
  }

  // Idempotency: first delivery wins, duplicates are a no-op.
  const inserted = await db
    .insert(processedEventsTable)
    .values({ providerEventId: event.providerEventId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) {
    res.json({ received: true, duplicate: true });
    return;
  }

  if (event.type === "subscription_active") {
    if (!event.userId) {
      req.log.error({ subscriptionId: event.subscriptionId }, "subscription without userId metadata");
      res.json({ received: true });
      return;
    }
    await db
      .update(usersTable)
      .set({
        plan: "plus",
        planStatus: event.status,
        planRenewsAt: event.currentPeriodEnd,
        billingProvider: "stripe",
        billingCustomerId: event.customerId,
      })
      .where(eq(usersTable.id, event.userId));
    await db
      .insert(subscriptionsTable)
      .values({
        userId: event.userId,
        provider: "stripe",
        providerSubscriptionId: event.subscriptionId,
        plan: event.plan,
        status: event.status,
        currentPeriodEnd: event.currentPeriodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptionsTable.providerSubscriptionId,
        set: { status: event.status, currentPeriodEnd: event.currentPeriodEnd },
      });
    // Library-wide entitlement: revive an existing subscription grant or create one.
    const [existing] = await db
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.userId, event.userId),
          isNull(entitlementsTable.storyId),
          eq(entitlementsTable.source, "subscription"),
        ),
      );
    if (existing) {
      await db
        .update(entitlementsTable)
        .set({ expiresAt: null })
        .where(eq(entitlementsTable.id, existing.id));
    } else {
      await db
        .insert(entitlementsTable)
        .values({ userId: event.userId, storyId: null, source: "subscription" });
    }
  }

  if (event.type === "subscription_canceled") {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.providerSubscriptionId, event.subscriptionId));
    await db
      .update(subscriptionsTable)
      .set({ status: "canceled" })
      .where(eq(subscriptionsTable.providerSubscriptionId, event.subscriptionId));
    if (sub) {
      await db
        .update(usersTable)
        .set({ plan: "free", planStatus: "canceled" })
        .where(eq(usersTable.id, sub.userId));
      await db
        .update(entitlementsTable)
        .set({ expiresAt: new Date() })
        .where(
          and(
            eq(entitlementsTable.userId, sub.userId),
            isNull(entitlementsTable.storyId),
            eq(entitlementsTable.source, "subscription"),
          ),
        );
    }
  }

  if (event.type === "payment_succeeded" && event.kind === "story" && event.storyId) {
    await db
      .insert(ordersTable)
      .values({
        userId: event.userId,
        storyId: event.storyId,
        kind: "story",
        amountCents: event.amountCents,
        currency: event.currency,
        provider: "stripe",
        providerPaymentId: event.paymentId,
        status: "paid",
      })
      .onConflictDoNothing();
    await db
      .insert(entitlementsTable)
      .values({ userId: event.userId, storyId: event.storyId, source: "purchase" });
  }

  if (event.type === "refund" && event.paymentId) {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.providerPaymentId, event.paymentId));
    if (order) {
      await db
        .update(ordersTable)
        .set({ status: "refunded" })
        .where(eq(ordersTable.id, order.id));
      if (order.storyId) {
        await db
          .update(entitlementsTable)
          .set({ expiresAt: new Date() })
          .where(
            and(
              eq(entitlementsTable.userId, order.userId),
              eq(entitlementsTable.storyId, order.storyId),
              eq(entitlementsTable.source, "purchase"),
            ),
          );
      }
    }
  }

  res.json({ received: true });
}

export default router;
