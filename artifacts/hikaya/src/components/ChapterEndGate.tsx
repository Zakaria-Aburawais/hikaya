import { useI18n } from "@/lib/i18n";
import { NewsletterInline } from "./NewsletterInline";

export function ChapterEndGate({ storyTitle }: { storyTitle: string }) {
  const { t } = useI18n();
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-gradient-to-b from-[hsl(var(--primary))]/25 to-black/40 p-6 text-center text-white">
      <h3 className="font-display text-lg font-semibold">
        {t("gate_title").replace("{title}", storyTitle)}
      </h3>
      <p className="mt-1 text-sm text-white/65">{t("gate_body")}</p>
      <div className="mx-auto mt-4 max-w-sm">
        <NewsletterInline source="chapter_gate" />
      </div>
    </div>
  );
}
