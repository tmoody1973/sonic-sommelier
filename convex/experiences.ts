import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import {
  paletteValidator,
  sonicProfileValidator,
  trackValidator,
  courseValidator,
} from "./schema";

// ─── Public Queries ──────────────────────────────────────────────────────────

/**
 * Get a single experience by ID.
 * Requires the requesting user to own the experience.
 */
export const get = query({
  args: { id: v.id("experiences") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const experience = await ctx.db.get(args.id);
    if (!experience) return null;

    if (experience.userId !== identity.subject) {
      throw new Error("Not authorized");
    }
    return experience;
  },
});

/**
 * Get an experience by its share slug (public, no auth required).
 * Only returns experiences with status "ready".
 */
export const getByShareSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const experience = await ctx.db
      .query("experiences")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.slug))
      .unique();

    if (!experience || experience.status !== "ready") return null;
    return experience;
  },
});

/**
 * List all experiences for the authenticated user, newest first.
 */
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("experiences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// ─── Internal Queries ────────────────────────────────────────────────────────

/**
 * Get an experience by ID without auth check.
 * For use by server-side actions in the pipeline.
 */
export const getInternal = internalQuery({
  args: { id: v.id("experiences") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Public Mutations ────────────────────────────────────────────────────────

/**
 * Create a new experience. Sets initial status to "interpreting".
 */
export const create = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    palette: paletteValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const experienceId = await ctx.db.insert("experiences", {
      userId: identity.subject,
      title: args.title,
      subtitle: args.subtitle,
      status: "interpreting",
      palette: args.palette,
      createdAt: Date.now(),
    });

    return experienceId;
  },
});

// ─── Internal Mutations (pipeline steps) ─────────────────────────────────────

/**
 * Update the status of an experience.
 */
export const updateStatus = internalMutation({
  args: {
    id: v.id("experiences"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Set the brief, title, and subtitle, then advance to "curating_music".
 */
export const updateBrief = internalMutation({
  args: {
    id: v.id("experiences"),
    brief: v.object({
      mood: v.string(),
      cuisineDirection: v.string(),
      occasion: v.string(),
      inputType: v.string(),
    }),
    title: v.string(),
    subtitle: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      brief: args.brief,
      title: args.title,
      subtitle: args.subtitle,
      status: "curating_music",
    });
  },
});

/**
 * Set tracks, sonic profile, and palette, then advance to "designing_menu".
 */
export const updateTracks = internalMutation({
  args: {
    id: v.id("experiences"),
    tracks: v.array(trackValidator),
    sonicProfile: sonicProfileValidator,
    palette: paletteValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      tracks: args.tracks,
      sonicProfile: args.sonicProfile,
      palette: args.palette,
      status: "designing_menu",
    });
  },
});

/**
 * Set courses array, then advance to "pairing_beverages".
 */
export const updateCourses = internalMutation({
  args: {
    id: v.id("experiences"),
    courses: v.array(courseValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      courses: args.courses,
      status: "pairing_beverages",
    });
  },
});

/**
 * Merge beverage pairing data into existing courses, then advance to "generating_media".
 * Each pairing is matched to a course by courseNumber.
 */
export const updatePairings = internalMutation({
  args: {
    id: v.id("experiences"),
    pairings: v.array(
      v.object({
        courseNumber: v.number(),
        beverageType: v.union(v.literal("wine"), v.literal("sake")),
        beverageName: v.string(),
        classification: v.optional(v.string()),
        region: v.optional(v.string()),
        servingTemp: v.optional(v.string()),
        tastingNote: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const experience = await ctx.db.get(args.id);
    if (!experience || !experience.courses) {
      throw new Error("Experience or courses not found");
    }

    const updatedCourses = experience.courses.map((course) => {
      const pairing = args.pairings.find(
        (p) => p.courseNumber === course.courseNumber
      );
      if (!pairing) return course;

      return {
        ...course,
        beverageType: pairing.beverageType,
        beverageName: pairing.beverageName,
        classification: pairing.classification,
        region: pairing.region,
        servingTemp: pairing.servingTemp,
        tastingNote: pairing.tastingNote,
      };
    });

    await ctx.db.patch(args.id, {
      courses: updatedCourses,
      status: "generating_media",
    });
  },
});

/**
 * Update media URLs — either on individual courses or at the experience level.
 */
export const updateMedia = internalMutation({
  args: {
    id: v.id("experiences"),
    // Experience-level media
    heroImageUrl: v.optional(v.string()),
    introNarrationText: v.optional(v.string()),
    introNarrationUrl: v.optional(v.string()),
    fullNarrationUrl: v.optional(v.string()),
    // Course-level media updates
    courseMedia: v.optional(
      v.array(
        v.object({
          courseNumber: v.number(),
          recipeImageUrl: v.optional(v.string()),
          aiImageUrl: v.optional(v.string()),
          narrationText: v.optional(v.string()),
          narrationAudioUrl: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};

    if (args.heroImageUrl !== undefined) {
      updates.heroImageUrl = args.heroImageUrl;
    }
    if (args.introNarrationText !== undefined) {
      updates.introNarrationText = args.introNarrationText;
    }
    if (args.introNarrationUrl !== undefined) {
      updates.introNarrationUrl = args.introNarrationUrl;
    }
    if (args.fullNarrationUrl !== undefined) {
      updates.fullNarrationUrl = args.fullNarrationUrl;
    }

    // Merge course-level media if provided
    if (args.courseMedia && args.courseMedia.length > 0) {
      const experience = await ctx.db.get(args.id);
      if (experience?.courses) {
        updates.courses = experience.courses.map((course) => {
          const media = args.courseMedia!.find(
            (m) => m.courseNumber === course.courseNumber
          );
          if (!media) return course;

          return {
            ...course,
            ...(media.recipeImageUrl !== undefined && {
              recipeImageUrl: media.recipeImageUrl,
            }),
            ...(media.aiImageUrl !== undefined && {
              aiImageUrl: media.aiImageUrl,
            }),
            ...(media.narrationText !== undefined && {
              narrationText: media.narrationText,
            }),
            ...(media.narrationAudioUrl !== undefined && {
              narrationAudioUrl: media.narrationAudioUrl,
            }),
          };
        });
      }
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Mark the experience as ready and set the share slug.
 */
export const markReady = internalMutation({
  args: {
    id: v.id("experiences"),
    shareSlug: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "ready",
      shareSlug: args.shareSlug,
    });
  },
});
