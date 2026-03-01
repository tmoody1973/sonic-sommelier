"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";
import * as spoonacular from "../lib/spoonacular";

/**
 * Step 3: Culinary Chef — takes the 5 tracks with their sonic profiles
 * and designs a 5-course menu where each dish is inspired by its paired track.
 * Then enriches each course with a real recipe from Spoonacular.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    try {
      const client = createMistralClient(process.env.MISTRAL_API_KEY!);
      const agentId = process.env.CULINARY_CHEF_AGENT_ID!;
      const spoonKey = process.env.SPOONACULAR_API_KEY!;

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

Apply the sonic-to-culinary mapping for each dish. Include a recipeSearchQuery for each dish that could find a similar real recipe (e.g. "seared scallop citrus" or "braised short rib red wine").`;

      const result = await runAgentConversation(client, agentId, prompt, 15);

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

      // Enrich each course with a real recipe from Spoonacular
      const enrichedCourses = await Promise.all(
        courses.map(async (c: Record<string, unknown>) => {
          const base = {
            courseNumber: c.courseNumber as number,
            courseType: c.courseType as string,
            arcRole: c.arcRole as string,
            dishName: c.dishName as string,
            dishDescription: c.dishDescription as string,
            cuisineType:
              (c.cuisineType as string) ??
              experience.brief?.cuisineDirection ??
              "eclectic",
          };

          // Search for a matching recipe
          const searchQuery =
            (c.recipeSearchQuery as string) || (c.dishName as string);
          try {
            const searchResult = await spoonacular.searchRecipes(
              searchQuery,
              spoonKey,
              c.cuisineType as string | undefined
            );
            const firstMatch = searchResult?.results?.[0];
            if (firstMatch?.id) {
              const recipe = await spoonacular.getRecipeInformation(
                firstMatch.id,
                spoonKey
              );
              if (recipe) {
                return {
                  ...base,
                  recipeTitle: recipe.title,
                  ingredients: recipe.extendedIngredients
                    .slice(0, 12)
                    .map((ing) => ({
                      name: ing.name,
                      amount: ing.original,
                    })),
                  instructions:
                    recipe.analyzedInstructions?.[0]?.steps
                      ?.map((s) => s.step)
                      ?.slice(0, 8) ?? [],
                  prepTime: recipe.readyInMinutes,
                  servings: recipe.servings,
                  recipeSourceUrl: recipe.sourceUrl,
                };
              }
            }
          } catch (err) {
            console.error(
              `Recipe fetch failed for course ${c.courseNumber}:`,
              err
            );
          }

          return base;
        })
      );

      await ctx.runMutation(internal.experiences.updateCourses, {
        id: args.experienceId,
        courses: enrichedCourses,
      });

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
