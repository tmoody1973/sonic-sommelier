"use node";

import * as soundstat from "../lib/soundstat";
import * as spotify from "../lib/spotify";
import * as spoonacular from "../lib/spoonacular";
import { Mistral } from "@mistralai/mistralai";

/**
 * Parse JSON from an agent response, stripping markdown fences if present.
 * Throws if parsing fails after cleanup.
 */
export function parseAgentJson(raw: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Execute a single tool call by name, dispatching to the appropriate API helper.
 * Returns a JSON-stringified result for feeding back to the Mistral conversation.
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const ssKey = process.env.SOUNDSTAT_API_KEY!;
  const spClientId = process.env.SPOTIFY_CLIENT_ID!;
  const spSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const spoonKey = process.env.SPOONACULAR_API_KEY!;

  switch (toolName) {
    case "search_tracks_by_mood":
      return JSON.stringify(
        await soundstat.searchByMood(args.mood as string, ssKey)
      );

    case "get_track_audio_features":
      return JSON.stringify(
        await soundstat.getTrackFeatures(args.spotify_id as string, ssKey)
      );

    case "search_spotify_tracks":
      return JSON.stringify(
        await spotify.searchTrack(
          args.query as string,
          spClientId,
          spSecret
        )
      );

    case "get_similar_tracks":
      return JSON.stringify(
        await soundstat.getSimilarTracks(args.spotify_id as string, ssKey)
      );

    case "search_tracks_by_features": {
      const features: Record<string, unknown> = {};
      if (args.energy_min != null)
        features.energy = [
          args.energy_min as number,
          (args.energy_max as number) ?? 1,
        ];
      if (args.valence_min != null)
        features.valence = [
          args.valence_min as number,
          (args.valence_max as number) ?? 1,
        ];
      if (args.tempo_min != null)
        features.tempo = [
          args.tempo_min as number,
          (args.tempo_max as number) ?? 200,
        ];
      return JSON.stringify(
        await soundstat.searchByFeatures(features, ssKey)
      );
    }

    case "search_recipes":
      return JSON.stringify(
        await spoonacular.searchRecipes(
          args.query as string,
          spoonKey,
          args.cuisine as string | undefined
        )
      );

    case "get_wine_pairing":
      return JSON.stringify(
        await spoonacular.getWinePairing(args.food as string, spoonKey)
      );

    case "get_wine_recommendation":
      return JSON.stringify(
        await spoonacular.getWineRecommendation(
          args.wine_type as string,
          spoonKey,
          args.max_price as number
        )
      );

    case "get_wine_description":
      return JSON.stringify(
        await spoonacular.getWineDescription(
          args.wine_type as string,
          spoonKey
        )
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

/**
 * Run a conversation with a Mistral agent, handling tool calls in a loop.
 * Returns the agent's final text response.
 */
export async function runAgentConversation(
  client: Mistral,
  agentId: string,
  input: string,
  maxTurns = 10
): Promise<string> {
  let response = await client.beta.conversations.start({
    agentId,
    inputs: [
      { type: "message.input", role: "user", content: input },
    ],
  });

  for (let turn = 0; turn < maxTurns; turn++) {
    if (!response.outputs || response.outputs.length === 0) {
      throw new Error("Agent returned empty outputs");
    }

    const lastOutput = response.outputs[response.outputs.length - 1];

    // If the agent produced a final message, extract text and return
    if (lastOutput.type === "message.output") {
      const content = (lastOutput as { content: string | unknown[] }).content;
      if (typeof content === "string") return content;
      // If content is an array of chunks, concatenate text pieces
      return (content as Array<{ text?: string }>)
        .map((c) => c.text ?? "")
        .join("");
    }

    // If the agent wants to call a function, execute it and feed result back
    if (lastOutput.type === "function.call") {
      const fc = lastOutput as {
        name: string;
        arguments: Record<string, unknown> | string;
        toolCallId: string;
      };

      const callArgs =
        typeof fc.arguments === "string"
          ? JSON.parse(fc.arguments)
          : fc.arguments;
      const result = await executeToolCall(fc.name, callArgs);

      response = await client.beta.conversations.append({
        conversationId: response.conversationId,
        conversationAppendRequest: {
          inputs: [
            {
              type: "function.result",
              toolCallId: fc.toolCallId,
              result,
            },
          ],
        },
      });
      continue;
    }

    // Unknown output type — break out of the loop
    break;
  }

  // Fallback: return last output content as-is
  if (!response.outputs || response.outputs.length === 0) {
    throw new Error("Agent returned empty outputs");
  }
  const last = response.outputs[response.outputs.length - 1];
  const fallbackContent = (last as { content?: string | unknown[] }).content;
  if (typeof fallbackContent === "string") return fallbackContent;
  if (Array.isArray(fallbackContent)) {
    return (fallbackContent as Array<{ text?: string }>)
      .map((c) => c.text ?? "")
      .join("");
  }
  return JSON.stringify(last);
}
