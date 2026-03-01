"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";
import * as spotify from "../lib/spotify";
import * as youtube from "../lib/youtube";
import { computeAggregateProfile, derivePalette } from "../lib/palette";
import seedData from "../lib/rhythm_lab_seed_list.json";

/**
 * Build a compact seed list reference for the agent prompt.
 * Groups all 150 tracks by category. Using mistral-large-latest (128K context).
 */
function buildSeedReference(): string {
  const cats: Record<string, string[]> = {};
  for (const t of seedData.tracks) {
    if (!cats[t.category]) cats[t.category] = [];
    cats[t.category].push(`${t.artist} — "${t.track}"`);
  }
  const lines = Object.entries(cats).map(
    ([cat, tracks]) => `  ${cat}: ${tracks.join(", ")}`
  );
  return lines.join("\n");
}

/**
 * Step 2: Music Curator — selects 5 real tracks forming a dining arc.
 * Uses Mistral's deep music knowledge + Spotify search for verification.
 * No SoundStat dependency — the agent IS the curator.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const think = (message: string) =>
      ctx.runMutation(internal.experiences.addThought, {
        id: args.experienceId,
        agent: "curator",
        message,
      });

    try {
      const client = createMistralClient(process.env.MISTRAL_API_KEY!);
      const agentId = process.env.MUSIC_CURATOR_AGENT_ID!;

      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.brief) throw new Error("No brief found");

      await think("Building your sonic journey. Let me find the perfect tracks...");

      const seedReference = buildSeedReference();
      const keyLabels = seedData.metadata.key_labels.join(", ");

      const prompt = `You are a music curator for Rhythm Lab Radio — Tarik Moody's genre-defying show weaving hip-hop, electronic, soul, jazz, Afrobeat, and world music into intentional sets.

TASTE DNA — Reference tracks (3 per category from 150-track seed list):
${seedReference}

Key labels: ${keyLabels}
Select tracks that share sonic DNA with these references. Prioritize discovery but anchor in this taste.

Mood: ${experience.brief.mood}
Cuisine: ${experience.brief.cuisineDirection}
Occasion: ${experience.brief.occasion}

Music must complement food and wine:
- Delicate dishes → airy, acoustic | Bold dishes → deep grooves, warm bass
- French/Italian → jazz, chanson | Japanese → ambient, minimalist
- Latin → Afro-Latin rhythms, bossa nova | American → soul, R&B, hip-hop

Select 5 REAL Spotify tracks. Use search_spotify_tracks to verify each. Curate a dining arc:
1. Arrival (atmospheric) — textured, inviting
2. Opening (warming) — groove that opens the palate
3. Deepening (complex) — layers, depth, richness
4. Peak (intense) — bold, powerful
5. Resolution (gentle) — reflective closer

Estimate audio features per track (energy, valence, tempo, danceability, acousticness 0-1, tempo BPM).
Return JSON array of 5 objects with: name, artist, spotifyId, audioFeatures.`;

      const result = await runAgentConversation(client, agentId, prompt, 20);

      let curatedTracks;
      try {
        curatedTracks = parseAgentJson(result) as any[];
      } catch {
        await ctx.runMutation(internal.experiences.updateStatus, {
          id: args.experienceId,
          status: "error",
        });
        return;
      }

      const spClientId = process.env.SPOTIFY_CLIENT_ID!;
      const spSecret = process.env.SPOTIFY_CLIENT_SECRET!;
      const ytKey = process.env.YOUTUBE_API_KEY!;

      // Enrich each track with Spotify metadata, YouTube video, and artist images
      const enrichedTracks = await Promise.all(
        curatedTracks.map(async (track: Record<string, unknown>, i: number) => {
          await think(
            `Track ${i + 1}: "${track.name}" by ${track.artist}`
          );

          let spotifyData;
          try {
            spotifyData = await spotify.getTrack(
              track.spotifyId as string,
              spClientId,
              spSecret
            );
          } catch {
            const searchResult = await spotify.searchTrack(
              `${track.artist} ${track.name}`,
              spClientId,
              spSecret
            );
            spotifyData = searchResult.tracks?.items?.[0];
          }

          let videoId: string | null = null;
          try {
            videoId = await youtube.searchVideo(
              `${track.artist} ${track.name}`,
              ytKey
            );
          } catch {
            // Continue without YouTube video
          }

          let artistImage = "";
          if (spotifyData?.artists?.[0]?.id) {
            try {
              const artistData = await spotify.getArtist(
                spotifyData.artists[0].id,
                spClientId,
                spSecret
              );
              artistImage = artistData.images?.[0]?.url ?? "";
            } catch {
              // Continue without artist image
            }
          }

          // Use agent-estimated features or sensible defaults
          const rawFeatures =
            (track.audioFeatures as Record<string, number>) ?? {};
          const audioFeatures = {
            energy: Number(rawFeatures.energy ?? 0.5),
            valence: Number(rawFeatures.valence ?? 0.5),
            tempo: Number(rawFeatures.tempo ?? 120),
            danceability: Number(rawFeatures.danceability ?? 0.5),
            acousticness: Number(rawFeatures.acousticness ?? 0.5),
            key: Number(rawFeatures.key ?? 0),
            mode: Number(rawFeatures.mode ?? 1),
          };

          return {
            spotifyId: spotifyData?.id ?? (track.spotifyId as string),
            name: spotifyData?.name ?? (track.name as string),
            artist:
              spotifyData?.artists?.[0]?.name ?? (track.artist as string),
            album: spotifyData?.album?.name ?? "",
            albumArt: spotifyData?.album?.images?.[0]?.url ?? "",
            artistImage,
            youtubeVideoId: videoId ?? "",
            audioFeatures,
          };
        })
      );

      await think("All 5 tracks locked in. Computing your sonic profile...");

      const sonicProfile = computeAggregateProfile(enrichedTracks);
      const palette = derivePalette(sonicProfile);

      await ctx.runMutation(internal.experiences.updateTracks, {
        id: args.experienceId,
        tracks: enrichedTracks,
        sonicProfile,
        palette,
      });

      await think("Handing off to the Chef to design your menu...");

      await ctx.scheduler.runAfter(0, internal.actions.cook.run, {
        experienceId: args.experienceId,
      });
    } catch (err) {
      console.error(`Pipeline step failed:`, err);
      await ctx.runMutation(internal.experiences.updateStatus, {
        id: args.experienceId,
        status: "error",
      });
    }
  },
});
