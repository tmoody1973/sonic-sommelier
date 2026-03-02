import { NextResponse } from "next/server";

/**
 * GET /api/seed-art
 * Fetches album art from Spotify for a curated selection of seed list tracks.
 * Uses Client Credentials flow (no user auth needed).
 * Results are cached for 24 hours.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

// Curated selection from the 150-track seed list — diverse, recognizable album art
const SEED_QUERIES = [
  "Little Simz Fear No Man",
  "Noname Rainforest",
  "Thundercat Them Changes",
  "Khruangbin Time You and I",
  "Nubya Garcia Source",
  "Sault Free",
  "Shabaka Hutchings Black Skin Black Sun",
  "Flying Lotus Never Catch Me",
  "Floating Points Cascade",
  "Hiatus Kaiyote Breathing Underwater",
  "Jordan Rakei Wallflower",
  "Tom Misch South of the River",
  "Kaytranada Glowed Up",
  "BadBadNotGood Time Moves Slow",
  "Robert Glasper Black Radio",
  "Erykah Badu On & On",
  "Madlib Shades of Blue",
  "Mulatu Astatke Yekermo Sew",
  "Marcos Valle Estrelar",
  "Nujabes Feather",
  "Bonobo Kerala",
  "Yussef Dayes Black Classical Music",
  "Little Dragon Ritual Union",
  "Sampha Process",
];

async function getToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Spotify credentials");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Token failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  try {
    const token = await getToken();

    const results = await Promise.allSettled(
      SEED_QUERIES.map(async (query) => {
        const q = encodeURIComponent(query);
        const res = await fetch(`${SEARCH_URL}?type=track&q=${q}&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const track = data.tracks?.items?.[0];
        if (!track) return null;
        return {
          artist: track.artists?.[0]?.name ?? "",
          track: track.name,
          albumArt: track.album?.images?.[1]?.url ?? track.album?.images?.[0]?.url ?? "",
          album: track.album?.name ?? "",
        };
      })
    );

    const art = results
      .filter(
        (r): r is PromiseFulfilledResult<{
          artist: string;
          track: string;
          albumArt: string;
          album: string;
        }> =>
          r.status === "fulfilled" &&
          r.value != null &&
          typeof r.value === "object" &&
          "albumArt" in (r.value as Record<string, unknown>) &&
          (r.value as { albumArt: string }).albumArt !== ""
      )
      .map((r) => r.value);

    return NextResponse.json(art, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err) {
    console.error("Seed art fetch failed:", err);
    return NextResponse.json([], { status: 500 });
  }
}
