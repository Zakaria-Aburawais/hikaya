import { useAuth } from "@workspace/replit-auth-web";
import { useListMyProgress, useListMyBookmarks } from "@workspace/api-client-react";
import { StoryCard } from "@/components/StoryCard";
import { useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Profile() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { data: progress } = useListMyProgress({ query: { enabled: isAuthenticated } as any });
  const { data: bookmarks } = useListMyBookmarks({ query: { enabled: isAuthenticated } as any });

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-8">Loading…</div>;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{t("nav_profile")}</h1>
        <p className="mt-2 text-white/60">{t("login_required")}</p>
        <Button onClick={login} className="mt-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90">
          {t("login")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        {user?.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="h-16 w-16 rounded-full" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--primary))]/40 text-2xl font-bold">
            {(user?.firstName || user?.email || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold">{user?.firstName || user?.email}</h1>
          <p className="truncate text-sm text-white/55">{user?.email}</p>
          {(user as any)?.role === "super_admin" && (
            <span className="mt-1 inline-block rounded-full bg-[hsl(var(--gold))]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--gold))]">
              Super Admin
            </span>
          )}
        </div>
        <Button variant="ghost" onClick={logout} data-testid="button-logout">
          {t("logout")}
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">{t("plus")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/pricing">
            <Button
              size="sm"
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
              data-testid="button-go-plus"
            >
              {t("go_plus")}
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="border border-white/15"
            onClick={async () => {
              const r = await fetch("/api/billing/portal", {
                method: "POST",
                credentials: "include",
              });
              if (r.ok) {
                const { url } = await r.json();
                if (url) location.href = url;
              } else {
                location.href = "/pricing";
              }
            }}
            data-testid="button-manage-plan"
          >
            {t("manage_plan")}
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">{t("preferences")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr] sm:items-center">
          <div className="text-sm text-white/65">{t("ui_language")}</div>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  lang === l.code
                    ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))]"
                    : "border-white/10 text-white/70 hover:border-white/30"
                }`}
                data-testid={`pref-lang-${l.code}`}
              >
                <span className={l.rtl ? "font-arabic" : ""}>{l.nativeLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">{t("reading_history")}</h2>
        {(progress ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No history yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {progress!.map((p: any) => (
              <Link key={p.storyId} to={`/story/${p.story.slug}/read/${p.chapterNumber}`}>
                <StoryCard story={p.story} />
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/55">
                  Ch. {p.chapterNumber} · {p.progressPercent}%
                </div>
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
