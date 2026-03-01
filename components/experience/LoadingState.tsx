"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "@/lib/types";

interface Thought {
  agent: string;
  message: string;
  timestamp: number;
}

const AGENT_LABELS: Record<string, string> = {
  maitre_d: "Maitre D'",
  curator: "Music Curator",
  chef: "Chef",
  sommelier: "Sommelier",
};

const AGENT_ICONS: Record<string, string> = {
  maitre_d: "\u{1F3A9}",
  curator: "\u{1F3B5}",
  chef: "\u{1F468}\u{200D}\u{1F373}",
  sommelier: "\u{1F377}",
};

const STATUS_SUBTITLES: Record<string, string> = {
  loading: "Preparing your table...",
  interpreting: "Reading the room",
  curating_music: "Building your sonic journey",
  designing_menu: "Translating sound into flavor",
  pairing_beverages: "Selecting wines",
  generating_media: "Final preparations",
  error: "Something went wrong",
};

export function LoadingState({
  status,
  palette,
  thoughts,
}: {
  status: string;
  palette: Palette | null;
  thoughts?: Thought[];
}) {
  const colors = palette ?? {
    primary: "#2D3142",
    secondary: "#0f1015",
    accent: "#7C9082",
    text: "#F1E8D9",
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest thought
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts?.length]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        backgroundColor: colors.secondary,
        background: `radial-gradient(ellipse at 50% 30%, ${colors.primary}22, ${colors.secondary})`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4"
            style={{ color: colors.accent + "66" }}
          >
            Sonic Sommelier
          </div>

          {/* Animated pulse */}
          <motion.div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: colors.accent + "15" }}
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                `0 0 0 0 ${colors.accent}00`,
                `0 0 40px 10px ${colors.accent}15`,
                `0 0 0 0 ${colors.accent}00`,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors.accent }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="font-['Instrument_Serif'] italic text-lg"
              style={{ color: colors.text + "66" }}
            >
              {STATUS_SUBTITLES[status] ?? "Preparing your experience..."}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Thoughts stream — the waiter's inner monologue */}
        {thoughts && thoughts.length > 0 && (
          <div
            ref={scrollRef}
            className="space-y-3 max-h-[40vh] overflow-y-auto pr-2"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            {thoughts.map((thought, i) => (
              <motion.div
                key={thought.timestamp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i === thoughts.length - 1 ? 0.1 : 0, duration: 0.4 }}
                className="flex gap-3 items-start"
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  {AGENT_ICONS[thought.agent] ?? "\u{2728}"}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-['JetBrains_Mono'] text-[9px] tracking-[0.15em] uppercase mb-0.5"
                    style={{ color: colors.accent + "55" }}
                  >
                    {AGENT_LABELS[thought.agent] ?? thought.agent}
                  </div>
                  <p
                    className="font-['Space_Grotesk'] text-[13px] leading-[1.5] m-0"
                    style={{ color: colors.text + "aa" }}
                  >
                    {thought.message}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {status !== "error" && status !== "ready" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 items-center pl-10"
              >
                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: colors.text + "44",
                        animationDelay: `${j * 200}ms`,
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="text-center mt-4">
            <p
              className="font-['Space_Grotesk'] text-sm"
              style={{ color: colors.text + "55" }}
            >
              Something went wrong. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
