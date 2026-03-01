/**
 * Gemini image generation helper.
 * Uses Gemini 3.1 Flash to generate images from text prompts.
 * Returns base64-encoded image data or null on failure.
 */

export async function generateImage(
  prompt: string,
  apiKey: string,
  aspectRatio: string = "4:3"
): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio },
        },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );
  return imagePart?.inlineData?.data ?? null;
}
