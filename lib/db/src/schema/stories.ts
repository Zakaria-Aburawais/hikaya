import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const storiesTable = pgTable(
  "stories",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug").notNull(),
    title: varchar("title").notNull(),
    description: text("description").notNull().default(""),
    coverImage: text("cover_image"),
    language: varchar("language").notNull().default("en"),
    category: varchar("category").notNull().default("general"),
    type: varchar("type").notNull().default("story"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: varchar("status").notNull().default("draft"),
    videoUrl: text("video_url"),
    accentColor: varchar("accent_color").notNull().default("#8b5cf6"),
    uploadedBy: varchar("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("stories_slug_idx").on(t.slug)],
);

export const charactersTable = pgTable(
  "characters",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    role: varchar("role").notNull().default("character"),
    voiceId: varchar("voice_id").notNull(),
    tone: varchar("tone").notNull().default("neutral"),
    color: varchar("color").notNull().default("#e8c97e"),
    stability: integer("stability").notNull().default(50),
    similarity: integer("similarity").notNull().default(75),
    style: integer("style").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("characters_story_idx").on(t.storyId)],
);

export const chaptersTable = pgTable(
  "chapters",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    title: varchar("title").notNull(),
    content: text("content").notNull().default(""),
    segments: jsonb("segments").notNull().default(sql`'[]'::jsonb`),
    durationSec: integer("duration_sec").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("chapters_story_number_idx").on(t.storyId, t.chapterNumber),
  ],
);

export const audioSegmentsTable = pgTable(
  "audio_segments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    chapterId: varchar("chapter_id")
      .notNull()
      .references(() => chaptersTable.id, { onDelete: "cascade" }),
    segmentIndex: integer("segment_index").notNull(),
    audio: bytea("audio").notNull(),
    mimeType: varchar("mime_type").notNull().default("audio/mpeg"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("audio_chapter_idx").on(t.chapterId, t.segmentIndex),
  ],
);

export const readingProgressTable = pgTable(
  "reading_progress",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storyId: varchar("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull().default(1),
    progressPercent: integer("progress_percent").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("progress_user_story_idx").on(t.userId, t.storyId)],
);

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storyId: varchar("story_id")
      .notNull()
      .references(() => storiesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bookmark_user_story_idx").on(t.userId, t.storyId)],
);

export type Story = typeof storiesTable.$inferSelect;
export type Character = typeof charactersTable.$inferSelect;
export type Chapter = typeof chaptersTable.$inferSelect;
export type AudioSegment = typeof audioSegmentsTable.$inferSelect;
export type ReadingProgress = typeof readingProgressTable.$inferSelect;
export type Bookmark = typeof bookmarksTable.$inferSelect;

export type ChapterSegment = {
  index: number;
  kind: "narrator" | "dialogue" | "scene";
  characterId: string | null;
  characterName: string;
  emotion: string;
  text: string;
};
