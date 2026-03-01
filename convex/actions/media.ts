"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { createMistralClient } from "../lib/agents";
import { runAgentConversation, parseAgentJson } from "./toolExecutor";
import { synthesizeSpeech } from "../lib/elevenlabs";
import { generateImage } from "../lib/gemini";
import { nanoid } from "nanoid";

/**
 * Step 5: Media Generation — generates narration audio (ElevenLabs) and
 * dish images (Gemini) for the completed experience, then marks it ready.
 */
export const run = internalAction({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    try {
      const experience = await ctx.runQuery(
        internal.experiences.getInternal,
        { id: args.experienceId }
      );
      if (!experience?.courses || !experience?.tracks) {
        throw new Error("Missing courses or tracks data");
      }

      const mistralClient = createMistralClient(process.env.MISTRAL_API_KEY!);
      const maitreDAgentId = process.env.MAITRE_D_AGENT_ID!;
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;
      const geminiKey = process.env.GEMINI_API_KEY!;

      // ── 1. Generate narration text via Maitre D' agent ──────────────────

      const narrationPrompt = `You are narrating a luxury dining experience called "${experience.title}" (${experience.subtitle}).
Mood: ${experience.brief?.mood ?? "eclectic"}
Cuisine direction: ${experience.brief?.cuisineDirection ?? "eclectic"}

Write narration text for this experience. Return a JSON object with:
- "intro": A 2-3 sentence poetic introduction to the experience (sets the scene, welcomes the guest)
- "courses": An array of 5 objects, each with:
  - "courseNumber": the course number (1-5)
  - "narration": A 2-3 sentence narration for each course, describing the dish ("${experience.courses.map((c) => c.dishName).join('", "')}"), its paired track ("${experience.tracks.map((t) => `${t.name} by ${t.artist}`).join('", "')}"), and the beverage pairing. Paint a vivid sensory picture.

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

      let narrationData: { intro: string; courses: Array<{ courseNumber: number; narration: string }> };
      try {
        narrationData = parseAgentJson(narrationResult) as typeof narrationData;
      } catch {
        // Fallback: use a simple intro if the agent output can't be parsed
        narrationData = {
          intro: `Welcome to ${experience.title}. ${experience.subtitle}.`,
          courses: experience.courses.map((c) => ({
            courseNumber: c.courseNumber,
            narration: `Course ${c.courseNumber}: ${c.dishName}. ${c.dishDescription}`,
          })),
        };
      }

      // ── 2. Generate intro narration audio (ElevenLabs) ──────────────────

      let introNarrationUrl: string | undefined;
      try {
        const introAudio = await synthesizeSpeech(narrationData.intro, elevenLabsKey);
        const introBlob = new Blob([introAudio], { type: "audio/mpeg" });
        const introStorageId = await ctx.storage.store(introBlob);
        introNarrationUrl = await ctx.storage.getUrl(introStorageId) ?? undefined;
      } catch (err) {
        console.error("Failed to generate intro narration audio:", err);
      }

      // ── 3. Generate course narration audio + dish images ────────────────

      const courseMedia: Array<{
        courseNumber: number;
        narrationText?: string;
        narrationAudioUrl?: string;
        aiImageUrl?: string;
      }> = [];

      for (const course of experience.courses) {
        const courseNarration = narrationData.courses.find(
          (n) => n.courseNumber === course.courseNumber
        );
        const narrationText = courseNarration?.narration ??
          `${course.dishName}. ${course.dishDescription}`;

        let narrationAudioUrl: string | undefined;
        let aiImageUrl: string | undefined;

        // Generate narration audio for this course
        try {
          const courseAudio = await synthesizeSpeech(narrationText, elevenLabsKey);
          const courseBlob = new Blob([courseAudio], { type: "audio/mpeg" });
          const storageId = await ctx.storage.store(courseBlob);
          narrationAudioUrl = await ctx.storage.getUrl(storageId) ?? undefined;
        } catch (err) {
          console.error(`Failed to generate audio for course ${course.courseNumber}:`, err);
        }

        // Generate dish image via Gemini
        try {
          const imagePrompt = `Professional food photography of "${course.dishName}" — ${course.dishDescription}. ${course.cuisineType} cuisine. Beautifully plated on elegant dinnerware. Soft, warm lighting. Shallow depth of field. Top-down or 45-degree angle. Fine dining presentation. No text or watermarks.`;
          const base64Image = await generateImage(imagePrompt, geminiKey);
          if (base64Image) {
            const imageBuffer = Buffer.from(base64Image, "base64");
            const imageBlob = new Blob([imageBuffer], { type: "image/png" });
            const storageId = await ctx.storage.store(imageBlob);
            aiImageUrl = await ctx.storage.getUrl(storageId) ?? undefined;
          }
        } catch (err) {
          console.error(`Failed to generate image for course ${course.courseNumber}:`, err);
        }

        courseMedia.push({
          courseNumber: course.courseNumber,
          narrationText,
          narrationAudioUrl,
          aiImageUrl,
        });
      }

      // ── 4. Update experience with all media ─────────────────────────────

      await ctx.runMutation(internal.experiences.updateMedia, {
        id: args.experienceId,
        introNarrationText: narrationData.intro,
        introNarrationUrl,
        courseMedia,
      });

      // ── 5. Mark experience as ready ─────────────────────────────────────

      const shareSlug = nanoid(10);
      await ctx.runMutation(internal.experiences.markReady, {
        id: args.experienceId,
        shareSlug,
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
