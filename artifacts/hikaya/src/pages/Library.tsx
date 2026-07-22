import { useEffect, useMemo, useState } from "react";
import { useListStories } from "@workspace/api-client-react";
import { StoryCard } from "@/components/StoryCard";
import { useI18n, LANGS } from "@/lib/i18n";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["all", "children", "thriller", "romance", "historical", "general"];
const TYPES = ["all", "story", "movie"];

export default function Library() {
  const { t, lang: uiLang } = useI18n();
  const initialUrlCategory = useMemo(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("category") ?? "all";
  }, []);

  const [language, setLanguage] = useState("all");
  const [category, setCategory] = useState(initialUrlCategory);
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(id);
  }, [q]);

  const { data: stories, isLoading } = useListStories({
    language: language === "all" ? undefined : language,
    category: category === "all" ? undefined : category,
    type: type === "all" ? undefined : type,
    q: debouncedQ || undefined,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t("nav_library")}</h1>

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="ps-9"
            data-testid="input-search"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[140px]" data-testid="select-language">
            <SelectValue placeholder={t("filter_language")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all")}</SelectItem>
            {LANGS.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.nativeLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[140px]" data-testid="select-category">
            <SelectValue placeholder={t("filter_category")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? t("filter_all") : c[0].toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[120px]" data-testid="select-type">
            <SelectValue placeholder={t("filter_type")} />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((tt) => (
              <SelectItem key={tt} value={tt}>
                {tt === "all" ? t("filter_all") : tt[0].toUpperCase() + tt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-7">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl shimmer" />
            ))}
          </div>
        ) : (stories?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-white/60">{t("no_results")}</p>
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setLanguage("all");
                setCategory("all");
                setType("all");
              }}
              className="mt-3"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {stories!.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
