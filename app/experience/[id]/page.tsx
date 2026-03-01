"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { StoryFlow } from "@/components/experience/StoryFlow";
import { LoadingState } from "@/components/experience/LoadingState";

export default function ExperiencePage() {
  const params = useParams();
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

  return <StoryFlow experience={experience} />;
}
