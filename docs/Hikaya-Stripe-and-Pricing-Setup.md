# Hikāya — Stripe & Pricing Setup

The operational steps to actually take money: what to create in Stripe, how to price globally, how to wire the webhook, and how to go live. Pairs with the billing code in `Hikaya-Implementation-Code.md` (§2.5–2.6). Do this in **test mode** first, then repeat the product/price/webhook steps in live mode.

> **Merchant-of-Record alternative.** If you'd rather not handle worldwide VAT/sales-tax filing yourself, use **Paddle** or **Lemon Squeezy** instead of Stripe — they act as the seller of record and remit tax for you. The code is already behind a `PaymentProvider` interface, so swapping is a new provider file + env keys, not a rewrite. The rest of this guide assumes Stripe; the concepts (products, prices, webhook, portal) map 1:1.

---

## 1. Global pricing table (PPP)

Charge less where incomes are lower so you don't price out most of the world (including much of MENA, LATAM, South/SE Asia). Two tiers is enough to start.

| Product | Core (US/EU/GCC/UK/AU) | Emerging markets | Stripe object |
|---|---|---|---|
| Plus — monthly | $6.99 | $2.99 | recurring price |
| Plus — annual | $49 | $19 | recurring price |
| Single-story unlock | $2.49 | $0.99 | one-time (dynamic amount) |
| Credit pack (5 stories) | $8.99 | $3.99 | one-time |
| Tips | $3 / $5 / $10 | local presets | one-time (dynamic amount) |

Trial: **7 days** on both Plus prices. Annual is the hero (biggest cash + lowest churn) — default the toggle to annual.

**Two ways to implement the regional tier (pick one):**

- **Easiest — Stripe Adaptive Pricing / presentment currencies:** enable it in the dashboard; Stripe presents local currency automatically at checkout. Good enough to launch. Doesn't do true PPP discounts, only currency conversion.
- **True PPP — country-keyed price IDs:** create two prices per plan (core + emerging), detect the buyer's country (IP or `users.country`), and pass the right `priceId` to checkout. Store a small map in code:

```ts
// artifacts/api-server/src/lib/pricing.ts
const EMERGING = new Set(["LY","EG","DZ","TN","MA","JO","IN","PK","BD","ID","PH","VN","NG","KE","BR","MX","CO","AR","TR","UA"]);
export function plusPriceId(country: string | null, interval: "monthly" | "annual") {
  const tier = country && EMERGING.has(country) ? "EMERGING" : "CORE";
  return process.env[`STRIPE_PRICE_PLUS_${interval.toUpperCase()}_${tier}`]!;
}
```

Then set four env vars (`STRIPE_PRICE_PLUS_MONTHLY_CORE`, `…_MONTHLY_EMERGING`, `…_ANNUAL_CORE`, `…_ANNUAL_EMERGING`) and use `plusPriceId()` in the checkout route. Start with Adaptive Pricing; graduate to country-keyed once you have volume.

---

## 2. Create products & prices in Stripe

Dashboard → **Product catalog → Add product** (or via CLI/API). Create:

1. **Hikāya Plus** (one product, multiple prices):
   - Price: recurring, monthly, $6.99 USD → copy the `price_...` id → `STRIPE_PRICE_PLUS_MONTHLY` (or `_CORE`).
   - Price: recurring, yearly, $49 USD → `STRIPE_PRICE_PLUS_ANNUAL`.
   - (PPP path) add the two emerging-market prices → `_EMERGING` vars.
   - On each recurring price, the code sets `trial_period_days: 7` at checkout, so you don't need to configure the trial on the price itself.
2. **Single story** and **Tips** don't need catalog prices — the code uses `price_data` with a dynamic `unit_amount` at checkout. (Optional: make a "Credit pack" product if you prefer a fixed catalog price.)

Enable the currencies you want each price presented in (or turn on Adaptive Pricing) under the price's settings.

---

## 3. Turn on Stripe Tax (if using Stripe directly)

Dashboard → **Tax → Enable**. Set your **origin address** and register in jurisdictions where you cross thresholds. In the checkout session the code should set `automatic_tax: { enabled: true }` and collect the customer's address:

```ts
// add to stripe.ts createCheckout(...) session params:
automatic_tax: { enabled: true },
customer_update: { address: "auto" },
billing_address_collection: "auto",
tax_id_collection: { enabled: true },
```

If this is heavier than you want to manage, this is exactly the burden a Merchant-of-Record (Paddle/Lemon Squeezy) removes.

---

## 4. Customer portal (self-serve manage/cancel)

Dashboard → **Settings → Billing → Customer portal** → activate. Allow: update payment method, cancel subscription, switch monthly↔annual, view invoices. The code's `POST /billing/portal` returns the portal URL; link it from Profile ("Manage plan").

---

## 5. Webhook

Dashboard → **Developers → Webhooks → Add endpoint**.

- **Endpoint URL:** `https://yourdomain.com/api/billing/webhook`
- **Events to send:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid` (optional — renewal confirmations)
  - `charge.refunded` (to revoke entitlements on refund)
- Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

**Critical:** the webhook route must get the **raw** request body for signature verification. Mount `billingRouter` (or at least `/api/billing/webhook` with `express.raw`) **before** any global `express.json()`. This is also rule #6 in `CLAUDE.md`.

**Local testing:**

```bash
stripe login
stripe listen --forward-to localhost:PORT/api/billing/webhook   # prints a whsec_ for local use
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

---

## 6. Test cards

| Scenario | Card |
|---|---|
| Success | 4242 4242 4242 4242 |
| Requires authentication (3DS) | 4000 0025 0000 3155 |
| Declined | 4000 0000 0000 0002 |

Any future expiry, any CVC, any postal code. Verify each entitlement path from the plan's definition-of-done: free account, trialing account, per-story purchaser, lapsed/canceled subscriber.

---

## 7. Environment variables (full set)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# single-tier:
STRIPE_PRICE_PLUS_MONTHLY=price_...
STRIPE_PRICE_PLUS_ANNUAL=price_...
# PPP path (instead of the two above):
STRIPE_PRICE_PLUS_MONTHLY_CORE=price_...
STRIPE_PRICE_PLUS_MONTHLY_EMERGING=price_...
STRIPE_PRICE_PLUS_ANNUAL_CORE=price_...
STRIPE_PRICE_PLUS_ANNUAL_EMERGING=price_...
APP_BASE_URL=https://yourdomain.com
```

Store these in Replit Secrets, never in the repo (rule #5).

---

## 8. Go-live checklist

- [ ] Products/prices re-created in **live** mode (test-mode ids don't carry over)
- [ ] Live webhook endpoint added; `STRIPE_WEBHOOK_SECRET` is the **live** secret
- [ ] Customer portal activated in live mode
- [ ] Stripe Tax enabled + registrations done (or MoR in use)
- [ ] Business details, statement descriptor ("HIKAYA"), and support email set in Stripe
- [ ] Payout bank account connected and verified
- [ ] End-to-end live smoke test with a real card, then refund it
- [ ] Refund flow revokes the entitlement (via `charge.refunded`)
- [ ] Prices shown on the pricing page match Stripe exactly (incl. PPP)
- [ ] Terms, Privacy, and Refund pages linked from checkout and footer (see legal pack)

---

## 9. Unit-economics reminder

Audio is generated **once** and served to everyone, so a story costs ~$5–15 of ElevenLabs one time and then earns indefinitely. A single $49 annual subscriber covers the audio of 3–10 whole stories. Price for reach (PPP), optimize the funnel, and the margins take care of themselves — the constraint is conversion, not cost.
