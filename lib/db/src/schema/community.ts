import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { storiesTable } from "./stories";

export const tipsTable = pgTable(
  "tips",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    fromUserId: varchar("from_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storyId: varchar("story_id").references(() => storiesTable.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tips_from_user_idx").on(t.fromUserId)],
);

export const referralsTable = pgTable(
  "referrals",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    referrerUserId: varchar("referrer_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    code: varchar("code").notNull().unique(),
    referredUserId: varchar("referred_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    rewardStatus: varchar("reward_status").notNull().default("pending"), // pending | granted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Plain index: the code-holder row has referredUserId null; each redemption
  // inserts an additional row for the same referrer.
  (t) => [index("referrals_referrer_idx").on(t.referrerUserId)],
);

export const ratingsTable = pgTable(
  "ratings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storyId: varchar("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(), // 1..5
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ratings_user_story_idx").on(t.userId, t.storyId)],
);

// One row per (user, active day) — reading_progress is upserted per story so it
// cannot reconstruct daily history; this table backs the streak counter.
export const activityDaysTable = pgTable(
  "activity_days",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    day: varchar("day").notNull(), // "YYYY-MM-DD" (UTC)
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export type Tip = typeof tipsTable.$inferSelect;
export type Referral = typeof referralsTable.$inferSelect;
export type Rating = typeof ratingsTable.$inferSelect;
