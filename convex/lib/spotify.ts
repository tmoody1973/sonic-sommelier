/**
 * Spotify Web API v1 — metadata and images.
 * Uses Client Credentials flow (no user login).
 * Base URL: https://api.spotify.com
 *
 * All functions throw on error so the pipeline is aware of failures.
 */

const BASE_URL = "https://api.spotify.com";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  [key: string]: unknown;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  [key: string]: unknown;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  [key: string]: unknown;
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    [key: string]: unknown;
  };
}

export interface SpotifyArtistFull extends SpotifyArtist {
  followers?: { total: number };
  popularity?: number;
}

// ─── Token Cache ────────────────────────────────────────────────────────────

let cachedToken: TokenData | null = null;

/**
 * Get an access token using Client Credentials flow.
 * Caches the token and reuses it until 60 seconds before expiry.
 */
async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Spotify token request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function spotifyGet(
  path: string,
  clientId: string,
  clientSecret: string
): Promise<unknown> {
  const token = await getAccessToken(clientId, clientSecret);

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Spotify GET ${path} failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search for tracks matching a query string.
 * GET /v1/search?type=track&q={query}&limit=5
 */
export async function searchTrack(
  query: string,
  clientId: string,
  clientSecret: string
): Promise<SpotifySearchResult> {
  const q = encodeURIComponent(query);
  return (await spotifyGet(
    `/v1/search?type=track&q=${q}&limit=5`,
    clientId,
    clientSecret
  )) as SpotifySearchResult;
}

/**
 * Get a single track by its Spotify ID.
 * GET /v1/tracks/{trackId}
 */
export async function getTrack(
  trackId: string,
  clientId: string,
  clientSecret: string
): Promise<SpotifyTrack> {
  return (await spotifyGet(
    `/v1/tracks/${encodeURIComponent(trackId)}`,
    clientId,
    clientSecret
  )) as SpotifyTrack;
}

/**
 * Get an artist by their Spotify ID.
 * GET /v1/artists/{artistId}
 */
export async function getArtist(
  artistId: string,
  clientId: string,
  clientSecret: string
): Promise<SpotifyArtistFull> {
  return (await spotifyGet(
    `/v1/artists/${encodeURIComponent(artistId)}`,
    clientId,
    clientSecret
  )) as SpotifyArtistFull;
}
