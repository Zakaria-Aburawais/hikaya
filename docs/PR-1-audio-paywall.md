# PR: Server-side audio paywall — entitlements + gated audio streaming

## What this does

Closes the biggest revenue leak: `GET /api/audio/:chapterId/:idx` streamed premium audio bytes to anyone, with no auth check. This PR makes the paywall enforceable server-side (package rule #1) per `docs/Hikaya-Reconciliation-and-Corrections.md` (§B–§C).

### Schema (`@workspace/db`)
- `usersTable`: `plan`, `planStatus`, `planRenewsAt`, `billingProvider`, `billingCustomerId`, `country`, `freeUnlocksUsed`, `freeUnlocksResetAt`
- `storiesTable`: `access` (free | premium | purchasable, default **premium**), `priceCents`, `previewChapterCount` (default 1), `isFeatured`, `isSponsored`, `ratingAvg`, `ratingCount`, `listenCount`
- New `lib/db/src/schema/billing.ts`: `email_subscribers`, `subscriptions`, `entitlements`, `orders`, `processed_events` — varchar UUID PKs, `...Table` convention

### Server (`@workspace/api-server`)
- New `src/lib/entitlements.ts`: `isEntitled(userId, storyId)` (story-specific or library-wide, expiry-aware) and `chapterIsPreview(chapterId)`
- `GET /audio/:chapterId/:idx` returns **402 `payment_required`** for non-preview chapters without an active entitlement; admins bypass (admin editor needs draft audio)
- Audio `Cache-Control` changed `public` → `private` so shared caches/CDNs can never serve paywalled bytes past the gate
- Chapter payload: `audioUrl` nulled + `locked: true` on locked segments, and a top-level `unlocked` flag for the reader UI (defense-in-depth only — the 402 is the enforcement)

## Test checklist
- [ ] `pnpm run typecheck` passes (verified locally)
- [ ] Run `pnpm --filter @workspace/db run push` on Replit (needs `DATABASE_URL`)
- [ ] Anonymous request to audio of chapter 1 of a premium story → 200
- [ ] Anonymous request to audio of chapter 2+ → 402
- [ ] Signed-in user with an `entitlements` row (story-specific or storyId NULL) → 200
- [ ] Expired entitlement (`expires_at` in the past) → 402
- [ ] Story with `access = 'free'` → all chapters 200
- [ ] Admin → 200 everywhere, including drafts
- [ ] Reader payload shows `locked: true` / `audioUrl: null` on gated segments

## ⚠️ Do not deploy alone
`access` defaults to `premium` with a 1-chapter preview: pushing the schema locks all existing stories beyond chapter 1 with no way to pay until the Stripe PR lands. Either ship together with Stripe, or first set existing stories to `access = 'free'`.

## Out of scope (needs Hikaya-Implementation-Code.md)
`tryConsumeFreeUnlock` (free monthly unlocks), the frontend paywall modal, Stripe checkout/webhook.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
