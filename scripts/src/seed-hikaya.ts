import { db, storiesTable, charactersTable, chaptersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

type Seg = {
  index: number;
  kind: "narrator" | "dialogue" | "scene";
  characterId: string | null;
  characterName: string;
  emotion: string;
  text: string;
};

async function main() {
  console.log("Seeding Hikāya demo data...");

  await db.execute(sql`DELETE FROM audio_segments`);
  await db.execute(sql`DELETE FROM chapters`);
  await db.execute(sql`DELETE FROM characters`);
  await db.execute(sql`DELETE FROM stories WHERE slug IN ('the-lantern-keeper','rihla-of-ibn-battuta','les-jardins-de-grenade')`);

  const stories = [
    {
      slug: "the-lantern-keeper",
      title: "The Lantern Keeper",
      description:
        "On the windswept cliffs of a forgotten coast, an old keeper tends a lantern that guides more than ships.",
      coverImage: null,
      language: "en",
      category: "fiction",
      type: "story",
      tags: ["mystery", "atmospheric", "short"],
      status: "published",
      accentColor: "#e8c97e",
      characters: [
        { name: "Narrator", role: "narrator", voiceId: "EXAVITQu4vr4xnSDxMaL", tone: "calm", color: "#e8c97e" },
        { name: "Eli", role: "protagonist", voiceId: "ErXwobaYiN019PkySvjV", tone: "warm", color: "#8b5cf6" },
        { name: "The Stranger", role: "character", voiceId: "VR6AewLTigWG4xSOukaG", tone: "grave", color: "#22d3ee" },
      ],
      chapters: [
        {
          n: 1,
          title: "The First Light",
          content:
            "[SCENE: A storm gathers over the cliffs.]\n\n[NARRATOR]The sea remembered every ship it had taken. Eli did too.[/NARRATOR]\n\n[Eli emotion=\"warm\"]Another night, old friend. Burn bright for me.[/Eli]\n\n[NARRATOR]A figure climbed the rocks below, soaked through.[/NARRATOR]\n\n[The Stranger emotion=\"grave\"]I was told the keeper here listens.[/The Stranger]",
        },
        {
          n: 2,
          title: "Names in the Salt",
          content:
            "[NARRATOR]Morning came thin and grey.[/NARRATOR]\n\n[Eli emotion=\"calm\"]You haven't told me your name.[/Eli]\n\n[The Stranger emotion=\"grave\"]I left it at the bottom of the bay.[/The Stranger]",
        },
      ],
    },
    {
      slug: "rihla-of-ibn-battuta",
      title: "رحلة ابن بطوطة",
      description: "رحلة الرحالة العظيم عبر العالم الإسلامي في القرن الرابع عشر.",
      coverImage: null,
      language: "ar",
      category: "history",
      type: "history",
      tags: ["travel", "history", "arabic"],
      status: "published",
      accentColor: "#8b5cf6",
      characters: [
        { name: "الراوي", role: "narrator", voiceId: "EXAVITQu4vr4xnSDxMaL", tone: "calm", color: "#e8c97e" },
        { name: "ابن بطوطة", role: "protagonist", voiceId: "ErXwobaYiN019PkySvjV", tone: "warm", color: "#8b5cf6" },
      ],
      chapters: [
        {
          n: 1,
          title: "الرحيل من طنجة",
          content:
            "[NARRATOR]في عام ٧٢٥ هجرية، خرج فتى من طنجة قاصداً الحج.[/NARRATOR]\n\n[ابن بطوطة emotion=\"warm\"]وداعاً يا أرض أبائي. سأعود يوماً، إن شاء الله.[/ابن بطوطة]",
        },
      ],
    },
    {
      slug: "les-jardins-de-grenade",
      title: "Les Jardins de Grenade",
      description:
        "Une promenade poétique dans les jardins de l'Alhambra, entre fontaines et orangers.",
      coverImage: null,
      language: "fr",
      category: "poetry",
      type: "story",
      tags: ["poésie", "andalousie", "court"],
      status: "published",
      accentColor: "#22d3ee",
      characters: [
        { name: "Narrateur", role: "narrator", voiceId: "EXAVITQu4vr4xnSDxMaL", tone: "calm", color: "#e8c97e" },
        { name: "Yasmin", role: "protagonist", voiceId: "ThT5KcBeYPX3keUQqHPh", tone: "warm", color: "#8b5cf6" },
      ],
      chapters: [
        {
          n: 1,
          title: "Sous les arches",
          content:
            "[SCENE: L'aube se pose sur l'Alhambra.]\n\n[NARRATOR]Les fontaines parlaient une langue plus ancienne que la pierre.[/NARRATOR]\n\n[Yasmin emotion=\"warm\"]Écoute. Elles racontent ceux qui sont partis.[/Yasmin]",
        },
      ],
    },
  ];

  for (const s of stories) {
    const [story] = await db
      .insert(storiesTable)
      .values({
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverImage: s.coverImage,
        language: s.language,
        category: s.category,
        type: s.type,
        tags: s.tags,
        status: s.status,
        accentColor: s.accentColor,
      })
      .returning();

    const charByName = new Map<string, string>();
    for (const c of s.characters) {
      const [row] = await db
        .insert(charactersTable)
        .values({
          storyId: story.id,
          name: c.name,
          role: c.role,
          voiceId: c.voiceId,
          tone: c.tone,
          color: c.color,
        })
        .returning();
      charByName.set(c.name, row.id);
    }

    for (const ch of s.chapters) {
      const segments = parseScript(ch.content, charByName);
      await db.insert(chaptersTable).values({
        storyId: story.id,
        chapterNumber: ch.n,
        title: ch.title,
        content: ch.content,
        segments,
      });
    }
    console.log(`  ✓ ${s.title} (${s.chapters.length} chapter${s.chapters.length === 1 ? "" : "s"})`);
  }

  console.log("Done.");
  process.exit(0);
}

function parseScript(text: string, charByName: Map<string, string>): Seg[] {
  const segments: Seg[] = [];
  let idx = 0;
  const tagRe = /\[([^\]\/][^\]]*?)(?:\s+emotion="([^"]+)")?\]([\s\S]*?)\[\/\1\]|\[SCENE:\s*([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text)) !== null) {
    if (m[4] !== undefined) {
      segments.push({
        index: idx++,
        kind: "scene",
        characterId: null,
        characterName: "",
        emotion: "neutral",
        text: m[4].trim(),
      });
      continue;
    }
    const name = m[1].trim();
    const emotion = m[2] ?? "neutral";
    const body = m[3].trim();
    const isNarrator = name.toUpperCase() === "NARRATOR" || name === "الراوي" || name === "Narrateur";
    segments.push({
      index: idx++,
      kind: isNarrator ? "narrator" : "dialogue",
      characterId: charByName.get(name) ?? null,
      characterName: name,
      emotion,
      text: body,
    });
  }
  return segments;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
