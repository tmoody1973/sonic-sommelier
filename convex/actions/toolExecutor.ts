"use node";

import * as spotify from "../lib/spotify";
import * as spoonacular from "../lib/spoonacular";
import { Mistral } from "@mistralai/mistralai";

/**
 * Retry a function up to `attempts` times with exponential backoff.
 * Retries on timeout / connection errors only.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelay = 2000
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? (err as { name?: string }).name ?? "" : "";
      const isRetryable =
        msg.includes("timeout") ||
        msg.includes("Timeout") ||
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        name === "ConnectionError" ||
        name === "HeadersTimeoutError";
      if (!isRetryable || i === attempts - 1) throw err;
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Retry ${i + 1}/${attempts} after ${delay}ms: ${msg}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("withRetry: unreachable");
}

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
  const spClientId = process.env.SPOTIFY_CLIENT_ID!;
  const spSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const spoonKey = process.env.SPOONACULAR_API_KEY!;

  switch (toolName) {
    case "search_spotify_tracks":
      return JSON.stringify(
        await spotify.searchTrack(
          args.query as string,
          spClientId,
          spSecret
        )
      );

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
  let response = await withRetry(() =>
    client.beta.conversations.start({
      agentId,
      inputs: [
        { type: "message.input", role: "user", content: input },
      ],
    })
  );

  for (let turn = 0; turn < maxTurns; turn++) {
    if (!response.outputs || response.outputs.length === 0) {
      throw new Error("Agent returned empty outputs");
    }

    // Check if there's a final message in the outputs
    const messageOutput = response.outputs.find(
      (o) => (o as { type?: string }).type === "message.output"
    );
    if (messageOutput) {
      const content = (messageOutput as { content: string | unknown[] }).content;
      if (typeof content === "string") return content;
      return (content as Array<{ text?: string }>)
        .map((c) => c.text ?? "")
        .join("");
    }

    // Collect ALL function calls from the response and execute them
    const functionCalls = response.outputs.filter(
      (o) => (o as { type?: string }).type === "function.call"
    );

    if (functionCalls.length === 0) {
      // Unknown output types — break
      break;
    }

    const toolResults = await Promise.all(
      functionCalls.map(async (output: unknown) => {
        const fc = output as {
          name: string;
          arguments: Record<string, unknown> | string;
          toolCallId: string;
        };
        const callArgs =
          typeof fc.arguments === "string"
            ? JSON.parse(fc.arguments)
            : fc.arguments;
        let result: string;
        try {
          result = await executeToolCall(fc.name, callArgs);
        } catch (toolErr) {
          console.error(`Tool call ${fc.name} failed:`, toolErr);
          result = JSON.stringify({
            error: `Tool ${fc.name} failed: ${toolErr instanceof Error ? toolErr.message : String(toolErr)}`,
          });
        }
        return {
          type: "function.result" as const,
          toolCallId: fc.toolCallId,
          result,
        };
      })
    );

    const convId = response.conversationId;
    response = await withRetry(() =>
      client.beta.conversations.append({
        conversationId: convId,
        conversationAppendRequest: {
          inputs: toolResults,
        },
      })
    );
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
