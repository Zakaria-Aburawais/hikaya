import { Router, type IRouter } from "express";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import { db, ratingsTable, storiesTable, usersTable } from "@workspace/db";
import { RateStoryBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.get("/stories/:id/ratings", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      stars: ratingsTable.stars,
      body: ratingsTable.body,
      firstName: usersTable.firstName,
      createdAt: ratingsTable.createdAt,
    })
    .from(ratingsTable)
    .innerJoin(usersTable, eq(usersTable.id, ratingsTable.userId))
    .where(eq(ratingsTable.storyId, req.params.id as string))
    .orderBy(desc(ratingsTable.createdAt))
    .limit(50);
  res.json(rows);
});

router.post("/stories/:id/ratings", requireAuth, async (req, res): Promise<void> => {
  const parsed = RateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const storyId = req.params.id as string;
  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId));
  if (!story || story.status !== "published") {
    res.status(404).json({ error: "Story not found" });
    return;
  }

  await db
    .insert(ratingsTable)
    .values({
      userId: req.user!.id,
      storyId,
      stars: parsed.data.stars,
      body: parsed.data.body ?? null,
    })
    .onConflictDoUpdate({
      target: [ratingsTable.userId, ratingsTable.storyId],
      set: { stars: parsed.data.stars, body: parsed.data.body ?? null, createdAt: new Date() },
    });

  // Recompute the story aggregate; ratingAvg is stored as avg * 10 (integer).
  const [agg] = await db
    .select({ avg: avg(ratingsTable.stars), count: count() })
    .from(ratingsTable)
    .where(eq(ratingsTable.storyId, storyId));
  const ratingAvg = agg.avg ? Math.round(Number(agg.avg) * 10) : null;
  const ratingCount = Number(agg.count);
  await db
    .update(storiesTable)
    .set({ ratingAvg, ratingCount })
    .where(eq(storiesTable.id, storyId));

  res.json({ ratingAvg, ratingCount });
});

export default router;
