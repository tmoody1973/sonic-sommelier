/**
 * ElevenLabs text-to-speech helper.
 * Synthesizes narration audio from text using ElevenLabs v3 model.
 */

/** Strip markdown formatting that ElevenLabs can't handle. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.*?)\*/g, "$1")       // *italic*
    .replace(/__(.*?)__/g, "$1")       // __bold__
    .replace(/_(.*?)_/g, "$1")         // _italic_
    .replace(/`(.*?)`/g, "$1")         // `code`
    .replace(/#{1,6}\s/g, "")          // # headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url)
    .replace(/\n{3,}/g, "\n\n")        // collapse excess newlines
    .trim();
}

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<ArrayBuffer> {
  const voice = voiceId ?? "RILOU7YmBhvwJGDGjNmP";
  const cleanText = stripMarkdown(text);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.6, similarity_boost: 0.8 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs error (${res.status}): ${body}`);
  }
  return res.arrayBuffer();
}
