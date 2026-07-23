# Hikāya — PR description templates

One template per shippable PR, matching the commit order in `Hikaya-Implementation-Code.md`. Copy the block into the PR body, tick the boxes as you go, and delete lines that don't apply. Every PR shares this baseline:

**Baseline checklist (all PRs)**
- [ ] `pnpm run typecheck` passes at root
- [ ] Schema changes pushed (`pnpm --filter @workspace/db run push`) if applicable
- [ ] Spec changes ran codegen (`pnpm --filter @workspace/api-spec run codegen`) if applicable
- [ ] No `console.log` on the server (used `req.log`)
- [ ] No secrets committed
- [ ] New UI verified in Arabic/RTL

---

## PR 1 — feat: analytics + email capture + newsletter endpoint

**Why:** Stop leaking visitors and start measuring the funnel. Adds owned-audience email capture and PostHog instrumentation. (Plan §1.1–1.2)

**What changed**
- PostHog client init + `track`/`identify` helpers (`artifacts/hikaya/src/lib/analytics.ts`), initialized in `main.tsx`.
- New `email_subscribers` table + schema barrel export.
- `POST /newsletter/subscribe` (OpenAPI → codegen → server route with Zod validation).
- Resend email util + fire-and-forget welcome email.
- Capture components: `NewsletterInline`, `ChapterEndGate`, `ExitIntentModal`; placed on Home, Reader (end of free chapter), and app shell.

**Test**
- [ ] Submitting the form inserts a row and does not error on duplicate email
- [ ] Welcome email sends (or logs a handled failure) without blocking the response
- [ ] `newsletter_submitted`, `story_opened` events appear in PostHog
- [ ] Env: `RESEND_API_KEY`, `EMAIL_FROM`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` set

---

## PR 2 — feat: guest mode + magic-link auth

**Why:** Replit Auth is the wrong front door for readers. Let people try without an account, then sign in in one tap. (Plan §1.3–1.4)

**What changed**
- Guest reading progress in `localStorage` (`guest-progress.ts`); migrated into `reading_progress` on sign-in.
- Passwordless magic-link flow (`auth-magic.ts`): request link → signed JWT (15 min) → verify → upsert `users` → start session. `SignInDialog` on the frontend.
- Replit Auth retained for admin.

**Test**
- [ ] Guest can read + preview and see progress persist across reloads
- [ ] Magic link creates/logs in a user and starts a valid session
- [ ] Expired/invalid token is rejected cleanly
- [ ] **First-user→`super_admin` promotion logic in `auth.ts` untouched**
- [ ] Env: `MAGIC_LINK_SECRET`, `APP_BASE_URL` set

---

## PR 3 — feat: SEO meta + JSON-LD + sitemap

**Why:** Six languages = six times the organic surface. Make story pages indexable and share beautifully. (Plan §1.5)

**What changed**
- `StorySeo` component: per-page title/description, Open Graph + Twitter cards, `Audiobook` JSON-LD, `lang`/`hreflang`.
- Generated `sitemap.xml` route (one entry per story per language).
- Story data fetchable without auth so crawlers see content.

**Test**
- [ ] Story page renders correct OG tags + JSON-LD (validate in a rich-results tester)
- [ ] `sitemap.xml` lists published stories across languages
- [ ] RTL/Arabic pages set `lang="ar"` and `dir` correctly
- [ ] (If SPA indexing is weak) pre-render/SSR decision noted in the PR

---

## PR 4 — feat: billing schema + entitlements + preview flag

**Why:** The data foundation for the paywall. No user-facing change yet. (Plan §2.1–2.4)

**What changed**
- New tables: `subscriptions`, `entitlements`, `orders`, `credits`, `processed_events`.
- Columns added to `users` (plan/billing/free-unlock counters), `stories` (access/price/merchandising/rating/listen), `audio_segments` (`is_preview`).
- `entitlements.ts` service (`isEntitled`, `tryConsumeFreeUnlock`).
- Backfill script `scripts/src/mark-previews.ts` to set `is_preview` on the first N chapters.

**Test**
- [ ] `push` succeeds; existing data intact (defaults sensible)
- [ ] `isEntitled` returns correctly for library-wide vs per-story vs expired grants
- [ ] Backfill marks preview segments for every seeded story
- [ ] Free monthly-unlock counter resets across the month boundary

---

## PR 5 — feat: Stripe provider + checkout/portal/webhook

**Why:** Take money. Provider-agnostic interface with a concrete Stripe implementation. (Plan §2.5–2.6)

**What changed**
- `PaymentProvider` interface + `stripeProvider` (checkout, portal, signature-verified webhook parsing).
- `billing.ts` routes: `POST /billing/checkout` (subscription), `POST /purchases/story` (one-time), `POST /billing/portal`, `POST /billing/webhook` (raw body, idempotent via `processed_events`).
- Webhook maps events → `users.plan`, `subscriptions`, `orders`, and `entitlements` rows.

**Test**
- [ ] `stripe listen`/CLI: subscription active → library entitlement created, `users.plan = plus`
- [ ] One-time story payment → per-story entitlement + `orders` row
- [ ] Duplicate webhook delivery is a no-op (idempotency)
- [ ] Bad signature rejected with 400
- [ ] **Webhook route mounted before global `express.json()`** (raw body intact)
- [ ] Cancellation downgrades + expires the library entitlement
- [ ] Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PLUS_ANNUAL` set

---

## PR 6 — feat: pricing page + paywall modal + player gating

**Why:** Turn entitlements into revenue at the moment of desire. (Plan §2.3, §2.7)

**What changed**
- Reader/segments endpoint filters by entitlement: unentitled users get preview segments only, `audioUrl: null` + `locked: true` on the rest; per-segment audio endpoint returns 402 when locked.
- `Pricing.tsx` (`/pricing`, annual-first, 7-day trial) routed in `App.tsx`.
- `Paywall.tsx` modal (upgrade or buy-just-this-story); `StickyAudioPlayer` opens it instead of playing a locked segment.
- Funnel events: `paywall_shown`, `checkout_started`.

**Test**
- [ ] Free user: preview plays, locked segments open the paywall (no audio URL ever sent)
- [ ] Plus user: full playback, no paywall
- [ ] Per-story purchaser: that story unlocked, others still gated
- [ ] Lapsed subscriber: re-gated
- [ ] Checkout redirect works end-to-end; success returns to the right page
- [ ] Paywall renders correctly in RTL

---

## PR 7 — feat: tips + referrals + gifting

**Why:** Warm up first-time payers, add a viral loop, enable gifting demand. (Plan §3.1–3.3)

**What changed**
- `tips` table + `POST /tips` (one-time checkout, `kind: tip`) + supporter badge on tip; `TipButton` with presets.
- `referrals` table + `/referrals/code` and `/referrals/redeem` (give-14-get-14 via time-boxed grants); `?ref=` capture on landing.
- Gifting: `kind: gift` + `giftRecipientEmail`; recipient redeem link → per-story entitlement.

**Test**
- [ ] Tip completes → `tips` row + supporter badge shown
- [ ] Referral code redeems once, grants both sides 14 days, self-referral blocked
- [ ] Gift purchase emails recipient; redeem grants access to the right story
- [ ] All new checkout flows verified against the webhook

---

## PR 8 — feat: ratings + streaks + lifecycle emails

**Why:** Social proof, habit formation, and re-engagement — the retention layer. (Plan §3.4–3.6)

**What changed**
- `ratings` table + create/list routes; recompute `stories.ratingAvg`/`ratingCount`; stars + reviews on StoryDetail; `aggregateRating` added to JSON-LD.
- Reading-streak derivation (`streak.ts`) surfaced on Shelf/Profile.
- Lifecycle emails via Resend: weekly new-story broadcast, trial-ending nudge, win-back; scheduled worker.

**Test**
- [ ] Rating create updates aggregate + shows on page and in rich results
- [ ] Streak counts consecutive active days correctly (incl. today/gap edge cases)
- [ ] Scheduled emails target the right cohorts (trialing near renewal; canceled)

---

## PR 9 — feat: karaoke highlighting + voice previews + soundscapes

**Why:** The demo-able "wow" and premium differentiation. (Plan §4.1–4.4)

**What changed**
- Active-line highlighting synced to the player's segment index; auto-scroll into view. (Optional word-level via stored ElevenLabs timings in an `audio_segments.timings` jsonb column.)
- Character voice previews: `preview_audio_url` per character, playable chips on StoryDetail.
- Cinematic soundscapes: optional `ambienceUrl`, ducked second audio element, gated to Plus.
- Player polish: speed control, sleep timer, MediaSession background/lock-screen playback.

**Test**
- [ ] Highlight tracks the currently playing line; scroll follows
- [ ] Character preview plays the right voice sample
- [ ] Soundscape only for entitled users; ducks correctly under narration
- [ ] Background playback + lock-screen controls work on mobile
- [ ] All new audio respects RTL layout

---

*After PR 6, Hikāya captures visitors and takes money. PRs 7–9 compound conversion, retention, and word-of-mouth.*
