# Hikāya — Full Implementation Package (all code)

**A complete, copy-pasteable build guide for Claude Code.**
Companion to `Hikaya-Monetization-Growth-Plan.md`. Prepared 22 July 2026.

---

## ⚠️ Read this first

This file contains real, working code written to match Hikāya's documented architecture: a pnpm monorepo with Drizzle + Postgres (`lib/db`), Express 5 + Zod (`artifacts/api-server`), contract-first OpenAPI (`lib/api-spec`), and React 18 + Vite + React Query + shadcn (`artifacts/hikaya`), with Replit Auth (OIDC).

Because the repo is private, a few things — exact import paths, the precise shape of your existing `stories`/`users` tables, your Drizzle export barrel, and your generated-hook names — I can't see. **Every spot where you must reconcile with a real file is marked `// 🔧 RECONCILE:`.** When you run this in Claude Code (which *can* see the repo), tell it: *"apply this, and wherever you see `🔧 RECONCILE` match it to the actual file."*

Build in phase order. Each phase is independently shippable. After any schema change run `pnpm --filter @workspace/db run push`; after any `lib/api-spec` change run `pnpm --filter @workspace/api-spec run codegen`; before every commit run `pnpm run typecheck`.

**Table of contents**
- [Phase 0 — Setup: dependencies & env](#phase-0)
- [Phase 1 — Capture: auth, guest mode, email, analytics, SEO](#phase-1)
- [Phase 2 — Money: schema, entitlements paywall, billing, checkout](#phase-2)
- [Phase 3 — Convert & retain: tips, referrals, gifting, ratings, streaks, emails](#phase-3)
- [Phase 4 — Delight: karaoke highlighting, voice previews, soundscapes](#phase-4)

---

<a name="phase-0"></a>
## Phase 0 — Setup: dependencies & environment

### Dependencies

```bash
# API server
pnpm --filter @workspace/api-server add stripe resend jsonwebtoken nanoid
pnpm --filter @workspace/api-server add -D @types/jsonwebtoken

# Frontend
pnpm --filter @workspace/hikaya add posthog-js
# 🔧 RECONCILE: your frontend package name may differ (e.g. @workspace/web). Check package.json "name".
```

We use **Stripe** as the concrete payment provider because it's universal and fully programmable. It's wrapped behind a `PaymentProvider` interface (§2.5) so you can swap in **Paddle** or **Lemon Squeezy** later (recommended if you'd rather not handle global VAT yourself — see the strategy doc §A.4) without touching the rest of the app.

### Environment secrets (Replit → Secrets, never commit)

```bash
# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PLUS_MONTHLY=price_...      # created in Stripe dashboard
STRIPE_PRICE_PLUS_ANNUAL=price_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM="Hikaya <hello@yourdomain.com>"

# Auth (magic link)
MAGIC_LINK_SECRET=<32+ random bytes>      # openssl rand -hex 32

# Analytics (PostHog) — frontend env, exposed via Vite
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://eu.posthog.com  # EU region for GDPR

APP_BASE_URL=https://yourdomain.com       # for building links in emails/checkout
```

---

<a name="phase-1"></a>
## Phase 1 — Capture (stop leaking visitors)

Goal: let strangers try the product, capture their email, measure the funnel, and be found on Google — before asking anyone to pay.

### 1.1 Analytics (PostHog) — measure everything

`artifacts/hikaya/src/lib/analytics.ts` (new):

```ts
import posthog from "posthog-js";

let started = false;

export function initAnalytics() {
  if (started || !import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    capture_pageview: true,
    persistence: "localStorage+cookie",
  });
  started = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!started) return;
  posthog.capture(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!started) return;
  posthog.identify(userId, traits);
}
```

Call `initAnalytics()` once in `src/main.tsx` (or wherever your React root mounts). Then sprinkle `track(...)` at the funnel-critical moments: `story_opened`, `preview_finished`, `paywall_shown`, `signup_started`, `checkout_started`, `purchase_completed`. These become your conversion funnel in PostHog with zero extra work.

### 1.2 Email capture — the owned-audience asset

**Schema** — `lib/db/src/schema/email-subscribers.ts` (new):

```ts
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailSubscribers = pgTable("email_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  locale: text("locale"),                       // ar | en | fr | nl | es | de
  source: text("source").notNull(),             // newsletter | chapter_gate | exit_intent | waitlist
  userId: uuid("user_id"),                       // nullable; linked once they sign up
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

```ts
// 🔧 RECONCILE: export it from your schema barrel, e.g. lib/db/src/schema/index.ts
export * from "./email-subscribers";
```

Then: `pnpm --filter @workspace/db run push`.

**OpenAPI** — add to `lib/api-spec` (then `codegen`):

```yaml
  /newsletter/subscribe:
    post:
      operationId: subscribeNewsletter
      tags: [growth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, source]
              properties:
                email:   { type: string, format: email }
                source:  { type: string, enum: [newsletter, chapter_gate, exit_intent, waitlist] }
                locale:  { type: string }
      responses:
        "200":
          description: Subscribed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
```

**Email util** — `artifacts/api-server/src/lib/email.ts` (new):

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Hikaya <hello@example.com>";

export async function sendEmail(to: string, subject: string, html: string) {
  return resend.emails.send({ from: FROM, to, subject, html });
}
```

**Route** — `artifacts/api-server/src/routes/growth.ts` (new):

```ts
import { Router } from "express";
import { db } from "@workspace/db";                     // 🔧 RECONCILE: your db client import
import { emailSubscribers } from "@workspace/db/schema"; // 🔧 RECONCILE: your schema import path
import { subscribeNewsletterBody } from "@workspace/api-zod"; // 🔧 RECONCILE: generated Zod name
import { sendEmail } from "../lib/email";

export const growthRouter = Router();

growthRouter.post("/newsletter/subscribe", async (req, res) => {
  const parsed = subscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid" });
  const { email, source, locale } = parsed.data;

  await db
    .insert(emailSubscribers)
    .values({ email, source, locale })
    .onConflictDoNothing({ target: emailSubscribers.email });

  // Fire-and-forget welcome (don't block the response)
  sendEmail(
    email,
    "Welcome to Hikāya — stories that speak",
    `<p>Thanks for joining. We'll send you a new voiced story every week.</p>`
  ).catch((e) => req.log.error({ e }, "welcome email failed"));

  res.json({ ok: true });
});
```

```ts
// 🔧 RECONCILE: mount it in your app bootstrap next to the other routers, e.g.:
// app.use("/api", growthRouter);
```

**Frontend capture components** — `artifacts/hikaya/src/components/NewsletterInline.tsx` (new):

```tsx
import { useState } from "react";
import { track } from "@/lib/analytics";

export function NewsletterInline({ source = "newsletter", locale }: { source?: string; locale?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    track("newsletter_submitted", { source });
    await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source, locale }),
    });
    setDone(true);
  }

  if (done) return <p className="text-sm text-muted-foreground">You're in. Check your inbox 🎧</p>;

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
      />
      <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Get weekly stories
      </button>
    </form>
  );
}
```

`ChapterEndGate.tsx` — shown when a guest finishes a free chapter (drop it at the end of the Reader's last free chapter):

```tsx
import { NewsletterInline } from "./NewsletterInline";

export function ChapterEndGate({ storyTitle, locale }: { storyTitle: string; locale?: string }) {
  return (
    <div className="my-8 rounded-2xl bg-gradient-to-b from-purple-900/40 to-black/40 p-6 text-center ring-1 ring-white/10">
      <h3 className="text-lg font-semibold">Want to hear how “{storyTitle}” ends?</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get the next chapter — and a new voiced story every week — in your inbox.
      </p>
      <div className="mx-auto mt-4 max-w-sm">
        <NewsletterInline source="chapter_gate" locale={locale} />
      </div>
    </div>
  );
}
```

`ExitIntentModal.tsx` — captures desktop leavers:

```tsx
import { useEffect, useState } from "react";
import { NewsletterInline } from "./NewsletterInline";

export function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("exit_shown")) return;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) { setOpen(true); sessionStorage.setItem("exit_shown", "1"); }
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70" onClick={() => setOpen(false)}>
      <div className="w-[min(92vw,420px)] rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Before you go…</h3>
        <p className="mt-1 text-sm text-muted-foreground">One voiced story a week. No spam.</p>
        <div className="mt-4"><NewsletterInline source="exit_intent" /></div>
      </div>
    </div>
  );
}
```

### 1.3 Guest mode — let people in without an account

Store reading progress locally for logged-out visitors so they can start reading/listening immediately, then offer to "keep your progress" via sign-in.

`artifacts/hikaya/src/lib/guest-progress.ts` (new):

```ts
type Progress = { storyId: string; chapterId: string; segmentIndex: number; updatedAt: number };
const KEY = "hikaya_guest_progress";

export function saveGuestProgress(p: Omit<Progress, "updatedAt">) {
  const all = readAll();
  all[p.storyId] = { ...p, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function getGuestProgress(storyId: string): Progress | undefined {
  return readAll()[storyId];
}
export function allGuestProgress(): Progress[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}
function readAll(): Record<string, Progress> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
```

On sign-in, migrate any guest progress into the server `reading_progress` table (call your existing progress endpoint for each entry, then clear the key).

### 1.4 Auth front door — email magic-link (highest-ROI capture fix)

Keep Replit Auth for admin; add a **passwordless magic-link** flow for readers that writes to the same `users` table and issues the same session. This removes the "create a Replit account" wall.

**Route** — `artifacts/api-server/src/routes/auth-magic.ts` (new):

```ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";     // 🔧 RECONCILE
import { sendEmail } from "../lib/email";

export const authMagicRouter = Router();
const SECRET = process.env.MAGIC_LINK_SECRET!;
const BASE = process.env.APP_BASE_URL!;

// 1) Request a link
authMagicRouter.post("/auth/magic/request", async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  if (!email.includes("@")) return res.status(400).json({ error: "invalid_email" });
  const token = jwt.sign({ email }, SECRET, { expiresIn: "15m" });
  const link = `${BASE}/api/auth/magic/verify?token=${encodeURIComponent(token)}`;
  await sendEmail(email, "Your Hikāya sign-in link",
    `<p><a href="${link}">Click here to sign in</a>. This link expires in 15 minutes.</p>`);
  res.json({ ok: true });
});

// 2) Verify and start a session
authMagicRouter.get("/auth/magic/verify", async (req, res) => {
  try {
    const { email } = jwt.verify(String(req.query.token), SECRET) as { email: string };
    // upsert user
    let [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      [user] = await db.insert(users).values({ email }).returning(); // 🔧 RECONCILE: required columns
    }
    // 🔧 RECONCILE: establish the session exactly like auth.ts does after OIDC login.
    // e.g. req.session.userId = user.id;  (reuse your existing session mechanism)
    (req.session as any).userId = user.id;
    res.redirect("/"); // or /shelf
  } catch {
    res.status(400).send("This link is invalid or expired.");
  }
});
```

> **Important:** do not touch the first-user→`super_admin` promotion logic in `auth.ts` (the advisory-lock transaction). Magic-link users default to `user`. If you want the same promotion to apply to the very first magic-link signup too, call the same promotion helper `auth.ts` already uses, inside the upsert.

**Frontend** — a minimal `SignInDialog.tsx`:

```tsx
import { useState } from "react";
export function SignInDialog() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  async function go() {
    await fetch("/api/auth/magic/request", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }
  return sent ? <p>Check your email for a sign-in link.</p> : (
    <div className="space-y-2">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
        className="w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10" />
      <button onClick={go} className="w-full rounded-lg bg-primary py-2 font-medium">Email me a link</button>
      {/* 🔧 Optionally add Google/Apple buttons that hit your OIDC provider */}
    </div>
  );
}
```

### 1.5 SEO — six languages = six times the organic reach

Add per-page meta + JSON-LD structured data so story pages are indexable and share beautifully. Install `react-helmet-async` (or use your framework's head management).

`artifacts/hikaya/src/components/StorySeo.tsx` (new):

```tsx
import { Helmet } from "react-helmet-async";

export function StorySeo({ story }: { story: {
  title: string; synopsis: string; coverUrl: string; language: string; slug: string;
} }) {
  const url = `${location.origin}/story/${story.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Audiobook",
    name: story.title, description: story.synopsis, image: story.coverUrl,
    inLanguage: story.language, url,
  };
  return (
    <Helmet>
      <title>{story.title} — Hikāya</title>
      <meta name="description" content={story.synopsis} />
      <meta property="og:title" content={story.title} />
      <meta property="og:description" content={story.synopsis} />
      <meta property="og:image" content={story.coverUrl} />
      <meta property="og:type" content="book" />
      <meta name="twitter:card" content="summary_large_image" />
      <html lang={story.language} />
      <script type="application/ld+json">{JSON.stringify(ld)}</script>
    </Helmet>
  );
}
```

Also add a generated `sitemap.xml` (one entry per story per language) and `hreflang` alternate links. A simple server route in `api-server` that queries published stories and emits XML is enough; point Google Search Console at it.

> **Note on SPA SEO:** Vite SPAs render client-side, which weakens indexing. If organic search matters (it does, for six languages), consider pre-rendering story/library routes (e.g. `vite-plugin-ssr`/`react-snap`) or an SSR layer. At minimum, ensure story data is fetchable without auth so crawlers see content.

---

<a name="phase-2"></a>
## Phase 2 — Money (the layer that earns revenue)

This is the core. The golden rule from the strategy doc: **entitlements are enforced server-side.** A free user must be physically unable to fetch premium audio URLs — the React app only *reflects* lock state.

### 2.1 Schema changes

**Extend existing tables** — `lib/db/src/schema/` (add columns; 🔧 RECONCILE with your real column definitions):

```ts
// users: add billing/plan columns
plan:            text("plan").notNull().default("free"),        // free | plus
planStatus:      text("plan_status"),                            // active | trialing | past_due | canceled
planRenewsAt:    timestamp("plan_renews_at", { withTimezone: true }),
billingProvider: text("billing_provider"),                       // stripe | paddle | lemonsqueezy
billingCustomerId: text("billing_customer_id"),
country:         text("country"),                                // for PPP + tax
freeUnlocksUsed: integer("free_unlocks_used").notNull().default(0),   // monthly allowance counter
freeUnlocksResetAt: timestamp("free_unlocks_reset_at", { withTimezone: true }),

// stories: add access/merchandising columns
access:          text("access").notNull().default("premium"),   // free | premium | purchasable
priceCents:      integer("price_cents"),
isFeatured:      boolean("is_featured").notNull().default(false),
isSponsored:     boolean("is_sponsored").notNull().default(false),
previewChapterCount: integer("preview_chapter_count").notNull().default(1),
ratingAvg:       numeric("rating_avg"),
ratingCount:     integer("rating_count").notNull().default(0),
listenCount:     integer("listen_count").notNull().default(0),
authorId:        uuid("author_id"),

// audio_segments: the flag the paywall reads
isPreview:       boolean("is_preview").notNull().default(false),
```

**New tables** — `lib/db/src/schema/billing.ts` (new):

```ts
import { pgTable, uuid, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  providerSubscriptionId: text("provider_subscription_id").notNull().unique(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),               // active | trialing | past_due | canceled
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The ONE table the paywall checks.
export const entitlements = pgTable("entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  storyId: uuid("story_id"),                       // null = whole-library (a Plus sub)
  source: text("source").notNull(),               // subscription | purchase | grant
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = no expiry
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  storyId: uuid("story_id"),
  kind: text("kind").notNull(),                   // story | credit_pack | gift | tip
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  provider: text("provider").notNull(),
  providerPaymentId: text("provider_payment_id").unique(),
  status: text("status").notNull(),               // pending | paid | refunded
  giftRecipientEmail: text("gift_recipient_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const credits = pgTable("credits", {
  userId: uuid("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
});

// Idempotency guard for webhooks
export const processedEvents = pgTable("processed_events", {
  providerEventId: text("provider_event_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Export from the barrel, then `pnpm --filter @workspace/db run push`.

### 2.2 Entitlements service (the brain of the paywall)

`artifacts/api-server/src/lib/entitlements.ts` (new):

```ts
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { entitlements, users } from "@workspace/db/schema"; // 🔧 RECONCILE

const FREE_MONTHLY_UNLOCKS = 2;

/** Is this user entitled to full audio for this story? */
export async function isEntitled(userId: string | null, storyId: string): Promise<boolean> {
  if (!userId) return false;
  const now = new Date();
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        or(isNull(entitlements.storyId), eq(entitlements.storyId, storyId)),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
      ),
    );
  return rows.length > 0;
}

/** Free users get a small monthly allowance of full unlocks. Returns true if consumed. */
export async function tryConsumeFreeUnlock(userId: string): Promise<boolean> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return false;
  const now = new Date();
  const reset = u.freeUnlocksResetAt ? new Date(u.freeUnlocksResetAt) : null;
  let used = u.freeUnlocksUsed ?? 0;
  if (!reset || reset < now) { used = 0; } // new month window
  if (used >= FREE_MONTHLY_UNLOCKS) return false;
  const nextReset = reset && reset >= now ? reset : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  await db.update(users)
    .set({ freeUnlocksUsed: used + 1, freeUnlocksResetAt: nextReset })
    .where(eq(users.id, userId));
  return true;
}
```

### 2.3 Enforce the paywall in the reader endpoint

Wherever `stories.ts` returns `audio_segments` to the Reader, filter by entitlement. 🔧 RECONCILE the query/response shape with your existing handler; the pattern:

```ts
// artifacts/api-server/src/routes/stories.ts  (inside the chapter/segments handler)
import { isEntitled } from "../lib/entitlements";

const userId = (req.session as any)?.userId ?? null;   // 🔧 RECONCILE how you read the session user
const entitled = await isEntitled(userId, storyId);

const segments = await db.select().from(audioSegments)
  .where(eq(audioSegments.chapterId, chapterId)); // 🔧 RECONCILE

const payload = segments.map((s) => {
  const unlocked = entitled || s.isPreview;
  return {
    ...s,
    audioUrl: unlocked ? s.audioUrl : null,   // ⛔ never leak the URL when locked
    locked: !unlocked,
  };
});

res.json({ segments: payload, entitled });
```

If you also stream audio through a dedicated per-segment endpoint (e.g. `GET /segments/:id/audio`), it **must** re-check entitlement and return `402`/`403` for a locked segment — the list endpoint hiding the URL is not enough on its own:

```ts
segmentsRouter.get("/segments/:id/audio", async (req, res) => {
  const seg = await getSegment(req.params.id);           // 🔧 RECONCILE
  const userId = (req.session as any)?.userId ?? null;
  if (!seg.isPreview && !(await isEntitled(userId, seg.storyId))) {
    return res.status(402).json({ error: "payment_required" });
  }
  // ... stream/redirect to the audio as you do today
});
```

### 2.4 Mark preview segments

When audio is generated (admin flow) or via a one-off backfill, set `is_preview = true` for the segments belonging to the first `previewChapterCount` chapters of each story. Quick backfill script (`scripts/`):

```ts
// scripts/src/mark-previews.ts
import { db } from "@workspace/db";
import { stories, chapters, audioSegments } from "@workspace/db/schema"; // 🔧 RECONCILE
import { eq, inArray } from "drizzle-orm";

for (const story of await db.select().from(stories)) {
  const ch = await db.select().from(chapters)
    .where(eq(chapters.storyId, story.id)); // 🔧 RECONCILE ordering (by index)
  const previewChapterIds = ch.slice(0, story.previewChapterCount ?? 1).map((c) => c.id);
  if (previewChapterIds.length) {
    await db.update(audioSegments).set({ isPreview: true })
      .where(inArray(audioSegments.chapterId, previewChapterIds));
  }
}
console.log("previews marked");
```

### 2.5 Billing — provider-agnostic, Stripe concrete

`artifacts/api-server/src/lib/payments/provider.ts` (new — the interface):

```ts
export interface CheckoutParams {
  userId: string;
  customerId?: string | null;
  mode: "subscription" | "payment";
  priceId?: string;                 // for subscriptions
  amountCents?: number;             // for one-time (story/tip/credits)
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
  | { type: "subscription_active"; providerEventId: string; userId: string; customerId: string; subscriptionId: string; plan: string; status: string; currentPeriodEnd: Date }
  | { type: "subscription_canceled"; providerEventId: string; subscriptionId: string }
  | { type: "payment_succeeded"; providerEventId: string; userId: string; kind: string; storyId?: string; amountCents: number; currency: string; paymentId: string }
  | { type: "ignore"; providerEventId: string };
```

`artifacts/api-server/src/lib/payments/stripe.ts` (new — concrete):

```ts
import Stripe from "stripe";
import type { PaymentProvider, CheckoutParams, ProviderEvent } from "./provider";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const stripeProvider: PaymentProvider = {
  async createCheckout(p: CheckoutParams) {
    const session = await stripe.checkout.sessions.create({
      mode: p.mode,
      client_reference_id: p.userId,
      customer: p.customerId ?? undefined,
      line_items: p.mode === "subscription"
        ? [{ price: p.priceId!, quantity: 1 }]
        : [{
            price_data: {
              currency: p.currency ?? "usd",
              product_data: { name: p.metadata.title ?? "Hikāya" },
              unit_amount: p.amountCents!,
            },
            quantity: 1,
          }],
      subscription_data: p.mode === "subscription" ? { trial_period_days: 7 } : undefined,
      metadata: p.metadata,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      allow_promotion_codes: true,
    });
    return { url: session.url! };
  },

  async createPortal(customerId, returnUrl) {
    const s = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return { url: s.url };
  },

  async verifyAndParseWebhook(rawBody, signature): Promise<ProviderEvent> {
    const evt = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    const id = evt.id;
    switch (evt.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const s = evt.data.object as Stripe.Subscription;
        const active = ["active", "trialing"].includes(s.status);
        if (!active) return { type: "subscription_canceled", providerEventId: id, subscriptionId: s.id };
        return {
          type: "subscription_active", providerEventId: id,
          userId: String(s.metadata.userId ?? ""), customerId: String(s.customer),
          subscriptionId: s.id, plan: "plus", status: s.status,
          currentPeriodEnd: new Date(s.current_period_end * 1000),
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
            type: "payment_succeeded", providerEventId: id,
            userId: String(cs.client_reference_id ?? cs.metadata?.userId ?? ""),
            kind: String(cs.metadata?.kind ?? "story"),
            storyId: cs.metadata?.storyId ? String(cs.metadata.storyId) : undefined,
            amountCents: cs.amount_total ?? 0, currency: cs.currency ?? "usd",
            paymentId: cs.id,
          };
        }
        return { type: "ignore", providerEventId: id };
      }
      default:
        return { type: "ignore", providerEventId: id };
    }
  },
};
```

### 2.6 Billing routes (checkout, portal, webhook)

`artifacts/api-server/src/routes/billing.ts` (new):

```ts
import { Router, raw } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { users, subscriptions, entitlements, orders, processedEvents } from "@workspace/db/schema"; // 🔧
import { stripeProvider as provider } from "../lib/payments/stripe";

export const billingRouter = Router();
const BASE = process.env.APP_BASE_URL!;

function requireUser(req: any, res: any): string | null {
  const id = req.session?.userId ?? null;               // 🔧 RECONCILE
  if (!id) { res.status(401).json({ error: "auth_required" }); return null; }
  return id;
}

// Start a subscription checkout
billingRouter.post("/billing/checkout", async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return;
  const interval = req.body?.interval === "annual" ? "annual" : "monthly";
  const priceId = interval === "annual"
    ? process.env.STRIPE_PRICE_PLUS_ANNUAL! : process.env.STRIPE_PRICE_PLUS_MONTHLY!;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const { url } = await provider.createCheckout({
    userId, customerId: u?.billingCustomerId, mode: "subscription", priceId,
    metadata: { userId, kind: "subscription" },
    successUrl: `${BASE}/shelf?welcome=1`, cancelUrl: `${BASE}/pricing`,
  });
  res.json({ url });
});

// Buy a single story
billingRouter.post("/purchases/story", async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return;
  const { storyId, title, amountCents, currency } = req.body;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const { url } = await provider.createCheckout({
    userId, customerId: u?.billingCustomerId, mode: "payment",
    amountCents, currency, metadata: { userId, kind: "story", storyId, title },
    successUrl: `${BASE}/story/${storyId}?unlocked=1`, cancelUrl: `${BASE}/story/${storyId}`,
  });
  res.json({ url });
});

// Manage/cancel
billingRouter.post("/billing/portal", async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u?.billingCustomerId) return res.status(400).json({ error: "no_customer" });
  const { url } = await provider.createPortal(u.billingCustomerId, `${BASE}/profile`);
  res.json({ url });
});

// Webhook — RAW body + signature verification + idempotency
billingRouter.post("/billing/webhook", raw({ type: "*/*" }), async (req, res) => {
  let event;
  try {
    event = await provider.verifyAndParseWebhook(req.body as Buffer, req.headers["stripe-signature"] as string);
  } catch (e) {
    req.log.error({ e }, "webhook verify failed");
    return res.status(400).send("bad signature");
  }
  // idempotency
  const dup = await db.insert(processedEvents)
    .values({ providerEventId: event.providerEventId })
    .onConflictDoNothing().returning();
  if (dup.length === 0) return res.json({ received: true, duplicate: true });

  if (event.type === "subscription_active") {
    await db.update(users).set({
      plan: "plus", planStatus: event.status, planRenewsAt: event.currentPeriodEnd,
      billingProvider: "stripe", billingCustomerId: event.customerId,
    }).where(eq(users.id, event.userId));
    await db.insert(subscriptions).values({
      userId: event.userId, provider: "stripe", providerSubscriptionId: event.subscriptionId,
      plan: event.plan, status: event.status, currentPeriodEnd: event.currentPeriodEnd,
    }).onConflictDoUpdate({
      target: subscriptions.providerSubscriptionId,
      set: { status: event.status, currentPeriodEnd: event.currentPeriodEnd },
    });
    // library-wide entitlement
    await db.insert(entitlements).values({ userId: event.userId, storyId: null, source: "subscription" });
  }

  if (event.type === "subscription_canceled") {
    await db.update(subscriptions).set({ status: "canceled" })
      .where(eq(subscriptions.providerSubscriptionId, event.subscriptionId));
    // 🔧 look up the userId from the subscription row, then downgrade + expire library entitlement
  }

  if (event.type === "payment_succeeded" && event.kind === "story" && event.storyId) {
    await db.insert(orders).values({
      userId: event.userId, storyId: event.storyId, kind: "story",
      amountCents: event.amountCents, currency: event.currency,
      provider: "stripe", providerPaymentId: event.paymentId, status: "paid",
    }).onConflictDoNothing();
    await db.insert(entitlements).values({ userId: event.userId, storyId: event.storyId, source: "purchase" });
  }

  res.json({ received: true });
});
```

```ts
// 🔧 RECONCILE (app bootstrap): the webhook needs the RAW body, so mount billingRouter
// BEFORE any global express.json() middleware, or exclude /api/billing/webhook from it.
```

### 2.7 Frontend — Pricing page & Paywall modal

`artifacts/hikaya/src/pages/Pricing.tsx` (new; route it in `App.tsx` at `/pricing`):

```tsx
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function Pricing() {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  async function subscribe() {
    track("checkout_started", { interval });
    const r = await fetch("/api/billing/checkout", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const { url } = await r.json();
    if (url) location.href = url;             // redirect to Stripe Checkout
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">Hikāya Plus</h1>
      <p className="mt-2 text-muted-foreground">Every character voiced. Every story, unlocked.</p>

      <div className="mt-6 inline-flex rounded-full bg-white/5 p-1 ring-1 ring-white/10">
        {(["annual", "monthly"] as const).map((i) => (
          <button key={i} onClick={() => setInterval(i)}
            className={`rounded-full px-4 py-1 text-sm ${interval === i ? "bg-primary text-primary-foreground" : ""}`}>
            {i === "annual" ? "Annual · save 41%" : "Monthly"}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-sm rounded-2xl bg-gradient-to-b from-purple-900/40 to-black/40 p-8 ring-1 ring-white/10">
        <div className="text-4xl font-bold">{interval === "annual" ? "$49" : "$6.99"}
          <span className="text-base font-normal text-muted-foreground">/{interval === "annual" ? "yr" : "mo"}</span>
        </div>
        <ul className="mt-6 space-y-2 text-left text-sm">
          {["Unlimited full multi-voice audio","Offline & background listening","No ads",
            "Early access to new stories","Cinematic soundscapes"].map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
        <button onClick={subscribe} className="mt-8 w-full rounded-xl bg-primary py-3 font-semibold">
          Start 7-day free trial
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Cancel anytime.</p>
      </div>
    </div>
  );
}
```

`artifacts/hikaya/src/components/Paywall.tsx` (new; open it when the player hits a `locked` segment):

```tsx
import { track } from "@/lib/analytics";

export function Paywall({ storyTitle, storyId, priceCents, onClose }: {
  storyTitle: string; storyId: string; priceCents?: number; onClose: () => void;
}) {
  async function upgrade() {
    track("paywall_upgrade_clicked", { storyId });
    const r = await fetch("/api/billing/checkout", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval: "annual" }),
    });
    const { url } = await r.json(); if (url) location.href = url;
  }
  async function buyStory() {
    track("buy_story_clicked", { storyId });
    const r = await fetch("/api/purchases/story", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId, title: storyTitle, amountCents: priceCents ?? 249, currency: "usd" }),
    });
    const { url } = await r.json(); if (url) location.href = url;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80" onClick={onClose}>
      <div className="w-[min(92vw,440px)] rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold">Keep listening to “{storyTitle}”</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You've reached the end of the free preview. Unlock the full cast.
        </p>
        <button onClick={upgrade} className="mt-5 w-full rounded-xl bg-primary py-3 font-semibold">
          Start free trial of Plus
        </button>
        <button onClick={buyStory} className="mt-2 w-full rounded-xl bg-white/5 py-3 text-sm ring-1 ring-white/10">
          Or unlock just this story · ${((priceCents ?? 249) / 100).toFixed(2)}
        </button>
      </div>
    </div>
  );
}
```

Wire the `StickyAudioPlayer` so that attempting to play a segment with `locked: true` calls `track("paywall_shown")` and opens `<Paywall/>` instead of playing.

---

<a name="phase-3"></a>
## Phase 3 — Convert & retain

### 3.1 Tips / patronage + supporter badge

Schema — `lib/db/src/schema/community.ts` (new):

```ts
import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const tips = pgTable("tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: uuid("from_user_id").notNull(),
  storyId: uuid("story_id"),
  authorId: uuid("author_id"),
  amountCents: integer("amount_cents").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Route — add to `billing.ts` (tips are just a one-time checkout with `kind: "tip"`):

```ts
billingRouter.post("/tips", async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return;
  const { storyId, authorId, amountCents, message } = req.body;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const { url } = await provider.createCheckout({
    userId, customerId: u?.billingCustomerId, mode: "payment", amountCents, currency: "usd",
    metadata: { userId, kind: "tip", storyId: storyId ?? "", authorId: authorId ?? "", message: message ?? "", title: "Support this story" },
    successUrl: `${BASE}/story/${storyId ?? ""}?tipped=1`, cancelUrl: `${BASE}/story/${storyId ?? ""}`,
  });
  res.json({ url });
});
```

In the webhook (`payment_succeeded` with `kind === "tip"`): insert a `tips` row and set a `supporter` flag/badge on the tipper's profile. The supporter badge is just a boolean or a derived query (`exists a tip by this user`).

Frontend — a `TipButton.tsx` mirroring the Paywall's checkout redirect, with $3 / $5 / $10 presets.

### 3.2 Referrals (viral loop: give 14 days, get 14 days)

Schema:

```ts
export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerUserId: uuid("referrer_user_id").notNull(),
  code: text("code").notNull().unique(),
  referredUserId: uuid("referred_user_id"),
  rewardStatus: text("reward_status").notNull().default("pending"), // pending | granted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Route — `artifacts/api-server/src/routes/referrals.ts`:

```ts
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@workspace/db";
import { referrals, entitlements } from "@workspace/db/schema"; // 🔧

export const referralsRouter = Router();

// Get (or create) my referral code
referralsRouter.get("/referrals/code", async (req: any, res) => {
  const userId = req.session?.userId; if (!userId) return res.status(401).end();
  let [r] = await db.select().from(referrals).where(eq(referrals.referrerUserId, userId));
  if (!r) [r] = await db.insert(referrals).values({ referrerUserId: userId, code: nanoid(8) }).returning();
  res.json({ code: r.code, url: `${process.env.APP_BASE_URL}/?ref=${r.code}` });
});

// Redeem on signup: grant both sides 14 trial days via a time-boxed library entitlement
referralsRouter.post("/referrals/redeem", async (req: any, res) => {
  const userId = req.session?.userId; if (!userId) return res.status(401).end();
  const code = String(req.body?.code ?? "");
  const [r] = await db.select().from(referrals).where(eq(referrals.code, code));
  if (!r || r.referrerUserId === userId) return res.status(400).json({ error: "invalid_code" });
  const expires = new Date(Date.now() + 14 * 864e5);
  await db.insert(entitlements).values([
    { userId, storyId: null, source: "grant", expiresAt: expires },
    { userId: r.referrerUserId, storyId: null, source: "grant", expiresAt: expires },
  ]);
  await db.update(referrals).set({ referredUserId: userId, rewardStatus: "granted" }).where(eq(referrals.id, r.id));
  res.json({ ok: true, trialDays: 14 });
});
```

Frontend: read `?ref=CODE` on landing, stash in `localStorage`, and POST to `/referrals/redeem` right after the user signs up.

### 3.3 Gifting a story

A gift is a one-time checkout with `kind: "gift"` and a `giftRecipientEmail`. On `payment_succeeded`, create an `orders` row and email the recipient a redeem link; when they click it and sign in, insert a per-story `entitlement` for them. Reuse the `purchases/story` route with an added `recipientEmail` field and branch in the webhook.

### 3.4 Ratings & reviews (social proof + SEO content)

Schema:

```ts
export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  storyId: uuid("story_id").notNull(),
  stars: integer("stars").notNull(),      // 1..5
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Route (create + list) and, on create, recompute `stories.ratingAvg` / `ratingCount`. Render stars + reviews on `StoryDetail.tsx`; add `aggregateRating` to the JSON-LD in `StorySeo` so Google shows star snippets.

### 3.5 Reading streaks (retention)

You already have `reading_progress`. Derive a streak from distinct active days:

```ts
// artifacts/api-server/src/lib/streak.ts
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
export async function getStreak(userId: string): Promise<number> {
  // count consecutive days up to today with any reading_progress update
  const rows = await db.execute(sql`
    SELECT DISTINCT date_trunc('day', updated_at) AS d
    FROM reading_progress WHERE user_id = ${userId}
    ORDER BY d DESC LIMIT 60`); // 🔧 RECONCILE table/column names
  let streak = 0; const today = new Date(); today.setHours(0,0,0,0);
  for (const row of rows.rows as any[]) {
    const d = new Date(row.d); d.setHours(0,0,0,0);
    const expected = new Date(today); expected.setDate(today.getDate() - streak);
    if (d.getTime() === expected.getTime()) streak++; else break;
  }
  return streak;
}
```

Surface the streak on the Shelf/Profile ("🔥 6-day streak") — a cheap, powerful habit hook.

### 3.6 Lifecycle emails

With Resend + `email_subscribers`, send: welcome (done in §1.2), a weekly "new voiced story" broadcast, a trial-ending-in-2-days nudge (query users with `planStatus = 'trialing'` and `planRenewsAt` near), and a win-back to `canceled` users. Run the scheduled ones from a small cron worker or Replit scheduled deployment; keep the send logic in `lib/email.ts`.

---

<a name="phase-4"></a>
## Phase 4 — Delight (differentiation & word-of-mouth)

### 4.1 Karaoke-style synced highlighting (the demo-able "wow")

Your audio is already per-segment. Highlight the active line as its clip plays by listening to the player's segment index:

```tsx
// inside Reader — segments: {id, text, audioUrl}[]; activeIndex from the player
{segments.map((s, i) => (
  <p key={s.id}
     className={i === activeIndex ? "text-white transition-colors" : "text-white/45 transition-colors"}>
    {s.text}
  </p>
))}
```

Drive `activeIndex` from the `StickyAudioPlayer`: when clip *i* ends, advance to *i+1* and scroll it into view (`ref.scrollIntoView({ block: "center", behavior: "smooth" })`). For true word-level karaoke, request ElevenLabs **timestamps** (character/word timings) at generation time, store them on the `audio_segments` row (a `timings` jsonb column), and highlight words by `audio.currentTime`.

### 4.2 Character voice previews on the story page

You already assign each character an ElevenLabs voice. Generate one short sample line per character at setup time, store it as a `preview_audio_url` on the `characters` row, and let the detail page play it:

```tsx
function CharacterChip({ name, previewUrl }: { name: string; previewUrl?: string }) {
  const play = () => previewUrl && new Audio(previewUrl).play();
  return (
    <button onClick={play} className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
      <span>🔊</span><span className="text-sm">{name}</span>
    </button>
  );
}
```

This sells the multi-voice premise *before* the user commits — and each chip is a natural share moment.

### 4.3 Cinematic soundscapes (premium hook)

Add an optional ambience bed under narration for Plus users. Store an optional `ambienceUrl` per chapter (or per story), loop it at low volume via a second `<audio>` element ducked under the narration, and gate it behind entitlement. Small change, big "audio film" upgrade that justifies Plus.

### 4.4 Player polish (mostly table-stakes, several are Plus hooks)

Extend `StickyAudioPlayer`: playback speed (0.8×–2×), **sleep timer**, and background/lock-screen playback via the **MediaSession API**:

```ts
navigator.mediaSession.metadata = new MediaMetadata({
  title: chapterTitle, artist: storyTitle, album: "Hikāya",
  artwork: [{ src: coverUrl, sizes: "512x512", type: "image/png" }],
});
navigator.mediaSession.setActionHandler("nexttrack", playNextSegment);
navigator.mediaSession.setActionHandler("previoustrack", playPrevSegment);
```

### 4.5 Creator marketplace & institutional (build toward)

These are platform-scale, not single-PRs, so treat them as their own projects once the funnel converts:

- **Marketplace:** your admin studio (PDF → annotate → assign voices → generate → publish) is already ~80% of a creator tool. Add an `authors` relation, per-author payout accounts (Stripe Connect), a revenue-share field on `orders`/`subscriptions`, and open the admin flow to approved authors behind a role. This is how the catalog scales without you voicing everything.
- **Institutional licences:** add an `organizations` table + seat-based access (an org-wide `entitlement`), an invite flow, and simple admin. Sell to schools/libraries on the language-learning angle — higher value, stickier than consumer subs.

---

## Wiring checklist (do this as you go)

1. Every new schema file is exported from the Drizzle barrel → `pnpm --filter @workspace/db run push`.
2. Every new endpoint is added to `lib/api-spec` → `pnpm --filter @workspace/api-spec run codegen` → server validates with the generated Zod, client uses the generated hooks.
3. Mount new routers in the API bootstrap. **The Stripe webhook must receive the raw body** — register `billingRouter` (or at least `/api/billing/webhook`) *before* global `express.json()`, or exclude that path from JSON parsing.
4. Route the new pages (`/pricing`) in `App.tsx`.
5. `initAnalytics()` in `main.tsx`; `identify(userId)` after login.
6. `pnpm run typecheck` at root before every commit. No `console.log` on the server — use `req.log`.
7. Do **not** modify the first-user→`super_admin` advisory-lock logic in `auth.ts`.

## Suggested commit order (each is a shippable PR)

1. `feat: analytics + email capture + newsletter endpoint` (§1.1–1.2)
2. `feat: guest mode + magic-link auth` (§1.3–1.4)
3. `feat: SEO meta + JSON-LD + sitemap` (§1.5)
4. `feat: billing schema + entitlements + preview flag` (§2.1–2.4)
5. `feat: Stripe provider + checkout/portal/webhook` (§2.5–2.6)
6. `feat: pricing page + paywall modal + player gating` (§2.7)
7. `feat: tips + referrals + gifting` (§3.1–3.3)
8. `feat: ratings + streaks + lifecycle emails` (§3.4–3.6)
9. `feat: karaoke highlighting + voice previews + soundscapes` (§4.1–4.4)

Ship 1–6 and Hikāya captures visitors and takes money. Everything after compounds it.
