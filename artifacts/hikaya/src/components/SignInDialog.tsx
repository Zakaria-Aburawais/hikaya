import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { Mail, LogIn } from "lucide-react";

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (!open) return null;

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    track("signup_started", { method: "magic_link" });
    try {
      await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, returnTo: location.pathname }),
      });
    } finally {
      setSent(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={onClose}
      data-testid="modal-signin"
    >
      <div
        className="w-[min(92vw,400px)] rounded-2xl border border-white/10 bg-[#14102a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold">{t("signin_title")}</h3>
        {sent ? (
          <p className="mt-3 text-sm text-white/70" data-testid="text-magic-sent">
            {t("signin_sent")}
          </p>
        ) : (
          <>
            <form onSubmit={requestLink} className="mt-4 space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("newsletter_placeholder")}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-[hsl(var(--gold))]/50"
                data-testid="input-magic-email"
              />
              <Button
                type="submit"
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
                data-testid="button-magic-request"
              >
                <Mail className="me-1.5 h-4 w-4" /> {t("signin_magic_cta")}
              </Button>
            </form>
            <div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/35">
              <span className="h-px flex-1 bg-white/10" />
              {t("signin_or")}
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                track("signup_started", { method: "replit_oidc" });
                login();
              }}
              className="w-full border border-white/15"
              data-testid="button-signin-replit"
            >
              <LogIn className="me-1.5 h-4 w-4" /> {t("signin_replit")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
