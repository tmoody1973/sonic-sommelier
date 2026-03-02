"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Experience } from "@/lib/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SonicProfileScreen } from "./SonicProfileScreen";
import { CourseCard } from "./CourseCard";
import { FullMenuScreen } from "./FullMenuScreen";
import { NarrationPlayer } from "./NarrationPlayer";

// Screens: 0=Arrival, 1=SonicProfile, 2-6=Courses, 7=FullMenu
const TOTAL_SCREENS = 8;
const MUSIC_VOL_FULL = 25; // YouTube volume 0-100
const MUSIC_VOL_DUCKED = 8; // During narration

// YouTube IFrame API types
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (vol: number) => void;
  destroy: () => void;
}

interface YTPlayerConstructor {
  new (
    elementId: string,
    options: {
      videoId: string;
      width: number;
      height: number;
      playerVars: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: unknown) => void;
      };
    }
  ): YTPlayer;
}

declare global {
  interface Window {
    YT?: { Player: YTPlayerConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Load the YouTube IFrame API script (once) */
function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById("yt-iframe-api");
    if (existing) {
      // Script is loading, wait for callback
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

export function StoryFlow({ experience }: { experience: Experience }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(1);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const palette = experience.palette;

  const navigate = useCallback(
    (dir: number) => {
      const next = currentScreen + dir;
      if (next < 0 || next >= TOTAL_SCREENS) return;
      setDirection(dir);
      setCurrentScreen(next);
    },
    [currentScreen]
  );

  // Auto-advance after narration ends (with a short pause)
  const handleNarrationEnd = useCallback(() => {
    setNarrationPlaying(false);
    setTimeout(() => {
      navigate(1);
    }, 2000);
  }, [navigate]);

  const handleNarrationPlay = useCallback(() => {
    setNarrationPlaying(true);
  }, []);

  const handleNarrationPause = useCallback(() => {
    setNarrationPlaying(false);
  }, []);

  // Get the current track for course screens
  const currentTrack =
    currentScreen >= 2 && currentScreen <= 6
      ? experience.tracks?.[currentScreen - 2]
      : null;

  // Check if current screen has narration audio
  const hasNarration =
    (currentScreen === 0 && !!experience.introNarrationUrl) ||
    (currentScreen >= 2 &&
      currentScreen <= 6 &&
      !!experience.courses?.[currentScreen - 2]?.narrationAudioUrl);

  // ─── YouTube background music player ────────────────────────────────
  useEffect(() => {
    const videoId = currentTrack?.youtubeVideoId;
    console.log(`[YT] Screen ${currentScreen}, videoId="${videoId || ""}"`);
    if (!videoId) {
      // No video for this screen — stop any playing music
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo(); } catch {}
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      return;
    }

    let destroyed = false;

    const initPlayer = async () => {
      await loadYTApi();
      if (destroyed || !window.YT?.Player) return;

      // Destroy previous player
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }

      // Need a fresh DOM element each time
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = "";
        const div = document.createElement("div");
        div.id = "yt-bg-player";
        ytContainerRef.current.appendChild(div);
      }

      const player = new window.YT.Player("yt-bg-player", {
        videoId,
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            console.log(`[YT] Player ready, playing at volume ${MUSIC_VOL_FULL}`);
            ytPlayerRef.current = e.target;
            e.target.setVolume(MUSIC_VOL_FULL);
            e.target.playVideo();
          },
          onStateChange: (e) => {
            console.log(`[YT] State changed: ${e.data}`);
          },
          onError: (e) => {
            console.warn(`[YT] Player error:`, e);
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyed = true;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo(); } catch {}
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [currentTrack?.youtubeVideoId]);

  // ─── Volume ducking when narration plays/pauses ─────────────────────
  useEffect(() => {
    if (!ytPlayerRef.current) return;
    try {
      ytPlayerRef.current.setVolume(
        narrationPlaying ? MUSIC_VOL_DUCKED : MUSIC_VOL_FULL
      );
    } catch {}
  }, [narrationPlaying]);

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    navigate(x > rect.width / 2 ? 1 : -1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
    touchStartRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      role="button"
      aria-label={`Experience story screen ${currentScreen + 1} of ${TOTAL_SCREENS}. Tap or swipe to navigate.`}
      tabIndex={0}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-screen overflow-hidden relative select-none"
      style={{
        backgroundColor: palette.secondary,
      }}
    >
      {/* Hidden YouTube player container */}
      <div
        ref={ytContainerRef}
        className="absolute pointer-events-none"
        style={{ position: "absolute", top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }}
      />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-3 flex gap-1">
        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[2px] rounded-full transition-colors duration-400"
            style={{
              backgroundColor:
                i <= currentScreen
                  ? palette.accent + "88"
                  : palette.text + "1f",
            }}
          />
        ))}
      </div>

      {/* Screen content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentScreen}
          custom={direction}
          initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? "-100%" : "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0"
        >
          <ErrorBoundary>
            {currentScreen === 0 && (
              <ArrivalScreen
                experience={experience}
                onNarrationEnd={handleNarrationEnd}
                onNarrationPlay={handleNarrationPlay}
                onNarrationPause={handleNarrationPause}
              />
            )}
            {currentScreen === 1 && (
              <SonicProfileScreen experience={experience} />
            )}
            {currentScreen >= 2 &&
              currentScreen <= 6 &&
              experience.courses?.[currentScreen - 2] &&
              experience.tracks?.[currentScreen - 2] && (
                <CourseCard
                  course={experience.courses[currentScreen - 2]}
                  track={experience.tracks[currentScreen - 2]}
                  palette={palette}
                />
              )}
            {currentScreen === 7 && (
              <FullMenuScreen experience={experience} />
            )}
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>

      {/* Narration player for course screens */}
      {currentScreen >= 2 &&
        currentScreen <= 6 &&
        experience.courses?.[currentScreen - 2]?.narrationAudioUrl && (
          <div className="absolute bottom-6 left-0 right-0 z-50 px-6 max-w-md mx-auto">
            <NarrationPlayer
              key={currentScreen}
              audioUrl={experience.courses[currentScreen - 2].narrationAudioUrl!}
              palette={palette}
              onEnded={handleNarrationEnd}
              onPlay={handleNarrationPlay}
              onPause={handleNarrationPause}
            />
          </div>
        )}

      {/* Navigation hint */}
      {currentScreen < TOTAL_SCREENS - 1 && !hasNarration && (
        <div className="absolute bottom-3 left-0 right-0 text-center z-50">
          <span
            className="font-['Space_Grotesk'] text-[9px] tracking-[0.1em] uppercase"
            style={{ color: palette.text + "22" }}
          >
            TAP TO CONTINUE
          </span>
        </div>
      )}
    </div>
  );
}

function ArrivalScreen({
  experience,
  onNarrationEnd,
  onNarrationPlay,
  onNarrationPause,
}: {
  experience: Experience;
  onNarrationEnd: () => void;
  onNarrationPlay: () => void;
  onNarrationPause: () => void;
}) {
  const p = experience.palette;
  const albumArts = experience.tracks
    ?.map((t) => t.albumArt)
    .filter(Boolean) ?? [];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
      style={{
        background: `radial-gradient(ellipse at 50% 60%, ${p.primary}44, ${p.secondary})`,
      }}
    >
      {/* Floating album art background */}
      {albumArts.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 grid grid-cols-3 md:grid-cols-5 gap-4 p-6"
            style={{
              opacity: 0.08,
              transform: "rotate(-5deg) scale(1.3)",
              transformOrigin: "center center",
            }}
          >
            {/* Duplicate to fill grid */}
            {[...albumArts, ...albumArts, ...albumArts, ...albumArts].slice(0, 15).map((art, i) => (
              <div
                key={i}
                className="aspect-square rounded-md overflow-hidden"
                style={{
                  backgroundImage: `url(${art})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  animationName: "floatTile",
                  animationDuration: `${4 + (i % 3) * 2}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
          {/* Vignette overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, transparent 20%, ${p.secondary} 75%)`,
            }}
          />
        </div>
      )}

      <div className="text-center max-w-xl relative z-10">
        <div
          className="font-mono text-[10px] tracking-[0.35em] uppercase mb-6"
          style={{ color: p.accent + "88" }}
        >
          Sonic Sommelier
        </div>
        <h1
          className="font-['Playfair_Display'] text-[44px] md:text-[64px] italic font-normal leading-[1.05] mb-4"
          style={{ color: p.text }}
        >
          {experience.title}
        </h1>
        <p
          className="font-['Instrument_Serif'] text-base md:text-lg italic"
          style={{ color: p.text + "66" }}
        >
          {experience.subtitle}
        </p>
        {experience.introNarrationUrl && (
          <div className="mt-6 w-full max-w-xs mx-auto">
            <NarrationPlayer
              audioUrl={experience.introNarrationUrl}
              palette={p}
              onEnded={onNarrationEnd}
              onPlay={onNarrationPlay}
              onPause={onNarrationPause}
            />
          </div>
        )}
        {!experience.introNarrationUrl && (
          <div className="mt-12">
            <span
              className="font-['Space_Grotesk'] text-[11px] tracking-[0.2em] uppercase"
              style={{ color: p.text + "33" }}
            >
              Tap to begin
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
