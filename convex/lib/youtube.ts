/**
 * YouTube Data API v3 — search for track videos.
 * Based on the crate-cli YouTube search implementation.
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const FETCH_TIMEOUT_MS = 15000;

/**
 * Search YouTube for the official audio/video of a track.
 * Uses videoCategoryId=10 (Music) for better results.
 * Returns the videoId of the top result, or null if none found.
 */
export async function searchVideo(
  query: string,
  apiKey: string
): Promise<string | null> {
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: `${query} official audio`,
    type: "video",
    videoCategoryId: "10", // Music category
    maxResults: "1",
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`YouTube search failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };

    return data.items?.[0]?.id?.videoId ?? null;
  } finally {
    clearTimeout(timer);
  }
}
