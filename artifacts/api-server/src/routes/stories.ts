import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  storiesTable,
  charactersTable,
  chaptersTable,
  audioSegmentsTable,
  readingProgressTable,
  bookmarksTable,
} from "@workspace/db";
import { isEntitled, chapterIsPreview } from "../lib/entitlements";

const router: IRouter = Router();

router.get("/stories", async (req, res): Promise<void> => {
  const language = typeof req.query.language === "string" ? req.query.language : null;
  const category = typeof req.query.category === "string" ? req.query.category : null;
  const type = typeof req.query.type === "string" ? req.query.type : null;
  const q = typeof req.query.q === "string" ? req.query.q : null;

  const conditions = [eq(storiesTable.status, "published")];
  if (language && language !== "all") conditions.push(eq(storiesTable.language, language));
  if (category && category !== "all") conditions.push(eq(storiesTable.category, category));
  if (type && type !== "all") conditions.push(eq(storiesTable.type, type));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(ilike(storiesTable.title, pattern), ilike(storiesTable.description, pattern))!,
    );
  }

  const rows = await db
    .select({
      id: storiesTable.id,
      slug: storiesTable.slug,
      title: storiesTable.title,
      description: storiesTable.description,
      coverImage: storiesTable.coverImage,
      language: storiesTable.language,
      category: storiesTable.category,
      type: storiesTable.type,
      tags: storiesTable.tags,
      status: storiesTable.status,
      videoUrl: storiesTable.videoUrl,
      accentColor: storiesTable.accentColor,
      createdAt: storiesTable.createdAt,
      chapterCount: sql<number>`(select count(*)::int from ${chaptersTable} where ${chaptersTable.storyId} = ${storiesTable.id})`,
    })
    .from(storiesTable)
    .where(and(...conditions))
    .orderBy(asc(storiesTable.title));

  res.json(rows);
});

router.get("/stories/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug as string;
  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.slug, slug));
  const isAdmin =
    req.isAuthenticated() &&
    (req.user.role === "super_admin" || req.user.role === "admin");
  if (!story || (story.status !== "published" && !isAdmin)) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.storyId, story.id))
    .orderBy(asc(charactersTable.name));

  const chapters = await db
    .select({
      id: chaptersTable.id,
      chapterNumber: chaptersTable.chapterNumber,
      title: chaptersTable.title,
      durationSec: chaptersTable.durationSec,
      hasAudio: sql<boolean>`exists(select 1 from ${audioSegmentsTable} where ${audioSegmentsTable.chapterId} = ${chaptersTable.id})`,
    })
    .from(chaptersTable)
    .where(eq(chaptersTable.storyId, story.id))
    .orderBy(asc(chaptersTable.chapterNumber));

  let bookmarked = false;
  let progress: any = null;
  if (req.isAuthenticated()) {
    const [b] = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, req.user.id), eq(bookmarksTable.storyId, story.id)));
    bookmarked = !!b;

    const [p] = await db
      .select()
      .from(readingProgressTable)
      .where(
        and(eq(readingProgressTable.userId, req.user.id), eq(readingProgressTable.storyId, story.id)),
      );
    if (p) {
      progress = {
        storyId: story.id,
        chapterNumber: p.chapterNumber,
        progressPercent: p.progressPercent,
        updatedAt: p.updatedAt,
        story,
      };
    }
  }

  res.json({
    story: { ...story, chapterCount: chapters.length },
    characters,
    chapters,
    bookmarked,
    progress,
  });
});

router.get("/stories/:slug/chapters/:chapterNumber", async (req, res): Promise<void> => {
  const slug = req.params.slug as string;
  const chNum = parseInt(req.params.chapterNumber as string, 10);
  if (Number.isNaN(chNum)) {
    res.status(400).json({ error: "Invalid chapter number" });
    return;
  }

  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.slug, slug));
  // Drafts are visible to admins (so the admin editor can load them); everyone
  // else only sees published stories.
  const isAdmin =
    req.isAuthenticated() &&
    (req.user.role === "super_admin" || req.user.role === "admin");
  if (!story || (story.status !== "published" && !isAdmin)) {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(and(eq(chaptersTable.storyId, story.id), eq(chaptersTable.chapterNumber, chNum)));
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.storyId, story.id));

  const audioRows = await db
    .select({ index: audioSegmentsTable.segmentIndex })
    .from(audioSegmentsTable)
    .where(eq(audioSegmentsTable.chapterId, chapter.id));
  const audioIdxSet = new Set(audioRows.map((r) => r.index));

  const userId = req.isAuthenticated() ? req.user.id : null;
  const isPreview =
    story.access === "free" || chapter.chapterNumber <= (story.previewChapterCount ?? 1);
  const unlocked = isAdmin || isPreview || (await isEntitled(userId, story.id));

  const segments = (chapter.segments as any[]).map((s, i) => {
    const hasAudio = audioIdxSet.has(i);
    return {
      ...s,
      index: i,
      audioUrl: hasAudio && unlocked ? `/api/audio/${chapter.id}/${i}` : null,
      locked: hasAudio && !unlocked,
    };
  });

  const allChapters = await db
    .select({ chapterNumber: chaptersTable.chapterNumber })
    .from(chaptersTable)
    .where(eq(chaptersTable.storyId, story.id))
    .orderBy(asc(chaptersTable.chapterNumber));
  const idx = allChapters.findIndex((c) => c.chapterNumber === chNum);
  const prev = idx > 0 ? allChapters[idx - 1].chapterNumber : null;
  const next = idx >= 0 && idx < allChapters.length - 1 ? allChapters[idx + 1].chapterNumber : null;

  res.json({
    story,
    chapter: {
      ...chapter,
      segments,
      hasAudio: audioIdxSet.size > 0,
    },
    characters,
    nextChapterNumber: next,
    prevChapterNumber: prev,
    unlocked,
  });
});

router.get("/audio/:chapterId/:idx", async (req, res): Promise<void> => {
  const chapterId = req.params.chapterId as string;
  const idx = parseInt(req.params.idx as string, 10);
  if (Number.isNaN(idx)) {
    res.status(400).json({ error: "Invalid index" });
    return;
  }

  // Server-side paywall: audio bytes only leave through this endpoint, so the
  // entitlement check here is the single enforcement point (CLAUDE.md rule 1).
  const isAdmin =
    req.isAuthenticated() &&
    (req.user.role === "super_admin" || req.user.role === "admin");
  if (!isAdmin) {
    const { isPreview, storyId } = await chapterIsPreview(chapterId);
    const userId = req.isAuthenticated() ? req.user.id : null;
    if (!isPreview && !(await isEntitled(userId, storyId))) {
      res.status(402).json({ error: "payment_required" });
      return;
    }
  }

  const [seg] = await db
    .select()
    .from(audioSegmentsTable)
    .where(and(eq(audioSegmentsTable.chapterId, chapterId), eq(audioSegmentsTable.segmentIndex, idx)));
  if (!seg) {
    res.status(404).json({ error: "Audio not found" });
    return;
  }
  res.setHeader("Content-Type", seg.mimeType);
  // "private" so shared caches/CDNs can never serve paywalled bytes past the gate.
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(seg.audio);
});

export default router;
