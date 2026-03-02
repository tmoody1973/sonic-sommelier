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
const MUSIC_VOL_DURING_NARRATION = 0.15;
const MUSIC_VOL_FULL = 0.5;

export function StoryFlow({ experience }: { experience: Experience }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const spotifyIframeRef = useRef<HTMLIFrameElement | null>(null);
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
    setTimeout(() => {
      navigate(1);
    }, 2000); // 2s pause after narration before advancing
  }, [navigate]);

  // Get the Spotify track ID for the current course screen
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
      {/* Background Spotify player — plays the current course's track at low volume */}
      {currentTrack?.spotifyId && (
        <iframe
          key={currentTrack.spotifyId}
          ref={spotifyIframeRef}
          src={`https://open.spotify.com/embed/track/${currentTrack.spotifyId}?utm_source=generator&theme=0&autoplay=1`}
          width="0"
          height="0"
          allow="autoplay; clipboard-write; encrypted-media"
          className="absolute opacity-0 pointer-events-none"
          style={{ position: "absolute", top: -9999, left: -9999 }}
        />
      )}

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
          <div className="absolute bottom-10 left-0 right-0 z-50 px-6 max-w-md mx-auto">
            <NarrationPlayer
              key={currentScreen}
              audioUrl={experience.courses[currentScreen - 2].narrationAudioUrl!}
              palette={palette}
              onEnded={handleNarrationEnd}
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
}: {
  experience: Experience;
  onNarrationEnd: () => void;
}) {
  const p = experience.palette;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
      style={{
        background: `radial-gradient(ellipse at 50% 60%, ${p.primary}44, ${p.secondary})`,
      }}
    >
      <div className="text-center max-w-xl">
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
