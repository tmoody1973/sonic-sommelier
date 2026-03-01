"use client";

import { motion } from "framer-motion";
import { Experience } from "@/lib/types";

export function FullMenuScreen({
  experience,
}: {
  experience: Experience;
}) {
  const p = experience.palette;
  const courses = experience.courses ?? [];

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-y-auto"
      style={{
        padding: "60px 28px 40px",
        background: `linear-gradient(to bottom, ${p.secondary}, ${p.primary}33)`,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-center mb-8"
      >
        <div
          className="font-['JetBrains_Mono'] text-[9px] tracking-[0.35em] uppercase mb-3"
          style={{ color: p.accent + "66" }}
        >
          The Complete Menu
        </div>
        <h2
          className="font-['Playfair_Display'] text-[32px] italic font-normal leading-[1.1] m-0"
          style={{ color: p.text }}
        >
          {experience.title}
        </h2>
      </motion.div>

      {/* Course list */}
      <div className="relative">
        {courses.map((c, i) => (
          <motion.div
            key={c.courseNumber}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
            className="flex gap-4 mb-6"
          >
            <div
              className="font-['JetBrains_Mono'] text-[11px] w-4 flex-shrink-0 pt-0.5"
              style={{ color: p.accent + "55" }}
            >
              {String(c.courseNumber).padStart(2, "0")}
            </div>
            <div className="flex-1">
              <div
                className="font-['Space_Grotesk'] text-[9px] tracking-[0.2em] uppercase mb-1"
                style={{ color: p.text + "33" }}
              >
                {c.courseType}
              </div>
              <div
                className="font-['Playfair_Display'] text-lg leading-[1.2] mb-1"
                style={{ color: p.text }}
              >
                {c.dishName}
              </div>
              {c.beverageName && (
                <div
                  className="font-['Instrument_Serif'] text-[13px] italic"
                  style={{ color: p.text + "55" }}
                >
                  {c.beverageName}
                </div>
              )}
              {experience.tracks?.[i] && (
                <div
                  className="font-['Space_Grotesk'] text-[11px] mt-1"
                  style={{ color: p.text + "33" }}
                >
                  &#9835; {experience.tracks[i].name} &mdash;{" "}
                  {experience.tracks[i].artist}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mx-auto my-6"
        style={{
          width: "40px",
          height: "1px",
          backgroundColor: p.accent + "33",
        }}
      />

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="flex flex-col gap-3 items-center"
      >
        <button
          className="font-['Space_Grotesk'] text-xs tracking-[0.15em] uppercase font-medium rounded-full px-9 py-3.5 cursor-pointer border-none"
          style={{ color: p.secondary, backgroundColor: p.accent }}
        >
          &#9654; Play Full Experience
        </button>
        {experience.shareSlug && (
          <button
            className="font-['Space_Grotesk'] text-[11px] tracking-[0.12em] uppercase rounded-full px-7 py-2.5 cursor-pointer bg-transparent"
            style={{
              color: p.text + "55",
              border: `1px solid ${p.text}15`,
            }}
          >
            Share Menu
          </button>
        )}
      </motion.div>
    </div>
  );
}
