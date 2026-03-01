"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation } from "./toolExecutor";

/**
 * Step 3: Culinary Chef — takes the 5 tracks with their sonic profiles
 * and designs a 5-course menu where each dish is inspired by its paired track.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const client = createMistralClient(process.env.MISTRAL_API_KEY!);
    const agentId = process.env.CULINARY_CHEF_AGENT_ID!;

    const experience = await ctx.runQuery(
      internal.experiences.getInternal,
      { id: args.experienceId }
    );
    if (!experience?.tracks) throw new Error("No tracks found");

    const courseNames = [
      "AMUSE-BOUCHE",
      "APPETIZER",
      "SECOND COURSE",
      "MAIN COURSE",
      "DESSERT",
    ];
    const arcRoles = [
      "THE ARRIVAL",
      "THE OPENING",
      "THE DEEPENING",
      "THE PEAK",
      "THE RESOLUTION",
    ];

    const trackSummary = experience.tracks
      .map((t, i) => {
        return `Course ${i + 1} (${courseNames[i]} / ${arcRoles[i]}):
Track: "${t.name}" by ${t.artist}
Audio: energy=${t.audioFeatures.energy}, valence=${t.audioFeatures.valence}, tempo=${t.audioFeatures.tempo}, danceability=${t.audioFeatures.danceability}, acousticness=${t.audioFeatures.acousticness}`;
      })
      .join("\n\n");

    const prompt = `Design a 5-course menu for this experience.
Cuisine Direction: ${experience.brief?.cuisineDirection ?? "eclectic"}

${trackSummary}

Apply the sonic-to-culinary mapping for each dish.`;

    const result = await runAgentConversation(client, agentId, prompt, 15);
    const courses = JSON.parse(result);

    await ctx.runMutation(internal.experiences.updateCourses, {
      id: args.experienceId,
      courses: courses.map(
        (c: Record<string, unknown>) => ({
          courseNumber: c.courseNumber as number,
          courseType: c.courseType as string,
          arcRole: c.arcRole as string,
          dishName: c.dishName as string,
          dishDescription: c.dishDescription as string,
          cuisineType:
            (c.cuisineType as string) ??
            experience.brief?.cuisineDirection ??
            "eclectic",
        })
      ),
    });

    // Schedule step 4: Wine & Sake Sommelier
    await ctx.scheduler.runAfter(0, internal.actions.pair.run, {
      experienceId: args.experienceId,
    });
  },
});
