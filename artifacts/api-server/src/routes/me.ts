import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  storiesTable,
  bookmarksTable,
  readingProgressTable,
  tipsTable,
} from "@workspace/db";
import {
  UpdateMyPreferencesBody,
  UpsertMyProgressBody,
  ToggleBookmarkBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.patch("/me/preferences", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMyPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [u] = await db
    .update(usersTable)
    .set({ preferredLanguage: parsed.data.preferredLanguage })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
    role: u.role,
    preferredLanguage: u.preferredLanguage,
  });
});

router.get("/me/progress", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      storyId: readingProgressTable.storyId,
      chapterNumber: readingProgressTable.chapterNumber,
      progressPercent: readingProgressTable.progressPercent,
      updatedAt: readingProgressTable.updatedAt,
      story: storiesTable,
    })
    .from(readingProgressTable)
    .innerJoin(storiesTable, eq(storiesTable.id, readingProgressTable.storyId))
    .where(eq(readingProgressTable.userId, req.user!.id))
    .orderBy(desc(readingProgressTable.updatedAt));
  res.json(rows);
});

router.post("/me/progress", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertMyProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(readingProgressTable)
    .values({
      userId: req.user!.id,
      storyId: parsed.data.storyId,
      chapterNumber: parsed.data.chapterNumber,
      progressPercent: parsed.data.progressPercent,
    })
    .onConflictDoUpdate({
      target: [readingProgressTable.userId, readingProgressTable.storyId],
      set: {
        chapterNumber: parsed.data.chapterNumber,
        progressPercent: parsed.data.progressPercent,
        updatedAt: new Date(),
      },
    })
    .returning();
  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, row.storyId));
  res.json({
    storyId: row.storyId,
    chapterNumber: row.chapterNumber,
    progressPercent: row.progressPercent,
    updatedAt: row.updatedAt,
    story,
  });
});

router.get("/me/bookmarks", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ story: storiesTable })
    .from(bookmarksTable)
    .innerJoin(storiesTable, eq(storiesTable.id, bookmarksTable.storyId))
    .where(eq(bookmarksTable.userId, req.user!.id));
  res.json(rows.map((r) => r.story));
});

router.post("/me/bookmarks", requireAuth, async (req, res): Promise<void> => {
  const parsed = ToggleBookmarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.user!.id;
  const storyId = parsed.data.storyId;
  const [existing] = await db
    .select()
    .from(bookmarksTable)
    .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.storyId, storyId)));
  if (existing) {
    await db.delete(bookmarksTable).where(eq(bookmarksTable.id, existing.id));
    res.json({ bookmarked: false });
    return;
  }
  await db.insert(bookmarksTable).values({ userId, storyId });
  res.json({ bookmarked: true });
});

router.get("/me/supporter", requireAuth, async (req, res): Promise<void> => {
  const [tip] = await db
    .select({ id: tipsTable.id })
    .from(tipsTable)
    .where(eq(tipsTable.fromUserId, req.user!.id))
    .limit(1);
  res.json({ supporter: !!tip });
});

export default router;
