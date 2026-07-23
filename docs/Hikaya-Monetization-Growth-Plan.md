# Hikāya · حكاية — Monetization, Engagement & Visitor-Capture Plan

**A combined strategy playbook + implementation spec for Fable 5**
Prepared 22 July 2026 · Target repo: `github.com/Zakaria-Aburawais/hikaya`

---

## 0. How to use this document

This is written in two layers so you can hand the whole thing to Fable 5:

- **Part A – Strategy** explains *what* to build and *why* (the business logic, pricing, funnel, and feature bets).
- **Part B – Implementation Spec** maps every recommendation to your actual codebase — files, DB tables, OpenAPI endpoints, and new components — grouped into phases so it can be built change-by-change.

A one-line brief you can paste at the top of a Fable 5 session is included at the very end (§B.9).

---

## Part A — Strategy

### A.1 The core economic insight (read this first)

Everything below rests on one fact about how Hikāya already works: **audio is generated once by the admin and stored as `audio_segments` rows, then streamed to unlimited readers.**

That means the marginal cost of one more person listening to a story is essentially bandwidth — fractions of a cent. The real cost is the *one-time* ElevenLabs generation when a story is produced.

Grounding that with current ElevenLabs API pricing (mid-2026): paid API overage runs roughly **$0.12–$0.30 per 1,000 characters**, and the Flash v2.5 model is about half the credit cost of Multilingual v2. A typical multi-chapter story of ~40,000 characters of narration therefore costs on the order of **$5–$15 to voice, one time**. ([ElevenLabs pricing breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown), [ElevenLabs API pricing](https://elevenlabs.io/pricing/api))

The strategic consequence: **a single annual subscriber can pay for the audio of an entire shelf of stories, and every listener after that is near-pure margin.** Hikāya's economics look like a software product, not a media company. So the plan optimizes for two things above all — (1) getting people *in the door and captured* (email/account), and (2) *converting the ones who fall in love with a story into recurring payers*. Content COGS is not the constraint; attention and conversion are.

### A.2 Positioning — who we capture first

You chose a **global multilingual** audience. The sharpest way to own that without being generic is to lead with the thing no mainstream audiobook app does well: **full-cast, multi-voice audio drama in six languages, with text and audio perfectly synced.** That single sentence is the wedge. It appeals simultaneously to:

- **Immersive-reading / audiobook fans** who want more than one flat narrator.
- **Language learners** — synced text + native-voice audio is a genuinely excellent study tool (a large, motivated, willing-to-pay segment across all six languages).
- **Arabic and RTL readers**, who are chronically underserved by Western reading apps and where your RTL-first build is a real moat.

Positioning line to use across the site and in metadata: **"Stories that speak — every character voiced, in six languages, read and heard at once."** You already have "Stories that speak." in the hero; lean into it everywhere.

### A.3 The monetization architecture (all streams, layered)

Don't pick one model — **layer them** so every kind of visitor has a way to pay that fits their intent. The layers, from foundation upward:

**1. Freemium subscription — "Hikāya Plus" (the core revenue engine).**
This should be 70–80% of revenue long-term. Recurring, predictable, and the best fit for audio content people consume repeatedly. Structure:

- *Free forever:* browse the entire library, read **all text** in any language, and listen to a **generous audio preview** — the first chapter of any story (or the first ~2 minutes), plus a small monthly allowance of full-audio unlocks (e.g. 1–2 stories/month) so free users experience the "wow" repeatedly.
- *Plus (paid):* unlimited full multi-voice audio, offline download, background/lock-screen playback, no ads, sleep timer + speed control, early access to new stories, and premium-only "cinematic" extras (soundscapes/music beds — see A.6).

**2. Pay-per-story / credits (à la carte, for non-subscribers).**
Captures the person who won't commit to a subscription but will pay $2 for *this one story* right now — impulse and gifting demand. Sell single-story audio unlocks and discounted credit packs (e.g. 5 credits for the price of 3). Add **gifting**: buy a story for someone else, delivered by link. This is also your best low-friction first transaction — the on-ramp to a later subscription.

**3. Patronage / tip the author (community & goodwill).**
A "support this story" / buy-me-a-coffee button on story and author pages, with a visible **supporter badge** on the tipper's profile. Small absolute revenue, but it (a) warms up first-time payers, (b) funds and motivates contributors once you open the platform to other authors, and (c) signals a creator-friendly brand.

**4. Ads / sponsorship (monetize the free tier without a wall).**
Keep it tasteful or it will poison the cinematic feel. Two clean formats: a short **audio interstitial before a chapter** for free listeners ("this chapter is brought to you by…"), and **sponsored / featured story** placements in the library and "Fresh from the press" row. Avoid intrusive display banners inside the reader. Ads are a floor under un-converted free users, and the "remove ads" benefit is itself a reason to upgrade.

**5. Beyond the obvious — additional streams to build toward:**

- **Institutional / education licences.** Site licences for schools, universities, and libraries — especially compelling on the *language-learning* angle. Higher-value, lower-volume, and sticky. This is potentially bigger than consumer subscriptions.
- **Creator marketplace (turn the product into a platform).** Open publishing to outside authors and take a revenue share on their paid stories/tips. This is how Hikāya scales its catalog without you generating everything — and how it becomes defensible. Your admin tooling (PDF upload → script annotation → voice assignment → generation) is already 80% of a creator studio.
- **B2B / white-label of the audio-drama engine.** Publishers, e-learning companies, and other apps will pay to turn their text into synced multi-voice audio. Your monorepo already isolates the engine cleanly.
- **Premium voice packs / commissioned narration.** Let power users or authors pay for higher-tier voices, celebrity-style voices, or "re-voice this story with a different cast."
- **Print-on-demand & affiliate.** Sell physical copies of popular stories (POD) and/or affiliate-link to buy the print book — near-zero effort, incremental revenue, and a nice trust signal.

The **priority order** for a solo operator: ship **1 (subscription)** + **2 (pay-per-story)** first, add **3 (tips)** and **4 (ads)** as fast follows because they're cheap, then pursue **institutional** and **marketplace** once you have traction and a catalog.

### A.4 Pricing (global, with purchasing-power tiers)

Because the audience is global, **flat USD pricing leaves money on the table in rich markets and prices out emerging ones** (including much of MENA). Use regional / purchasing-power-parity (PPP) pricing.

| Product | Core markets (US/EU/GCC) | Emerging markets (incl. much of MENA, LATAM, S/SE Asia) |
|---|---|---|
| Hikāya Plus — monthly | $6.99 / €6.99 | $2.99 |
| Hikāya Plus — annual | $49 (≈41% off monthly) | $19 |
| Single-story unlock | $2.49 | $0.99 |
| Credit pack (5) | $8.99 | $3.99 |
| Tip tiers | $3 / $5 / $10 | local equivalents |

Anchor on the **annual plan** — it's the biggest lever for a content app because it front-loads cash and slashes churn. Offer a **7-day free trial of Plus** (card up front) and an **annual-first paywall** (show yearly as the default, monthly as the "or" option). Realistic free-to-paid conversion for consumer content sits around **1–5%**, so the whole funnel (A.5) exists to push toward and past the top of that range. ([Freemium conversion benchmarks](https://www.withdaydream.com/library/insights/freemium-conversion-rate))

**Unit economics sanity check:** at a $49 annual sub and ~$5–15 one-time audio cost per story, a single annual subscriber funds the audio for 3–10 whole stories — and then every additional listener on those stories is margin. This is why the funnel, not the content cost, is where to spend effort.

**Payments — important for a global solo operator.** Rather than raw Stripe (where *you* become responsible for collecting and remitting VAT/sales tax in dozens of countries, and where card coverage in parts of MENA is patchy), strongly consider a **Merchant-of-Record (MoR)** provider — **Paddle** or **Lemon Squeezy** — which handles global tax compliance for you and supports more local payment methods. Stripe remains a fine choice if you'd rather own the stack and add a tax service (Stripe Tax) yourself. Build the billing layer **provider-agnostic** (see §B.3) so this stays a swappable decision. ([Stripe alternatives 2026](https://www.paddle.com/alternatives/stripe), [Stripe supported countries + MENA gaps](https://dodopayments.com/blogs/stripe-supported-countries-alternatives))

### A.5 Visitor capture & the growth funnel

Right now the site's biggest capture leak is almost certainly **login friction**: Replit Auth (OIDC) is fine for an internal tool but is a poor front door for a consumer product — visitors won't create a "Replit" account to try a story. Fixing the top of funnel matters more than any single feature.

The funnel, stage by stage, with the tactic for each:

**Attract (SEO + social).** Story detail pages and the library should be fully server-renderable/indexable per language, with structured data (`Book`/`Audiobook` schema.org), per-language `hreflang`, and rich share cards (Open Graph/Twitter) that show cover art and a "listen" badge. Each of the six languages is a separate SEO surface — that's six times the organic real estate. Add auto-generated **shareable audio snippet cards** ("hear this line") — a 15-second clip of the best voiced moment, perfect for social, each linking back.

**Capture (email > account).** Email is the asset you own regardless of platform. Add capture at multiple low-friction points: a "**save your spot / get the next chapter**" prompt when a guest hits the end of a free chapter; a newsletter ("a new voiced story every week"); an **exit-intent** offer; and a **waitlist/early-access** hook for new premium stories. Every captured email feeds a lifecycle sequence (welcome → best free story → soft upgrade → trial offer).

**Reduce signup friction.** Let people **read and start listening as a guest** (no account) — you already support guest browsing; extend it to previews and store progress in local storage, then offer to "keep your progress" via a **one-tap magic-link / social sign-in** at the moment they're invested. Replace or augment Replit Auth with **email magic-link + Google/Apple sign-in** (this is the single highest-ROI capture change).

**Convert.** Contextual paywall at the moment of desire — when a free user finishes their preview chapter and wants to keep listening, show a beautiful, on-brand upgrade modal (annual-first, trial CTA), *not* a generic wall. Show the value they're about to get (the full cast, offline, etc.).

**Refer (viral loop).** "Give a friend 14 days of Plus, get 14 days free." Referral is unusually effective for content people love. Also let subscribers **gift a story** (ties into A.3 stream 2).

**Retain (the compounding lever).** Reading streaks, "resume where you left off" (you have `reading_progress` already — surface it hard), a weekly "new story" email/push, and re-engagement notifications. Retention is what makes annual plans renew and what makes the whole model compound.

### A.6 "Interesting" — engagement & delight features

These make the product worth talking about and worth paying for. Prioritized by impact-to-effort:

- **Karaoke-style word/line highlighting** synced to the audio (the current sync is per-segment; highlighting the active line — or word — as it's spoken is the single most "wow" upgrade to the reader and is directly demoable in marketing).
- **Character voice previews on the story detail page** — tap a character, hear their voice. This sells the multi-voice premise *before* the reader commits, and it's a natural share moment.
- **Player polish:** playback speed, **sleep timer**, background/lock-screen playback, and skip-by-line. These are table-stakes for audio and several are premium hooks.
- **Cinematic layer (premium):** optional ambient **soundscapes / music beds** under narration (rain, market, oud) — turns "audiobook" into "audio film." Strong Plus differentiator.
- **Discovery & curation:** editor's picks, themed collections, "because you listened to…" recommendations, and a real **daily/weekly story drop** to create appointment habit. Your homepage already has "Browse by category" and "Fresh from the press" — wire them to real data and add a "Continue listening" row for signed-in users.
- **Social proof & community:** ratings, short reviews, and listen counts on story pages — these both convert new visitors and generate SEO-friendly content.
- **Gamification:** streaks, "minutes listened," badges (incl. the supporter badge), and finished-story achievements.
- **Author pages:** a home for each author's catalog and tip button — essential once the marketplace opens, and a nice trust/SEO surface now.

---

## Part B — Implementation Spec (for Fable 5)

Everything here respects Hikāya's existing conventions: **contract-first** (edit the OpenAPI spec in `lib/api-spec` → run `pnpm --filter @workspace/api-spec run codegen` → server validates with generated Zod, client uses generated React Query hooks), **no `console.log` on the server** (use `req.log` / `logger`), push schema with `pnpm --filter @workspace/db run push`, and `pnpm run typecheck` at root as the gate before every commit.

### B.0 Three principles that keep this safe

1. **Gate entitlements on the server, never the client.** The paywall must live where `audio_segments` are served (`artifacts/api-server`). The React app can *show* locks, but a non-subscriber must be physically unable to fetch premium audio URLs. Client-only gating is trivially bypassed.
2. **Make billing provider-agnostic.** Wrap Stripe/Paddle/Lemon Squeezy behind one internal `PaymentProvider` interface so switching MoR later is a config change, not a rewrite (see A.4).
3. **Ship the funnel before the features.** Phases 1–2 (capture + paywall + checkout) are what make money; the delight features (§A.6) amplify a funnel that already converts. Build in the phase order in §B.8.

### B.1 Data model — `lib/db/src/schema/`

Add new tables (new files under `schema/`, exported from the schema index) and a few columns to existing ones. Then `pnpm --filter @workspace/db run push`.

**Extend existing tables:**

- `users`: add `plan` (`'free' | 'plus'`, default `'free'`), `plan_status` (`active|trialing|past_due|canceled`), `plan_renews_at`, `billing_provider`, `billing_customer_id`, `country` (for PPP + tax), `locale`.
- `stories`: add `access` (`'free' | 'premium' | 'purchasable'`), `price_cents` (for à-la-carte), `is_featured`/`is_sponsored` (bool) for merchandising, `preview_chapter_count` (default 1), `rating_avg`, `rating_count`, `listen_count`, `author_id` (FK to a new `authors`/`users` row for the marketplace).
- `audio_segments`: add `is_preview` (bool) — the flag the paywall reads. Preview segments are servable to everyone; the rest require entitlement.

**New tables:**

- `subscriptions` — `id, user_id, provider, provider_subscription_id, plan, status, current_period_end, created_at`. Source of truth synced from billing webhooks.
- `entitlements` — `id, user_id, story_id (nullable = whole-library), source ('subscription'|'purchase'|'grant'), expires_at (nullable)`. The single table the paywall checks. A Plus subscription creates a library-wide entitlement; a story purchase creates a per-story one.
- `orders` / `purchases` — `id, user_id, story_id (nullable), kind ('story'|'credit_pack'|'gift'|'tip'), amount_cents, currency, provider, provider_payment_id, status, gift_recipient_email (nullable), created_at`.
- `credits` — `user_id, balance` (+ a `credit_ledger` for auditability).
- `tips` — `id, from_user_id, story_id/author_id, amount_cents, message, created_at` (drives supporter badges).
- `referrals` — `id, referrer_user_id, code, referred_user_id (nullable), reward_status`.
- `email_subscribers` — `id, email, locale, source ('newsletter'|'chapter_gate'|'waitlist'|'exit_intent'), user_id (nullable), confirmed, created_at`. Your owned-audience asset; capture even from logged-out visitors.
- `ratings` / `reviews` — `id, user_id, story_id, stars, body, created_at`.
- `analytics_events` — `id, user_id (nullable), anon_id, name, props (jsonb), created_at` (funnel measurement; or offload to PostHog — see §B.7).
- `sponsorships` / `ad_slots` — optional, for stream 4: `id, story_id/slot, sponsor_name, audio_url, active, starts_at, ends_at`.

### B.2 API contract — `lib/api-spec` (then run codegen)

Add these paths to the OpenAPI spec, regenerate Zod + React Query hooks, then implement server-side. Group them by route file they'll land in.

- **Billing** (`/api/billing/*`): `POST /billing/checkout` (create a subscription or one-time checkout session, returns provider redirect URL), `POST /billing/portal` (customer portal link for managing/canceling), `POST /billing/webhook` (provider → server; **not** codegen'd as a typed client call — raw body, signature-verified), `GET /me/entitlements` (what the current user can access).
- **Purchases** (`/api/purchases/*`): `POST /purchases/story` (buy/unlock one story via credits or checkout), `POST /purchases/gift`, `GET /me/credits`, `POST /purchases/credits` (buy a pack).
- **Tips** (`/api/tips`): `POST /tips` (tip a story/author).
- **Growth** (`/api/*`): `POST /newsletter/subscribe`, `POST /referrals` (get my code) + `POST /referrals/redeem`, `POST /stories/{id}/ratings`, `GET /stories/{id}/ratings`.
- **Reader gating**: extend the existing story/reader endpoints in `stories.ts` so segment responses respect entitlement (see B.4) — often no new *path*, just a changed response shape (`locked: true`, preview URLs only).

### B.3 Backend — payments, provider-agnostic — `artifacts/api-server/src/routes/billing.ts` (new)

Create a `PaymentProvider` interface (`createCheckout`, `createPortalSession`, `verifyWebhook`, `parseEvent`) with a concrete impl (start with **Paddle** or **Lemon Squeezy** for hands-off global tax, or **Stripe** if you prefer to own it — A.4). The webhook handler is the heart: on `subscription.active/updated/canceled` → upsert `subscriptions` + `users.plan` + a library-wide `entitlements` row; on one-time `payment.succeeded` → create the per-story `entitlements` row or credit the account; on `refund` → revoke. Verify signatures, make handlers **idempotent** (store `provider_event_id`), and log via `req.log`. Add the provider secret to Replit secrets (never commit) alongside `ELEVENLABS_API_KEY`.

### B.4 Backend — the paywall / entitlements middleware (the crux) — `artifacts/api-server`

This is the change that actually earns money. Implement an `entitlements` helper + middleware:

1. A function `getEntitlement(userId, storyId)` that checks `entitlements` for a matching library-wide or per-story, unexpired row (plus a free monthly-unlock allowance counter for logged-in free users).
2. In `stories.ts`, wherever `audio_segments` are returned to the Reader: if the requester **is not entitled** to that story, return **only** segments where `is_preview = true` (the first `preview_chapter_count` chapters / first N segments), and mark the rest `{ locked: true }` with **no audio URL**. Do the same for any per-segment audio-fetch endpoint — a locked segment's audio must 402/403, not stream.
3. Keep text fully readable for everyone (text is the free hook; audio is the paid product) — unless you later decide to gate whole premium stories, in which case gate at the chapter/story level using the same `access` field.

Because audio is generated once and served many times (A.1), this middleware is the *entire* difference between "free forever" and "recurring revenue." Get it right and test it with a free account, a trialing account, a per-story purchaser, and a lapsed subscriber.

### B.5 Backend — growth & community endpoints — `artifacts/api-server/src/routes/`

- Extend `me.ts` for `/me/entitlements`, `/me/credits`, referral code, and supporter status.
- New `growth.ts` (or fold into a public router): `newsletter/subscribe` (writes `email_subscribers`, fires a welcome email), `referrals` redeem (grants trial days by inserting a time-boxed `entitlements` row), ratings create/list.
- New `tips.ts`: create a tip (via checkout/credits), insert `tips`, grant supporter badge.
- Email/lifecycle: integrate a transactional + broadcast email provider (Resend/Postmark/Loops) for welcome, weekly-new-story, trial-ending, and win-back sequences. Store minimal state; let the ESP own sequencing where possible.

### B.6 Frontend — `artifacts/hikaya/src/`

Use the generated React Query hooks (from codegen) for all new calls. New/changed pieces:

- **`components/Paywall.tsx`** (new) — the contextual upgrade modal: annual-first, 7-day-trial CTA, shows what Plus unlocks (full cast, offline, no ads, soundscapes). Triggered when a free user hits a locked segment in the Reader.
- **`pages/Pricing.tsx`** (new) — plans page with monthly/annual toggle and PPP-aware prices (read region from `users.country` / IP), FAQ, trust signals. Route it in `App.tsx`.
- **`components/StickyAudioPlayer.tsx`** (extend) — add speed control, sleep timer, background/lock-screen playback (MediaSession API), and a **locked state** that opens the Paywall instead of playing a locked segment. Add karaoke line/word highlighting synced to segment timing (A.6).
- **`pages/Reader.tsx`** (extend) — render `locked` segments with a blurred/CTA state; surface "Continue listening" and progress (from `reading_progress`).
- **`pages/StoryDetail.tsx`** (extend) — **character voice previews** (tap a character → play a sample), ratings/reviews block, a tip button, share buttons + OG cards, and a clear free-vs-Plus indicator.
- **`pages/Profile.tsx`** (extend) — billing/account section (plan status, manage/cancel via portal link, credits balance, supporter badge, referral code + share).
- **Capture components** — `NewsletterInline`, `ChapterEndGate` (email/CTA when a guest finishes a free chapter), `ExitIntentModal`. Wire these to `newsletter/subscribe`.
- **`pages/Home.tsx`** (extend) — wire "Browse by category" and "Fresh from the press" to real endpoints, add a "Continue listening" row for signed-in users, and a featured/sponsored slot.
- **Guest mode** — allow reading + previews with progress in `localStorage`; prompt account creation ("keep your progress") at the invested moment.

### B.7 Auth friction — the highest-ROI capture fix — `lib/replit-auth-web` + `artifacts/api-server/src/routes/auth.ts`

Replit Auth (OIDC) is the wrong front door for a consumer product. Add **email magic-link** and **Google/Apple** sign-in so a visitor can create an account in one tap at the moment they're hooked. Keep the existing first-user→`super_admin` promotion logic (the Postgres advisory-lock transaction) intact — just add providers feeding the same `users` table. This can be additive (keep Replit Auth for admin, add consumer auth for readers) to de-risk the change. Also add lightweight **analytics** (PostHog is the fast path — funnels, retention, and A/B out of the box; or the `analytics_events` table from B.1 if you want to own the data). You cannot optimize the funnel you can't measure.

### B.8 Suggested build phases (ship revenue first)

**Phase 1 — Capture + measure (week 1–2).** Auth friction fix (B.7), guest mode, email capture components + `email_subscribers` + newsletter endpoint, analytics/PostHog, SEO/OG/hreflang on story + library pages. *Outcome: you stop leaking visitors and can see the funnel.*

**Phase 2 — The money layer (week 2–4).** `is_preview` flag + entitlements middleware/paywall (B.4), billing provider + checkout + webhooks (B.3), Pricing page + Paywall modal, subscription + per-story purchase. *Outcome: Hikāya can take money.*

**Phase 3 — Convert & retain (week 4–6).** Trials, annual-first paywall, referrals, gifting, tips + supporter badge, lifecycle emails, "Continue listening," streaks. *Outcome: conversion and renewal go up.*

**Phase 4 — Delight & moat (week 6+).** Karaoke highlighting, character voice previews, soundscapes (premium), ratings/reviews, recommendations, author pages, then the **creator marketplace** and **institutional licences**. *Outcome: differentiation, virality, and platform scale.*

### B.9 One-line brief to paste into a Fable 5 session

> Implement the Hikāya monetization plan (this document) against `github.com/Zakaria-Aburawais/hikaya`, in phase order. Contract-first: edit `lib/api-spec` → run `pnpm --filter @workspace/api-spec run codegen` → implement server routes with generated Zod validation and client with generated React Query hooks. Start with Phase 1 (auth-friction fix, guest mode, email capture, analytics, SEO). Gate all audio entitlements **server-side** in `artifacts/api-server` — free users get `is_preview` segments only. Keep billing behind a provider-agnostic interface. Run `pnpm run typecheck` before every commit; no `console.log` on the server (use `req.log`). Do not touch the first-user→super_admin promotion logic.

---

## Metrics to watch (so you know it's working)

Visitor→email capture rate, email→account rate, account→trial rate, trial→paid rate, free→paid conversion (target the upper end of the 1–5% consumer band), annual mix %, monthly churn, average revenue per user, and story-level listen-completion (your best content-quality and recommendation signal).

## Risks & honest caveats

- **Don't over-wall the magic.** The multi-voice audio *is* the wow — give enough of it free that people fall in love before you ask them to pay. A too-tight preview kills conversion faster than a generous one costs you.
- **Payments/tax are the operationally hardest part** for a solo global operator — the MoR recommendation (A.4) exists specifically to remove that burden; don't hand-roll tax.
- **Auth migration is delicate.** Add consumer auth additively rather than ripping out Replit Auth in one shot, and preserve the admin-promotion logic.
- **Content licensing.** As you open a marketplace or ingest third-party PDFs, make sure you have the rights to voice and sell them — bake rights/consent into the upload flow.

---

*Sources: [ElevenLabs pricing breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown) · [ElevenLabs API pricing](https://elevenlabs.io/pricing/api) · [Freemium conversion benchmarks](https://www.withdaydream.com/library/insights/freemium-conversion-rate) · [Stripe alternatives 2026 (Paddle)](https://www.paddle.com/alternatives/stripe) · [Stripe supported countries & MENA gaps](https://dodopayments.com/blogs/stripe-supported-countries-alternatives)*
