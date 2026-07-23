import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export function Paywall({
  storyTitle,
  storyId,
  priceCents,
  onClose,
}: {
  storyTitle: string;
  storyId: string;
  priceCents?: number | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const price = `$${((priceCents ?? 249) / 100).toFixed(2)}`;

  async function checkout(path: string, body: Record<string, unknown>, event: string) {
    setBusy(true);
    track(event, { storyId });
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const { url } = await r.json();
      if (url) {
        location.href = url;
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80"
      onClick={onClose}
      data-testid="modal-paywall"
    >
      <div
        className="w-[min(92vw,440px)] rounded-2xl border border-white/10 bg-[#14102a] p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl font-semibold">
          {t("paywall_title").replace("{title}", storyTitle)}
        </h3>
        <p className="mt-1 text-sm text-white/65">{t("paywall_body")}</p>
        <Button
          onClick={() => checkout("/api/billing/checkout", { interval: "annual" }, "checkout_started")}
          disabled={busy}
          className="mt-5 w-full bg-[hsl(var(--primary))] py-6 font-semibold hover:bg-[hsl(var(--primary))]/90"
          data-testid="button-paywall-trial"
        >
          {t("cta_trial")}
        </Button>
        <Button
          onClick={() => checkout("/api/purchases/story", { storyId }, "buy_story_clicked")}
          disabled={busy}
          variant="ghost"
          className="mt-2 w-full border border-white/15 text-sm"
          data-testid="button-paywall-buy-story"
        >
          {t("paywall_buy_story").replace("{price}", price)}
        </Button>
        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-white/45 underline-offset-4 hover:underline"
          data-testid="button-paywall-close"
        >
          {t("keep_free")}
        </button>
      </div>
    </div>
  );
}
