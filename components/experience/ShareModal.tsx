"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "@/lib/types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareSlug?: string;
  shareImageUrl?: string;
  title: string;
  palette: Palette;
}

export function ShareModal({
  isOpen,
  onClose,
  shareSlug,
  shareImageUrl,
  title,
  palette,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const p = palette;

  const shareUrl = shareSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/menu/${shareSlug}`
    : "";

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPoster = () => {
    if (!shareImageUrl) return;
    const a = document.createElement("a");
    a.href = shareImageUrl;
    a.download = `sonic-sommelier-${shareSlug ?? "poster"}.png`;
    a.click();
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Check out my Sonic Sommelier experience: "${title}" — AI-curated dining meets music. ${shareUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl overflow-hidden border"
            style={{
              backgroundColor: p.secondary,
              borderColor: p.accent + "20",
            }}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2
                  className="font-['Playfair_Display'] text-xl italic"
                  style={{ color: p.text }}
                >
                  Share Experience
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ color: p.text + "44" }}
                >
                  &times;
                </button>
              </div>
              <p
                className="font-['Instrument_Serif'] text-sm italic"
                style={{ color: p.text + "55" }}
              >
                &ldquo;{title}&rdquo;
              </p>
            </div>

            {/* Poster preview */}
            {shareImageUrl && (
              <div className="px-6 mb-4">
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: p.accent + "15" }}
                >
                  <img
                    src={shareImageUrl}
                    alt={`${title} poster`}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {!shareImageUrl && (
              <div
                className="mx-6 mb-4 rounded-xl h-32 flex items-center justify-center"
                style={{ backgroundColor: p.primary + "22" }}
              >
                <span
                  className="font-['Space_Grotesk'] text-xs tracking-wider"
                  style={{ color: p.text + "33" }}
                >
                  Poster generating...
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 pt-2 space-y-3">
              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className="w-full py-3 rounded-xl font-['Space_Grotesk'] text-sm tracking-wider transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: p.accent + "22",
                  color: p.accent,
                }}
              >
                {copied ? "Copied!" : "Copy Share Link"}
              </button>

              {/* Download poster */}
              <button
                onClick={handleDownloadPoster}
                disabled={!shareImageUrl}
                className="w-full py-3 rounded-xl font-['Space_Grotesk'] text-sm tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
                style={{
                  backgroundColor: p.text + "0a",
                  color: p.text + "88",
                }}
              >
                Download Poster
              </button>

              {/* Share to X/Twitter */}
              <button
                onClick={handleShareTwitter}
                disabled={!shareUrl}
                className="w-full py-3 rounded-xl font-['Space_Grotesk'] text-sm tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
                style={{
                  backgroundColor: p.text + "0a",
                  color: p.text + "88",
                }}
              >
                Share on X
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
