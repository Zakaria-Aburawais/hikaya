import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { track } from "@/lib/analytics";
import { Check } from "lucide-react";

export default function Pricing() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }
    setBusy(true);
    track("checkout_started", { interval });
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interval }),
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

  const features = [
    t("feat_audio"),
    t("feat_offline"),
    t("feat_noads"),
    t("feat_early"),
    t("feat_soundscapes"),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-3 inline-flex items-center rounded-full border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--gold))]">
        {t("plus")}
      </div>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t("pricing_headline")}</h1>
      <p className="mt-3 text-white/65">{t("pricing_subhead")}</p>

      <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        {(["annual", "monthly"] as const).map((i) => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              interval === i
                ? "bg-[hsl(var(--primary))] text-white"
                : "text-white/60 hover:text-white"
            }`}
            data-testid={`button-interval-${i}`}
          >
            {i === "annual" ? t("toggle_annual") : t("toggle_monthly")}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-[hsl(var(--primary))]/25 to-black/40 p-8">
        <div className="font-display text-4xl font-bold">
          {interval === "annual" ? "$49" : "$6.99"}
          <span className="text-base font-normal text-white/55">
            /{interval === "annual" ? "yr" : "mo"}
          </span>
        </div>
        <ul className="mt-6 space-y-2.5 text-start text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={subscribe}
          disabled={busy}
          className="mt-8 w-full bg-[hsl(var(--primary))] py-6 font-semibold hover:bg-[hsl(var(--primary))]/90"
          data-testid="button-start-trial"
        >
          {t("cta_trial")}
        </Button>
        <p className="mt-3 text-xs text-white/50">{t("reassure_cancel")}</p>
      </div>

      <div className="mt-6">
        <a href="/library" className="text-sm text-white/55 underline-offset-4 hover:underline">
          {t("keep_free")} →
        </a>
      </div>
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
}
