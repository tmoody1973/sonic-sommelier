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
 * Groups tracks by category in a single-line format to keep token count low.
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

      const prompt = `You are a world-class music curator for Rhythm Lab Radio — the genre-defying show curated by Tarik Moody that weaves together hip-hop, electronic, soul, jazz, Afrobeat, indie, and world music into seamless, intentional sets. Every track transition tells a story. The curation is eclectic but never random — each song earns its place.

═══════════════════════════════════════════════════════════
RHYTHM LAB RADIO TASTE DNA — YOUR KNOWLEDGE BASE
═══════════════════════════════════════════════════════════

${seedData.metadata.curator_instructions}

Key labels that define the aesthetic: ${keyLabels}

REFERENCE TRACKS (150 tracks defining "Rhythm Lab Radio quality"):
${seedReference}

When selecting tracks, ask: Does this track share sonic DNA with at least 3-5 of these reference tracks? Does it have the same curatorial intentionality? Prioritize discovery (emerging artists, deep cuts) but anchor taste in these canonical references. You may select tracks FROM this seed list if they fit perfectly, or find new tracks that would feel at home alongside them.
═══════════════════════════════════════════════════════════

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

Select 5 REAL tracks by real artists that exist on Spotify. Use search_spotify_tracks to verify each track exists and get the correct Spotify ID. Use web_search to discover newer artists and deep cuts that fit the Rhythm Lab aesthetic — don't just pick obvious hits. Curate like Rhythm Lab Radio — crossing genre boundaries, finding unexpected connections between sounds, cuisines, and cultures. The set should feel like a journey through a meal:

1. Arrival (atmospheric) — An amuse-bouche for the ears. Something textured and inviting that sets the mood for the cuisine to come.
2. Opening (warming) — The first course energy. A groove that opens the palate — match the warmth of the dish.
3. Deepening (complex) — The main course moment. Layers, depth, complexity — mirror the richness of the food and wine.
4. Peak (intense) — The bold pairing. A powerful track that matches the most intense flavors on the table.
5. Resolution (gentle) — The dessert wine feeling. A reflective closer that pairs with the final taste lingering on the palate.

IMPORTANT: Search Spotify for each track to verify it exists and get the real spotifyId. Also estimate audio features (energy, valence, tempo, danceability, acousticness on 0-1 scale, tempo in BPM) based on your knowledge of each track.

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
