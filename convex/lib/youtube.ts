/**
 * YouTube video search — scrapes YouTube search results page
 * to extract video IDs. No API key required.
 */

const FETCH_TIMEOUT_MS = 15000;

/**
 * Search YouTube for the official audio/video of a track.
 * Scrapes the search results HTML to extract the first video ID.
 * Returns the videoId of the top result, or null if none found.
 */
export async function searchVideo(
  query: string,
  _apiKey?: string // kept for backwards compat, not used
): Promise<string | null> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${query} official audio`
  )}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.error(`YouTube search HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // YouTube embeds video IDs in the page as "videoId":"XXXXXXXXXXX"
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match?.[1]) {
      return match[1];
    }

    // Fallback: look for /watch?v= links
    const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch?.[1]) {
      return watchMatch[1];
    }

    return null;
  } catch (err) {
    console.error("YouTube search failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
