/**
 * SoundStat API — audio feature analysis and music recommendations.
 * Base URL: https://soundstat.info/api/v1
 * Auth: x-api-key header.
 */

const BASE_URL = "https://soundstat.info/api/v1";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AudioFeatures {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  key: number;
  mode: number;
  [key: string]: unknown;
}

export interface TrackAnalysis {
  audio_features?: AudioFeatures;
  [key: string]: unknown;
}

export interface MoodRecommendation {
  track_id: string;
  name?: string;
  artist?: string;
  [key: string]: unknown;
}

export interface SimilarTrack {
  track_id: string;
  name?: string;
  artist?: string;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function get(
  path: string,
  apiKey: string
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SoundStat GET ${path} failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

async function post(
  path: string,
  apiKey: string,
  body: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<unknown> {
  let url = `${BASE_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SoundStat POST ${path} failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get audio analysis for a track by its Spotify ID.
 * GET /track/{track_id}
 */
export async function getTrackFeatures(
  spotifyId: string,
  apiKey: string
): Promise<TrackAnalysis> {
  return (await get(
    `/track/${encodeURIComponent(spotifyId)}`,
    apiKey
  )) as TrackAnalysis;
}

/**
 * Search for tracks matching a desired mood.
 * POST /recommendations/mood
 * mood: happy | sad | energetic | relaxed | danceable
 */
export async function searchByMood(
  mood: string,
  apiKey: string,
  limit: number = 10
): Promise<MoodRecommendation[]> {
  const result = await post("/recommendations/mood", apiKey, {
    mood,
    limit,
  });
  return (result as { tracks?: MoodRecommendation[] })?.tracks ?? (result as MoodRecommendation[]);
}

/**
 * Get tracks similar to a seed track.
 * GET /recommendations/similar?seed_track_id=...&limit=...
 */
export async function getSimilarTracks(
  spotifyId: string,
  apiKey: string,
  limit: number = 5
): Promise<SimilarTrack[]> {
  const result = await get(
    `/recommendations/similar?seed_track_id=${encodeURIComponent(spotifyId)}&limit=${limit}`,
    apiKey
  );
  return (result as { tracks?: SimilarTrack[] })?.tracks ?? (result as SimilarTrack[]);
}

/**
 * Search for tracks matching specific audio feature targets.
 * POST /recommendations/by-features
 */
export async function searchByFeatures(
  features: Record<string, unknown>,
  apiKey: string,
  limit: number = 10
): Promise<unknown> {
  return post("/recommendations/by-features", apiKey, {
    features,
    limit,
  });
}

/**
 * Get a progression of tracks with changing characteristics.
 * POST /recommendations/progression
 */
export async function getProgression(
  parameter: string,
  direction: string,
  steps: number,
  apiKey: string
): Promise<unknown> {
  return post("/recommendations/progression", apiKey, {
    parameter,
    direction,
    steps,
  });
}
