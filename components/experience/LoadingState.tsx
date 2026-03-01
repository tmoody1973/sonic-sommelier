"use client";

import { Palette } from "@/lib/types";

const STATUS_MESSAGES: Record<string, string> = {
  loading: "Preparing your table...",
  interpreting: "The Maitre D' is setting the mood...",
  curating_music: "The curator is selecting your soundtrack...",
  designing_menu: "The chef is designing your menu...",
  pairing_beverages: "The sommelier is selecting your wines...",
  generating_media: "Adding the finishing touches...",
  error: "Something went wrong. Please try again.",
};

export function LoadingState({ status, palette }: { status: string; palette: Palette | null }) {
  const colors = palette ?? {
    primary: "#2D3142",
    secondary: "#0f1015",
    accent: "#7C9082",
    text: "#F1E8D9",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: colors.secondary }}
    >
      <div className="text-center space-y-6">
        <div
          className="w-12 h-12 rounded-full mx-auto animate-pulse"
          style={{ backgroundColor: colors.accent + "33" }}
        />
        <p
          className="font-['Instrument_Serif'] italic text-lg"
          style={{ color: colors.text + "88" }}
        >
          {STATUS_MESSAGES[status] ?? "Preparing your experience..."}
        </p>
        <div
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: colors.accent + "44" }}
        >
          {status}
        </div>
      </div>
    </div>
  );
}
