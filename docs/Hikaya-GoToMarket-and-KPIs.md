# Hikāya — Go-to-Market Playbook & KPIs

Building the product earns nothing until people find it and pay. This is how to get the first users and the first revenue, what to measure, and how to sequence it over the first 90 days. Pairs with the strategy plan and the code package.

---

## 1. Positioning (the one sentence everything hangs on)

> **Hikāya turns stories into full-cast audio dramas you can read and hear at once — in six languages.**

That single idea is the wedge. No mainstream audiobook app does multi-voice + synced text + six languages. Lead with it in every headline, store listing, and social clip. Three audiences hear it differently, and that's the point:

- **Immersive-reading / audiobook fans** — "more than one flat narrator."
- **Language learners** — "hear native voices while you read." (Large, motivated, pays for study tools.)
- **Arabic & RTL readers** — an underserved market where your RTL-first build is a genuine edge.

Don't dilute the message trying to name all three. Lead with the audio-drama magic; each audience self-selects.

---

## 2. The channel plan (ranked by fit)

**A. SEO — your biggest long-term asset (start day 1).**
Six languages = six times the organic real estate, and story pages are evergreen. Each published story should be an indexable page per language with the JSON-LD, OG cards, and `hreflang` from the code package. Target long-tail intent: "listen to {story} in Arabic," "{classic} audio drama," "read and listen {language}." Publish a steady stream of story pages + a blog (author spotlights, "best short stories to listen to in {language}"). This compounds while you sleep and costs nothing but content.

**B. Short-form audio-snippet social (highest virality).**
Your product is inherently clippable. Auto-generate 15–30s vertical clips: the best voiced line, text animating in sync (karaoke highlight), cover art, "🎧 Hikāya" watermark, link in bio. Post to TikTok, Instagram Reels, YouTube Shorts, and X. One clip per new story, per language where you have reach. This is the cheapest way to show — not tell — what makes Hikāya different. (Higgsfield/CapCut can batch these.)

**C. Communities (fast, free, targeted).**
Go where each audience already gathers: language-learning subreddits/Discords (r/languagelearning, r/learnarabic, r/French…), Arabic literature and audiobook groups, immersive-reading and "study with me" communities, and teacher groups (the education angle). Show up with value (share a free story, not a pitch). Seed the first 100 users by hand.

**D. Launch moments.**
A Product Hunt / Hacker News "Show HN" launch once the paywall + a dozen polished stories are live. Line up the audio-snippet clips, a 60-second demo video, and the first-week free-Plus code to convert the traffic spike. Re-launch each major feature (karaoke sync, marketplace).

**E. Partnerships & influencers.**
Language teachers and "learn X with stories" creators are perfect affiliates — give them free Plus + a referral cut. Approach small publishers and independent authors for the marketplace (they bring their own audiences). Libraries and schools for the institutional tier.

**F. Paid ads — later, only after the funnel converts.**
Don't buy traffic until PostHog shows a healthy free→paid rate. Then test small on Meta/TikTok with the winning organic clips as creative, targeting language-learners and audiobook interests. Kill anything that doesn't beat organic CAC.

---

## 3. Content engine (the flywheel)

Each new story should trigger a repeatable checklist so every release does quadruple duty (catalog + SEO + social + email):

1. Publish the story (free opening chapter, rest gated).
2. Ship its SEO page(s) with structured data, per language.
3. Cut 1–3 audio-snippet clips → schedule across social.
4. Feature it in the weekly newsletter (subject lines are in the copy pack).
5. Add it to a themed collection ("Voices of Andalusia," "5-minute bedtime tales").

Cadence: **one new full-cast story per week** is enough to sustain the newsletter, social, and SEO engine without burning out. Quality of narration > quantity.

---

## 4. First-100-users motion (before any spend)

- Personally seed stories into 5–10 relevant communities.
- DM 20 language teachers/creators offering free Plus in exchange for honest feedback + a share.
- Post 3 audio clips before launch to warm up social accounts.
- Turn on the newsletter capture from day 1 — even pre-launch traffic becomes a launch-day audience.
- Ask every early user one question: "what nearly stopped you from listening?" — that's your conversion roadmap.

---

## 5. 30-60-90 day plan

**Days 0–30 — Foundation & capture.**
Ship PRs 1–3 (analytics, email capture, magic-link auth, guest mode, SEO). Polish 8–12 stories with great narration and preview chapters. Set up social accounts, post first clips, start the newsletter, seed communities. *Goal: measurable funnel + first 200–500 emails.*

**Days 30–60 — Turn on revenue.**
Ship PRs 4–6 (entitlements paywall, Stripe, pricing page, paywall modal). Publish Terms/Privacy/Refunds and go live with payments. Weekly story cadence running. Soft-launch to your email list and communities. *Goal: first paying subscribers; validate free→paid > ~1.5%.*

**Days 60–90 — Convert, retain, amplify.**
Ship PRs 7–8 (referrals, gifting, tips, ratings, streaks, lifecycle emails). Do the Product Hunt launch with clips + demo. Start A/B tests on the paywall and pricing. Begin outreach to teachers/authors for the marketplace and one pilot school/library. *Goal: referral loop live, churn understood, a repeatable acquisition channel identified.*

Then: double down on whatever channel showed the best CAC, and start the marketplace/institutional tracks (PR 9 delight features run in parallel as marketing fuel).

---

## 6. KPI dashboard (what to watch, with targets)

Build these as PostHog funnels/insights. Targets are launch-stage starting points, not guarantees — beat them over time.

**Acquisition & capture**
- Visitor → email capture: **target 4–8%**
- Visitor → account: **target 3–6%**
- Traffic by channel & language (find your winning channel)

**Activation**
- New user → opened a story: **> 70%**
- New user → finished a preview chapter: **> 40%** (the "aha")

**Conversion**
- Account → trial start: **target 8–15%**
- Trial → paid: **target 40–60%**
- Overall free → paid: **target 1–5%** (push the upper end via funnel work)
- Annual mix of new subs: **target > 50%** (cash + retention)

**Revenue & retention**
- MRR and its growth rate
- ARPU and blended LTV
- Monthly churn: **keep < 5–7%**
- Refund rate: **keep < 2%**

**Engagement (leading indicators of retention)**
- Weekly active listeners / minutes listened
- Story completion rate (also your best recommendation & content-quality signal)
- Referral coefficient (invites sent × acceptance)

Instrument the exact event names already in the code: `story_opened`, `preview_finished`, `paywall_shown`, `checkout_started`, `purchase_completed`.

---

## 7. Pricing & paywall experiment roadmap

Once you have ~1,000 visitors/week to test on, run these one at a time (PostHog experiments):

1. **Preview generosity:** 1 free chapter vs 2 vs "first 2 minutes of audio." Under-walling usually *raises* conversion for content people fall in love with — test it.
2. **Paywall framing:** trial-first vs price-first vs "unlock just this story"-first.
3. **Annual anchor:** annual-default toggle vs monthly-default.
4. **Trial length:** 7 vs 14 days.
5. **PPP depth:** how much emerging-market discount maximizes revenue, not just signups.
6. **Price points:** $6.99 vs $7.99 monthly; $49 vs $59 annual.

Change one variable at a time, give each test enough sample to reach significance, and let completion-rate and 30-day retention — not just checkout clicks — decide the winner.

---

## 8. The one-paragraph summary

Lead with the audio-drama magic in six languages. Capture email from day one, let people taste stories free, and gate the full cast behind a generous paywall. Grow with SEO (six-language story pages), clippable audio-snippet social, and hand-seeded communities — then add referrals and a Product Hunt moment. Price for global reach with PPP, measure the funnel obsessively in PostHog, and reinvest in the single channel that converts cheapest. The margins are already excellent because audio is generated once and sold forever; the whole game is attention and conversion.
