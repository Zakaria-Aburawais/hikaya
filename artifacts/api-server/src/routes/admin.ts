import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
// Import the inner module to avoid pdf-parse/index.js's debug-mode side effect
// that tries to read a test fixture file at module load.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import {
  db,
  storiesTable,
  charactersTable,
  chaptersTable,
  audioSegmentsTable,
  usersTable,
} from "@workspace/db";
import {
  CreateStoryBody,
  UpdateStoryBody,
  CreateCharacterBody,
  CreateChapterBody,
  UpdateChapterBody,
  ParsePdfBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";
import { listVoices, synthesize } from "../lib/elevenlabs";

const router: IRouter = Router();

router.use("/admin", requireAdmin);

router.get("/admin/voices", async (_req, res): Promise<void> => {
  const voices = await listVoices();
  res.json(voices);
});

router.get("/admin/stories", async (_req, res): Promise<void> => {
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
      // Raw qualified names — see stories.ts: drizzle dequalifies interpolated
      // columns inside subqueries.
      chapterCount: sql<number>`(select count(*)::int from chapters where chapters.story_id = stories.id)`,
    })
    .from(storiesTable)
    .orderBy(desc(storiesTable.createdAt));
  res.json(rows);
});

router.post("/admin/stories", async (req, res): Promise<void> => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db
      .insert(storiesTable)
      .values({ ...parsed.data, uploadedBy: req.user!.id })
      .returning();
    res.status(201).json({ ...row, chapterCount: 0 });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? "Insert failed" });
  }
});

router.patch("/admin/stories/:id", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const parsed = UpdateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(storiesTable)
    .set(parsed.data)
    .where(eq(storiesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, chapterCount: 0 });
});

router.delete("/admin/stories/:id", async (req, res): Promise<void> => {
  await db.delete(storiesTable).where(eq(storiesTable.id, req.params.id as string));
  res.sendStatus(204);
});

router.post("/admin/stories/:id/characters", async (req, res): Promise<void> => {
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(charactersTable)
    .values({ ...parsed.data, storyId: req.params.id as string })
    .returning();
  res.status(201).json(row);
});

router.delete("/admin/characters/:id", async (req, res): Promise<void> => {
  await db.delete(charactersTable).where(eq(charactersTable.id, req.params.id as string));
  res.sendStatus(204);
});

router.post("/admin/stories/:id/chapters", async (req, res): Promise<void> => {
  const parsed = CreateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db
      .insert(chaptersTable)
      .values({
        storyId: req.params.id as string,
        chapterNumber: parsed.data.chapterNumber,
        title: parsed.data.title,
        content: parsed.data.content ?? "",
        segments: (parsed.data.segments ?? []) as any,
      })
      .returning();
    res.status(201).json({ ...row, hasAudio: false });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? "Insert failed" });
  }
});

router.patch("/admin/chapters/:id", async (req, res): Promise<void> => {
  const parsed = UpdateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.content !== undefined) update.content = parsed.data.content;
  if (parsed.data.segments !== undefined) update.segments = parsed.data.segments;
  const [row] = await db
    .update(chaptersTable)
    .set(update)
    .where(eq(chaptersTable.id, req.params.id as string))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, hasAudio: false });
});

router.delete("/admin/chapters/:id", async (req, res): Promise<void> => {
  await db.delete(chaptersTable).where(eq(chaptersTable.id, req.params.id as string));
  res.sendStatus(204);
});

router.post(
  "/admin/chapters/:id/generate-audio",
  async (req, res): Promise<void> => {
    const chapterId = req.params.id as string;
    const [chapter] = await db
      .select()
      .from(chaptersTable)
      .where(eq(chaptersTable.id, chapterId));
    if (!chapter) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }
    const characters = await db
      .select()
      .from(charactersTable)
      .where(eq(charactersTable.storyId, chapter.storyId));
    const charByName = new Map(characters.map((c) => [c.name.toLowerCase(), c]));
    const narrator = characters.find((c) => c.role === "narrator") ?? characters[0];
    if (!narrator) {
      res.status(400).json({ error: "Define at least one character (narrator) before generating audio." });
      return;
    }

    const segments = (chapter.segments as any[]) ?? [];
    if (segments.length === 0) {
      res.status(400).json({ error: "Chapter has no segments. Annotate the script first." });
      return;
    }

    // Wipe existing audio
    await db
      .delete(audioSegmentsTable)
      .where(eq(audioSegmentsTable.chapterId, chapterId));

    let generated = 0;
    let totalDuration = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.kind === "scene") continue;
      const character =
        seg.kind === "narrator"
          ? narrator
          : (charByName.get(String(seg.characterName).toLowerCase()) ?? narrator);

      try {
        const audio = await synthesize({
          text: seg.text,
          voiceId: character.voiceId,
          emotion: seg.emotion ?? "neutral",
          stability: character.stability,
          similarity: character.similarity,
          style: character.style,
        });
        await db.insert(audioSegmentsTable).values({
          chapterId,
          segmentIndex: i,
          audio,
          mimeType: "audio/mpeg",
        });
        generated += 1;
        // Rough duration estimate: ~12 chars/sec for English speech
        totalDuration += Math.ceil(seg.text.length / 12);
      } catch (err) {
        req.log.error({ err, segIndex: i }, "Failed to synthesize segment");
      }
    }

    await db
      .update(chaptersTable)
      .set({ durationSec: totalDuration })
      .where(eq(chaptersTable.id, chapterId));

    res.json({
      generatedSegments: generated,
      totalSegments: segments.length,
      message:
        generated === segments.filter((s: any) => s.kind !== "scene").length
          ? "Audio generated successfully."
          : `Generated ${generated}/${segments.length} segments. Check logs for failures.`,
    });
  },
);

router.post("/admin/parse-pdf", async (req, res): Promise<void> => {
  const parsed = ParsePdfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const buf = Buffer.from(parsed.data.base64, "base64");
    const data = await pdfParse(buf);
    res.json({ text: data.text, pages: data.numpages });
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? "PDF parse failed" });
  }
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [stories] = await db.select({ c: sql<number>`count(*)::int` }).from(storiesTable);
  const [users] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
  const [chapters] = await db.select({ c: sql<number>`count(*)::int` }).from(chaptersTable);
  const [audio] = await db.select({ c: sql<number>`count(*)::int` }).from(audioSegmentsTable);
  res.json({
    totalStories: Number(stories.c),
    totalUsers: Number(users.c),
    totalChapters: Number(chapters.c),
    audioSegments: Number(audio.c),
  });
});

export default router;
