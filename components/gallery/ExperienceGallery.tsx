"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { UserButton } from "@clerk/nextjs";

const STATUS_LABELS: Record<string, string> = {
  interpreting: "Interpreting...",
  curating_music: "Curating music...",
  designing_menu: "Designing menu...",
  pairing_beverages: "Pairing wines...",
  generating_media: "Generating media...",
  ready: "Ready",
  error: "Error",
};

export function ExperienceGallery({ onCreateNew }: { onCreateNew: () => void }) {
  const experiences = useQuery(api.experiences.listByUser);
  const router = useRouter();

  if (!experiences) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#F1E8D9]/30 font-mono text-sm tracking-widest">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="font-mono text-[9px] tracking-[0.35em] text-[#7C9082]/60 uppercase mb-3">
              Sonic Sommelier
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl italic text-[#F1E8D9]/90">
              Your Experiences
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onCreateNew}
              className="px-6 py-3 rounded-full bg-[#7C9082] text-[#0f1015] font-['Space_Grotesk'] text-sm tracking-wider uppercase font-medium hover:bg-[#8DA693] transition-colors"
            >
              + New
            </button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </div>

        {experiences.length === 0 ? (
          <EmptyState onCreateNew={onCreateNew} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <ExperienceCard
                  experience={exp}
                  onClick={() => router.push(`/experience/${exp._id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExperienceCard({
  experience,
  onClick,
}: {
  experience: {
    _id: Id<"experiences">;
    title: string;
    subtitle: string;
    status: string;
    palette: { primary: string; secondary: string; accent: string; text: string; gradientStart: string; gradientEnd: string };
    courses?: Array<{ dishName: string; courseType: string }>;
    tracks?: Array<{ name: string; artist: string; albumArt: string }>;
    shareSlug?: string;
    createdAt: number;
  };
  onClick: () => void;
}) {
  const p = experience.palette;
  const isReady = experience.status === "ready";
  const isError = experience.status === "error";
  const courseCount = experience.courses?.length ?? 0;
  const trackCount = experience.tracks?.length ?? 0;
  const date = new Date(experience.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteExperience = useMutation(api.experiences.remove);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteExperience({ id: experience._id });
  };

  return (
    <div
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group cursor-pointer relative"
      style={{
        borderColor: p.accent + "15",
        backgroundColor: p.secondary,
      }}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: confirmDelete ? "#ff4444" + "33" : p.text + "15",
          color: confirmDelete ? "#ff4444" : p.text + "55",
        }}
        title={confirmDelete ? "Click again to confirm" : "Delete experience"}
      >
        {confirmDelete ? "!" : "\u00D7"}
      </button>

      {/* Gradient header */}
      <div
        className="h-32 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${p.gradientStart}, ${p.gradientEnd})`,
        }}
      >
        {/* Album art mosaic */}
        {experience.tracks && experience.tracks.length > 0 && (
          <div className="absolute inset-0 flex opacity-20 group-hover:opacity-30 transition-opacity">
            {experience.tracks.slice(0, 5).map((t, i) => (
              t.albumArt && (
                <div
                  key={i}
                  className="flex-1 bg-cover bg-center"
                  style={{ backgroundImage: `url(${t.albumArt})` }}
                />
              )
            ))}
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-['Space_Grotesk'] tracking-wider uppercase font-medium"
            style={{
              backgroundColor: isReady
                ? p.accent + "33"
                : isError
                ? "#ff4444" + "33"
                : p.text + "15",
              color: isReady ? p.accent : isError ? "#ff4444" : p.text + "88",
            }}
          >
            {STATUS_LABELS[experience.status] ?? experience.status}
          </span>
        </div>

        {/* Date */}
        <div
          className="absolute bottom-3 left-4 font-mono text-[10px] tracking-wider"
          style={{ color: p.text + "44" }}
        >
          {date}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3
          className="font-['Playfair_Display'] text-lg italic leading-tight mb-1.5 line-clamp-1"
          style={{ color: p.text }}
        >
          {experience.title}
        </h3>
        <p
          className="font-['Instrument_Serif'] text-sm italic mb-4 line-clamp-2"
          style={{ color: p.text + "55" }}
        >
          {experience.subtitle}
        </p>

        {isReady && (
          <div
            className="flex items-center gap-4 text-[11px] font-['Space_Grotesk'] tracking-wider"
            style={{ color: p.text + "44" }}
          >
            {trackCount > 0 && <span>{trackCount} tracks</span>}
            {courseCount > 0 && <span>{courseCount} courses</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-6 opacity-30">&#127925;</div>
      <h2 className="font-['Playfair_Display'] text-2xl italic text-[#F1E8D9]/60 mb-3">
        No experiences yet
      </h2>
      <p className="font-['Instrument_Serif'] text-base italic text-[#F1E8D9]/30 mb-8 max-w-sm">
        Tell the Ma&icirc;tre D&apos; about a mood, an artist, or a craving —
        and we&apos;ll build your dinner from the sound.
      </p>
      <button
        onClick={onCreateNew}
        className="px-8 py-3 rounded-full bg-[#7C9082] text-[#0f1015] font-['Space_Grotesk'] text-sm tracking-wider uppercase font-medium hover:bg-[#8DA693] transition-colors"
      >
        Create Your First Experience
      </button>
    </div>
  );
}
