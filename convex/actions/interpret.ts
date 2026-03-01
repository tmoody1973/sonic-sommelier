"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation } from "./toolExecutor";

/**
 * Step 1: Maitre D' — parses raw user input into a structured creative brief.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences"), userInput: v.string() },
  handler: async (ctx, args) => {
    const think = (message: string) =>
      ctx.runMutation(internal.experiences.addThought, {
        id: args.experienceId,
        agent: "maitre_d",
        message,
      });

    try {
      await think("Good evening. Let me study your request...");

      const client = createMistralClient(process.env.MISTRAL_API_KEY!);
      const agentId = process.env.MAITRE_D_AGENT_ID!;

      const result = await runAgentConversation(client, agentId, args.userInput);

      let brief;
      try {
        brief = JSON.parse(result);
      } catch {
        brief = {
          mood: args.userInput,
          cuisineDirection: "eclectic",
          occasion: "evening dinner",
          inputType: "mood",
          title: "A Sonic Journey",
          subtitle: "A 5-course dining experience curated from sound",
        };
      }

      await think(
        `I sense ${brief.mood}. This calls for ${brief.cuisineDirection} cuisine.`
      );
      await think(`Your evening: "${brief.title}" — ${brief.subtitle}`);

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

      await think("Calling the Music Curator to build your sonic journey...");

      await ctx.scheduler.runAfter(0, internal.actions.curate.run, {
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
