"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Palette } from "@/lib/types";

interface NarrationPlayerProps {
  audioUrl: string;
  palette: Palette;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function NarrationPlayer({
  audioUrl,
  palette,
  autoPlay = true,
  onEnded,
  onPlay,
  onPause,
}: NarrationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const p = palette;

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(1);
      onEnded?.();
    });

    audio.addEventListener("play", () => {
      setIsPlaying(true);
      onPlay?.();
    });
    audio.addEventListener("pause", () => {
      setIsPlaying(false);
      onPause?.();
    });

    // Handle audio errors gracefully
    audio.addEventListener("error", () => {
      setIsPlaying(false);
    });

    if (autoPlay) {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl, autoPlay, onEnded, onPlay, onPause]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = x * duration;
  }, [duration]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-full backdrop-blur-md"
      style={{ backgroundColor: "rgba(13,13,13,0.75)", border: `1px solid ${p.text}10` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          backgroundColor: p.accent + "22",
          color: p.accent,
        }}
      >
        <span className="text-[11px]">
          {isPlaying ? "\u275A\u275A" : "\u25B6"}
        </span>
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-1 rounded-full cursor-pointer relative"
        style={{ backgroundColor: p.text + "10" }}
        onClick={handleSeek}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: p.accent + "66",
          }}
        />
      </div>

      {/* Time */}
      <span
        className="font-['JetBrains_Mono'] text-[10px] flex-shrink-0 tabular-nums"
        style={{ color: p.text + "33" }}
      >
        {duration > 0
          ? formatTime(progress * duration)
          : "0:00"}
      </span>
    </motion.div>
  );
}
