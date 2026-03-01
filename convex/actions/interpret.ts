"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation } from "./toolExecutor";

/**
 * Step 1: Maitre D' — parses raw user input into a structured creative brief.
 * Writes brief/title/subtitle to the experience, then schedules the Music Curator.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences"), userInput: v.string() },
  handler: async (ctx, args) => {
    const client = createMistralClient(process.env.MISTRAL_API_KEY!);
    const agentId = process.env.MAITRE_D_AGENT_ID!;

    const result = await runAgentConversation(client, agentId, args.userInput);

    let brief;
    try {
      brief = JSON.parse(result);
    } catch {
      // Fallback if agent doesn't return valid JSON
      brief = {
        mood: args.userInput,
        cuisineDirection: "eclectic",
        occasion: "evening dinner",
        inputType: "mood",
        title: "A Sonic Journey",
        subtitle: "A 5-course dining experience curated from sound",
      };
    }

    await ctx.runMutation(internal.experiences.updateBrief, {
      id: args.experienceId,
      brief: {
        mood: brief.mood ?? args.userInput,
        cuisineDirection: brief.cuisineDirection ?? "eclectic",
        occasion: brief.occasion ?? "evening dinner",
        inputType: brief.inputType ?? "mood",
      },
      title: brief.title ?? "A Sonic Journey",
      subtitle:
        brief.subtitle ??
        "A 5-course dining experience curated from sound",
    });

    // Schedule step 2: Music Curator
    await ctx.scheduler.runAfter(0, internal.actions.curate.run, {
      experienceId: args.experienceId,
    });
  },
});
