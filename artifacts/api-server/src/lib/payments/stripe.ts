import Stripe from "stripe";
import type { PaymentProvider, CheckoutParams, ProviderEvent } from "./provider";

let stripe: Stripe | null = null;
function client(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

/** current_period_end lives on the subscription in older API versions and on
 *  the subscription item in newer ones — read whichever is present. */
function periodEnd(s: Stripe.Subscription): Date | null {
  const raw =
    (s as unknown as { current_period_end?: number }).current_period_end ??
    s.items?.data?.[0]?.current_period_end;
  return raw ? new Date(raw * 1000) : null;
}

export const stripeProvider: PaymentProvider = {
  async createCheckout(p: CheckoutParams) {
    const session = await client().checkout.sessions.create({
      mode: p.mode,
      client_reference_id: p.userId,
      customer: p.customerId ?? undefined,
      line_items:
        p.mode === "subscription"
          ? [{ price: p.priceId!, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: p.currency ?? "usd",
                  product_data: { name: p.metadata.title ?? "Hikāya" },
                  unit_amount: p.amountCents!,
                },
                quantity: 1,
              },
            ],
      subscription_data:
        p.mode === "subscription"
          ? { trial_period_days: 7, metadata: p.metadata }
          : undefined,
      metadata: p.metadata,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      allow_promotion_codes: true,
    });
    return { url: session.url! };
  },

  async createPortal(customerId, returnUrl) {
    const s = await client().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: s.url };
  },

  async verifyAndParseWebhook(rawBody, signature): Promise<ProviderEvent> {
    const evt = client().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    const id = evt.id;
    switch (evt.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const s = evt.data.object as Stripe.Subscription;
        const active = ["active", "trialing"].includes(s.status);
        if (!active) {
          return { type: "subscription_canceled", providerEventId: id, subscriptionId: s.id };
        }
        return {
          type: "subscription_active",
          providerEventId: id,
          userId: String(s.metadata?.userId ?? ""),
          customerId: String(s.customer),
          subscriptionId: s.id,
          plan: "plus",
          status: s.status,
          currentPeriodEnd: periodEnd(s),
        };
      }
      case "customer.subscription.deleted": {
        const s = evt.data.object as Stripe.Subscription;
        return { type: "subscription_canceled", providerEventId: id, subscriptionId: s.id };
      }
      case "checkout.session.completed": {
        const cs = evt.data.object as Stripe.Checkout.Session;
        if (cs.mode === "payment") {
          return {
            type: "payment_succeeded",
            providerEventId: id,
            userId: String(cs.client_reference_id ?? cs.metadata?.userId ?? ""),
            kind: String(cs.metadata?.kind ?? "story"),
            storyId: cs.metadata?.storyId ? String(cs.metadata.storyId) : undefined,
            amountCents: cs.amount_total ?? 0,
            currency: cs.currency ?? "usd",
            // Prefer the payment intent so charge.refunded events can be
            // matched back to the order later.
            paymentId: String(cs.payment_intent ?? cs.id),
            message: cs.metadata?.message ? String(cs.metadata.message) : undefined,
            giftRecipientEmail: cs.metadata?.giftRecipientEmail
              ? String(cs.metadata.giftRecipientEmail)
              : undefined,
          };
        }
        return { type: "ignore", providerEventId: id };
      }
      case "charge.refunded": {
        const ch = evt.data.object as Stripe.Charge;
        const paymentId = ch.metadata?.checkout_session_id ?? ch.payment_intent;
        return { type: "refund", providerEventId: id, paymentId: String(paymentId ?? "") };
      }
      default:
        return { type: "ignore", providerEventId: id };
    }
  },
};
