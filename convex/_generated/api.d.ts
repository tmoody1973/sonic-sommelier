/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_cook from "../actions/cook.js";
import type * as actions_curate from "../actions/curate.js";
import type * as actions_generate from "../actions/generate.js";
import type * as actions_interpret from "../actions/interpret.js";
import type * as actions_media from "../actions/media.js";
import type * as actions_pair from "../actions/pair.js";
import type * as actions_toolExecutor from "../actions/toolExecutor.js";
import type * as experiences from "../experiences.js";
import type * as lib_agents from "../lib/agents.js";
import type * as lib_elevenlabs from "../lib/elevenlabs.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_palette from "../lib/palette.js";
import type * as lib_soundstat from "../lib/soundstat.js";
import type * as lib_spoonacular from "../lib/spoonacular.js";
import type * as lib_spotify from "../lib/spotify.js";
import type * as lib_youtube from "../lib/youtube.js";
import type * as setupAgents from "../setupAgents.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/cook": typeof actions_cook;
  "actions/curate": typeof actions_curate;
  "actions/generate": typeof actions_generate;
  "actions/interpret": typeof actions_interpret;
  "actions/media": typeof actions_media;
  "actions/pair": typeof actions_pair;
  "actions/toolExecutor": typeof actions_toolExecutor;
  experiences: typeof experiences;
  "lib/agents": typeof lib_agents;
  "lib/elevenlabs": typeof lib_elevenlabs;
  "lib/gemini": typeof lib_gemini;
  "lib/palette": typeof lib_palette;
  "lib/soundstat": typeof lib_soundstat;
  "lib/spoonacular": typeof lib_spoonacular;
  "lib/spotify": typeof lib_spotify;
  "lib/youtube": typeof lib_youtube;
  setupAgents: typeof setupAgents;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
