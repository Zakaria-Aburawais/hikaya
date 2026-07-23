import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  preferredLanguage: varchar("preferred_language").notNull().default("en"),
  plan: varchar("plan").notNull().default("free"), // free | plus
  planStatus: varchar("plan_status"), // active | trialing | past_due | canceled
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  billingProvider: varchar("billing_provider"),
  billingCustomerId: varchar("billing_customer_id"),
  country: varchar("country"),
  freeUnlocksUsed: integer("free_unlocks_used").notNull().default(0),
  freeUnlocksResetAt: timestamp("free_unlocks_reset_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
