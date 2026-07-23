// Lifecycle email worker — run daily from a Replit Scheduled Deployment:
//   pnpm --filter @workspace/scripts run lifecycle-emails
//
// Cohorts (windowed so a daily run sends each email roughly once per user):
//  1. trial-ending: trialing users whose renewal lands in the next 2 days
//  2. win-back: canceled users whose access ended 7–14 days ago
//  3. weekly new-story broadcast: newest story published in the last 7 days,
//     sent to newsletter subscribers (only on the configured weekday)
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, usersTable, storiesTable, emailSubscribersTable } from "@workspace/db";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Hikaya <hello@example.com>";
const BASE = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
const BROADCAST_WEEKDAY = 5; // Friday (UTC)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[dry-run] ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error(`send failed for ${to}:`, e);
  }
}

const DAY = 24 * 60 * 60 * 1000;

async function trialEnding() {
  const now = new Date();
  const rows = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.planStatus, "trialing"),
        gte(usersTable.planRenewsAt, new Date(now.getTime() + 1 * DAY)),
        lte(usersTable.planRenewsAt, new Date(now.getTime() + 2 * DAY)),
      ),
    );
  for (const u of rows) {
    if (!u.email) continue;
    await send(
      u.email,
      "Your Hikāya Plus trial ends in 2 days",
      `<p>Hope you're enjoying the full cast. Your free trial ends ${u.planRenewsAt?.toDateString()}.</p>
       <p>Nothing to do to continue — or <a href="${BASE}/profile">manage your plan</a> whenever you like. Either way, the free library is always yours.</p>`,
    );
  }
  console.log(`trial-ending: ${rows.length}`);
}

async function winBack() {
  const now = new Date();
  const rows = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.planStatus, "canceled"),
        gte(usersTable.planRenewsAt, new Date(now.getTime() - 14 * DAY)),
        lte(usersTable.planRenewsAt, new Date(now.getTime() - 7 * DAY)),
      ),
    );
  for (const u of rows) {
    if (!u.email) continue;
    await send(
      u.email,
      "The voices are still here when you're ready",
      `<p>Your Plus access has ended, but your shelf and progress are saved.</p>
       <p><a href="${BASE}/pricing">Reactivate Plus →</a></p>`,
    );
  }
  console.log(`win-back: ${rows.length}`);
}

async function weeklyBroadcast() {
  if (new Date().getUTCDay() !== BROADCAST_WEEKDAY) {
    console.log("weekly: not broadcast day, skipped");
    return;
  }
  const [story] = await db
    .select()
    .from(storiesTable)
    .where(
      and(
        eq(storiesTable.status, "published"),
        gte(storiesTable.createdAt, new Date(Date.now() - 7 * DAY)),
      ),
    )
    .orderBy(desc(storiesTable.createdAt))
    .limit(1);
  if (!story) {
    console.log("weekly: no new story this week, skipped");
    return;
  }
  const subs = await db.select().from(emailSubscribersTable);
  for (const s of subs) {
    await send(
      s.email,
      `This week's voiced story: ${story.title}`,
      `<p>A new full-cast story just landed — ${story.description.slice(0, 140)}</p>
       <p><a href="${BASE}/story/${story.slug}">Listen to the first chapter free →</a></p>
       <p>Prefer to read? It's all there too. See you inside.</p>`,
    );
  }
  console.log(`weekly: sent "${story.title}" to ${subs.length} subscribers`);
}

await trialEnding();
await winBack();
await weeklyBroadcast();
process.exit(0);
