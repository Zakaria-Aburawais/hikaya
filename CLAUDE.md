# CLAUDE.md — Hikāya

Standing instructions for Claude Code working in this repo. Read this first, every session.

## What this project is

Hikāya (Arabic for "story") is a cinematic, multilingual storytelling web platform. Users read stories chapter-by-chapter while listening to AI-generated, multi-voice audio narration — each character voiced by a distinct ElevenLabs voice, like an audio drama. Six UI languages (ar, en, fr, nl, es, de); Arabic is fully RTL.

## Architecture (pnpm monorepo, TypeScript 5.9, Node 24)

```
artifacts/
├── hikaya/         # React 18 + Vite frontend (the website)
├── api-server/     # Express 5 backend
└── mockup-sandbox/ # internal component preview (not shipped)
lib/
├── db/                # Drizzle ORM schema + Postgres client
├── api-spec/          # OpenAPI spec — SOURCE OF TRUTH for the API
├── api-zod/           # generated Zod schemas (Orval)
├── api-client-react/  # generated React Query hooks (Orval)
└── replit-auth-web/   # shared auth hook for the frontend
scripts/            # utilities, incl. seed-hikaya
```

- **Frontend** `artifacts/hikaya`: routing via `App.tsx` (wouter-style), pages in `src/pages/` (Home, Library, StoryDetail, Reader, Shelf, Profile, admin/*), shared components (`Header`, `BottomNav`, `StickyAudioPlayer`, `StoryCard`, `ui/`). i18n + RTL in `src/lib`/`src/hooks`. Calls the API with relative URLs through a reverse proxy (`/api`).
- **Backend** `artifacts/api-server`: routes in `src/routes/` — `stories.ts` (public library/reader), `auth.ts` (OIDC + first-user promotion), `admin.ts` (PDF upload, script annotation, voice assignment, audio generation), `me.ts` (profile, shelf, progress, bookmarks), `health.ts`. Script parsing in `src/lib/script-parser.ts`.
- **DB** PostgreSQL + Drizzle. Tables: `users`, `sessions`, `stories`, `characters`, `chapters`, `audio_segments`, `reading_progress`, `bookmarks`.
- **Audio** ElevenLabs API. Each annotated script line → an `audio_segments` row, keyed to a character's voice. Audio is generated once (admin) and served to unlimited readers.
- **Auth** Replit Auth (OIDC). Roles `user` / `super_admin`. The first user to sign in is promoted to `super_admin` in a transaction with a Postgres advisory lock.

## Non-negotiable rules

1. **Contract-first.** Change the API by editing `lib/api-spec` → run `pnpm --filter @workspace/api-spec run codegen` → the server validates with the generated Zod schemas, the client uses the generated React Query hooks. Never hand-write request/response types that the spec should own.
2. **Enforce paywall / entitlements on the SERVER.** Any premium content gate (audio segments) must be enforced in `artifacts/api-server`. The frontend may only *reflect* lock state. Never return a premium `audioUrl` to an unentitled user; a per-segment audio endpoint must return 402/403 when locked. Client-side gating is not acceptable.
3. **Do NOT modify the first-user→`super_admin` promotion logic** in `auth.ts` (the advisory-lock transaction). New auth methods must feed the same `users` table without changing that flow.
4. **No `console.log` on the server.** Use `req.log` / the shared `logger`.
5. **Secrets** (`ELEVENLABS_API_KEY`, `SESSION_SECRET`, `DATABASE_URL`, and any new payment/email keys) live in Replit environment secrets — never commit them.
6. **The Stripe webhook needs the raw request body.** Mount the billing webhook route before any global `express.json()`, or exclude its path from JSON parsing.

## Commands

```bash
pnpm run typecheck                                   # canonical full check — run before every commit
pnpm --filter @workspace/db run push                 # push Drizzle schema changes
pnpm --filter @workspace/api-spec run codegen        # regenerate Zod + React Query hooks after spec change
pnpm --filter @workspace/scripts run seed-hikaya     # seed 3 demo stories
```

## Definition of done (every change)

- `pnpm run typecheck` passes at the root.
- If schema changed → pushed. If the API spec changed → codegen run and both server + client use the generated artifacts.
- No `console.log` on the server; secrets not committed.
- Entitlement gates (if touched) verified server-side with a free account, a trialing account, a per-story purchaser, and a lapsed subscriber.

## Current roadmap — monetization, capture & engagement

The full plan and all implementation code live in two docs (in the repo `docs/` folder or the Hikāya project):
`Hikaya-Monetization-Growth-Plan.md` (strategy + spec) and `Hikaya-Implementation-Code.md` (all code).

Build in this order — each item is one shippable PR (see the PR templates):

1. Analytics + email capture + newsletter endpoint
2. Guest mode + magic-link auth (front-door fix; keep Replit Auth for admin)
3. SEO meta + JSON-LD + sitemap
4. Billing schema + entitlements + preview flag
5. Stripe provider + checkout/portal/webhook
6. Pricing page + paywall modal + player gating
7. Tips + referrals + gifting
8. Ratings + streaks + lifecycle emails
9. Karaoke highlighting + voice previews + soundscapes

PRs 1–6 make Hikāya capture visitors and take money; 7–9 compound it. When implementing from `Hikaya-Implementation-Code.md`, every `// 🔧 RECONCILE:` marker means: match that line to the actual file (import paths, real column names, the existing session mechanism, generated-hook names).

## House style

- Match existing patterns in neighboring files over introducing new ones.
- Keep changes minimal and scoped to the PR; don't refactor unrelated code.
- Respect RTL: any new UI must render correctly in Arabic (logical properties, no hard-coded left/right).
- Prefer the generated React Query hooks for new API calls; a thin `fetch` is acceptable only until the spec/codegen catches up, and should be flagged.
