import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export function NewsletterInline({ source = "newsletter" }: { source?: string }) {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    track("newsletter_submitted", { source });
    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source, locale: lang }),
      });
    } finally {
      setDone(true);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-white/60" data-testid="text-newsletter-success">
        {t("newsletter_success")} 🎧
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2" data-testid="form-newsletter">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("newsletter_placeholder")}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-[hsl(var(--gold))]/50"
        data-testid="input-newsletter-email"
      />
      <Button
        type="submit"
        size="sm"
        className="shrink-0 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
        data-testid="button-newsletter-submit"
      >
        {t("newsletter_cta")}
      </Button>
    </form>
  );
}
