import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { track } from "@/lib/analytics";
import { Heart } from "lucide-react";

const PRESETS_CENTS = [300, 500, 1000];

export function TipButton({ storyId }: { storyId: string }) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function tip(amountCents: number) {
    setBusy(true);
    track("tip_started", { storyId, amountCents });
    try {
      const r = await fetch("/api/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ storyId, amountCents }),
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
    <>
      <Button
        size="sm"
        variant="ghost"
        className="border border-white/15"
        onClick={() => (isAuthenticated ? setOpen((o) => !o) : setShowSignIn(true))}
        data-testid="button-tip"
      >
        <Heart className="me-1.5 h-4 w-4 text-[hsl(var(--gold))]" /> {t("tip")}
      </Button>
      {open && (
        <div className="flex items-center gap-2" data-testid="tip-presets">
          {PRESETS_CENTS.map((c) => (
            <Button
              key={c}
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => tip(c)}
              className="border border-[hsl(var(--gold))]/30 text-[hsl(var(--gold))]"
              data-testid={`button-tip-${c}`}
            >
              ${(c / 100).toFixed(0)}
            </Button>
          ))}
        </div>
      )}
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
