"use node";

import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Entry point: creates an experience and kicks off the full agent pipeline.
 * This is a public action (not internal) so the frontend can call it directly.
 * Uses `api.experiences.create` (public mutation) because it requires auth from the caller.
 */
export const start = action({
  args: { userInput: v.string() },
  handler: async (ctx, args): Promise<Id<"experiences">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create experience with a default "Twilight" palette
    const experienceId = await ctx.runMutation(api.experiences.create, {
      title: "Generating...",
      subtitle: "A 5-course dining experience curated from sound",
      palette: {
        primary: "#2D3142",
        secondary: "#0f1015",
        accent: "#7C9082",
        surface: "rgba(15,16,21,0.85)",
        text: "#F1E8D9",
        gradientStart: "#0f1015",
        gradientMid: "#2D3142",
        gradientEnd: "#1a1b22",
      },
    });

    // Kick off the pipeline: Step 1 (Maitre D' / interpret)
    await ctx.scheduler.runAfter(0, internal.actions.interpret.run, {
      experienceId,
      userInput: args.userInput,
    });

    return experienceId;
  },
});
