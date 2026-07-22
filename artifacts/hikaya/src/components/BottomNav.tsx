import { useLocation } from "wouter";
import { Home, Library, Bookmark, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useI18n();
  const { isAuthenticated, login } = useAuth();
  const [location, navigate] = useLocation();

  const items = [
    { key: "/", icon: Home, label: t("nav_home"), test: "tab-home" },
    { key: "/library", icon: Library, label: t("nav_library"), test: "tab-library" },
    {
      key: "/shelf",
      icon: Bookmark,
      label: t("nav_shelf"),
      test: "tab-shelf",
      onClick: () => (isAuthenticated ? navigate("/shelf") : login()),
    },
    {
      key: "/profile",
      icon: User,
      label: t("nav_profile"),
      test: "tab-profile",
      onClick: () => (isAuthenticated ? navigate("/profile") : login()),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[hsl(var(--background))]/95 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const active = location === it.key;
          return (
            <button
              key={it.key}
              onClick={it.onClick ?? (() => navigate(it.key))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
                active
                  ? "text-[hsl(var(--gold))]"
                  : "text-white/55 hover:text-white",
              )}
              data-testid={it.test}
            >
              <it.icon className={cn("h-5 w-5", active && "fill-current/10")} />
              {it.label}
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
