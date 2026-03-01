/**
 * SoundStat.info API — audio feature analysis.
 * Base URL: https://api.soundstat.info/api/v1
 * Auth: x-api-key header.
 *
 * All functions throw on error so the pipeline is aware of failures.
 */

const BASE_URL = "https://api.soundstat.info/api/v1";

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

export interface TrackFeaturesResponse {
  audio_features: AudioFeatures;
  [key: string]: unknown;
}

export interface MoodRecommendation {
  track_id: string;
  name: string;
  artist: string;
  [key: string]: unknown;
}

export interface ProgressionResponse {
  tracks: Array<{
    track_id: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface SimilarTrack {
  track_id: string;
  name: string;
  artist: string;
  [key: string]: unknown;
}

export interface FeatureSearchResult {
  tracks: Array<{
    track_id: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function post(
  path: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
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
      `SoundStat ${path} failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get audio features for a track by its Spotify ID.
 * POST /track/{spotify_id}
 */
export async function getTrackFeatures(
  spotifyId: string,
  apiKey: string
): Promise<TrackFeaturesResponse> {
  return (await post(`/track/${encodeURIComponent(spotifyId)}`, apiKey, {})) as TrackFeaturesResponse;
}

/**
 * Search for track recommendations by mood.
 * POST /recommendations/mood
 */
export async function searchByMood(
  mood: string,
  apiKey: string,
  limit: number = 10
): Promise<MoodRecommendation[]> {
  return (await post("/recommendations/mood", apiKey, {
    mood,
    limit,
  })) as MoodRecommendation[];
}

/**
 * Get a progression of tracks from a seed toward target audio features.
 * POST /recommendations/progression
 */
export async function getProgression(
  seedTrackId: string,
  targetFeatures: Record<string, number>,
  steps: number,
  apiKey: string
): Promise<ProgressionResponse> {
  return (await post("/recommendations/progression", apiKey, {
    seed_track_id: seedTrackId,
    target_features: targetFeatures,
    steps,
  })) as ProgressionResponse;
}

/**
 * Get tracks similar to a given Spotify track.
 * POST /recommendations/similar
 */
export async function getSimilarTracks(
  spotifyId: string,
  apiKey: string,
  limit: number = 5
): Promise<SimilarTrack[]> {
  return (await post("/recommendations/similar", apiKey, {
    track_id: spotifyId,
    limit,
  })) as SimilarTrack[];
}

/**
 * Search for tracks matching specific audio feature ranges.
 * POST /recommendations/by-features
 */
export async function searchByFeatures(
  features: Record<string, unknown>,
  apiKey: string,
  limit: number = 10
): Promise<FeatureSearchResult> {
  return (await post("/recommendations/by-features", apiKey, {
    ...features,
    limit,
  })) as FeatureSearchResult;
}
