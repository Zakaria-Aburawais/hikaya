import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { Gift } from "lucide-react";

export default function GiftRedeem() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;

  async function redeem() {
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/gifts/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        setError(true);
        return;
      }
      const { storySlug } = await r.json();
      navigate(`/story/${storySlug}?unlocked=1`);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <div className="mx-auto max-w-md px-4 py-16 text-center">…</div>;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Gift className="mx-auto h-10 w-10 text-[hsl(var(--gold))]" />
      <h1 className="mt-4 font-display text-2xl font-bold">{t("gift_redeem_title")}</h1>
      {error ? (
        <p className="mt-3 text-sm text-red-400">This gift link is invalid or was already used.</p>
      ) : (
        <Button
          onClick={redeem}
          disabled={busy || !token}
          className="mt-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
          data-testid="button-redeem-gift"
        >
          {t("gift_redeem_cta")}
        </Button>
      )}
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
}
