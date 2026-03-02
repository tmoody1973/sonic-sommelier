"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { SignInButton } from "@clerk/nextjs";

// ─── Color Palette ─────────────────────────────────────────────────────────
const BG = "#0d0d0d";
const CREAM = "#F1E8D9";
const GOLD = "#C9A96E";
const GOLD_DIM = "#C9A96E88";
const MUTED = "#F1E8D944";
const FAINT = "#F1E8D91a";

// ─── Album Art Types ───────────────────────────────────────────────────────
interface SeedArt {
  artist: string;
  track: string;
  albumArt: string;
  album: string;
}

// ─── Hook: fetch seed art from API ─────────────────────────────────────────
function useSeedArt(): SeedArt[] {
  const [art, setArt] = useState<SeedArt[]>([]);
  useEffect(() => {
    fetch("/api/seed-art")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setArt(data);
      })
      .catch(() => {});
  }, []);
  return art;
}

// ─── Floating Album Art Grid (hero background) ────────────────────────────
function FloatingArtGrid({ art }: { art: SeedArt[] }) {
  if (art.length === 0) return null;

  // Duplicate to fill grid, pick 20
  const tiles = art.slice(0, 20);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 grid grid-cols-5 gap-3 p-8"
        style={{
          opacity: 0.06,
          transform: "rotate(-3deg) scale(1.2)",
          transformOrigin: "center center",
        }}
      >
        {tiles.map((t, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm overflow-hidden"
            style={{
              animationName: "floatTile",
              animationDuration: `${12 + (i % 5) * 3}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDelay: `${(i % 7) * -2}s`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.albumArt}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scrolling Album Art Marquee ───────────────────────────────────────────
function AlbumArtMarquee({
  art,
  direction = "left",
  speed = 40,
}: {
  art: SeedArt[];
  direction?: "left" | "right";
  speed?: number;
}) {
  if (art.length === 0) return null;

  // Double the items for seamless loop
  const items = [...art, ...art];

  return (
    <div className="overflow-hidden py-6" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
      <div
        className="flex gap-4 w-max"
        style={{
          animationName: direction === "left" ? "marqueeLeft" : "marqueeRight",
          animationDuration: `${speed}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {items.map((t, i) => (
          <div key={i} className="flex-shrink-0 group relative">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-sm overflow-hidden"
              style={{ border: `1px solid ${GOLD}15` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.albumArt}
                alt={`${t.artist} — ${t.album}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>
            {/* Label on hover */}
            <div
              className="absolute -bottom-5 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <span
                className="font-['Space_Grotesk'] text-[8px] tracking-wider uppercase whitespace-nowrap"
                style={{ color: CREAM + "44" }}
              >
                {t.artist}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scattered Art Tiles (alongside vertical text) ─────────────────────────
function ScatteredArt({
  art,
  side = "left",
}: {
  art: SeedArt[];
  side?: "left" | "right";
}) {
  if (art.length < 3) return null;

  const tiles = art.slice(0, 3);
  const positions = side === "left"
    ? [
        { top: "15%", left: "10px", rotate: "-6deg", size: "56px" },
        { top: "45%", left: "25px", rotate: "4deg", size: "48px" },
        { top: "75%", left: "5px", rotate: "-3deg", size: "52px" },
      ]
    : [
        { top: "20%", right: "10px", rotate: "5deg", size: "52px" },
        { top: "50%", right: "20px", rotate: "-4deg", size: "56px" },
        { top: "80%", right: "8px", rotate: "7deg", size: "48px" },
      ];

  return (
    <>
      {tiles.map((t, i) => {
        const pos = positions[i];
        return (
          <div
            key={i}
            className="hidden lg:block absolute"
            style={{
              ...pos,
              width: pos.size,
              height: pos.size,
              transform: `rotate(${pos.rotate})`,
              opacity: 0.12,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.albumArt}
              alt=""
              className="w-full h-full object-cover rounded-sm"
              loading="lazy"
            />
          </div>
        );
      })}
    </>
  );
}

// ─── Vertical Text (the signature layout element) ──────────────────────────
function VerticalText({
  children,
  side = "left",
  className = "",
}: {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`hidden md:block absolute top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} ${className}`}
      style={{ width: "60px" }}
    >
      <div
        className="sticky top-1/2 -translate-y-1/2 font-['Playfair_Display'] font-normal uppercase tracking-[0.15em]"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: side === "left" ? "rotate(180deg)" : "none",
          color: CREAM,
          fontSize: "clamp(48px, 6vw, 80px)",
          lineHeight: 1,
          opacity: 0.06,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Decorative Divider ────────────────────────────────────────────────────
function GoldRule({ width = "60px" }: { width?: string }) {
  return (
    <div
      className="mx-auto my-6"
      style={{ width, height: "1px", backgroundColor: GOLD_DIM }}
    />
  );
}

// ─── Section Header (menu-style gold accent bar) ───────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center mb-8">
      <div className="px-5 py-1.5" style={{ backgroundColor: GOLD }}>
        <span
          className="font-['Space_Grotesk'] text-[11px] tracking-[0.25em] uppercase font-medium"
          style={{ color: BG }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────
function AgentCard({
  number,
  name,
  role,
  description,
}: {
  number: string;
  name: string;
  role: string;
  description: string;
}) {
  return (
    <div className="p-5" style={{ border: `1px solid ${GOLD}33` }}>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="font-['JetBrains_Mono'] text-[11px]"
          style={{ color: GOLD_DIM }}
        >
          {number}
        </span>
        <span
          className="font-['Playfair_Display'] text-lg"
          style={{ color: CREAM }}
        >
          {name}
        </span>
      </div>
      <div
        className="font-['Space_Grotesk'] text-[10px] tracking-[0.2em] uppercase mb-2"
        style={{ color: GOLD }}
      >
        {role}
      </div>
      <p
        className="font-['Space_Grotesk'] text-[13px] leading-[1.6] m-0"
        style={{ color: CREAM + "88" }}
      >
        {description}
      </p>
    </div>
  );
}

// ─── Tech Stack Item ───────────────────────────────────────────────────────
function TechItem({ name, role }: { name: string; role: string }) {
  return (
    <div
      className="flex justify-between items-baseline py-2.5"
      style={{ borderBottom: `1px solid ${FAINT}` }}
    >
      <span
        className="font-['Space_Grotesk'] text-[14px] font-medium"
        style={{ color: CREAM }}
      >
        {name}
      </span>
      <span className="font-['Space_Grotesk'] text-[12px]" style={{ color: MUTED }}>
        {role}
      </span>
    </div>
  );
}

// ─── Pipeline Step ─────────────────────────────────────────────────────────
function PipelineStep({
  step,
  label,
  description,
}: {
  step: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="font-['JetBrains_Mono'] text-[11px] w-6 flex-shrink-0 pt-0.5 text-right"
        style={{ color: GOLD }}
      >
        {step}
      </div>
      <div>
        <div
          className="font-['Space_Grotesk'] text-[13px] font-medium mb-0.5"
          style={{ color: CREAM }}
        >
          {label}
        </div>
        <p
          className="font-['Space_Grotesk'] text-[12px] leading-[1.5] m-0"
          style={{ color: CREAM + "66" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const seedArt = useSeedArt();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      {/* ════════ HERO — with vertical "SONIC" on left, "SOMMELIER" on right ════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Floating album art background */}
        <FloatingArtGrid art={seedArt} />

        {/* Vertical text — left side */}
        <div
          className="hidden md:flex absolute left-4 lg:left-8 top-0 bottom-0 items-center"
          style={{ width: "70px" }}
        >
          <div
            className="font-['Playfair_Display'] font-normal uppercase"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              color: CREAM,
              fontSize: "clamp(72px, 9vw, 120px)",
              lineHeight: 0.85,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            Sonic
          </div>
        </div>

        {/* Vertical text — right side */}
        <div
          className="hidden md:flex absolute right-4 lg:right-8 top-0 bottom-0 items-center"
          style={{ width: "70px" }}
        >
          <div
            className="font-['Playfair_Display'] font-normal uppercase"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              color: CREAM,
              fontSize: "clamp(72px, 9vw, 120px)",
              lineHeight: 0.85,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              opacity: 0.08,
            }}
          >
            Sommelier
          </div>
        </div>

        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 40% at 50% 45%, ${GOLD}0a, transparent)`,
          }}
        />

        {/* Center content */}
        <div className="relative text-center max-w-2xl z-10">
          {/* Hackathon badge */}
          <div
            className="inline-block px-4 py-1 mb-8"
            style={{ backgroundColor: GOLD, color: BG }}
          >
            <span className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] uppercase font-semibold">
              Mistral AI Hackathon 2026
            </span>
          </div>

          <div
            className="font-['JetBrains_Mono'] text-[10px] tracking-[0.5em] uppercase mb-6"
            style={{ color: GOLD_DIM }}
          >
            Rhythm Lab Radio presents
          </div>

          <h1
            className="font-['Playfair_Display'] text-[52px] sm:text-[68px] md:text-[88px] italic font-normal leading-[0.95] mb-6"
            style={{ color: CREAM }}
          >
            Sonic<br />Sommelier
          </h1>

          {/* Decorative line */}
          <div
            className="w-16 h-px mx-auto mb-6"
            style={{ backgroundColor: GOLD }}
          />

          <p
            className="font-['Instrument_Serif'] text-xl md:text-2xl italic mb-3"
            style={{ color: CREAM + "77" }}
          >
            AI-curated dining experiences driven by music
          </p>

          <p
            className="font-['Space_Grotesk'] text-sm max-w-md mx-auto mb-10"
            style={{ color: CREAM + "44" }}
          >
            Tell us a mood, an artist, or a craving. Four AI agents collaborate to design
            a 5-course menu, curate the perfect playlist, pair wines, and narrate your experience.
          </p>

          <SignInButton mode="modal">
            <button
              className="px-10 py-4 font-['Space_Grotesk'] text-sm tracking-[0.2em] uppercase font-medium cursor-pointer border-none transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: GOLD, color: BG }}
            >
              Create Your Experience
            </button>
          </SignInButton>

          <div
            className="mt-6 font-['Space_Grotesk'] text-[11px] tracking-wider"
            style={{ color: CREAM + "33" }}
          >
            Free to use &middot; No credit card required
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ color: CREAM + "22" }}
        >
          <div className="font-['Space_Grotesk'] text-[9px] tracking-[0.3em] uppercase mb-2">
            Scroll
          </div>
          <div className="w-px h-8 mx-auto" style={{ backgroundColor: CREAM + "15" }} />
        </div>
      </section>

      {/* ════════ HOW IT WORKS — vertical "PIPELINE" on left ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="left">The Pipeline</VerticalText>
        <ScatteredArt art={seedArt.slice(0, 3)} side="right" />

        <div className="max-w-3xl mx-auto md:ml-[80px] lg:ml-auto lg:max-w-3xl">
          <SectionHeader>How It Works</SectionHeader>

          <div className="text-center mb-12">
            <h2
              className="font-['Playfair_Display'] text-[32px] md:text-[40px] italic font-normal leading-[1.1] mb-4"
              style={{ color: CREAM }}
            >
              From Sound to Flavor
            </h2>
            <p
              className="font-['Instrument_Serif'] text-base italic"
              style={{ color: CREAM + "55" }}
            >
              Four AI agents work together to translate music into a complete dining experience
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <PipelineStep
              step="01"
              label="You describe a vibe"
              description="A mood, a favorite artist, a cuisine craving, or just a feeling. 'Rainy night jazz for two' or 'Brazilian soul food.'"
            />
            <PipelineStep
              step="02"
              label="The Maitre D' interprets"
              description="Our orchestrator agent reads your input and crafts a creative brief — mood, cuisine direction, occasion, and an evocative title."
            />
            <PipelineStep
              step="03"
              label="The Music Curator selects 5 tracks"
              description="Seeded with 150 reference tracks from Rhythm Lab Radio's 20-year catalog, the curator builds a 5-track dining arc — culturally rooted, genre-fluid, and verified on Spotify."
            />
            <PipelineStep
              step="04"
              label="The Chef designs a menu"
              description="Each track's 'sonic fingerprint' — a natural language portrait of its feel, texture, and cultural DNA — inspires a home-cookable dish."
            />
            <PipelineStep
              step="05"
              label="The Sommelier pairs wines"
              description="A virtual Master Sommelier reads the sonic character and dish together, then selects the perfect wine or sake for each course."
            />
            <PipelineStep
              step="06"
              label="Your experience comes alive"
              description="AI-generated narration, dish imagery, and a story-mode presentation bring it all together — swipe through like a musical meal."
            />
          </div>
        </div>
      </section>

      {/* ════════ ALBUM ART MARQUEE — scrolling left ════════ */}
      <AlbumArtMarquee art={seedArt.slice(0, 12)} direction="left" speed={45} />

      <GoldRule width="100px" />

      {/* ════════ RHYTHM LAB RADIO DNA — vertical "RHYTHM LAB" on right ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="right">Rhythm Lab</VerticalText>
        <ScatteredArt art={seedArt.slice(3, 6)} side="left" />

        <div className="max-w-3xl mx-auto md:mr-[80px] lg:mr-auto lg:max-w-3xl">
          <SectionHeader>The Musical DNA</SectionHeader>

          <div className="text-center mb-10">
            <h2
              className="font-['Playfair_Display'] text-[32px] md:text-[40px] italic font-normal leading-[1.1] mb-4"
              style={{ color: CREAM }}
            >
              Born from Rhythm Lab Radio
            </h2>
            <p
              className="font-['Instrument_Serif'] text-base italic max-w-lg mx-auto"
              style={{ color: CREAM + "55" }}
            >
              Every recommendation is seeded by 20+ years of genre-defying curation
            </p>
          </div>

          <div
            className="font-['Space_Grotesk'] text-[13px] leading-[1.7] space-y-4 max-w-2xl mx-auto mb-10"
            style={{ color: CREAM + "88" }}
          >
            <p>
              <a
                href="https://rhythmlab.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: GOLD, textDecoration: "none" }}
              >
                Rhythm Lab Radio
              </a>{" "}
              is Tarik Moody&apos;s genre-fluid music show — weaving hip-hop, electronic, soul, jazz,
              Afrobeat, and world music into intentional sets since the early 2000s. The show&apos;s
              philosophy: <em style={{ color: CREAM }}>music has no borders, only connections</em>.
            </p>
            <p>
              Sonic Sommelier&apos;s AI curator doesn&apos;t start from zero. It&apos;s trained on a{" "}
              <strong style={{ color: CREAM }}>150-track seed list</strong> — a handpicked reference
              library spanning 13 categories that defines &ldquo;Rhythm Lab quality.&rdquo; Every track was
              chosen because it represents the show&apos;s aesthetic: genre-fluid, discovery-focused,
              culturally grounded.
            </p>
          </div>

          {/* Seed categories grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-10">
            {[
              "Hip-Hop",
              "Jazz / Jazz Fusion",
              "Soul / Neo-Soul / R&B",
              "Electronic / Dance",
              "Afrobeat / Global",
              "70s Jazz Fusion",
              "Cross-Genre",
              "Canonical Touchstones",
              "Global Grooves",
            ].map((cat) => (
              <div
                key={cat}
                className="px-3 py-2 text-center"
                style={{ border: `1px solid ${GOLD}22` }}
              >
                <span
                  className="font-['Space_Grotesk'] text-[10px] tracking-[0.15em] uppercase"
                  style={{ color: GOLD_DIM }}
                >
                  {cat}
                </span>
              </div>
            ))}
          </div>

          <div
            className="font-['Space_Grotesk'] text-[13px] leading-[1.7] space-y-4 max-w-2xl mx-auto mb-8"
            style={{ color: CREAM + "88" }}
          >
            <p>
              The seed list includes metadata from <strong style={{ color: CREAM }}>34 key labels</strong> —
              Brainfeeder, Stones Throw, Warp, Ninja Tune, Blue Note, Far Out Recordings, and more.
              When you ask for &ldquo;Brazilian soul,&rdquo; the curator draws on artists it already
              knows from the seed list&apos;s Global Grooves category: Marcos Valle, Tim Maia, Seu Jorge.
            </p>
            <p>
              Each seed track carries a <strong style={{ color: CREAM }}>&ldquo;why&rdquo; field</strong> — a note
              from Tarik explaining what makes it Rhythm Lab material. This taste DNA flows through
              every recommendation the AI makes. The result: playlists that feel like they were
              curated by a human who&apos;s spent decades in the crates, not an algorithm.
            </p>
          </div>

          {/* Sample taste DNA */}
          <div
            className="max-w-2xl mx-auto p-5"
            style={{ border: `1px solid ${GOLD}22`, background: CREAM + "03" }}
          >
            <div
              className="font-['JetBrains_Mono'] text-[9px] tracking-[0.2em] uppercase mb-3"
              style={{ color: GOLD_DIM }}
            >
              Sample Seed Entry
            </div>
            <div className="font-['Space_Grotesk'] text-[13px]" style={{ color: CREAM }}>
              Khruangbin &mdash; &ldquo;Time (You and I)&rdquo;
            </div>
            <div
              className="font-['Space_Grotesk'] text-[11px] mt-1 mb-2"
              style={{ color: CREAM + "55" }}
            >
              Global Grooves &middot; Houston, USA &middot; Contemporary
            </div>
            <p
              className="font-['Instrument_Serif'] text-[13px] italic leading-[1.6] m-0"
              style={{ color: GOLD_DIM }}
            >
              &ldquo;Thai funk meets surf rock meets global soul. The trio&apos;s ability to inhabit
              multiple cultural sonic spaces simultaneously is peak Rhythm Lab aesthetic.&rdquo;
            </p>
          </div>
        </div>
      </section>

      <GoldRule width="100px" />

      {/* ════════ THE AGENTS — vertical "AGENTS" on right ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="right">Agents</VerticalText>

        <div className="max-w-4xl mx-auto md:mr-[80px] lg:mr-auto lg:max-w-4xl">
          <SectionHeader>The Agents</SectionHeader>

          <div className="text-center mb-12">
            <h2
              className="font-['Playfair_Display'] text-[32px] md:text-[40px] italic font-normal leading-[1.1] mb-4"
              style={{ color: CREAM }}
            >
              A Kitchen of AI Minds
            </h2>
            <p
              className="font-['Instrument_Serif'] text-base italic max-w-lg mx-auto"
              style={{ color: CREAM + "55" }}
            >
              Powered by Mistral&apos;s Agents API, four specialized agents collaborate
              through a structured pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgentCard
              number="01"
              name="The Maitre D'"
              role="Orchestrator"
              description="Interprets your raw input — a mood, an artist, a craving — and produces a structured creative brief. Sets the tone, cuisine direction, and emotional arc for the entire experience."
            />
            <AgentCard
              number="02"
              name="The Music Curator"
              role="Sonic Architect"
              description="Seeded with Rhythm Lab Radio's 150-track reference library spanning hip-hop, jazz, soul, Afrobeat, electronic, and world music. Searches Spotify to verify every track, then writes a 'sonic fingerprint' — a natural language portrait of each track's feel."
            />
            <AgentCard
              number="03"
              name="The Culinary Chef"
              role="Home Cook Artist"
              description="Reads each track's sonic fingerprint and translates feeling into flavor. 'Warm analog bass with humid bossa nova' becomes citrus-bright Brazilian-inspired stew. Every dish is home-cookable."
            />
            <AgentCard
              number="04"
              name="The Sommelier"
              role="Beverage Specialist"
              description="A virtual Master Sommelier with Certified Sake Professional knowledge. Pairs each course with wine or sake that bridges the sonic mood and the dish's flavor profile."
            />
          </div>
        </div>
      </section>

      {/* ════════ ALBUM ART MARQUEE — scrolling right ════════ */}
      <AlbumArtMarquee art={seedArt.slice(12, 24)} direction="right" speed={50} />

      <GoldRule width="100px" />

      {/* ════════ POWERED BY — vertical "MISTRAL" on left ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="left">Mistral</VerticalText>

        <div className="max-w-4xl mx-auto md:ml-[80px] lg:ml-auto lg:max-w-4xl">
          <SectionHeader>Powered By</SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Mistral */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center font-['JetBrains_Mono'] text-sm font-bold"
                  style={{ backgroundColor: GOLD, color: BG }}
                >
                  M
                </div>
                <div>
                  <h3
                    className="font-['Playfair_Display'] text-xl m-0"
                    style={{ color: CREAM }}
                  >
                    Mistral AI
                  </h3>
                  <div
                    className="font-['Space_Grotesk'] text-[10px] tracking-[0.15em] uppercase"
                    style={{ color: GOLD }}
                  >
                    Agent Intelligence
                  </div>
                </div>
              </div>
              <div
                className="font-['Space_Grotesk'] text-[13px] leading-[1.7] space-y-3"
                style={{ color: CREAM + "88" }}
              >
                <p>
                  All four agents run on{" "}
                  <strong style={{ color: CREAM }}>Mistral Large</strong> (128K
                  context) via the{" "}
                  <strong style={{ color: CREAM }}>Mistral Agents API</strong>.
                  Each agent has specialized system instructions, tool access, and
                  structured output formats.
                </p>
                <p>
                  The Music Curator uses Mistral&apos;s built-in{" "}
                  <strong style={{ color: CREAM }}>web_search</strong> tool
                  alongside a custom Spotify search tool to verify every track
                  exists and find real Spotify IDs.
                </p>
                <p>
                  The Chef uses a{" "}
                  <strong style={{ color: CREAM }}>recipe search</strong> tool
                  (Spoonacular API) to ground its creative dishes in real-world
                  recipes with actual ingredients and instructions.
                </p>
                <p>
                  Our &ldquo;Sonic Fingerprinting&rdquo; approach lets Mistral
                  describe music in natural language — the Chef reads{" "}
                  <em>
                    &ldquo;warm analog bass with humid bossa nova guitar&rdquo;
                  </em>{" "}
                  instead of raw numbers, producing far more expressive food-music
                  connections.
                </p>
              </div>
            </div>

            {/* ElevenLabs */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center font-['JetBrains_Mono'] text-sm font-bold"
                  style={{ backgroundColor: GOLD, color: BG }}
                >
                  XI
                </div>
                <div>
                  <h3
                    className="font-['Playfair_Display'] text-xl m-0"
                    style={{ color: CREAM }}
                  >
                    ElevenLabs
                  </h3>
                  <div
                    className="font-['Space_Grotesk'] text-[10px] tracking-[0.15em] uppercase"
                    style={{ color: GOLD }}
                  >
                    Voice & Narration
                  </div>
                </div>
              </div>
              <div
                className="font-['Space_Grotesk'] text-[13px] leading-[1.7] space-y-3"
                style={{ color: CREAM + "88" }}
              >
                <p>
                  Every experience includes AI-generated narration using
                  ElevenLabs&apos;{" "}
                  <strong style={{ color: CREAM }}>v3 text-to-speech</strong>{" "}
                  engine. A warm, conversational voice introduces each course —
                  part radio host, part sommelier.
                </p>
                <p>
                  The narration text itself is written by Mistral, blending the
                  style of a late-night radio DJ with the warmth of a
                  knowledgeable waiter:{" "}
                  <em>
                    &ldquo;This next dish is a conversation between citrus and
                    heat, just like the track that inspired it.&rdquo;
                  </em>
                </p>
                <p>
                  Audio plays automatically as you swipe through each course, with
                  background Spotify music at a lower volume creating a layered
                  sonic experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GoldRule width="100px" />

      {/* ════════ TECH STACK — vertical "STACK" on right ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="right">Stack</VerticalText>

        <div className="max-w-xl mx-auto md:mr-[80px] lg:mr-auto lg:max-w-xl">
          <SectionHeader>The Stack</SectionHeader>

          <div className="text-center mb-10">
            <p
              className="font-['Instrument_Serif'] text-xl italic"
              style={{ color: CREAM + "77" }}
            >
              Built for the Mistral AI Hackathon
            </p>
          </div>

          <div className="flex flex-col">
            <TechItem name="Rhythm Lab Radio" role="150-track seed list (musical DNA)" />
            <TechItem name="Mistral Large" role="AI Agents (4 agents, 128K context)" />
            <TechItem name="ElevenLabs v3" role="Text-to-Speech Narration" />
            <TechItem name="Google Gemini" role="AI Image Generation (dishes + poster)" />
            <TechItem name="Convex" role="Real-time Backend & Database" />
            <TechItem name="Next.js 16" role="Frontend Framework (App Router)" />
            <TechItem name="Spotify API" role="Track Search & Metadata" />
            <TechItem name="Spoonacular" role="Recipe Search & Ingredients" />
            <TechItem name="Clerk" role="Authentication" />
            <TechItem name="Framer Motion" role="Animations & Transitions" />
            <TechItem name="Tailwind CSS" role="Styling" />
          </div>
        </div>
      </section>

      <GoldRule width="100px" />

      {/* ════════ FEATURES — vertical "FEATURES" on left ════════ */}
      <section className="relative px-6 py-24">
        <VerticalText side="left">Features</VerticalText>
        <ScatteredArt art={seedArt.slice(6, 9)} side="right" />

        <div className="max-w-3xl mx-auto md:ml-[80px] lg:ml-auto lg:max-w-3xl">
          <SectionHeader>Features</SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {(
              [
                ["Sonic Fingerprinting", "Natural language music descriptions drive food pairing, not raw numbers"],
                ["5-Course Dining Arc", "Music and food follow a narrative: arrival, opening, deepening, peak, resolution"],
                ["Real Recipes", "Every dish includes ingredients, instructions, prep time — cookable tonight"],
                ["AI Narration", "ElevenLabs voice guides you through each course like a personal radio host"],
                ["Culturally Rooted", "Brazilian mood? Get Tim Maia, not generic indie. The curator goes deep"],
                ["AI Dish Imagery", "Gemini generates beautiful images for each course"],
                ["Story Mode", "Swipe through your experience like Instagram stories with auto-advance"],
                ["Share & Download", "Poster generation, recipe card downloads, social sharing"],
              ] as const
            ).map(([title, desc], i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="font-['JetBrains_Mono'] text-[10px] mt-1 flex-shrink-0"
                  style={{ color: GOLD_DIM }}
                >
                  &#9670;
                </span>
                <div>
                  <div
                    className="font-['Space_Grotesk'] text-[13px] font-medium mb-0.5"
                    style={{ color: CREAM }}
                  >
                    {title}
                  </div>
                  <p
                    className="font-['Space_Grotesk'] text-[12px] leading-[1.5] m-0"
                    style={{ color: CREAM + "55" }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoldRule width="100px" />

      {/* ════════ QUOTE / PULL QUOTE ════════ */}
      <section className="relative px-6 py-20 overflow-hidden">
        {/* Large decorative background quote marks */}
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 font-['Playfair_Display'] text-[200px] leading-none pointer-events-none select-none"
          style={{ color: GOLD + "08" }}
        >
          &ldquo;
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <p
            className="font-['Instrument_Serif'] text-2xl md:text-3xl italic leading-[1.4] mb-4"
            style={{ color: CREAM + "bb" }}
          >
            What if your playlist could cook you dinner?
          </p>
          <div
            className="font-['Space_Grotesk'] text-[11px] tracking-[0.2em] uppercase"
            style={{ color: GOLD_DIM }}
          >
            The question that started it all
          </div>
        </div>
      </section>

      <GoldRule width="100px" />

      {/* ════════ CTA ════════ */}
      <section className="relative px-6 py-32 text-center overflow-hidden">
        {/* Background vertical text for drama */}
        <div
          className="hidden md:block absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-['Playfair_Display'] text-[180px] lg:text-[240px] font-normal uppercase whitespace-nowrap"
            style={{ color: CREAM + "04", letterSpacing: "0.05em" }}
          >
            YOUR TABLE AWAITS
          </div>
        </div>

        <div className="relative z-10">
          <h2
            className="font-['Playfair_Display'] text-[36px] md:text-[48px] italic font-normal leading-[1.1] mb-4"
            style={{ color: CREAM }}
          >
            Your Table Awaits
          </h2>
          <p
            className="font-['Instrument_Serif'] text-lg italic mb-10"
            style={{ color: CREAM + "55" }}
          >
            Tell us what you&apos;re in the mood for. We&apos;ll handle the rest.
          </p>
          <SignInButton mode="modal">
            <button
              className="px-12 py-4 font-['Space_Grotesk'] text-sm tracking-[0.2em] uppercase font-medium cursor-pointer border-none transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: GOLD, color: BG }}
            >
              Begin Your Experience
            </button>
          </SignInButton>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="px-6 py-12 text-center" style={{ borderTop: `1px solid ${FAINT}` }}>
        <div
          className="font-['JetBrains_Mono'] text-[10px] tracking-[0.3em] uppercase mb-2"
          style={{ color: CREAM + "33" }}
        >
          Sonic Sommelier
        </div>
        <div
          className="font-['Space_Grotesk'] text-[11px] mb-4"
          style={{ color: CREAM + "22" }}
        >
          Built by Tarik Moody for the Mistral AI Hackathon 2026
        </div>
        <div
          className="font-['Space_Grotesk'] text-[10px]"
          style={{ color: CREAM + "15" }}
        >
          Rhythm Lab Radio &middot; Milwaukee, WI
        </div>
      </footer>
    </div>
  );
}
