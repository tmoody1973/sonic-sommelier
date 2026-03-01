"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";

/**
 * Step 4: Wine & Sake Sommelier — takes courses and their paired tracks,
 * pairs each course with wine or sake (at least one must be sake).
 * After pairing, schedules the media generation step.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    try {
      const client = createMistralClient(process.env.MISTRAL_API_KEY!);
      const agentId = process.env.SOMMELIER_AGENT_ID!;

      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.tracks || !experience?.courses)
        throw new Error("Missing tracks or courses data");

      const coursesInput = experience.courses.map((course, i) => {
        const track = experience.tracks![i];
        return {
          courseNumber: course.courseNumber,
          courseName: course.courseType,
          dishName: course.dishName,
          cuisineType: course.cuisineType,
          trackName: `${track.name} - ${track.artist}`,
          artistName: track.artist,
          sonicProfile: track.audioFeatures,
        };
      });

      const prompt = `Pair each course with a wine. Select wines that complement both the dish and the musical mood of its paired track.

${JSON.stringify({ courses: coursesInput }, null, 2)}

Return a JSON object with a "pairings" array of 5 objects matching the output format in your instructions. Use beverageType "wine" for all pairings.`;

      const result = await runAgentConversation(
        client,
        agentId,
        prompt,
        20
      );

      let parsed;
      try {
        parsed = parseAgentJson(result) as any;
      } catch {
        await ctx.runMutation(internal.experiences.updateStatus, {
          id: args.experienceId,
          status: "error",
        });
        return;
      }
      const pairings = parsed.pairings ?? parsed;

      await ctx.runMutation(internal.experiences.updatePairings, {
        id: args.experienceId,
        pairings: pairings.map(
          (p: Record<string, unknown>) => ({
            courseNumber: p.courseNumber as number,
            beverageType: p.beverageType as "wine" | "sake",
            beverageName: p.beverageName as string,
            classification: (p.classification as string) ?? "",
            region: (p.region as string) ?? "",
            servingTemp: (p.servingTemp as string) ?? "",
            tastingNote: (p.tastingNote as string) ?? "",
          })
        ),
      });

      // Schedule step 5: Media Generation (ElevenLabs voice + Gemini images)
      await ctx.scheduler.runAfter(0, internal.actions.media.run, {
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
