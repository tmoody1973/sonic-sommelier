"use client";

import { motion } from "framer-motion";
import { Experience } from "@/lib/types";
import { RadarChart } from "./RadarChart";

export function SonicProfileScreen({
  experience,
}: {
  experience: Experience;
}) {
  const p = experience.palette;
  const profile = experience.sonicProfile;

  if (!profile) return null;

  const stats = [
    { label: "Energy", val: profile.energy.toFixed(2) },
    { label: "Valence", val: profile.valence.toFixed(2) },
    { label: "Acoustic", val: profile.acousticness.toFixed(2) },
  ];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
      style={{ background: p.secondary }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-center"
      >
        <div
          className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] uppercase mb-3"
          style={{ color: p.accent + "88" }}
        >
          Your Sonic Profile
        </div>
        <p
          className="font-['Instrument_Serif'] text-[17px] italic mb-8 max-w-[280px]"
          style={{ color: p.text + "88" }}
        >
          Your music told us something. Here&apos;s what we&apos;re serving.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <RadarChart data={profile} size={260} color={p.accent} animated />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        className="mt-8 flex gap-5 flex-wrap justify-center"
      >
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="font-['JetBrains_Mono'] text-xl font-light"
              style={{ color: p.accent }}
            >
              {s.val}
            </div>
            <div
              className="font-['Space_Grotesk'] text-[9px] tracking-[0.15em] uppercase mt-0.5"
              style={{ color: p.text + "44" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
