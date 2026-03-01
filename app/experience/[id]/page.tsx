"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { StoryFlow } from "@/components/experience/StoryFlow";
import { LoadingState } from "@/components/experience/LoadingState";

export default function ExperiencePage() {
  const params = useParams();
  const router = useRouter();
  const experienceId = params.id as Id<"experiences">;
  const experience = useQuery(api.experiences.get, { id: experienceId });

  if (!experience) {
    return <LoadingState status="loading" palette={null} />;
  }

  if (experience.status !== "ready") {
    return (
      <LoadingState
        status={experience.status}
        palette={experience.palette}
        thoughts={experience.thoughts}
      />
    );
  }

  return (
    <div className="relative">
      {/* Back to gallery */}
      <button
        onClick={() => router.push("/")}
        className="fixed top-6 left-6 z-[60] px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm text-white/40 font-['Space_Grotesk'] text-xs tracking-wider uppercase hover:bg-black/50 hover:text-white/60 transition-colors"
      >
        &larr; Gallery
      </button>
      <StoryFlow experience={experience} />
    </div>
  );
}
