# Hikāya — Reconciliation & Corrections (matched to the live repo)

I read the actual repo on branch `main` and reconciled the implementation package against it. **This document overrides `Hikaya-Implementation-Code.md` wherever they differ.** Give both to Claude Code and tell it: *"Apply Hikaya-Implementation-Code.md, but use Hikaya-Reconciliation-and-Corrections.md for the exact values and the corrected blocks — the corrected blocks replace their originals."*

The repo mostly matches the documented architecture, but four things are materially different and change the code:

1. **Audio is stored as `bytea` in the database**, not as files/URLs. There is no `audioUrl` column and no per-segment `audio_segments.is_preview` that maps to text. Segments live in `chapters.segments` (jsonb); audio bytes stream from `GET /api/audio/:chapterId/:idx`. → **The paywall is gated per-chapter at that streaming endpoint, not via a segment flag.**
2. **Primary keys are `varchar` holding `gen_random_uuid()`**, not the `uuid` type. All new tables/FKs must match.
3. **The logged-in user is `req.user` (id = `req.user.id`)** via a custom `authMiddleware`, not `req.session.userId`. Guard with `requireAuth`.
4. **`express.json()` is global** (60 MB) and runs before the router → the Stripe webhook must be mounted with a raw parser *before* it.

---

## A. Global facts — exact values for every `🔧 RECONCILE`

**Package names**

| Workspace | Package name |
|---|---|
| root | `workspace` |
| frontend | `@workspace/hikaya` |
| api server | `@workspace/api-server` |
| db | `@workspace/db` |
| api spec | `@workspace/api-spec` |
| zod (generated) | `@workspace/api-zod` |
| react-query hooks (generated) | `@workspace/api-client-react` |
| scripts | `@workspace/scripts` |

Note: frontend is **React 19.1.0** (the components in the package work as written).

**DB imports & conventions**
- Everything is re-exported from the package root: `import { db, usersTable, storiesTable, chaptersTable, audioSegmentsTable } from "@workspace/db";`
- Table variables use the **`...Table` suffix** (`usersTable`, `storiesTable`, …). Name your new ones the same way (`emailSubscribersTable`, `entitlementsTable`, …).
- **Primary key pattern (use this everywhere):**
  ```ts
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ```
  All foreign keys are `varchar(...).references(() => otherTable.id)`. Import `sql` from `drizzle-orm` and column builders from `drizzle-orm/pg-core`.
- Schema files live in `lib/db/src/schema/` (`auth.ts`, `stories.ts`, `index.ts`). Add new tables in a new file and export it from `lib/db/src/schema/index.ts` (`export * from "./billing";`).
- No separate Drizzle `relations` file — relations are inline `.references()`.

**Auth / session (custom middleware, not Passport)**
- The logged-in user is `req.user` (type `AuthUser` from `@workspace/api-zod`). **User id = `req.user.id`; role = `req.user.role`.**
- Guard protected routes with `requireAuth` (and `requireAdmin`) imported from `../middlewares/requireAdmin`. `req.isAuthenticated()` is available.
- Replace every `req.session.userId` / `requireUser(req,res)` in the implementation doc with:
  ```ts
  const userId = req.user?.id ?? null;         // for optional gating
  // …or, on protected routes, add requireAuth middleware and use req.user!.id
  ```
- The first-user→`super_admin` advisory-lock promotion lives in the auth lib — **do not modify it.**

**Zod validation** — the generated validators are in `@workspace/api-zod`, imported by operation name (e.g. the server already uses `UpsertMyProgressBody`, `ToggleBookmarkBody`). After you add a path to the spec and run codegen, import the generated body schema by its generated name.

**React Query hooks** — generated into `@workspace/api-client-react` (split mode, `baseUrl: "/api"`, a `customFetch` mutator). Prefer these for new frontend calls; the thin `fetch(...)` in the sample components is fine to ship first and swap later.

**OpenAPI source** — single file **`lib/api-spec/openapi.yaml`**. Edit it, then `pnpm --filter @workspace/api-spec run codegen` (runs orval + `typecheck:libs`). Orval forces `info.title = "Api"`.

**Router registration** — sub-routers are combined in **`artifacts/api-server/src/routes/index.ts`** (`router.use(healthRouter, authRouter, storiesRouter, meRouter, adminRouter)`), each route file declaring its **own full path** (e.g. `/stories`, `/me/progress`). Everything is mounted under `/api` in `app.ts`. So: add `growthRouter`, `billingRouter`, `referralsRouter` to that `router.use(...)` line, and declare full paths like `/newsletter/subscribe`, `/billing/checkout` inside each file.

**Frontend routing** — `wouter`. Add in `App.tsx` inside `<Switch>`:
```jsx
<Route path="/pricing" component={Pricing} />
```
Init analytics once in `src/main.tsx`.

---

## B. Corrected schema (replaces §2.1 and §1.2 tables)

Use `varchar` PKs and the `...Table` suffix. Import: `import { pgTable, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core"; import { sql } from "drizzle-orm";`

**Columns to ADD to existing tables** (in `lib/db/src/schema/auth.ts` for users, `stories.ts` for stories):

```ts
// usersTable — add:
plan: varchar("plan").notNull().default("free"),                 // free | plus
planStatus: varchar("plan_status"),                              // active|trialing|past_due|canceled
planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
billingProvider: varchar("billing_provider"),
billingCustomerId: varchar("billing_customer_id"),
country: varchar("country"),
freeUnlocksUsed: integer("free_unlocks_used").notNull().default(0),
freeUnlocksResetAt: timestamp("free_unlocks_reset_at", { withTimezone: true }),

// storiesTable — add:
access: varchar("access").notNull().default("premium"),          // free | premium | purchasable
priceCents: integer("price_cents"),
previewChapterCount: integer("preview_chapter_count").notNull().default(1),
isFeatured: boolean("is_featured").notNull().default(false),
isSponsored: boolean("is_sponsored").notNull().default(false),
ratingAvg: integer("rating_avg"),         // store avg*10 as int, or use numeric — repo uses integers elsewhere
ratingCount: integer("rating_count").notNull().default(0),
listenCount: integer("listen_count").notNull().default(0),
```

> **Do NOT add `is_preview` to `audio_segments`.** Audio is `bytea` keyed by `(chapterId, segmentIndex)`; preview status is a property of the **chapter** (`chapterNumber <= story.previewChapterCount`). No backfill script needed — drop §2.4 entirely.

**New tables** — `lib/db/src/schema/billing.ts`:

```ts
import { pgTable, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable, storiesTable } from "./index";  // or direct file imports

export const emailSubscribersTable = pgTable("email_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  locale: varchar("locale"),
  source: varchar("source").notNull(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  confirmed: integer("confirmed").notNull().default(0),   // 0/1 to match repo's int style, or boolean
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id").notNull().unique(),
  plan: varchar("plan").notNull(),
  status: varchar("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entitlementsTable = pgTable("entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  storyId: varchar("story_id").references(() => storiesTable.id, { onDelete: "cascade" }), // null = whole library
  source: varchar("source").notNull(),               // subscription | purchase | grant
  expiresAt: timestamp("expires_at", { withTimezone: true }),   // null = no expiry
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  storyId: varchar("story_id").references(() => storiesTable.id, { onDelete: "set null" }),
  kind: varchar("kind").notNull(),                   // story | credit_pack | gift | tip
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency").notNull().default("usd"),
  provider: varchar("provider").notNull(),
  providerPaymentId: varchar("provider_payment_id").unique(),
  status: varchar("status").notNull(),
  giftRecipientEmail: varchar("gift_recipient_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const processedEventsTable = pgTable("processed_events", {
  providerEventId: varchar("provider_event_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Community tables (`tips`, `referrals`, `ratings`, and a new `activity_days` — see §E) follow the same `varchar`/`...Table` pattern. Then `pnpm --filter @workspace/db run push`.

---

## C. Corrected entitlements + paywall (replaces §2.2–2.4 and §2.3)

The **single choke point** is the audio streaming endpoint, which today has **no auth check** — anyone can hit `GET /api/audio/:chapterId/:idx` and get bytes. That's exactly where the gate goes.

**Entitlements service** — `artifacts/api-server/src/lib/entitlements.ts`:

```ts
import { and, eq, isNull, or, gt, sql } from "drizzle-orm";
import { db, entitlementsTable, usersTable, chaptersTable, storiesTable } from "@workspace/db";

const FREE_MONTHLY_UNLOCKS = 2;

export async function isEntitled(userId: string | null, storyId: string): Promise<boolean> {
  if (!userId) return false;
  const rows = await db.select().from(entitlementsTable).where(
    and(
      eq(entitlementsTable.userId, userId),
      or(isNull(entitlementsTable.storyId), eq(entitlementsTable.storyId, storyId)),
      or(isNull(entitlementsTable.expiresAt), gt(entitlementsTable.expiresAt, sql`now()`)),
    ),
  );
  return rows.length > 0;
}

/** A chapter is free if its number is within the story's preview window. */
export async function chapterIsPreview(chapterId: string): Promise<{ isPreview: boolean; storyId: string }> {
  const [row] = await db
    .select({
      storyId: storiesTable.id,
      chapterNumber: chaptersTable.chapterNumber,
      previewCount: storiesTable.previewChapterCount,
      access: storiesTable.access,
    })
    .from(chaptersTable)
    .innerJoin(storiesTable, eq(chaptersTable.storyId, storiesTable.id))
    .where(eq(chaptersTable.id, chapterId));
  if (!row) return { isPreview: false, storyId: "" };
  const isPreview = row.access === "free" || row.chapterNumber <= (row.previewCount ?? 1);
  return { isPreview, storyId: row.storyId };
}
```

**Gate the audio endpoint** — in `stories.ts`, the existing `GET /audio/:chapterId/:idx` handler, add at the top before streaming bytes:

```ts
import { isEntitled, chapterIsPreview } from "../lib/entitlements";

// inside GET /audio/:chapterId/:idx, before res.send(seg.audio):
const { isPreview, storyId } = await chapterIsPreview(req.params.chapterId);
const userId = req.user?.id ?? null;
if (!isPreview && !(await isEntitled(userId, storyId))) {
  return res.status(402).json({ error: "payment_required" });
}
// …existing: set Content-Type, Cache-Control, res.send(seg.audio)
```

**Reflect lock state in the reader payload** — in the existing `GET /stories/:slug/chapters/:chapterNumber` handler, where it maps `chapter.segments` to `{ ...s, index: i, audioUrl }`, compute entitlement once for the chapter and null out `audioUrl` for locked chapters:

```ts
const userId = req.user?.id ?? null;
const isPreview = chapter.chapterNumber <= (story.previewChapterCount ?? 1) || story.access === "free";
const unlocked = isPreview || await isEntitled(userId, story.id);

const segments = chapter.segments.map((s: any, i: number) => {
  const hasAudio = audioIdxSet.has(i);                    // existing set
  return {
    ...s,
    index: i,
    audioUrl: hasAudio && unlocked ? `/api/audio/${chapter.id}/${i}` : null,
    locked: hasAudio && !unlocked,
  };
});
// return { story, chapter: { ...chapter, segments, hasAudio }, characters, nextChapterNumber, prevChapterNumber, unlocked }
```

Because bytes only ever leave through the gated `/api/audio/...` endpoint, this is airtight: even if a client forged the `audioUrl`, the 402 check stops it. (CLAUDE.md rule 2 satisfied.)

Keep the free monthly-unlock allowance (`tryConsumeFreeUnlock` from the original §2.2) as-is but with `usersTable` and `varchar` ids — call it when a signed-in free user chooses to spend an unlock on a locked story (creates a per-story `entitlements` row with a 30-day `expiresAt`, or permanent — your call).

---

## D. Corrected billing wiring (replaces parts of §2.5–2.6)

- Everywhere the billing/tips/referrals routes read the user, use `req.user?.id` (optional routes) or add `requireAuth` and use `req.user!.id`. Delete the `requireUser(req,res)` helper; use the repo's `requireAuth` from `../middlewares/requireAdmin`.
- Import db + tables from `@workspace/db` (root), e.g. `import { db, usersTable, subscriptionsTable, entitlementsTable, ordersTable, processedEventsTable } from "@workspace/db";`
- Register `billingRouter` in `artifacts/api-server/src/routes/index.ts`.

**Webhook raw body — the important one.** `express.json({ limit: "60mb" })` is global in `app.ts` and runs before the router, so by the time a request reaches `billingRouter` the body is already parsed and signature verification will fail. Mount the webhook with a raw parser **before** the global json in `app.ts`:

```ts
// artifacts/api-server/src/app.ts — BEFORE app.use(express.json(...))
import { stripeWebhookHandler } from "./routes/billing";   // export the handler separately
app.post("/api/billing/webhook", express.raw({ type: "*/*" }), stripeWebhookHandler);

// …then the existing global middleware:
app.use(express.json({ limit: "60mb" }));
```

Export the webhook handler as a standalone function from `billing.ts` (keep checkout/portal as normal router routes). Everything else in the webhook logic (idempotency via `processedEventsTable`, entitlement creation) is unchanged except table names.

---

## E. Corrected streaks (replaces §3.5)

`reading_progress` holds **one upserted row per (user, story)** (`chapterNumber`, `progressPercent`, `updatedAt`) — it's overwritten each time, so it can't reconstruct historical daily activity. For streaks, record a lightweight day marker:

```ts
// lib/db/src/schema/community.ts
export const activityDaysTable = pgTable("activity_days", {
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  day: varchar("day").notNull(),   // "YYYY-MM-DD" (UTC or user tz)
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.day] }) }));
```

Write `(userId, today)` with `onConflictDoNothing()` whenever a signed-in user opens a chapter or updates progress (piggy-back on the existing `POST /me/progress`). Then compute the streak by walking back consecutive `day` strings. (Alternatively, read streaks straight from PostHog activity — but the table keeps it in your own data.)

---

## F. Corrected i18n (replaces §4 of the Copy pack's integration step)

The frontend i18n is **`src/lib/i18n.tsx`** with **inline dictionaries and FLAT keys — there are no namespaces.** Hook: `const { t } = useI18n(); t("nav_home")`. Locales `en`, `ar`, `fr` are full; `nl`, `es`, `de` currently **alias English**.

So don't add a `monetization` namespace object. Instead add **flat keys** into each locale dictionary in `i18n.tsx`, and reference them as `t("pricing_headline")` etc. There are already paywall-adjacent keys (`guest_listen_locked`, `login_required`, `login`, `logout`) to sit beside.

Flat keys to add (map from the Copy pack's `monetization.*`): `plus`, `pricing_headline`, `pricing_subhead`, `toggle_annual`, `toggle_monthly`, `feat_audio`, `feat_offline`, `feat_noads`, `feat_early`, `feat_soundscapes`, `cta_trial`, `reassure_cancel`, `keep_free`, `paywall_title`, `paywall_body`, `paywall_buy_story`, `gate_title`, `gate_body`, `newsletter_cta`, `newsletter_success`, `buy_story`, `tip`, `supporter`.

The values are already translated in `Hikaya-Copy-and-Localization.md` §4 for all six languages — copy each language's values in as flat keys. **Bonus:** since `nl`, `es`, `de` currently just alias English, dropping in the real Dutch/Spanish/German values from the Copy pack upgrades those locales for these strings (worth doing the same for the rest of the app over time).

Update the sample components to use `t()`:
```tsx
const { t } = useI18n();
// e.g. in Paywall.tsx:  <h3>{t("paywall_title").replace("{title}", storyTitle)}</h3>
```

---

## G. Guest-progress migration — real endpoint

The migration in §1.3 targets the existing `POST /me/progress` (guarded by `requireAuth`, body `UpsertMyProgressBody`). Its real shape is `{ storyId, chapterNumber, progressPercent }` upserted on `(userId, storyId)`. When a guest signs in, replay each `localStorage` entry into that endpoint, then clear the key. (Guest local shape stores `segmentIndex`; map it to `chapterNumber`/`progressPercent` — or simplify guest storage to store `chapterNumber` + percent to match.)

---

## H. Net changes to the build — what's different from the package

- **Schema:** all new tables use `varchar` PK + `...Table` suffix; add columns to `usersTable`/`storiesTable`; **no `is_preview` on audio_segments**; add `activityDaysTable`.
- **Paywall:** chapter-level, enforced at `GET /api/audio/:chapterId/:idx` (add the 402 check) + `audioUrl` nulled in the reader payload. Drop the preview-backfill script.
- **Server:** use `req.user?.id` + `requireAuth`; register routers in `routes/index.ts`; mount the Stripe webhook raw-parser **before** the global `express.json()` in `app.ts`.
- **Spec:** edit `lib/api-spec/openapi.yaml`; codegen emits `@workspace/api-zod` + `@workspace/api-client-react`.
- **Frontend:** wouter route for `/pricing`; init analytics in `main.tsx`; i18n via flat keys in `src/lib/i18n.tsx` (`useI18n`), not namespaced JSON.
- **Streaks:** use a new `activity_days` table, not `reading_progress`.

Everything else in `Hikaya-Implementation-Code.md` (billing provider interface, checkout/portal/webhook logic, Stripe setup, pricing page, paywall modal, referrals/tips/gifting logic, delight features, PR order) stands as written once the names above are substituted.
