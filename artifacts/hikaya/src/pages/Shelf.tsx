import { useAuth } from "@workspace/replit-auth-web";
import { useListMyBookmarks, useListMyProgress } from "@workspace/api-client-react";
import { StoryCard } from "@/components/StoryCard";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Shelf() {
  const { isAuthenticated, login } = useAuth();
  const { t } = useI18n();
  const { data: bookmarks } = useListMyBookmarks({ query: { enabled: isAuthenticated } as any });
  const { data: progress } = useListMyProgress({ query: { enabled: isAuthenticated } as any });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{t("nav_shelf")}</h1>
        <p className="mt-2 text-white/60">{t("login_required")}</p>
        <Button onClick={login} className="mt-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90">
          {t("login")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">{t("nav_shelf")}</h1>
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{t("section_continue")}</h2>
        {(progress ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-white/55">Nothing in progress.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {progress!.map((p: any) => (
              <Link key={p.storyId} to={`/story/${p.story.slug}/read/${p.chapterNumber}`}>
                <StoryCard story={p.story} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">{t("bookmarks")}</h2>
        {(bookmarks ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No bookmarks yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {bookmarks!.map((s: any) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
