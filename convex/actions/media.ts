"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";
import { synthesizeSpeech } from "../lib/elevenlabs";
import { generateImage } from "../lib/gemini";
import { nanoid } from "nanoid";

/**
 * Step 5: Media Generation — progressive loading.
 *
 * Phase A: Generate narration text → save + mark "ready" immediately
 *          so the user sees the full menu right away.
 * Phase B: Generate audio narration + dish images per-course,
 *          saving each course's media as it completes (real-time push via Convex).
 *
 * This gives a restaurant-like experience — courses "arrive" one at a time.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const think = (message: string) =>
      ctx.runMutation(internal.experiences.addThought, {
        id: args.experienceId,
        agent: "maitre_d",
        message,
      });

    try {
      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.courses || !experience?.tracks) {
        throw new Error("Missing courses or tracks data");
      }

      await think("Writing the narration for your dining experience...");

      const mistralClient = createMistralClient(process.env.MISTRAL_API_KEY!);
      const maitreDAgentId = process.env.MAITRE_D_AGENT_ID!;
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;
      const geminiKey = process.env.GEMINI_API_KEY!;

      // ══════════════════════════════════════════════════════════════════════
      // PHASE A — Generate narration text, save it, and mark "ready"
      // ══════════════════════════════════════════════════════════════════════

      const narrationPrompt = `You are the voice of a luxury dining experience called "${experience.title}" (${experience.subtitle}).
Your style is a seamless blend of a late-night radio host and an attentive fine-dining waiter:
- RADIO HOST side: Warm, knowledgeable about the music. Drop context about the artist, the track's vibe, why it fits this moment. Speak like you're cueing up the next record — "Now let me set the mood with…", "This next track is going to change the temperature in the room…"
- WAITER side: Gracious, descriptive about the dish and wine. Guide the guest through flavors, aromas, textures. "For your next course, we've prepared…", "Paired beautifully with a…"
- Weave music and food together naturally — the track should feel like the soundtrack TO the dish, not separate from it.
- Keep it conversational, never stiff. No bullet points. No clinical descriptions. This is storytelling.

Mood: ${experience.brief?.mood ?? "eclectic"}
Cuisine direction: ${experience.brief?.cuisineDirection ?? "eclectic"}

Return a JSON object with:
- "intro": A 2-3 sentence introduction that sets the scene like a radio host opening a special broadcast AND a maître d' welcoming a guest to their table.
- "courses": An array of 5 objects, each with:
  - "courseNumber": the course number (1-5)
  - "narration": A 2-3 sentence narration blending radio host energy with waiter elegance. Name the dish, the track (artist + title), and the wine. Make the listener feel the connection between all three.

The courses are:
${experience.courses
  .map((c, i) => {
    const track = experience.tracks![i];
    return `Course ${c.courseNumber}: ${c.courseType} — "${c.dishName}" (${c.cuisineType})
  Track: "${track.name}" by ${track.artist}
  Beverage: ${c.beverageName ?? "TBD"} (${c.beverageType ?? "wine"})
  Description: ${c.dishDescription}`;
  })
  .join("\n\n")}

Return ONLY valid JSON. No markdown fences. No commentary.`;

      const narrationResult = await runAgentConversation(
        mistralClient,
        maitreDAgentId,
        narrationPrompt,
        10
      );

      let narrationData: {
        intro: string;
        courses: Array<{ courseNumber: number; narration: string }>;
      };
      try {
        const parsed = parseAgentJson(narrationResult) as Record<
          string,
          unknown
        >;
        // Handle both string and {text: "..."} formats from the agent
        const rawIntro = parsed.intro;
        const intro =
          typeof rawIntro === "string"
            ? rawIntro
            : (rawIntro as { text?: string })?.text ??
              `Welcome to ${experience.title}.`;
        const rawCourses = parsed.courses as Array<Record<string, unknown>>;
        narrationData = {
          intro,
          courses: (rawCourses ?? []).map((c) => {
            const rawNarration = c.narration;
            const narration =
              typeof rawNarration === "string"
                ? rawNarration
                : (rawNarration as { text?: string })?.text ?? "";
            return {
              courseNumber: Number(c.courseNumber),
              narration,
            };
          }),
        };
      } catch {
        narrationData = {
          intro: `Welcome to ${experience.title}. ${experience.subtitle}.`,
          courses: experience.courses.map((c) => ({
            courseNumber: c.courseNumber,
            narration: `Course ${c.courseNumber}: ${c.dishName}. ${c.dishDescription}`,
          })),
        };
      }

      // Save narration text for every course immediately
      const courseNarrationMedia = narrationData.courses.map((c) => ({
        courseNumber: c.courseNumber,
        narrationText: c.narration,
      }));

      await ctx.runMutation(internal.experiences.updateMedia, {
        id: args.experienceId,
        introNarrationText: narrationData.intro,
        courseMedia: courseNarrationMedia,
      });

      await think("Your table is ready. Please, follow me...");

      // Mark ready NOW so the user sees the full menu immediately
      const shareSlug = nanoid(10);
      await ctx.runMutation(internal.experiences.markReady, {
        id: args.experienceId,
        shareSlug,
      });

      // ══════════════════════════════════════════════════════════════════════
      // PHASE B — Generate audio + images per-course, saving progressively
      // ══════════════════════════════════════════════════════════════════════

      // Generate intro narration audio first
      try {
        const introAudio = await synthesizeSpeech(
          narrationData.intro,
          elevenLabsKey
        );
        const introBlob = new Blob([introAudio], { type: "audio/mpeg" });
        const introStorageId = await ctx.storage.store(introBlob);
        const introNarrationUrl =
          (await ctx.storage.getUrl(introStorageId)) ?? undefined;
        await ctx.runMutation(internal.experiences.updateMedia, {
          id: args.experienceId,
          introNarrationUrl,
        });
      } catch (err) {
        console.error("Failed to generate intro narration audio:", err);
      }

      // Process each course — audio + image, then save immediately
      for (const course of experience.courses) {
        const courseNarration = narrationData.courses.find(
          (n) => n.courseNumber === course.courseNumber
        );
        const narrationText =
          courseNarration?.narration ??
          `${course.dishName}. ${course.dishDescription}`;

        let narrationAudioUrl: string | undefined;
        let aiImageUrl: string | undefined;

        // Generate audio + image in parallel for each course
        const [audioResult, imageResult] = await Promise.allSettled([
          // Audio
          (async () => {
            const audioData = await synthesizeSpeech(
              narrationText,
              elevenLabsKey
            );
            const blob = new Blob([audioData], { type: "audio/mpeg" });
            const storageId = await ctx.storage.store(blob);
            return (await ctx.storage.getUrl(storageId)) ?? undefined;
          })(),
          // Image
          (async () => {
            const imagePrompt = `Professional food photography of "${course.dishName}" — ${course.dishDescription}. ${course.cuisineType} cuisine. Beautifully plated on elegant dinnerware. Soft, warm lighting. Shallow depth of field. Top-down or 45-degree angle. Fine dining presentation. No text or watermarks.`;
            const base64Image = await generateImage(imagePrompt, geminiKey);
            if (base64Image) {
              const imageBuffer = Buffer.from(base64Image, "base64");
              const blob = new Blob([imageBuffer], { type: "image/png" });
              const storageId = await ctx.storage.store(blob);
              return (await ctx.storage.getUrl(storageId)) ?? undefined;
            }
            return undefined;
          })(),
        ]);

        if (audioResult.status === "fulfilled") {
          narrationAudioUrl = audioResult.value;
        } else {
          console.error(
            `Audio failed for course ${course.courseNumber}:`,
            audioResult.reason
          );
        }

        if (imageResult.status === "fulfilled") {
          aiImageUrl = imageResult.value;
        } else {
          console.error(
            `Image failed for course ${course.courseNumber}:`,
            imageResult.reason
          );
        }

        // Save this course's media immediately — Convex pushes update to frontend
        if (narrationAudioUrl || aiImageUrl) {
          await ctx.runMutation(internal.experiences.updateMedia, {
            id: args.experienceId,
            courseMedia: [
              {
                courseNumber: course.courseNumber,
                ...(narrationAudioUrl && { narrationAudioUrl }),
                ...(aiImageUrl && { aiImageUrl }),
              },
            ],
          });
        }
      }

      // Schedule poster generation as a separate action to avoid timeout
      await ctx.scheduler.runAfter(0, internal.actions.media.generatePoster, {
        experienceId: args.experienceId,
      });
    } catch (error) {
      console.error("Media generation failed:", error);
      await ctx.runMutation(internal.experiences.updateStatus, {
        id: args.experienceId,
        status: "error",
      });
    }
  },
});

/**
 * Separate action for generating the social share poster.
 * Runs independently so it doesn't compete with audio/image generation for time.
 */
export const generatePoster = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    try {
      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.courses || !experience?.tracks) return;

      const geminiKey = process.env.GEMINI_API_KEY!;

      const courseList = experience.courses
        .map((c, i) => {
          const track = experience.tracks![i];
          return `Course ${c.courseNumber} (${c.courseType}): "${c.dishName}" — ${c.cuisineType}\n    Paired with: "${track.name}" by ${track.artist}\n    Wine: ${c.beverageName ?? "TBD"}`;
        })
        .join("\n  ");

      const posterPrompt = `Create a luxurious restaurant menu poster design. Dark background (#1a1a1a or similar deep charcoal/black). Elegant typography. Gold/warm accent colors. Hand-drawn or vintage-style food illustrations scattered around the edges.

The poster should read:

SONIC SOMMELIER (small, top, elegant serif font)

"${experience.title}" (large, centered, italic serif — the hero text)
${experience.subtitle}

Then list the 5-course tasting menu:
  ${courseList}

At the bottom: "Curated by Rhythm Lab Radio" in small elegant text.

Style: Sophisticated fine-dining menu meets vinyl record sleeve. Think jazz club menu meets Michelin-star restaurant. Dark, warm, editorial. The food illustrations should be line-art style (like the vintage breakfast menu aesthetic). Include subtle musical elements — a vinyl record, music notes, or sound waves woven into the design. No photographs, only illustrated/typographic elements. Vertical portrait orientation (3:4 ratio).`;

      const posterBase64 = await generateImage(posterPrompt, geminiKey, "3:4");
      if (posterBase64) {
        const posterBuffer = Buffer.from(posterBase64, "base64");
        const posterBlob = new Blob([posterBuffer], { type: "image/png" });
        const posterStorageId = await ctx.storage.store(posterBlob);
        const shareImageUrl =
          (await ctx.storage.getUrl(posterStorageId)) ?? undefined;
        if (shareImageUrl) {
          await ctx.runMutation(internal.experiences.updateMedia, {
            id: args.experienceId,
            shareImageUrl,
          });
        }
      }
    } catch (err) {
      console.error("Failed to generate share poster:", err);
    }
  },
});

/**
 * Public action to regenerate the share poster for an existing experience.
 * Useful for experiences created before the poster feature existed.
 */
export const retryPoster = action({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.actions.media.generatePoster, {
      experienceId: args.experienceId,
    });
    return "Poster generation scheduled";
  },
});
