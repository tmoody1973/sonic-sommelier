"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";
import * as spotify from "../lib/spotify";
import * as youtube from "../lib/youtube";
import { computeAggregateProfile, derivePalette } from "../lib/palette";

/**
 * Step 2: Music Curator — takes the brief and selects 5 real tracks
 * that form a narrative dining arc (Arrival -> Opening -> Deepening -> Peak -> Resolution).
 * Enriches tracks with Spotify metadata, YouTube video IDs, and artist images.
 * Computes aggregate sonic profile and derives a color palette.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    try {
      const client = createMistralClient(process.env.MISTRAL_API_KEY!);
      const agentId = process.env.MUSIC_CURATOR_AGENT_ID!;

      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.brief) throw new Error("No brief found");

      const prompt = `You are a world-class music curator inspired by Rhythm Lab Radio — the genre-defying show that weaves together hip-hop, electronic, soul, jazz, Afrobeat, indie, and world music into seamless, intentional sets. Every track transition tells a story. The curation is eclectic but never random — each song earns its place.

Mood: ${experience.brief.mood}
Cuisine Direction: ${experience.brief.cuisineDirection}
Occasion: ${experience.brief.occasion}

The music MUST complement the food and wine. Think about how sound pairs with flavor:
- Light, delicate dishes → airy, textured, acoustic sounds
- Rich, bold dishes → deep grooves, warm bass, soulful vocals
- Spicy, vibrant cuisine → rhythmic, percussive, energetic tracks
- French/Italian → jazz, chanson, sophisticated arrangements
- Japanese/Asian → ambient, minimalist, contemplative textures
- Latin/Caribbean → Afro-Latin rhythms, bossa nova, tropical bass
- American comfort → soul, R&B, blues, hip-hop with warmth

Select 5 REAL tracks by real artists that exist on Spotify. Curate them the way Rhythm Lab Radio would — crossing genre boundaries, finding unexpected connections between sounds, cuisines, and cultures. The set should feel like a journey through a meal:

1. Arrival (atmospheric) — An amuse-bouche for the ears. Something textured and inviting that sets the mood for the cuisine to come.
2. Opening (warming) — The first course energy. A groove that opens the palate — match the warmth of the dish.
3. Deepening (complex) — The main course moment. Layers, depth, complexity — mirror the richness of the food and wine.
4. Peak (intense) — The bold pairing. A powerful track that matches the most intense flavors on the table.
5. Resolution (gentle) — The dessert wine feeling. A reflective closer that pairs with the final taste lingering on the palate.

Think across the full spectrum of global music. The best pairing is when music, food, and wine feel like they belong together.`;

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
        curatedTracks.map(async (track: Record<string, unknown>) => {
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

      const sonicProfile = computeAggregateProfile(enrichedTracks);
      const palette = derivePalette(sonicProfile);

      await ctx.runMutation(internal.experiences.updateTracks, {
        id: args.experienceId,
        tracks: enrichedTracks,
        sonicProfile,
        palette,
      });

      // Schedule step 3: Culinary Chef
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
