import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useAdminListStories,
  useUpdateStory,
  useDeleteStory,
  useCreateCharacter,
  useDeleteCharacter,
  useListVoices,
  useGetStoryBySlug,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useGenerateChapterAudio,
  getAdminListStoriesQueryKey,
  getGetStoryBySlugQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wand2, Loader2, Headphones } from "lucide-react";
import { toast } from "sonner";

export default function EditStory() {
  const { id } = useParams<{ id: string }>();
  const { data: stories } = useAdminListStories();
  const story = stories?.find((s) => s.id === id);

  if (!story) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-white/60">Loading…</div>;
  }
  return <EditStoryInner story={story} />;
}

function EditStoryInner({ story }: { story: any }) {
  const qc = useQueryClient();
  const { data: voices = [] } = useListVoices();
  const { data: detail, refetch } = useGetStoryBySlug(story.slug);

  const [status, setStatus] = useState(story.status);
  const updateStory = useUpdateStory();
  const deleteStory = useDeleteStory();
  const createCharacter = useCreateCharacter();
  const deleteCharacter = useDeleteCharacter();
  const createChapter = useCreateChapter();

  function refreshAll() {
    qc.invalidateQueries({ queryKey: getAdminListStoriesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetStoryBySlugQueryKey(story.slug) });
    refetch();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6">
      <Link to="/admin" className="text-xs text-white/55 hover:text-white">
        ← Dashboard
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{story.title}</h1>
          <p className="text-sm text-white/55">{story.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => {
            setStatus(v);
            updateStory.mutate({ id: story.id, data: { status: v } }, {
              onSuccess: () => { toast.success("Saved."); refreshAll(); }
            });
          }}>
            <SelectTrigger className="w-[140px]" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Delete this story and all chapters?")) {
                deleteStory.mutate({ id: story.id }, {
                  onSuccess: () => { toast.success("Deleted."); window.location.href = "/admin"; }
                });
              }
            }}
            className="text-destructive"
          >
            <Trash2 className="me-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Cast */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Voice cast</h2>
        <p className="text-xs text-white/55">Add a Narrator and one entry per character. Voices are matched by name when audio is generated.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(detail?.characters ?? []).map((c: any) => (
            <div key={c.id} className="glass flex items-center justify-between rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold"
                  style={{ background: `${c.color}30`, color: c.color }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/50">
                    {c.role} · {c.tone} · {voices.find((v: any) => v.voiceId === c.voiceId)?.name ?? c.voiceId.slice(0, 8)}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                deleteCharacter.mutate({ id: c.id }, { onSuccess: refreshAll });
              }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <CharacterForm
          voices={voices}
          onSubmit={(data: any) => createCharacter.mutate({ id: story.id, data }, { onSuccess: refreshAll })}
        />
      </section>

      {/* Chapters */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Chapters</h2>
        <div className="mt-3 space-y-4">
          {(detail?.chapters ?? []).map((c: any) => (
            <ChapterEditor key={c.id} slug={story.slug} chapterId={c.id} chapterNumber={c.chapterNumber} characters={detail?.characters ?? []} onChange={refreshAll} />
          ))}
        </div>

        <Button
          variant="ghost"
          className="mt-4 border border-dashed border-white/20"
          onClick={() => {
            const next = (detail?.chapters?.length ?? 0) + 1;
            createChapter.mutate({
              id: story.id,
              data: {
                chapterNumber: next,
                title: `Chapter ${next}`,
                content: "",
                segments: [],
              },
            }, { onSuccess: refreshAll });
          }}
        >
          <Plus className="me-1.5 h-4 w-4" /> Add chapter
        </Button>
      </section>
    </div>
  );
}

function CharacterForm({ voices, onSubmit }: any) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("character");
  const [voiceId, setVoiceId] = useState(voices?.[0]?.voiceId ?? "");
  const [tone, setTone] = useState("neutral");
  const [color, setColor] = useState("#e8c97e");

  useEffect(() => {
    if (!voiceId && voices?.[0]?.voiceId) setVoiceId(voices[0].voiceId);
  }, [voices, voiceId]);

  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-white/15 p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] sm:items-end">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-character-name" />
      </Field>
      <Field label="Role">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="narrator">Narrator</SelectItem>
            <SelectItem value="protagonist">Protagonist</SelectItem>
            <SelectItem value="antagonist">Antagonist</SelectItem>
            <SelectItem value="character">Character</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Voice">
        <Select value={voiceId} onValueChange={setVoiceId}>
          <SelectTrigger data-testid="select-voice"><SelectValue /></SelectTrigger>
          <SelectContent>
            {voices.map((v: any) => (
              <SelectItem key={v.voiceId} value={v.voiceId}>
                {v.name} {v.gender ? `· ${v.gender}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Tone">
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["neutral","calm","warm","tense","aged","bright","grave","whispering"].map((tv) => (
              <SelectItem key={tv} value={tv}>{tv}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Color">
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" />
      </Field>
      <Button
        type="button"
        onClick={() => {
          if (!name || !voiceId) {
            toast.error("Name + voice required");
            return;
          }
          onSubmit({ name, role, voiceId, tone, color, stability: 50, similarity: 75, style: 20 });
          setName("");
        }}
        className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
        data-testid="button-add-character"
      >
        <Plus className="me-1 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function ChapterEditor({ slug, chapterId, chapterNumber, characters, onChange }: any) {
  const updateChapter = useUpdateChapter();
  const deleteChapter = useDeleteChapter();
  const generateAudio = useGenerateChapterAudio();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Authenticated fetch via cookie — admins can also view drafts because requireAuth is not enforced on this endpoint;
        // the story is published before admins generally edit, but for unpublished we'll call with credentials.
        const r = await fetch(`/api/stories/${slug}/chapters/${chapterNumber}`, { credentials: "include" });
        if (!r.ok || cancelled) return;
        const json = await r.json();
        setTitle(json.chapter.title);
        setContent(json.chapter.content || "");
        setSegments(json.chapter.segments ?? []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [slug, chapterId, chapterNumber]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 font-display font-bold text-[hsl(var(--gold))]">
            {chapterNumber}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-64"
            placeholder="Chapter title"
            data-testid={`input-chapter-title-${chapterNumber}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const parsed = parseScript(content);
              setSegments(parsed);
              toast.success(`Parsed ${parsed.length} segments.`);
            }}
            data-testid={`button-parse-${chapterNumber}`}
          >
            <Wand2 className="me-1.5 h-4 w-4" /> Parse script
          </Button>
          <Button
            size="sm"
            onClick={() => {
              updateChapter.mutate({
                id: chapterId,
                data: { title, content, segments },
              }, { onSuccess: () => { toast.success("Saved."); onChange(); } });
            }}
            data-testid={`button-save-chapter-${chapterNumber}`}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/20"
            disabled={generateAudio.isPending || !characters.length || !segments.length}
            onClick={() => {
              generateAudio.mutate({ id: chapterId }, {
                onSuccess: (r) => { toast.success(r.message); onChange(); },
                onError: (err: any) => toast.error(err?.data?.error ?? "Generation failed"),
              });
            }}
            data-testid={`button-generate-audio-${chapterNumber}`}
          >
            {generateAudio.isPending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Headphones className="me-1.5 h-4 w-4" />}
            Generate audio
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this chapter?")) {
                deleteChapter.mutate({ id: chapterId }, { onSuccess: onChange });
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-wider text-white/55">Tagged script</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="mt-1 font-mono text-xs"
            placeholder='[NARRATOR] The night was still. [/NARRATOR]&#10;[LAYLA emotion="excited"] Look! [/LAYLA]&#10;[SCENE: Market at dusk]'
            data-testid={`textarea-script-${chapterNumber}`}
          />
          <p className="mt-1 text-[10px] text-white/45">
            Use [NARRATOR]…[/NARRATOR], [NAME emotion="happy"]…[/NAME], and [SCENE: …] tags.
          </p>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-white/55">
            Parsed segments ({segments.length})
          </Label>
          <div className="mt-1 max-h-[320px] space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
            {segments.length === 0 && (
              <p className="p-2 text-xs text-white/45">No segments yet. Click <em>Parse script</em>.</p>
            )}
            {segments.map((s: any, i: number) => (
              <div key={i} className="rounded border border-white/5 bg-white/[0.03] p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--gold))]">
                  {s.kind} · {s.characterName} {s.emotion !== "neutral" && `· ${s.emotion}`}
                </div>
                <div className="mt-1 text-xs text-white/80">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/55">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function parseScript(text: string): any[] {
  const segments: any[] = [];
  const tagRegex = /\[(\/?)([A-Za-z][A-Za-z0-9_ ]*)(?:\s+emotion="([^"]+)")?\]|\[SCENE:\s*([^\]]+)\]/g;
  let lastIdx = 0;
  let currentSpeaker: string | null = null;
  let currentEmotion = "neutral";
  let buffer = "";
  let idx = 0;

  function flush() {
    const t = buffer.trim();
    buffer = "";
    if (!t) return;
    segments.push({
      index: idx++,
      kind: currentSpeaker && currentSpeaker !== "Narrator" ? "dialogue" : "narrator",
      characterId: null,
      characterName: currentSpeaker ?? "Narrator",
      emotion: currentEmotion,
      text: t,
    });
  }

  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(text)) !== null) {
    buffer += text.slice(lastIdx, m.index);
    lastIdx = m.index + m[0].length;
    if (m[4]) {
      flush();
      segments.push({ index: idx++, kind: "scene", characterId: null, characterName: "Scene", emotion: "neutral", text: m[4].trim() });
      continue;
    }
    const isClosing = m[1] === "/";
    const name = m[2].trim();
    if (isClosing) {
      flush();
      currentSpeaker = null;
      currentEmotion = "neutral";
    } else {
      flush();
      currentSpeaker = name.toUpperCase() === "NARRATOR" ? "Narrator" : name;
      currentEmotion = m[3] ?? "neutral";
    }
  }
  buffer += text.slice(lastIdx);
  flush();
  return segments.map((s, i) => ({ ...s, index: i }));
}
