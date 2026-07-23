import { Link } from "wouter";
import { useListStories, useListMyProgress } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { StoryCard } from "@/components/StoryCard";
import { NewsletterInline } from "@/components/NewsletterInline";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, BookOpen, Film, Heart, Drama, Baby, Scroll } from "lucide-react";

const CATEGORIES = [
  { key: "children", label_en: "Children", label_ar: "أطفال", Icon: Baby, color: "from-pink-500/30 to-purple-500/30" },
  { key: "thriller", label_en: "Thriller", label_ar: "إثارة", Icon: Drama, color: "from-red-500/30 to-purple-500/30" },
  { key: "romance", label_en: "Romance", label_ar: "رومانسية", Icon: Heart, color: "from-rose-500/30 to-purple-500/30" },
  { key: "historical", label_en: "Historical", label_ar: "تاريخية", Icon: Scroll, color: "from-amber-500/30 to-purple-500/30" },
];

export default function Home() {
  const { lang, t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { data: stories } = useListStories();
  const { data: progress } = useListMyProgress({
    query: { enabled: isAuthenticated } as any,
  });

  const featured = (stories ?? []).slice(0, 5);
  const recent = (stories ?? []).slice(0, 8);
  const heroStory = featured[0];

  return (
    <div className="space-y-12 pb-32">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
          <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
            <div className="flex flex-col justify-center">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--gold))]">
                <Sparkles className="h-3 w-3" /> Multi-voice AI narration
              </div>
              <h1
                className={`font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl ${
                  lang === "ar" ? "font-arabic" : ""
                }`}
              >
                {t("hero_title")}
                <span className="ms-2 inline-block">
                  <span className="gold-text">.</span>
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-base text-white/70 sm:text-lg">
                {t("hero_sub")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/library">
                  <Button
                    size="lg"
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                    data-testid="button-cta-browse"
                  >
                    <BookOpen className="me-2 h-4 w-4" /> {t("cta_browse")}
                  </Button>
                </Link>
                {heroStory && (
                  <Link to={`/story/${heroStory.slug}`}>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="border border-white/15 text-white"
                      data-testid="button-cta-featured"
                    >
                      {heroStory.title} <ChevronRight className="ms-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Hero artwork: stack of 3 cards */}
            <div className="relative hidden h-[420px] md:block">
              {featured.slice(0, 3).map((s, i) => (
                <div
                  key={s.id}
                  className="absolute"
                  style={{
                    top: `${i * 24}px`,
                    left: `${i * 30}px`,
                    width: "240px",
                    transform: `rotate(${(i - 1) * 4}deg)`,
                    zIndex: 10 - i,
                  }}
                >
                  <StoryCard story={s} large />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Continue */}
      {isAuthenticated && progress && progress.length > 0 && (
        <Section title={t("section_continue")}>
          <Row>
            {progress.slice(0, 6).map((p: any) => (
              <div key={p.storyId} className="w-40 shrink-0 sm:w-48">
                <StoryCard story={p.story} />
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[hsl(var(--gold))]"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
                  Ch. {p.chapterNumber} · {p.progressPercent}%
                </div>
              </div>
            ))}
          </Row>
        </Section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <Section title={t("section_featured")} cta={{ label: t("cta_browse"), href: "/library" }}>
          <Row>
            {featured.map((s) => (
              <div key={s.id} className="w-44 shrink-0 sm:w-52">
                <StoryCard story={s} />
              </div>
            ))}
          </Row>
        </Section>
      )}

      {/* Categories */}
      <Section title={t("section_categories")}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <Link key={c.key} to={`/library?category=${c.key}`} data-testid={`card-category-${c.key}`}>
                <div className={`group relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${c.color} p-4 transition-transform hover:-translate-y-0.5`}>
                  <c.Icon className="mb-3 h-6 w-6 text-[hsl(var(--gold))]" />
                  <div className="font-display text-base font-semibold">
                    {lang === "ar" ? c.label_ar : c.label_en}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* Recent */}
      {recent.length > 0 && (
        <Section title={t("section_new")}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recent.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {(stories ?? []).length === 0 && (
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto inline-flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-8 py-10">
            <Film className="h-8 w-8 text-white/40" />
            <p className="text-white/70">{t("no_results")}</p>
          </div>
        </div>
      )}

      {/* Newsletter capture */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[hsl(var(--primary))]/20 to-transparent p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t("gate_body")}</h2>
          <div className="mt-4 max-w-md">
            <NewsletterInline source="newsletter" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ title, cta, children }: any) {
  return (
    <section>
      <div className="mx-auto mb-3 flex max-w-7xl items-end justify-between px-4 sm:px-6">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
        {cta && (
          <Link to={cta.href}>
            <Button variant="ghost" size="sm">
              {cta.label} <ChevronRight className="ms-1 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
