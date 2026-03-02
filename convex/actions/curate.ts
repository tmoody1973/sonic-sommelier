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

      const rawInput = experience.userInput ?? "";

      const prompt = `You are a music curator for Rhythm Lab Radio — Tarik Moody's genre-defying show weaving hip-hop, electronic, soul, jazz, Afrobeat, and world music into intentional sets.

TASTE DNA — Reference tracks from 150-track seed list:
${seedReference}

Key labels: ${keyLabels}
Select tracks that share sonic DNA with these references. Prioritize discovery but anchor in this taste.

USER'S ORIGINAL REQUEST: "${rawInput}"
^^^ THIS IS CRITICAL. If the user mentions a specific instrument (flute, piano, saxophone, guitar, etc.), genre, artist, era, or style — you MUST honor it. Select tracks that prominently FEATURE what they asked for. "Flute jazz" means tracks where the flute is a lead or prominent instrument. "Piano soul" means piano-driven soul music. Do NOT ignore these specifics.

Mood: ${experience.brief.mood}
Cuisine: ${experience.brief.cuisineDirection}
Occasion: ${experience.brief.occasion}

CULTURAL ROOTEDNESS — THIS IS CRITICAL:
When the user specifies a genre or culture/country, you MUST select artists FROM that tradition. Think of the canonical and emerging artists of that specific tradition FIRST, then branch out:
- "Brazilian" → Tim Maia, Jorge Ben Jor, Seu Jorge, Gilberto Gil, Gal Costa, Marcos Valle, Tom Jobim, Suba, Elza Soares
- "Soul" → Marvin Gaye, Erykah Badu, D'Angelo, Curtis Mayfield, Al Green, Jill Scott, Leon Bridges, Solange
- "Japanese" → Haruomi Hosono, Hiroshi Yoshimura, Nujabes, Cornelius, Minako Yoshida, Tatsuro Yamashita
- "Afrobeat" → Fela Kuti, Tony Allen, Burna Boy, Angelique Kidjo, Ebo Taylor, Tinariwen
- "Jazz" → Miles Davis, Kamasi Washington, Robert Glasper, Shabaka Hutchings, Nubya Garcia, Makaya McCraven
Do NOT default to generic Western pop/indie when a specific tradition is requested. Go DEEP into that tradition's catalog.

Music must complement food and setting:
- Delicate dishes → airy, acoustic | Bold dishes → deep grooves, warm bass
- French/Italian → jazz, chanson | Japanese → ambient, city pop, minimalist
- Latin/Brazilian → Afro-Latin rhythms, bossa nova, MPB, tropicália | American → soul, R&B, hip-hop
- African → Afrobeat, highlife, desert blues | Electronic → downtempo, house, ambient

Select 5 REAL Spotify tracks. Use search_spotify_tracks to verify each. Curate a dining arc:
1. Arrival (atmospheric) — textured, inviting
2. Opening (warming) — groove that opens the palate
3. Deepening (complex) — layers, depth, richness
4. Peak (intense) — bold, powerful
5. Resolution (gentle) — reflective closer

For each track, provide:
1. audioFeatures: estimated numeric values (energy, valence, tempo, danceability, acousticness 0-1, tempo BPM) — used for UI visualization and palette generation.
2. sonicCharacter: a 2-3 sentence "sonic fingerprint" describing the track's FEEL — texture, warmth, rhythm, mood, instrumentation, cultural DNA. This is the MOST IMPORTANT field. The Chef and Sommelier will read this to design dishes and pairings. Write it like a music critic describing a song to a chef: "Warm analog bass with humid bossa nova guitar, languid shuffle at 92 BPM, feels like a late afternoon in Rio with windows open. The vocal sits in a bed of Rhodes keys and lazy percussion."

Return JSON array of 5 objects with: name, artist, spotifyId, audioFeatures, sonicCharacter.`;

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
              `${track.artist} ${track.name}`
            );
            if (videoId) {
              console.log(`YouTube found for "${track.name}": ${videoId}`);
            } else {
              console.log(`YouTube: no result for "${track.name}"`);
            }
          } catch (err) {
            console.error(`YouTube search error for "${track.name}":`, err);
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
            sonicCharacter: (track.sonicCharacter as string) ?? "",
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
