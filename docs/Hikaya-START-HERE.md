# Hikāya — START HERE (master index)

This is the complete package to turn Hikāya into a business that makes money. Everything lives in the **Hikāya project** and as downloadable files. Work top to bottom.

## The documents

1. **Hikaya-Monetization-Growth-Plan.md** — the strategy. *Why* each decision (monetization models, pricing, funnel, positioning, unit economics). Read this first to understand the thinking.

2. **Hikaya-Implementation-Code.md** — all the code, in 4 phases, mapped to your repo. This is what you hand to Claude Code to build. Every `🔧 RECONCILE` marker = match it to your real file.

3. **CLAUDE.md** — put this in your repo root. Claude Code reads it every session so you never re-explain the project, the rules, or the roadmap.

4. **Hikaya-PR-Templates.md** — a ready-to-paste description + test checklist for each of the 9 PRs. Ship one PR at a time.

5. **Hikaya-Copy-and-Localization.md** — every customer-facing word (pricing, paywall, capture prompts) as a drop-in i18n file in all six languages, plus the full lifecycle email set.

6. **Hikaya-Stripe-and-Pricing-Setup.md** — the operational steps to actually take money: PPP pricing table, Stripe products/prices/tax/portal/webhook, test cards, go-live checklist.

7. **Hikaya-Legal-Essentials.md** — Terms, Privacy, Refund policy templates (needed before processors let you charge). Fill placeholders; have a lawyer review.

8. **Hikaya-GoToMarket-and-KPIs.md** — how to get users and revenue: channels, content engine, 30-60-90 plan, KPI targets, pricing experiments.

9. **Hikaya-Reconciliation-and-Corrections.md** — ⭐ read alongside #2. The implementation code was reconciled against your *live* repo. This doc gives the exact real values (package names, `varchar` UUID PKs, `req.user.id`, `openapi.yaml`, `useI18n` flat keys) and replaces the blocks that differ — most importantly the paywall, which gates per-chapter at your `GET /api/audio/:chapterId/:idx` endpoint (currently ungated) because audio is stored as `bytea` in the DB. When building, tell Claude Code: *"apply #2 but use #9 for exact values and corrected blocks."*

## The critical path to first revenue

1. Drop `CLAUDE.md` in the repo root and the other docs in `docs/`. Commit.
2. In Claude Code, build **PRs 1–3** (capture: analytics, email, magic-link auth, guest mode, SEO) using the code doc + PR templates.
3. Build **PRs 4–6** (the money layer: paywall, Stripe, pricing page) — follow the Stripe setup guide alongside.
4. Fill in and publish the **legal pages**; flip Stripe to live mode using the go-live checklist.
5. Paste the **localized copy** into the components; wire the emails.
6. Run the **go-to-market 30-60-90 plan** — capture email from day one, ship one voiced story a week, seed communities, launch.
7. Build **PRs 7–9** (referrals, tips, ratings, streaks, delight) to compound conversion and word-of-mouth.

## The two rules you must never break

- **The audio paywall is enforced server-side.** A free user must be physically unable to fetch premium audio URLs. Client-side locks are bypassable and would give the product away.
- **Don't touch the first-user→`super_admin` promotion logic** in `auth.ts`. New sign-in methods feed the same `users` table without changing that flow.

## Why the economics work

Audio is generated **once** and served to unlimited listeners, so a story costs ~$5–15 of ElevenLabs one time and then earns forever. A single $49 annual subscriber covers the audio of several whole stories. The margins are already excellent — the entire game is capturing attention and converting it. That's what this whole package is built to do.
