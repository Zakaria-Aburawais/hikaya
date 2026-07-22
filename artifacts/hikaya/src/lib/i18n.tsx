import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar" | "fr" | "nl" | "es" | "de";

export const LANGS: { code: Lang; label: string; nativeLabel: string; rtl: boolean }[] = [
  { code: "en", label: "English", nativeLabel: "English", rtl: false },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", rtl: true },
  { code: "fr", label: "French", nativeLabel: "Français", rtl: false },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", rtl: false },
  { code: "es", label: "Spanish", nativeLabel: "Español", rtl: false },
  { code: "de", label: "German", nativeLabel: "Deutsch", rtl: false },
];

type Dict = Record<string, string>;

const en: Dict = {
  app_tagline: "A library of voices.",
  nav_home: "Home",
  nav_library: "Library",
  nav_shelf: "My Shelf",
  nav_profile: "Profile",
  nav_admin: "Admin",
  search_placeholder: "Search stories, authors, themes…",
  hero_title: "Stories that speak.",
  hero_sub: "Read or listen to every tale, voiced by a full cast of characters.",
  cta_browse: "Browse the library",
  cta_continue: "Continue listening",
  section_featured: "Featured stories",
  section_continue: "Continue reading",
  section_new: "Fresh from the press",
  section_categories: "Browse by category",
  section_languages: "Read in your language",
  filter_language: "Language",
  filter_category: "Category",
  filter_type: "Type",
  filter_all: "All",
  type_story: "Story",
  type_movie: "Movie",
  read_now: "Read",
  listen_now: "Listen",
  cast: "Voice cast",
  chapters: "Chapters",
  chapter: "Chapter",
  bookmark: "Bookmark",
  bookmarked: "Bookmarked",
  login: "Log in",
  logout: "Log out",
  login_required: "Log in to listen and save your progress.",
  guest_listen_locked: "Log in to unlock audio narration.",
  font_size: "Font size",
  reading_mode: "Reading mode",
  light: "Light",
  sepia: "Sepia",
  dark: "Dark",
  next_chapter: "Next chapter",
  prev_chapter: "Previous chapter",
  no_results: "No stories yet — check back soon.",
  speaking_now: "Speaking now",
  scene: "Scene",
  generate_audio: "Generate audio",
  upload_pdf: "Upload PDF",
  upload_story: "Upload a story",
  admin_dashboard: "Dashboard",
  admin_stories: "Stories",
  admin_users: "Users",
  total_stories: "Total stories",
  total_users: "Total users",
  total_chapters: "Total chapters",
  total_audio: "Audio segments",
  preferences: "Preferences",
  ui_language: "Interface language",
  reading_history: "Reading history",
  bookmarks: "Bookmarks",
};

const ar: Dict = {
  ...en,
  app_tagline: "مكتبة من الأصوات.",
  nav_home: "الرئيسية",
  nav_library: "المكتبة",
  nav_shelf: "رفّي",
  nav_profile: "حسابي",
  nav_admin: "الإدارة",
  search_placeholder: "ابحث عن قصص ومؤلفين…",
  hero_title: "قصصٌ تتكلّم.",
  hero_sub: "اقرأ أو استمع إلى كلّ حكاية بأصوات شخصياتها.",
  cta_browse: "تصفّح المكتبة",
  cta_continue: "تابع الاستماع",
  section_featured: "قصص مختارة",
  section_continue: "تابع القراءة",
  section_new: "أحدث الإصدارات",
  section_categories: "تصفّح حسب الفئة",
  section_languages: "اقرأ بلغتك",
  filter_language: "اللغة",
  filter_category: "الفئة",
  filter_type: "النوع",
  filter_all: "الكل",
  type_story: "قصة",
  type_movie: "فيلم",
  read_now: "اقرأ",
  listen_now: "استمع",
  cast: "طاقم الأصوات",
  chapters: "الفصول",
  chapter: "الفصل",
  bookmark: "إشارة مرجعية",
  bookmarked: "مُحفوظة",
  login: "تسجيل الدخول",
  logout: "تسجيل الخروج",
  login_required: "سجّل دخولك للاستماع وحفظ تقدّمك.",
  guest_listen_locked: "سجّل دخولك لفتح ميزة السرد الصوتي.",
  font_size: "حجم الخط",
  reading_mode: "وضع القراءة",
  light: "فاتح",
  sepia: "سيبيا",
  dark: "داكن",
  next_chapter: "الفصل التالي",
  prev_chapter: "الفصل السابق",
  no_results: "لا توجد قصص بعد — عُد قريبًا.",
  speaking_now: "يتحدث الآن",
  scene: "المشهد",
  generate_audio: "توليد الصوت",
  upload_pdf: "رفع PDF",
  upload_story: "رفع قصة",
  admin_dashboard: "لوحة التحكم",
  admin_stories: "القصص",
  admin_users: "المستخدمون",
  total_stories: "إجمالي القصص",
  total_users: "إجمالي المستخدمين",
  total_chapters: "إجمالي الفصول",
  total_audio: "مقاطع الصوت",
  preferences: "التفضيلات",
  ui_language: "لغة الواجهة",
  reading_history: "سجلّ القراءة",
  bookmarks: "الإشارات المرجعية",
};

const fr: Dict = {
  ...en,
  app_tagline: "Une bibliothèque de voix.",
  nav_home: "Accueil",
  nav_library: "Bibliothèque",
  nav_shelf: "Ma liste",
  nav_profile: "Profil",
  nav_admin: "Admin",
  hero_title: "Des histoires qui parlent.",
  hero_sub: "Lisez ou écoutez chaque récit, interprété par une troupe entière.",
  cta_browse: "Parcourir",
  cta_continue: "Reprendre l'écoute",
  section_featured: "À la une",
  section_continue: "Reprendre la lecture",
  section_new: "Nouveautés",
  section_categories: "Catégories",
  read_now: "Lire",
  listen_now: "Écouter",
  login: "Se connecter",
  logout: "Se déconnecter",
};

const dictionaries: Record<Lang, Dict> = { en, ar, fr, nl: en, es: en, de: en };

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
  dir: "ltr" | "rtl";
};

const Ctx = createContext<I18nCtx | null>(null);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("hikaya.lang") as Lang | null;
  if (stored && dictionaries[stored]) return stored;
  const nav = navigator.language.slice(0, 2).toLowerCase() as Lang;
  if (dictionaries[nav]) return nav;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  useEffect(() => {
    const meta = LANGS.find((l) => l.code === lang)!;
    document.documentElement.dir = meta.rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("lang-ar", lang === "ar");
    localStorage.setItem("hikaya.lang", lang);
  }, [lang]);

  const t = (key: keyof typeof en) => dictionaries[lang][key] ?? en[key] ?? String(key);
  const dir = LANGS.find((l) => l.code === lang)?.rtl ? "rtl" : "ltr";

  return (
    <Ctx.Provider value={{ lang, setLang: setLangState, t, dir }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
