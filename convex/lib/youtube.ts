/**
 * YouTube Data API v3 — search for track videos.
 *
 * Throws on error so the pipeline is aware of failures.
 */

const BASE_URL = "https://www.googleapis.com/youtube/v3";

// ─── Types ──────────────────────────────────────────────────────────────────

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: Record<string, { url: string; width: number; height: number }>;
    [key: string]: unknown;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search YouTube for the official audio of a track.
 * Returns the videoId of the top result, or null if none found.
 *
 * GET /search?part=snippet&type=video&q={query + " official audio"}&maxResults=1&key={apiKey}
 */
export async function searchVideo(
  query: string,
  apiKey: string
): Promise<string | null> {
  const q = encodeURIComponent(`${query} official audio`);
  const url = `${BASE_URL}/search?part=snippet&type=video&q=${q}&maxResults=1&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `YouTube search failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as YouTubeSearchResponse;

  if (!data.items || data.items.length === 0) {
    return null;
  }

  return data.items[0].id.videoId;
}
