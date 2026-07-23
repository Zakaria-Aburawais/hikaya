// Provider-agnostic payments layer (CLAUDE.md / plan §B.3): keep Stripe (or a
// future Paddle/Lemon Squeezy MoR) behind this interface so swapping providers
// is a new file + env keys, not a rewrite.
export interface CheckoutParams {
  userId: string;
  customerId?: string | null;
  mode: "subscription" | "payment";
  priceId?: string; // subscriptions
  amountCents?: number; // one-time (story/tip/credits)
  currency?: string;
  metadata: Record<string, string>; // e.g. { kind: "story", storyId }
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  createCheckout(p: CheckoutParams): Promise<{ url: string }>;
  createPortal(customerId: string, returnUrl: string): Promise<{ url: string }>;
  verifyAndParseWebhook(rawBody: Buffer, signature: string): Promise<ProviderEvent>;
}

export type ProviderEvent =
  | {
      type: "subscription_active";
      providerEventId: string;
      userId: string;
      customerId: string;
      subscriptionId: string;
      plan: string;
      status: string;
      currentPeriodEnd: Date | null;
    }
  | { type: "subscription_canceled"; providerEventId: string; subscriptionId: string }
  | {
      type: "payment_succeeded";
      providerEventId: string;
      userId: string;
      kind: string;
      storyId?: string;
      amountCents: number;
      currency: string;
      paymentId: string;
      message?: string;
      giftRecipientEmail?: string;
    }
  | { type: "refund"; providerEventId: string; paymentId: string }
  | { type: "ignore"; providerEventId: string };
