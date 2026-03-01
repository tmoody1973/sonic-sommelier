import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const audioFeaturesValidator = v.object({
  energy: v.number(),
  valence: v.number(),
  tempo: v.number(),
  danceability: v.number(),
  acousticness: v.number(),
  key: v.number(),
  mode: v.number(),
});

const paletteValidator = v.object({
  primary: v.string(),
  secondary: v.string(),
  accent: v.string(),
  surface: v.string(),
  text: v.string(),
  gradientStart: v.string(),
  gradientMid: v.string(),
  gradientEnd: v.string(),
});

const sonicProfileValidator = v.object({
  energy: v.number(),
  valence: v.number(),
  tempo: v.number(),
  danceability: v.number(),
  acousticness: v.number(),
  mode: v.number(),
});

const trackValidator = v.object({
  spotifyId: v.string(),
  name: v.string(),
  artist: v.string(),
  album: v.string(),
  albumArt: v.string(),
  artistImage: v.string(),
  youtubeVideoId: v.string(),
  audioFeatures: audioFeaturesValidator,
});

const courseValidator = v.object({
  courseNumber: v.number(),
  courseType: v.string(),
  arcRole: v.string(),
  dishName: v.string(),
  dishDescription: v.string(),
  cuisineType: v.string(),
  recipeImageUrl: v.optional(v.string()),
  aiImageUrl: v.optional(v.string()),
  beverageType: v.optional(v.union(v.literal("wine"), v.literal("sake"))),
  beverageName: v.optional(v.string()),
  classification: v.optional(v.string()),
  region: v.optional(v.string()),
  servingTemp: v.optional(v.string()),
  tastingNote: v.optional(v.string()),
  narrationText: v.optional(v.string()),
  narrationAudioUrl: v.optional(v.string()),
});

export default defineSchema({
  experiences: defineTable({
    userId: v.string(),
    title: v.string(),
    subtitle: v.string(),
    status: v.string(),
    palette: paletteValidator,
    sonicProfile: v.optional(sonicProfileValidator),
    brief: v.optional(
      v.object({
        mood: v.string(),
        cuisineDirection: v.string(),
        occasion: v.string(),
        inputType: v.string(),
      })
    ),
    tracks: v.optional(v.array(trackValidator)),
    courses: v.optional(v.array(courseValidator)),
    introNarrationText: v.optional(v.string()),
    introNarrationUrl: v.optional(v.string()),
    fullNarrationUrl: v.optional(v.string()),
    heroImageUrl: v.optional(v.string()),
    shareSlug: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_share_slug", ["shareSlug"])
    .index("by_status", ["status"]),

  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    savedExperiences: v.array(v.id("experiences")),
    preferences: v.optional(
      v.object({
        dietaryRestrictions: v.array(v.string()),
        winePreferences: v.string(),
        sakeOpenness: v.boolean(),
        budgetLevel: v.string(),
      })
    ),
  }).index("by_clerk_id", ["clerkId"]),

  trackCache: defineTable({
    spotifyId: v.string(),
    name: v.string(),
    artist: v.string(),
    albumArt: v.string(),
    audioFeatures: audioFeaturesValidator,
    lastFetched: v.number(),
  }).index("by_spotify_id", ["spotifyId"]),
});

// Re-export validators for use in function argument definitions
export {
  audioFeaturesValidator,
  paletteValidator,
  sonicProfileValidator,
  trackValidator,
  courseValidator,
};
