import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NewsletterInline } from "./NewsletterInline";

export function ExitIntentModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("hikaya.exit_shown")) return;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setOpen(true);
        sessionStorage.setItem("hikaya.exit_shown", "1");
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70"
      onClick={() => setOpen(false)}
      data-testid="modal-exit-intent"
    >
      <div
        className="w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#14102a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold">{t("exit_title")}</h3>
        <p className="mt-1 text-sm text-white/65">{t("exit_body")}</p>
        <div className="mt-4">
          <NewsletterInline source="exit_intent" />
        </div>
      </div>
    </div>
  );
}
