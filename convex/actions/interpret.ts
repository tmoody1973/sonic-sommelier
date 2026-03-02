"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";

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

      let brief: {
        mood: string;
        cuisineDirection: string;
        occasion: string;
        inputType: string;
        title: string;
        subtitle: string;
      };
      try {
        const raw = parseAgentJson(result) as Record<string, string>;
        brief = {
          mood: raw.mood || args.userInput,
          cuisineDirection: raw.cuisineDirection || "eclectic",
          occasion: raw.occasion || "evening dinner",
          inputType: raw.inputType || "mood",
          title: raw.title || "A Sonic Journey",
          subtitle: raw.subtitle || "A 5-course dining experience curated from sound",
        };
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
          mood: brief.mood,
          cuisineDirection: brief.cuisineDirection,
          occasion: brief.occasion,
          inputType: brief.inputType,
        },
        title: brief.title,
        subtitle: brief.subtitle,
        userInput: args.userInput,
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
