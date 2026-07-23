import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlayerSegment = {
  index: number;
  characterName: string;
  text: string;
  audioUrl: string | null;
  kind: "narrator" | "dialogue" | "scene";
};

export type PlayerStory = {
  storyId: string;
  storySlug: string;
  storyTitle: string;
  coverImage: string | null;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  accentColor: string;
};

type PlayerState = {
  story: PlayerStory | null;
  segments: PlayerSegment[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  sleepMinutes: number | null;
  load: (story: PlayerStory, segments: PlayerSegment[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekToSegment: (i: number) => void;
  setSpeed: (s: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  close: () => void;
  audioEl: HTMLAudioElement | null;
};

const Ctx = createContext<PlayerState | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [story, setStory] = useState<PlayerStory | null>(null);
  const [segments, setSegments] = useState<PlayerSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazily init audio element
  useEffect(() => {
    if (audioRef.current) return;
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  const playable = useMemo(
    () => segments.filter((s) => s.audioUrl && s.kind !== "scene"),
    [segments],
  );

  const playSegmentByIdx = useCallback(
    (idx: number) => {
      const a = audioRef.current;
      if (!a) return;
      const seg = segments[idx];
      setCurrentIndex(idx);
      if (!seg || !seg.audioUrl) {
        // Skip non-playable; advance
        const nextPlayable = segments.findIndex(
          (s, i) => i > idx && s.audioUrl && s.kind !== "scene",
        );
        if (nextPlayable >= 0) {
          playSegmentByIdx(nextPlayable);
        } else {
          setIsPlaying(false);
        }
        return;
      }
      a.src = seg.audioUrl;
      a.playbackRate = speed;
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    },
    [segments, speed],
  );

  // Hook up "ended" handler
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      const nextPlayable = segments.findIndex(
        (s, i) => i > currentIndex && s.audioUrl && s.kind !== "scene",
      );
      if (nextPlayable >= 0) {
        playSegmentByIdx(nextPlayable);
      } else {
        setIsPlaying(false);
      }
    };
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [segments, currentIndex, playSegmentByIdx]);

  const load = useCallback(
    (s: PlayerStory, segs: PlayerSegment[], startIndex = 0) => {
      setStory(s);
      setSegments(segs);
      const firstPlayable = segs.findIndex(
        (seg, i) => i >= startIndex && seg.audioUrl && seg.kind !== "scene",
      );
      const begin = firstPlayable >= 0 ? firstPlayable : 0;
      setCurrentIndex(begin);
      // Don't auto-play unless user clicks a play action. Defer.
    },
    [],
  );

  const play = useCallback(() => {
    if (!segments.length) return;
    const a = audioRef.current!;
    if (a.src) {
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      playSegmentByIdx(currentIndex);
    }
  }, [segments, currentIndex, playSegmentByIdx]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    const nextIdx = segments.findIndex(
      (s, i) => i > currentIndex && s.audioUrl && s.kind !== "scene",
    );
    if (nextIdx >= 0) playSegmentByIdx(nextIdx);
  }, [segments, currentIndex, playSegmentByIdx]);

  const prev = useCallback(() => {
    let foundIdx = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (segments[i].audioUrl && segments[i].kind !== "scene") {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx >= 0) playSegmentByIdx(foundIdx);
  }, [segments, currentIndex, playSegmentByIdx]);

  const seekToSegment = useCallback(
    (i: number) => {
      playSegmentByIdx(i);
    },
    [playSegmentByIdx],
  );

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepMinutes(minutes);
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    if (minutes) {
      sleepTimeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
        setSleepMinutes(null);
        sleepTimeoutRef.current = null;
      }, minutes * 60 * 1000);
    }
  }, []);

  // Lock-screen / background controls via the MediaSession API.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!story) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: story.chapterTitle,
      artist: story.storyTitle,
      album: "Hikāya",
      artwork: story.coverImage
        ? [{ src: story.coverImage, sizes: "512x512", type: "image/png" }]
        : [],
    });
  }, [story]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [play, pause, next, prev]);

  const close = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setStory(null);
    setSegments([]);
    setCurrentIndex(0);
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    setSleepMinutes(null);
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      story,
      segments,
      currentIndex,
      isPlaying,
      speed,
      sleepMinutes,
      load,
      play,
      pause,
      toggle,
      next,
      prev,
      seekToSegment,
      setSpeed,
      setSleepTimer,
      close,
      audioEl: audioRef.current,
    }),
    [story, segments, currentIndex, isPlaying, speed, sleepMinutes, load, play, pause, toggle, next, prev, seekToSegment, setSpeed, setSleepTimer, close],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudioPlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudioPlayer must be inside AudioPlayerProvider");
  return c;
}
