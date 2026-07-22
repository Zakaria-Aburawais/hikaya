import { Link } from "wouter";
import type { Story } from "@workspace/api-client-react";
import { Headphones, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const FALLBACK_GRADIENTS = [
  "from-[#3a1a78] to-[#1a0a2e]",
  "from-[#4c1d95] to-[#1a0a2e]",
  "from-[#5b21b6] via-[#241048] to-[#1a0a2e]",
  "from-[#7c3aed] via-[#4c1d95] to-[#1a0a2e]",
  "from-[#1a0a2e] via-[#3a1a78] to-[#0e0820]",
];

export function StoryCard({ story, large = false }: { story: Story; large?: boolean }) {
  const { lang } = useI18n();
  const grad = FALLBACK_GRADIENTS[Math.abs(hash(story.id)) % FALLBACK_GRADIENTS.length];
  const isAr = story.language === "ar";

  return (
    <Link
      to={`/story/${story.slug}`}
      data-testid={`card-story-${story.slug}`}
      className="group block w-full"
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${grad} ${
          large ? "aspect-[4/5]" : "aspect-[3/4]"
        } shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_25px_60px_-15px_rgba(139,92,246,0.4)]`}
      >
        {story.coverImage ? (
          <img
            src={story.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-5">
            <span
              className={`text-center font-display text-xl font-semibold leading-tight text-white/90 ${
                isAr ? "font-arabic" : ""
              } ${large ? "text-3xl" : "text-xl"}`}
            >
              {story.title}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--gold))]/90">
            <span>{story.category}</span>
            <span className="text-white/30">·</span>
            <span>{story.language}</span>
          </div>
          <div
            className={`line-clamp-2 font-display font-semibold text-white ${
              isAr ? "font-arabic" : ""
            } ${large ? "text-lg" : "text-sm"}`}
            data-testid={`text-story-title-${story.slug}`}
          >
            {story.title}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/65">
            {story.type === "movie" ? (
              <>
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-medium uppercase tracking-wider">
                  {lang === "ar" ? "فيلم" : "Movie"}
                </span>
              </>
            ) : (
              <>
                <BookOpen className="h-3 w-3" />
                <span>{(story as any).chapterCount ?? 0} ch.</span>
                <Headphones className="ms-2 h-3 w-3" />
              </>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent" />
      </div>
    </Link>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
