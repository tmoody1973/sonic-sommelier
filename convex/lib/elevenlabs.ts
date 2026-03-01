/**
 * ElevenLabs text-to-speech helper.
 * Synthesizes narration audio from text using ElevenLabs v3 model.
 */

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<ArrayBuffer> {
  const voice = voiceId ?? "RILOU7YmBhvwJGDGjNmP";
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.6, similarity_boost: 0.8 },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
  return res.arrayBuffer();
}
