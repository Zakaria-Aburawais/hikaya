import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useI18n, LANGS } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Globe, User, LogIn, LogOut, Shield, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";
import { useState } from "react";
import { useUpdateMyPreferences } from "@workspace/api-client-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [, navigate] = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  const updatePref = useUpdateMyPreferences();

  const isAdmin = (user as any)?.role === "super_admin";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[hsl(var(--background))]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" data-testid="link-home">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#e8c97e] shadow-[0_8px_30px_-8px_rgba(139,92,246,0.6)]">
            <span className="font-display text-lg font-bold text-[#1a0a2e]">H</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight">
              Hikāya <span className="text-[hsl(var(--gold))]">·</span>{" "}
              <span className="font-arabic">حكاية</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
              {t("app_tagline")}
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}
            data-testid="link-nav-home">
            {t("nav_home")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/library")}
            data-testid="link-nav-library">
            <Library className="mr-1.5 h-4 w-4" />
            {t("nav_library")}
          </Button>
          {isAuthenticated && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/shelf")}
              data-testid="link-nav-shelf">
              {t("nav_shelf")}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-[hsl(var(--gold))]"
              data-testid="link-nav-admin"
            >
              <Shield className="mr-1.5 h-4 w-4" />
              {t("nav_admin")}
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-language">
                <Globe className="h-4 w-4" />
                <span className="ml-1.5 hidden text-xs font-medium uppercase sm:inline">
                  {lang}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    if (isAuthenticated) {
                      updatePref.mutate({ data: { preferredLanguage: l.code } });
                    }
                  }}
                  data-testid={`menu-lang-${l.code}`}
                >
                  <span className="mr-2 inline-block w-8 text-xs uppercase text-white/50">
                    {l.code}
                  </span>
                  <span className={l.rtl ? "font-arabic" : ""}>{l.nativeLabel}</span>
                  {lang === l.code && (
                    <span className="ms-auto text-[hsl(var(--gold))]">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-user-menu">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--primary))]/40 text-xs font-semibold">
                      {(user?.firstName || user?.email || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <div className="px-2 py-1.5 text-xs">
                  <div className="font-medium">
                    {user?.firstName || user?.email}
                  </div>
                  <div className="text-white/50">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" /> {t("nav_profile")}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    data-testid="menu-admin"
                  >
                    <Shield className="mr-2 h-4 w-4" /> {t("nav_admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSignIn(true)}
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90"
              data-testid="button-login"
            >
              <LogIn className="mr-1.5 h-4 w-4" />
              {t("login")}
            </Button>
          )}
        </div>
      </div>
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </header>
  );
}
