import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { storiesTable } from "./stories";

export const emailSubscribersTable = pgTable("email_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  locale: varchar("locale"),
  source: varchar("source").notNull(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  confirmed: integer("confirmed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id").notNull().unique(),
  plan: varchar("plan").notNull(),
  status: varchar("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entitlementsTable = pgTable(
  "entitlements",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // null storyId = entitlement to the whole library (subscription)
    storyId: varchar("story_id").references(() => storiesTable.id, { onDelete: "cascade" }),
    source: varchar("source").notNull(), // subscription | purchase | grant
    expiresAt: timestamp("expires_at", { withTimezone: true }), // null = no expiry
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entitlements_user_idx").on(t.userId)],
);

export const ordersTable = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  storyId: varchar("story_id").references(() => storiesTable.id, { onDelete: "set null" }),
  kind: varchar("kind").notNull(), // story | credit_pack | gift | tip
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

export type EmailSubscriber = typeof emailSubscribersTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Entitlement = typeof entitlementsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
