import { useAudioPlayer } from "@/lib/audio-player";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Headphones,
  Moon,
} from "lucide-react";
import { Link } from "wouter";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SLEEP_STEPS: (number | null)[] = [null, 15, 30, 60];

export function StickyAudioPlayer() {
  const {
    story,
    segments,
    currentIndex,
    isPlaying,
    toggle,
    next,
    prev,
    speed,
    setSpeed,
    sleepMinutes,
    setSleepTimer,
    close,
  } = useAudioPlayer();
  const { t } = useI18n();
  if (!story) return null;

  const current = segments[currentIndex];
  const speakerName = current?.characterName ?? "—";
  const playableCount = segments.filter((s) => s.audioUrl && s.kind !== "scene").length;
  const playableIdx = segments
    .slice(0, currentIndex + 1)
    .filter((s) => s.audioUrl && s.kind !== "scene").length;
  const progress = playableCount ? Math.round((playableIdx / playableCount) * 100) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[60px] z-40 px-2 pb-2 md:bottom-2 md:px-4">
      <div
        className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#241048]/95 to-[#1a0a2e]/95 p-3 shadow-[0_30px_80px_-20px_rgba(139,92,246,0.5)] backdrop-blur-xl"
        style={{ borderColor: `${story.accentColor}40` }}
        data-testid="sticky-audio-player"
      >
        <div className="flex items-center gap-3">
          <Link to={`/story/${story.storySlug}`} className="shrink-0">
            <div
              className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#3a1a78] to-[#1a0a2e]"
              style={{
                boxShadow: `0 0 20px -5px ${story.accentColor}`,
              }}
            >
              {story.coverImage ? (
                <img src={story.coverImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <Headphones className="h-5 w-5 text-[hsl(var(--gold))]" />
              )}
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium uppercase tracking-wider text-white/55">
              {story.storyTitle} · Ch. {story.chapterNumber}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="speaker-dot inline-block h-2 w-2 rounded-full"
                style={{ background: story.accentColor }}
              />
              <span
                className="truncate text-sm font-semibold"
                data-testid="text-current-speaker"
              >
                {isPlaying ? t("speaking_now") : speakerName} · {speakerName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={prev}
              className="h-9 w-9"
              data-testid="button-audio-prev"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={toggle}
              className="h-11 w-11 rounded-full bg-[hsl(var(--gold))] text-[hsl(var(--background))] hover:bg-[hsl(var(--gold))]/90"
              data-testid="button-audio-toggle"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ms-0.5 h-5 w-5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={next}
              className="h-9 w-9"
              data-testid="button-audio-next"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <button
              onClick={() => {
                const i = SPEEDS.indexOf(speed);
                setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
              }}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-white/70 hover:bg-white/5"
              data-testid="button-audio-speed"
            >
              {speed}x
            </button>
            <button
              onClick={() => {
                const i = SLEEP_STEPS.indexOf(sleepMinutes);
                setSleepTimer(SLEEP_STEPS[(i + 1) % SLEEP_STEPS.length]);
              }}
              title={t("sleep_timer")}
              className={`flex items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-bold hover:bg-white/5 ${
                sleepMinutes ? "text-[hsl(var(--gold))]" : "text-white/70"
              }`}
              data-testid="button-audio-sleep"
            >
              <Moon className="h-3 w-3" />
              {sleepMinutes ? `${sleepMinutes}m` : ""}
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={close}
              className="h-8 w-8 text-white/50 hover:text-white"
              data-testid="button-audio-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${story.accentColor}, #e8c97e)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
