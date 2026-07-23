import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { Star } from "lucide-react";

type RatingEntry = {
  stars: number;
  body: string | null;
  firstName: string | null;
  createdAt: string;
};

function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? "cursor-pointer" : "cursor-default"}
          data-testid={onPick ? `star-pick-${n}` : undefined}
        >
          <Star
            className={`h-4 w-4 ${
              n <= value ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" : "text-white/25"
            }`}
          />
        </button>
      ))}
    </span>
  );
}

export function RatingsSection({
  storyId,
  ratingAvg,
  ratingCount,
}: {
  storyId: string;
  ratingAvg?: number | null;
  ratingCount?: number;
}) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<RatingEntry[]>([]);
  const [agg, setAgg] = useState({ avg: ratingAvg ?? null, count: ratingCount ?? 0 });
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/stories/${storyId}/ratings`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries)
      .catch(() => {});
  }, [storyId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }
    if (!stars) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/stories/${storyId}/ratings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stars, body: body || undefined }),
      });
      if (r.ok) {
        const d = await r.json();
        setAgg({ avg: d.ratingAvg, count: d.ratingCount });
        const list = await fetch(`/api/stories/${storyId}/ratings`).then((x) => x.json());
        setEntries(list);
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold">{t("ratings_title")}</h2>
        {agg.avg != null && agg.count > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-white/65" data-testid="text-rating-agg">
            <Stars value={Math.round(agg.avg / 10)} />
            {(agg.avg / 10).toFixed(1)} · {agg.count}
          </span>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 max-w-xl space-y-2" data-testid="form-rating">
        <div className="flex items-center gap-2 text-sm text-white/65">
          {t("rate_story")} <Stars value={stars} onPick={setStars} />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("review_placeholder")}
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40"
          data-testid="input-review"
        />
        <Button
          type="submit"
          size="sm"
          disabled={busy || !stars}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
          data-testid="button-submit-rating"
        >
          {t("submit_review")}
        </Button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-6 space-y-4">
          {entries.map((r, i) => (
            <li key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm">
                <Stars value={r.stars} />
                <span className="text-white/55">{r.firstName ?? "—"}</span>
              </div>
              {r.body && <p className="mt-2 text-sm text-white/80">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </section>
  );
}
