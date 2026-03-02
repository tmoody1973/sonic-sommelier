"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./MessageBubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Good evening. I'm your Ma\u00eetre D' \u2014 tell me about the experience you're craving. A mood, an artist, a song, a wine you love, or a dish you can't stop thinking about. I'll build your dinner from the sound.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const startGeneration = useAction(api.actions.generate.start);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);

    try {
      const experienceId = await startGeneration({ userInput: userMessage });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Your table is being prepared... Let me curate something extraordinary.",
        },
      ]);
      // Navigate to the experience page
      setTimeout(() => router.push(`/experience/${experienceId}`), 2000);
    } catch (error) {
      console.error("Generation failed:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Something went wrong: ${errMsg}`,
        },
      ]);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] h-[90vh] flex flex-col rounded-3xl overflow-hidden bg-[#0f1015] border border-[#F1E8D9]/5 shadow-2xl">
        {/* Header */}
        <div className="p-6 text-center border-b border-[#F1E8D9]/5">
          <div className="font-mono text-[9px] tracking-[0.35em] text-[#7C9082]/60 uppercase mb-2">
            Sonic Sommelier
          </div>
          <h1 className="font-['Playfair_Display'] text-xl italic text-[#F1E8D9]/90">
            The Ma&icirc;tre D&apos;
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt suggestions — only show before user has sent a message */}
        {messages.length === 1 && !isGenerating && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {[
              "Flute jazz on a rainy night",
              "Brazilian soul food",
              "Radiohead",
              "Late-night Coltrane",
              "Upbeat Afrobeat summer BBQ",
              "Mellow lo-fi & ramen",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="font-['Space_Grotesk'] text-[11px] px-3.5 py-2 rounded-full bg-transparent cursor-pointer transition-colors hover:bg-[#7C9082]/15"
                style={{
                  color: "#F1E8D9aa",
                  border: "1px solid rgba(241,232,217,0.08)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#F1E8D9]/5"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="A mood, an artist, a craving..."
              disabled={isGenerating}
              aria-label="Describe your dining experience — a mood, an artist, or a craving"
              className="flex-1 bg-[#F1E8D9]/5 rounded-full px-5 py-3 text-sm text-[#F1E8D9] placeholder-[#F1E8D9]/20 font-['Space_Grotesk'] border border-[#F1E8D9]/5 focus:outline-none focus:border-[#7C9082]/30"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              aria-label="Send message"
              className="w-11 h-11 rounded-full bg-[#7C9082] flex items-center justify-center text-[#0f1015] disabled:opacity-30 transition-opacity"
            >
              &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
