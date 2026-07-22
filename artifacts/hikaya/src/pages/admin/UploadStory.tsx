import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateStory,
  useParsePdf,
  useCreateChapter,
} from "@workspace/api-client-react";
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
import { Upload, FileText, Loader2 } from "lucide-react";
import { LANGS } from "@/lib/i18n";
import { toast } from "sonner";

export default function UploadStory() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState("general");
  const [type, setType] = useState<"story" | "movie">("story");
  const [coverImage, setCoverImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [tags, setTags] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [pdfPages, setPdfPages] = useState(0);
  const [, navigate] = useLocation();

  const parsePdf = useParsePdf();
  const createStory = useCreateStory();
  const createChapter = useCreateChapter();

  async function onPdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF must be under 50MB.");
      return;
    }
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    parsePdf.mutate(
      { data: { base64, filename: file.name } },
      {
        onSuccess: (r) => {
          setExtractedText(r.text);
          setPdfPages(r.pages);
          if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
          toast.success(`Extracted ${r.pages} pages.`);
        },
        onError: (err: any) => toast.error(err?.data?.error ?? "PDF parse failed"),
      },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !slug) {
      toast.error("Title and slug are required.");
      return;
    }
    const story = await createStory.mutateAsync({
      data: {
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description,
        language,
        category,
        type,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        coverImage: coverImage || null,
        videoUrl: videoUrl || null,
        accentColor,
      },
    });
    if (extractedText && type === "story") {
      // Split by chapter heuristic — split on form-feed or "Chapter" markers, fallback to single chapter.
      const chunks = splitChapters(extractedText);
      for (let i = 0; i < chunks.length; i++) {
        await createChapter.mutateAsync({
          id: story.id,
          data: {
            chapterNumber: i + 1,
            title: chunks[i].title || `Chapter ${i + 1}`,
            content: chunks[i].body,
            segments: [
              {
                index: 0,
                kind: "narrator",
                characterId: null,
                characterName: "Narrator",
                emotion: "neutral",
                text: chunks[i].body,
              },
            ],
          },
        });
      }
      toast.success(`Created ${chunks.length} chapter${chunks.length > 1 ? "s" : ""}.`);
    }
    navigate(`/admin/stories/${story.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Upload a story</h1>
      <p className="mt-1 text-sm text-white/55">Step 1: details. Then add cast and annotate the script.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <Label className="text-sm font-semibold">PDF source (optional)</Label>
          <p className="text-xs text-white/55">
            Upload a PDF to auto-extract the text. Up to 50MB.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-4 py-2.5 text-sm hover:border-white/40">
              {parsePdf.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {parsePdf.isPending ? "Extracting…" : "Choose PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onPdfChange}
                data-testid="input-pdf"
              />
            </label>
            {pdfPages > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-white/65">
                <FileText className="h-3 w-3" /> {pdfPages} pages, {extractedText.length.toLocaleString()} chars
              </span>
            )}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} data-testid="input-title" />
          </Field>
          <Field label="Slug (URL)">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="input-slug" />
          </Field>
          <Field label="Language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["general", "children", "thriller", "romance", "historical"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="movie">Movie</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Accent color">
            <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-full" />
          </Field>
        </div>

        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field label="Cover image URL (optional)">
          <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://…" />
        </Field>
        {type === "movie" && (
          <Field label="Video URL (YouTube / Vimeo / MP4)">
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        )}
        <Field label="Tags (comma-separated)">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="adventure, family" />
        </Field>

        {extractedText && type === "story" && (
          <Field label="Extracted text (will become chapter content — edit if needed)">
            <Textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </Field>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin")}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createStory.isPending || createChapter.isPending}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
            data-testid="button-create-story"
          >
            {createStory.isPending || createChapter.isPending ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Create & continue
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-white/65">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitChapters(text: string): { title: string; body: string }[] {
  const cleaned = text.replace(/\r/g, "").trim();
  // Try to split on lines that look like "Chapter N" or "Chapitre N" headings.
  const re = /^\s*(chapter|chapitre|capítulo|kapitel|hoofdstuk|الفصل)\s+[\dIVXLC]+.*$/gim;
  const matches = [...cleaned.matchAll(re)];
  if (matches.length < 2) {
    return [{ title: "", body: cleaned }];
  }
  const chunks: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : cleaned.length;
    const block = cleaned.slice(start, end).trim();
    const lines = block.split("\n");
    const title = lines[0].trim();
    const body = lines.slice(1).join("\n").trim();
    chunks.push({ title, body });
  }
  return chunks;
}
