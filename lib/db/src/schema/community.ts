import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, text, timestamp, index } from "drizzle-orm/pg-core";
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

export type Tip = typeof tipsTable.$inferSelect;
export type Referral = typeof referralsTable.$inferSelect;
