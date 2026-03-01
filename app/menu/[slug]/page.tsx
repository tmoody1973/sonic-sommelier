"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StoryFlow } from "@/components/experience/StoryFlow";
import { useParams } from "next/navigation";

export default function SharePage() {
  const params = useParams();
  const slug = params.slug as string;
  const experience = useQuery(api.experiences.getByShareSlug, { slug });

  if (experience === undefined) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="font-['Space_Grotesk'] text-[10px] tracking-[0.35em] uppercase text-[#C9B96B88]">
            Sonic Sommelier
          </div>
          <div className="mt-4 font-['Instrument_Serif'] text-lg italic text-[#F0E6D366]">
            Loading experience...
          </div>
        </div>
      </div>
    );
  }

  if (experience === null) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="font-['Space_Grotesk'] text-[10px] tracking-[0.35em] uppercase text-[#C9B96B88]">
            Sonic Sommelier
          </div>
          <div className="mt-4 font-['Playfair_Display'] text-2xl italic text-[#F0E6D3]">
            Experience not found
          </div>
          <p className="mt-2 font-['Instrument_Serif'] text-sm italic text-[#F0E6D366]">
            This menu may have been removed or is still being prepared.
          </p>
        </div>
      </div>
    );
  }

  return <StoryFlow experience={experience} />;
}
