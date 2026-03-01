"use node";

import { action } from "./_generated/server";
import { createMistralClient, createAgents } from "./lib/agents";

/**
 * Register all 4 Sonic Sommelier agents with the Mistral Agents API.
 *
 * Run once (or when agent definitions change) via:
 *   npx convex run setupAgents:setup
 *
 * Returns the agent IDs to be stored as environment variables or in the DB
 * for use by the pipeline actions.
 */
export const setup = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MISTRAL_API_KEY environment variable is not set. " +
          "Add it to your Convex dashboard under Settings > Environment Variables."
      );
    }

    const client = createMistralClient(apiKey);
    const agents = await createAgents(client);

    return {
      maitreDId: agents.maitreD.id,
      musicCuratorId: agents.musicCurator.id,
      culinaryChefId: agents.culinaryChef.id,
      sommelierId: agents.sommelier.id,
    };
  },
});
