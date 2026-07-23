import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { track } from "@/lib/analytics";
import { Gift } from "lucide-react";

export function GiftStoryForm({ storyId }: { storyId: string }) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function gift(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    track("gift_started", { storyId });
    try {
      const r = await fetch("/api/purchases/story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ storyId, recipientEmail: email }),
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
        data-testid="button-gift"
      >
        <Gift className="me-1.5 h-4 w-4" /> {t("gift_story")}
      </Button>
      {open && (
        <form onSubmit={gift} className="flex items-center gap-2" data-testid="form-gift">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("gift_recipient_placeholder")}
            className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none placeholder:text-white/40"
            data-testid="input-gift-email"
          />
          <Button
            type="submit"
            size="sm"
            disabled={busy}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
            data-testid="button-gift-send"
          >
            {t("gift_cta")}
          </Button>
        </form>
      )}
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
