import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as ShadToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Library from "@/pages/Library";
import StoryDetail from "@/pages/StoryDetail";
import Reader from "@/pages/Reader";
import Profile from "@/pages/Profile";
import Shelf from "@/pages/Shelf";
import AdminDashboard from "@/pages/admin/Dashboard";
import UploadStory from "@/pages/admin/UploadStory";
import EditStory from "@/pages/admin/EditStory";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { StickyAudioPlayer } from "@/components/StickyAudioPlayer";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AudioPlayerProvider } from "@/lib/audio-player";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  if (isLoading) return <div className="mx-auto max-w-md py-16 text-center text-white/55">Loading…</div>;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-white/65">Log in as the platform owner to access admin.</p>
        <Button onClick={login} className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90">Log in</Button>
      </div>
    );
  }
  if ((user as any)?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-white/65">
        You don't have access to the admin area.
      </div>
    );
  }
  return <>{children}</>;
}

function LangSync() {
  const { user } = useAuth();
  const { setLang, lang } = useI18n();
  useEffect(() => {
    const pref = (user as any)?.preferredLanguage;
    if (pref && pref !== lang && ["en","ar","fr","nl","es","de"].includes(pref)) {
      setLang(pref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return null;
}

function AppShell() {
  const [location] = useLocation();
  const isReader = /\/read\//.test(location);
  return (
    <div className="min-h-screen flex flex-col">
      {!isReader && <Header />}
      <main className="flex-1 pb-16 md:pb-0">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/library" component={Library} />
          <Route path="/story/:slug" component={StoryDetail} />
          <Route path="/story/:slug/read/:chapterNumber" component={Reader} />
          <Route path="/profile" component={Profile} />
          <Route path="/shelf" component={Shelf} />
          <Route path="/admin">{() => <AdminGuard><AdminDashboard /></AdminGuard>}</Route>
          <Route path="/admin/upload">{() => <AdminGuard><UploadStory /></AdminGuard>}</Route>
          <Route path="/admin/stories/:id">{() => <AdminGuard><EditStory /></AdminGuard>}</Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isReader && <BottomNav />}
      <StickyAudioPlayer />
      <LangSync />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
            <ShadToaster />
            <SonnerToaster richColors closeButton position="top-center" />
          </TooltipProvider>
        </AudioPlayerProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
