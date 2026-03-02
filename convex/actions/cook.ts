"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";

/**
 * Step 3: Culinary Chef — takes the 5 tracks with their sonic profiles
 * and designs a 5-course menu with full AI-generated recipes.
 * Each dish is inspired by its paired track's sonic character.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const think = (message: string) =>
      ctx.runMutation(internal.experiences.addThought, {
        id: args.experienceId,
        agent: "chef",
        message,
      });

    try {
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
          const sonic = t.sonicCharacter
            ? `Sonic Character: ${t.sonicCharacter}`
            : `Audio: energy=${t.audioFeatures.energy}, valence=${t.audioFeatures.valence}, tempo=${t.audioFeatures.tempo}, danceability=${t.audioFeatures.danceability}, acousticness=${t.audioFeatures.acousticness}`;
          return `Course ${i + 1} (${courseNames[i]} / ${arcRoles[i]}):
Track: "${t.name}" by ${t.artist}
${sonic}`;
        })
        .join("\n\n");

      await think("Translating sound into flavor. Designing your menu with full recipes...");

      const prompt = `Design a 5-course HOME-COOKABLE menu with FULL RECIPES for this experience.
Cuisine Direction: ${experience.brief?.cuisineDirection ?? "eclectic"}
User's Original Request: "${experience.userInput ?? ""}"

${trackSummary}

Read each track's Sonic Character description carefully — it tells you the FEEL of the music. Let the texture, warmth, rhythm, and cultural DNA of each track inspire the dish.

For EACH dish, include the complete ingredient list with measurements and step-by-step cooking instructions. These are real recipes a home cook will follow tonight.`;

      // Single turn — no tools needed
      const result = await runAgentConversation(client, agentId, prompt, 3);

      let courses;
      try {
        courses = parseAgentJson(result) as any[];
      } catch {
        await ctx.runMutation(internal.experiences.updateStatus, {
          id: args.experienceId,
          status: "error",
        });
        return;
      }

      // Report each dish
      for (const c of courses) {
        const ingredientCount = (c as any).ingredients?.length ?? 0;
        await think(
          `Course ${(c as any).courseNumber}: "${(c as any).dishName}" — ${(c as any).cuisineType} (${ingredientCount} ingredients)`
        );
      }

      // Map to storage format
      const mappedCourses = courses.map((c: Record<string, unknown>, idx: number) => ({
        courseNumber: (c.courseNumber as number) ?? idx + 1,
        courseType: (c.courseType as string) ?? courseNames[idx] ?? "COURSE",
        arcRole: (c.arcRole as string) ?? arcRoles[idx] ?? "COURSE",
        dishName: c.dishName as string,
        dishDescription: c.dishDescription as string,
        cuisineType: (c.cuisineType as string) ?? experience.brief?.cuisineDirection ?? "eclectic",
        prepTime: (c.prepTime as number) ?? undefined,
        servings: (c.servings as number) ?? undefined,
        ingredients: Array.isArray(c.ingredients)
          ? (c.ingredients as Array<Record<string, string>>).map((ing) => ({
              name: ing.name ?? "",
              amount: ing.amount ?? "",
            }))
          : [],
        instructions: Array.isArray(c.instructions)
          ? (c.instructions as string[])
          : [],
      }));

      await ctx.runMutation(internal.experiences.updateCourses, {
        id: args.experienceId,
        courses: mappedCourses,
      });

      await think("Menu and recipes complete. Calling the Sommelier for wine pairings...");

      // Schedule step 4: Wine Sommelier
      await ctx.scheduler.runAfter(0, internal.actions.pair.run, {
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
