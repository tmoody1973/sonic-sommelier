"use client";

import { useState, useEffect } from "react";
import { Course, Track, Palette } from "@/lib/types";

interface CourseCardProps {
  course: Course;
  track: Track;
  palette: Palette;
}

function AudioBars({
  features,
  color,
}: {
  features: {
    energy: number;
    valence: number;
    tempo: number;
    danceability: number;
    acousticness: number;
  };
  color: string;
}) {
  const bars = [
    { label: "NRG", val: features.energy },
    { label: "VAL", val: features.valence },
    { label: "BPM", val: features.tempo / 200 },
    { label: "DNC", val: features.danceability },
    { label: "ACU", val: features.acousticness },
  ];
  return (
    <div className="flex gap-2.5 items-end">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className="w-1.5 rounded-full opacity-70"
            style={{
              backgroundColor: color,
              height: `${Math.max(b.val * 40, 4)}px`,
              transition: `height 1s ease-out ${i * 100 + 1800}ms`,
            }}
          />
          <span
            className="text-[8px] font-['JetBrains_Mono'] tracking-[0.05em]"
            style={{ color: "rgba(240,230,211,0.35)" }}
          >
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const DISH_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)",
  "linear-gradient(135deg, #2d1b3d 0%, #1a3a2a 40%, #2d4a22 70%, #1a1a2e 100%)",
  "linear-gradient(135deg, #3d1b1b 0%, #2d1b3d 40%, #1a1a2e 70%, #16213e 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 30%, #4a1942 60%, #1a1a2e 100%)",
  "linear-gradient(135deg, #1b2d1b 0%, #1a2e1a 40%, #2d4a22 70%, #1a3a3a 100%)",
];

export function CourseCard({ course, track, palette }: CourseCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [pairingVisible, setPairingVisible] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setPairingVisible(false);
    const t1 = setTimeout(() => setRevealed(true), 100);
    const t2 = setTimeout(() => setPairingVisible(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [course.courseNumber]);

  const bgImage = course.aiImageUrl
    ? `url(${course.aiImageUrl})`
    : DISH_GRADIENTS[(course.courseNumber - 1) % 5];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: palette.secondary }}
    >
      {/* Background image with Ken Burns */}
      <div
        className="absolute"
        style={{
          inset: "-5%",
          width: "110%",
          height: "110%",
          background: bgImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: revealed ? 0.7 : 0,
          transition: "opacity 0.8s ease-out, transform 8s linear",
          transform: revealed ? "scale(1.05)" : "scale(1.0)",
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, rgba(13,13,13,0.3) 30%, rgba(13,13,13,0.75) 55%, rgba(13,13,13,0.95) 80%)`,
        }}
      />

      {/* Content */}
      <div
        className="relative h-full flex flex-col justify-end"
        style={{ padding: "32px 28px 40px" }}
      >
        {/* Course label -- top left */}
        <div
          className="absolute left-7"
          style={{
            top: "48px",
            opacity: revealed ? 0.6 : 0,
            transform: revealed ? "translateY(0)" : "translateY(-15px)",
            transition: "all 0.5s ease-out 0.2s",
          }}
        >
          <span
            className="font-['Space_Grotesk'] text-[11px] tracking-[0.25em] uppercase"
            style={{ color: palette.text }}
          >
            Course {course.courseNumber} &middot; {course.courseType}
          </span>
        </div>

        {/* Arc role */}
        <div
          className="absolute left-7"
          style={{
            top: "72px",
            opacity: revealed ? 0.35 : 0,
            transform: revealed ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.4s ease-out 0.35s",
          }}
        >
          <span
            className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em]"
            style={{ color: palette.accent }}
          >
            {course.arcRole}
          </span>
        </div>

        {/* Audio bars -- top right */}
        <div
          className="absolute right-7"
          style={{
            top: "52px",
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.5s ease-out 2s",
          }}
        >
          <AudioBars features={track.audioFeatures} color={palette.accent} />
        </div>

        {/* Dish info */}
        <div className="mb-2">
          <h2
            className="font-['Playfair_Display'] text-[34px] leading-[1.1] font-normal m-0"
            style={{
              color: palette.text,
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(25px)",
              transition:
                "all 0.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.4s",
            }}
          >
            {course.dishName}
          </h2>
          <p
            className="font-['Instrument_Serif'] text-[15px] leading-[1.55] italic mt-2.5"
            style={{
              color: palette.text + "99",
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(15px)",
              transition: "all 0.5s ease-out 0.65s",
            }}
          >
            {course.dishDescription}
          </p>
        </div>

        {/* Narration text — appears when media step delivers it */}
        {course.narrationText && (
          <p
            className="font-['Instrument_Serif'] text-[13px] leading-[1.6] italic mb-2"
            style={{
              color: palette.accent + "88",
              opacity: revealed ? 1 : 0,
              transition: "opacity 0.6s ease-out 0.8s",
            }}
          >
            {course.narrationText}
          </p>
        )}

        {/* Divider */}
        <div
          className="my-3"
          style={{
            width: pairingVisible ? "60px" : "0px",
            height: "1px",
            backgroundColor: palette.accent,
            transition: "width 0.6s ease-out",
            opacity: 0.4,
          }}
        />

        {/* Pairing section */}
        <div
          style={{
            opacity: pairingVisible ? 1 : 0,
            transform: pairingVisible ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        >
          {/* Spotify embed player — 30s preview, no auth needed */}
          {track.spotifyId && (
            <div
              className="mb-3 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://open.spotify.com/embed/track/${track.spotifyId}?utm_source=generator&theme=0`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: "12px" }}
              />
            </div>
          )}

          {/* Fallback track info (if no Spotify embed) */}
          {!track.spotifyId && (
            <div className="flex items-center gap-3 mb-3.5">
              <div
                className="w-11 h-11 rounded-md flex-shrink-0 flex items-center justify-center"
                style={{
                  background: track.albumArt
                    ? `url(${track.albumArt}) center/cover`
                    : `linear-gradient(135deg, ${palette.primary}, ${palette.accent}40)`,
                }}
              >
                {!track.albumArt && <span className="text-lg">&#9835;</span>}
              </div>
              <div>
                <div
                  className="font-['Space_Grotesk'] text-[13px] font-medium"
                  style={{ color: palette.text }}
                >
                  {track.name}
                </div>
                <div
                  className="font-['Space_Grotesk'] text-[11px]"
                  style={{ color: palette.text + "66" }}
                >
                  {track.artist} &middot; {track.album}
                </div>
              </div>
            </div>
          )}

          {/* Wine pairing */}
          {course.beverageName && (
            <div
              className="rounded-xl p-3.5"
              style={{
                background: "rgba(240,230,211,0.04)",
                border: "1px solid rgba(240,230,211,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-['JetBrains_Mono'] text-[9px] tracking-[0.15em] uppercase opacity-80"
                  style={{ color: palette.accent }}
                >
                  {course.beverageType === "sake" ? "SAKE" : "WINE"}
                </span>
                {course.servingTemp && (
                  <span
                    className="font-['JetBrains_Mono'] text-[9px]"
                    style={{ color: palette.text + "44" }}
                  >
                    {course.servingTemp}
                  </span>
                )}
              </div>
              <div
                className="font-['Instrument_Serif'] text-[15px] mb-1.5"
                style={{ color: palette.text }}
              >
                {course.beverageName}
              </div>
              {course.tastingNote && (
                <p
                  className="font-['Space_Grotesk'] text-xs leading-[1.5] m-0"
                  style={{ color: palette.text + "77" }}
                >
                  {course.tastingNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
