// Reading progress for logged-out visitors, kept in localStorage and migrated
// into the server's reading_progress table on sign-in (see App.tsx).
export type GuestProgress = {
  storyId: string;
  chapterNumber: number;
  progressPercent: number;
  updatedAt: number;
};

const KEY = "hikaya.guest_progress";

export function saveGuestProgress(p: Omit<GuestProgress, "updatedAt">) {
  const all = readAll();
  all[p.storyId] = { ...p, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getGuestProgress(storyId: string): GuestProgress | undefined {
  return readAll()[storyId];
}

export function allGuestProgress(): GuestProgress[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function clearGuestProgress() {
  localStorage.removeItem(KEY);
}

function readAll(): Record<string, GuestProgress> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
