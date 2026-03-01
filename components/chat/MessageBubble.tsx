export function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#7C9082]/20 text-[#F1E8D9] font-['Space_Grotesk']"
            : "bg-transparent text-[#F1E8D9]/70 font-['Instrument_Serif'] italic"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
