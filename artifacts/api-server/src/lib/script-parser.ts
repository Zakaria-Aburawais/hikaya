import type { ChapterSegment } from "@workspace/db";

/**
 * Parse a tagged script into segments.
 * Tag forms supported:
 *   [NARRATOR] ... [/NARRATOR]
 *   [NAME emotion="happy"] ... [/NAME]
 *   [SCENE: description]
 * Untagged text becomes a narrator segment.
 */
// Unicode-aware: speaker names can contain letters from any script (Arabic,
// French accents, Cyrillic, etc.), digits, marks, spaces, and underscores.
// Excludes characters that would terminate the tag itself: `]`, `[`, `/`.
const NAME_CLASS = "[\\p{L}\\p{M}\\p{N}_][\\p{L}\\p{M}\\p{N}_ '·\\.-]*";
const NARRATOR_ALIASES = new Set([
  "NARRATOR",
  "NARRATEUR",
  "NARRADOR",
  "ERZÄHLER",
  "VERTELLER",
  "الراوي",
]);

function isNarratorName(name: string): boolean {
  return NARRATOR_ALIASES.has(name.toUpperCase()) || NARRATOR_ALIASES.has(name);
}

export function parseScript(text: string): ChapterSegment[] {
  const segments: ChapterSegment[] = [];
  const tagRegex = new RegExp(
    `\\[(\\/?)(${NAME_CLASS})(?:\\s+emotion="([^"]+)")?\\]|\\[SCENE:\\s*([^\\]]+)\\]`,
    "gu",
  );

  let lastIdx = 0;
  let currentSpeaker: string | null = null;
  let currentEmotion = "neutral";
  let buffer = "";
  let idx = 0;

  function flush() {
    const t = buffer.trim();
    buffer = "";
    if (!t) return;
    const speaker = currentSpeaker ?? "Narrator";
    segments.push({
      index: idx++,
      kind: currentSpeaker && !isNarratorName(currentSpeaker) ? "dialogue" : "narrator",
      characterId: null,
      characterName: speaker,
      emotion: currentEmotion,
      text: t,
    });
  }

  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(text)) !== null) {
    buffer += text.slice(lastIdx, m.index);
    lastIdx = m.index + m[0].length;

    if (m[4] !== undefined) {
      // SCENE
      flush();
      segments.push({
        index: idx++,
        kind: "scene",
        characterId: null,
        characterName: "Scene",
        emotion: "neutral",
        text: m[4].trim(),
      });
      continue;
    }

    const isClosing = m[1] === "/";
    const name = m[2].trim();

    if (isClosing) {
      // Only honor the closer when it matches the currently open speaker.
      // Otherwise treat the tag as literal text and keep buffering.
      if (currentSpeaker && name === currentSpeaker) {
        flush();
        currentSpeaker = null;
        currentEmotion = "neutral";
      } else {
        buffer += m[0];
      }
    } else {
      flush();
      currentSpeaker = isNarratorName(name) ? "Narrator" : name;
      currentEmotion = m[3] ?? "neutral";
    }
  }

  buffer += text.slice(lastIdx);
  flush();

  return segments.map((s, i) => ({ ...s, index: i }));
}
