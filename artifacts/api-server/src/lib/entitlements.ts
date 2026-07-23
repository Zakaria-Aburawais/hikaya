import { and, eq, isNull, or, gt, sql } from "drizzle-orm";
import { db, entitlementsTable, chaptersTable, storiesTable } from "@workspace/db";

/**
 * True when the user holds an active entitlement covering this story —
 * either story-specific (purchase/unlock) or library-wide (storyId null,
 * i.e. an active subscription).
 */
export async function isEntitled(userId: string | null, storyId: string): Promise<boolean> {
  if (!userId) return false;
  const rows = await db
    .select({ id: entitlementsTable.id })
    .from(entitlementsTable)
    .where(
      and(
        eq(entitlementsTable.userId, userId),
        or(isNull(entitlementsTable.storyId), eq(entitlementsTable.storyId, storyId)),
        or(isNull(entitlementsTable.expiresAt), gt(entitlementsTable.expiresAt, sql`now()`)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** A chapter is free when its story is free or its number falls inside the story's preview window. */
export async function chapterIsPreview(
  chapterId: string,
): Promise<{ isPreview: boolean; storyId: string }> {
  const [row] = await db
    .select({
      storyId: storiesTable.id,
      chapterNumber: chaptersTable.chapterNumber,
      previewCount: storiesTable.previewChapterCount,
      access: storiesTable.access,
    })
    .from(chaptersTable)
    .innerJoin(storiesTable, eq(chaptersTable.storyId, storiesTable.id))
    .where(eq(chaptersTable.id, chapterId));
  if (!row) return { isPreview: false, storyId: "" };
  const isPreview = row.access === "free" || row.chapterNumber <= (row.previewCount ?? 1);
  return { isPreview, storyId: row.storyId };
}
