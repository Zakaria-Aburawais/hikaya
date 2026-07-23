import { useParams, Link } from "wouter";
import { useGetStoryBySlug, useToggleBookmark, getGetStoryBySlugQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { StorySeo } from "@/components/StorySeo";
import { TipButton } from "@/components/TipButton";
import { GiftStoryForm } from "@/components/GiftStoryForm";
import { Button } from "@/components/ui/button";
import { Bookmark, BookOpen, Headphones, Lock, Play, Volume2, ChevronRight, Film } from "lucide-react";

export default function StoryDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug!;
  const { data, isLoading } = useGetStoryBySlug(slug);
  const { isAuthenticated, login } = useAuth();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const toggleBookmark = useToggleBookmark({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetStoryBySlugQueryKey(slug) }),
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-72 shimmer rounded-2xl" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/60">
        Story not found.
      </div>
    );
  }

  const { story, characters, chapters, bookmarked, progress } = data;
  const isAr = story.language === "ar";

  const firstChapter = chapters[0];
  const resumeChapter =
    progress?.chapterNumber ?? firstChapter?.chapterNumber ?? 1;

  return (
    <div className="pb-32">
      <StorySeo story={story} />
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-white/5"
        style={{
          background: `linear-gradient(180deg, ${story.accentColor}28 0%, transparent 100%)`,
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[280px_1fr] md:py-12">
          <div className="mx-auto w-48 sm:w-56 md:mx-0 md:w-full">
            <div
              className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#3a1a78] to-[#1a0a2e] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
              style={{ boxShadow: `0 30px 80px -20px ${story.accentColor}60` }}
            >
              {story.coverImage ? (
                <img src={story.coverImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full items-center justify-center p-6 text-center font-display text-2xl font-bold ${isAr ? "font-arabic" : ""}`}>
                  {story.title}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--gold))]/90">
              <span>{story.category}</span>
              <span className="text-white/30">·</span>
              <span>{story.language}</span>
              {story.type === "movie" && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" /> Movie</span>
                </>
              )}
            </div>
            <h1
              className={`font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl ${
                isAr ? "font-arabic" : ""
              }`}
              data-testid="text-story-title"
            >
              {story.title}
            </h1>
            <p className={`mt-4 max-w-2xl text-white/75 ${isAr ? "font-arabic" : ""}`}>
              {story.description}
            </p>

            {story.tags && story.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {story.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {firstChapter && (
                <Link to={`/story/${slug}/read/${resumeChapter}`}>
                  <Button
                    size="lg"
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                    data-testid="button-read"
                  >
                    <BookOpen className="me-2 h-4 w-4" />
                    {progress ? `${t("chapter")} ${resumeChapter}` : t("read_now")}
                  </Button>
                </Link>
              )}
              {firstChapter && firstChapter.hasAudio && (
                <Link to={`/story/${slug}/read/${resumeChapter}?listen=1`}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/20"
                    data-testid="button-listen"
                  >
                    {isAuthenticated ? <Headphones className="me-2 h-4 w-4" /> : <Lock className="me-2 h-4 w-4" />}
                    {t("listen_now")}
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  if (!isAuthenticated) login();
                  else toggleBookmark.mutate({ data: { storyId: story.id } });
                }}
                data-testid="button-bookmark"
              >
                <Bookmark className={`me-2 h-4 w-4 ${bookmarked ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" : ""}`} />
                {bookmarked ? t("bookmarked") : t("bookmark")}
              </Button>
            </div>

            {!isAuthenticated && firstChapter?.hasAudio && (
              <p className="mt-3 text-xs text-white/55">{t("guest_listen_locked")}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TipButton storyId={story.id} />
              <GiftStoryForm storyId={story.id} />
            </div>
          </div>
        </div>
      </div>

      {story.type === "movie" && story.videoUrl && (
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              src={toEmbed(story.videoUrl)}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={story.title}
            />
          </div>
        </section>
      )}

      {/* Cast */}
      {characters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t("cast")}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className="glass flex items-center gap-3 rounded-xl px-3 py-2"
                data-testid={`card-character-${c.id}`}
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold"
                  style={{ background: `${c.color}40`, color: c.color }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/50">
                    {c.role} · {c.tone}
                  </div>
                </div>
                <Volume2 className="h-4 w-4 text-white/40" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chapters */}
      {chapters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t("chapters")}</h2>
          <ol className="mt-4 grid gap-2">
            {chapters.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/story/${slug}/read/${c.chapterNumber}`}
                  data-testid={`link-chapter-${c.chapterNumber}`}
                  className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 font-display text-base font-bold text-[hsl(var(--gold))]">
                      {c.chapterNumber}
                    </div>
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-white/50">
                        {c.hasAudio ? (
                          <span className="inline-flex items-center gap-1">
                            <Play className="h-3 w-3" /> Audio ready
                          </span>
                        ) : (
                          "Read only"
                        )}
                        {c.durationSec > 0 && ` · ${formatDur(c.durationSec)}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-[hsl(var(--gold))]" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function toEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be")
        ? u.pathname.slice(1)
        : u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return url;
}
