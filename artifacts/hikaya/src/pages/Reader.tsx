import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetChapter, useUpsertMyProgress } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useAudioPlayer } from "@/lib/audio-player";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { saveGuestProgress } from "@/lib/guest-progress";
import { ChapterEndGate } from "@/components/ChapterEndGate";
import { SignInDialog } from "@/components/SignInDialog";
import { Paywall } from "@/components/Paywall";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Type,
  Sun,
  Moon,
  Coffee,
  Lock,
  Play,
} from "lucide-react";

type Mode = "dark" | "sepia" | "light";

export default function Reader() {
  const params = useParams<{ slug: string; chapterNumber: string }>();
  const slug = params.slug!;
  const chNum = Number(params.chapterNumber);
  const { data, isLoading } = useGetChapter(slug, chNum);
  const { isAuthenticated } = useAuth();
  const { t, lang: uiLang } = useI18n();
  const player = useAudioPlayer();
  const [, navigate] = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const upsertProgress = useUpsertMyProgress();

  const [fontSize, setFontSize] = useState<number>(() =>
    Number(localStorage.getItem("hikaya.fontSize") ?? 18),
  );
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem("hikaya.mode") as Mode) ?? "dark",
  );

  useEffect(() => {
    localStorage.setItem("hikaya.fontSize", String(fontSize));
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem("hikaya.mode", mode);
  }, [mode]);

  const isAr = data?.story?.language === "ar";
  const wantsListen = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("listen") === "1";
  }, []);

  // Save initial progress when chapter loads (guests keep it in localStorage
  // until they sign in — see the migration effect in App.tsx)
  useEffect(() => {
    if (!data) return;
    if (isAuthenticated) {
      upsertProgress.mutate({
        data: {
          storyId: data.story.id,
          chapterNumber: chNum,
          progressPercent: 0,
        },
      });
    } else {
      saveGuestProgress({
        storyId: data.story.id,
        chapterNumber: chNum,
        progressPercent: 0,
      });
    }
  }, [data?.story.id, chNum, isAuthenticated]);

  // Funnel analytics
  useEffect(() => {
    if (!data) return;
    track("story_opened", {
      storyId: data.story.id,
      slug: data.story.slug,
      chapterNumber: chNum,
      language: data.story.language,
    });
  }, [data?.story.id, chNum]);

  // Auto-engage audio if user requested listen=1
  useEffect(() => {
    if (!data || !wantsListen || !isAuthenticated) return;
    if (!data.chapter.hasAudio) return;
    if ((data as any).unlocked === false) return; // locked chapters never autoplay
    player.load(
      {
        storyId: data.story.id,
        storySlug: data.story.slug,
        storyTitle: data.story.title,
        coverImage: data.story.coverImage ?? null,
        chapterId: data.chapter.id,
        chapterNumber: data.chapter.chapterNumber,
        chapterTitle: data.chapter.title,
        accentColor: data.story.accentColor,
      },
      data.chapter.segments.map((s: any) => ({
        index: s.index,
        characterName: s.characterName,
        text: s.text,
        audioUrl: s.audioUrl,
        kind: s.kind,
      })),
      0,
    );
    setTimeout(() => player.play(), 200);
  }, [data?.chapter.id, wantsListen, isAuthenticated]);

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-96 shimmer rounded-2xl" />
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/60">
        Chapter not found.
      </div>
    );

  const { story, chapter, characters, prevChapterNumber, nextChapterNumber } = data;
  const unlocked = (data as any).unlocked !== false;
  const charByName = new Map(characters.map((c: any) => [c.name.toLowerCase(), c]));

  const surfaceClass =
    mode === "dark"
      ? "bg-[#0e0820] text-[#efe7ff]"
      : mode === "sepia"
        ? "bg-[#f1e5cf] text-[#3a2c12]"
        : "bg-[#f8f4ec] text-[#2b2418]";

  const isPlayingThisChapter = player.story?.chapterId === chapter.id;
  const currentSegIdx = isPlayingThisChapter ? player.currentIndex : -1;

  return (
    <div className={`min-h-screen pb-44 transition-colors ${surfaceClass}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-black/5 bg-inherit/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to={`/story/${slug}`} className="flex min-w-0 items-center gap-2">
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[11px] uppercase tracking-wider opacity-60">
                {story.title}
              </div>
              <div className="truncate text-sm font-semibold">
                Ch. {chapter.chapterNumber} · {chapter.title}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFontSize((f) => Math.max(14, f - 2))}
              className="h-8 w-8"
              data-testid="button-font-down"
              title="A-"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="ms-0.5 text-[10px]">−</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setFontSize((f) => Math.min(28, f + 2))}
              className="h-8 w-8"
              data-testid="button-font-up"
              title="A+"
            >
              <Type className="h-4 w-4" />
              <span className="ms-0.5 text-[10px]">+</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                setMode(mode === "dark" ? "light" : mode === "light" ? "sepia" : "dark")
              }
              className="h-8 w-8"
              title={t("reading_mode")}
              data-testid="button-mode"
            >
              {mode === "dark" ? <Moon className="h-4 w-4" /> : mode === "light" ? <Sun className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
            </Button>
            {chapter.hasAudio && (
              isAuthenticated ? (
                <Button
                  size="sm"
                  className="ms-1 bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90"
                  onClick={() => {
                    if (!unlocked) {
                      track("paywall_shown", { storyId: story.id, chapterNumber: chNum });
                      setShowPaywall(true);
                      return;
                    }
                    player.load(
                      {
                        storyId: story.id,
                        storySlug: story.slug,
                        storyTitle: story.title,
                        coverImage: story.coverImage ?? null,
                        chapterId: chapter.id,
                        chapterNumber: chapter.chapterNumber,
                        chapterTitle: chapter.title,
                        accentColor: story.accentColor,
                      },
                      chapter.segments.map((s: any) => ({
                        index: s.index,
                        characterName: s.characterName,
                        text: s.text,
                        audioUrl: s.audioUrl,
                        kind: s.kind,
                      })),
                      0,
                    );
                    setTimeout(() => player.play(), 100);
                  }}
                  data-testid="button-listen-chapter"
                >
                  <Headphones className="me-1.5 h-4 w-4" /> {t("listen_now")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ms-1 border border-current/20"
                  onClick={() => setShowSignIn(true)}
                  data-testid="button-login-listen"
                >
                  <Lock className="me-1.5 h-4 w-4" /> {t("login")}
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <article
        className="mx-auto max-w-2xl px-4 py-10"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
        dir={isAr ? "rtl" : "ltr"}
      >
        <h1
          className={`mb-8 font-display text-3xl font-bold sm:text-4xl ${
            isAr ? "font-arabic" : ""
          }`}
        >
          {chapter.title}
        </h1>

        {chapter.segments && chapter.segments.length > 0 ? (
          <div className={`space-y-5 font-reading ${isAr ? "font-arabic" : ""}`}>
            {chapter.segments.map((seg: any, i: number) => {
              if (seg.kind === "scene") {
                return (
                  <div key={i} className="my-6 text-center">
                    <div className="mx-auto inline-block rounded-full border border-current/20 bg-current/5 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] opacity-70">
                      {t("scene")} · {seg.text}
                    </div>
                  </div>
                );
              }
              const char = charByName.get(seg.characterName.toLowerCase());
              const color = char?.color ?? "#e8c97e";
              const active = i === currentSegIdx;
              return (
                <p
                  key={i}
                  data-testid={`segment-${i}`}
                  className={`relative rounded-lg p-2 transition-colors ${
                    active ? "bg-[hsl(var(--primary))]/15" : ""
                  }`}
                  onClick={() => {
                    if (isPlayingThisChapter && seg.audioUrl) {
                      player.seekToSegment(i);
                    }
                  }}
                  style={{ cursor: isPlayingThisChapter && seg.audioUrl ? "pointer" : "text" }}
                >
                  {seg.kind === "dialogue" && (
                    <span className="me-2 inline-flex items-center gap-1.5 align-middle text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color }}
                    >
                      <span className={`inline-block h-2 w-2 rounded-full ${active ? "speaker-dot" : ""}`} style={{ background: color }} />
                      {seg.characterName}
                    </span>
                  )}
                  <span>{seg.text}</span>
                </p>
              );
            })}
          </div>
        ) : (
          <div className={`whitespace-pre-wrap font-reading ${isAr ? "font-arabic" : ""}`}>
            {chapter.content || "(This chapter has no content yet.)"}
          </div>
        )}

        {/* Guest email capture at the end of the chapter */}
        {!isAuthenticated && <ChapterEndGate storyTitle={story.title} />}

        {/* Footer nav */}
        <div className="mt-12 flex items-center justify-between border-t border-current/10 pt-6">
          <Button
            variant="ghost"
            disabled={!prevChapterNumber}
            onClick={() => navigate(`/story/${slug}/read/${prevChapterNumber}`)}
            data-testid="button-prev-chapter"
          >
            <ChevronLeft className="me-1 h-4 w-4" /> {t("prev_chapter")}
          </Button>
          <Button
            variant="ghost"
            disabled={!nextChapterNumber}
            onClick={() => navigate(`/story/${slug}/read/${nextChapterNumber}`)}
            data-testid="button-next-chapter"
          >
            {t("next_chapter")} <ChevronRight className="ms-1 h-4 w-4" />
          </Button>
        </div>
      </article>
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
      {showPaywall && (
        <Paywall
          storyTitle={story.title}
          storyId={story.id}
          priceCents={(story as any).priceCents}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}
