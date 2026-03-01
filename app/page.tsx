"use client";

import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ExperienceGallery } from "@/components/gallery/ExperienceGallery";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [view, setView] = useState<"gallery" | "create">("gallery");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#F1E8D9]/30 font-mono text-sm tracking-widest">
          SONIC SOMMELIER
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-8">
        <h1 className="font-['Playfair_Display'] text-4xl italic text-[#F1E8D9]">
          Sonic Sommelier
        </h1>
        <p className="text-[#F1E8D9]/50 font-['Instrument_Serif'] italic">
          AI-curated dining experiences driven by music
        </p>
        <SignInButton mode="modal">
          <button className="px-8 py-3 rounded-full bg-[#7C9082] text-[#0f1015] font-['Space_Grotesk'] text-sm tracking-wider uppercase font-medium">
            Enter
          </button>
        </SignInButton>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="relative">
        <button
          onClick={() => setView("gallery")}
          className="absolute top-6 left-6 z-50 px-4 py-2 rounded-full bg-[#F1E8D9]/5 text-[#F1E8D9]/40 font-['Space_Grotesk'] text-xs tracking-wider uppercase hover:bg-[#F1E8D9]/10 transition-colors"
        >
          &larr; Gallery
        </button>
        <ChatInterface />
      </div>
    );
  }

  return <ExperienceGallery onCreateNew={() => setView("create")} />;
}
