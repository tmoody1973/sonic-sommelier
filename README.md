# Sonic Sommelier

> Where music meets cuisine. AI transforms your favorite tracks into a personalized 5-course dining experience with wine and sake pairings.

## Overview

Sonic Sommelier analyzes the sonic profile of your music — energy, valence, tempo, danceability, acousticness — and orchestrates four AI agents to craft a complete fine dining experience. Each course is paired with a track from your taste profile and a complementary wine or sake.

The result is delivered as a Spotify Wrapped-style story flow: an 8-screen interactive experience you can tap/swipe through and share with friends.

### How It Works

1. **Chat with the Maitre D'** — Describe a mood, drop an artist name, or share a craving
2. **AI Agent Pipeline** — Four Mistral agents work sequentially:
   - **Maitre D'** interprets your input into a creative brief
   - **Music Curator** finds 5 tracks and analyzes their audio features
   - **Culinary Chef** designs 5 courses mapped to the sonic arc
   - **Wine & Sake Sommelier** pairs each course with wine or sake (at least one sake)
3. **Media Generation** — ElevenLabs narrates the experience, Gemini generates dish imagery
4. **Experience** — Tap through your personalized tasting menu with animations and audio

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion |
| Backend | Convex (real-time database + serverless functions) |
| Auth | Clerk (Google/GitHub social login) |
| AI Agents | Mistral Agents API (4 specialized agents with function calling) |
| Voice | ElevenLabs v3 TTS |
| Images | Google Gemini 2.0 Flash |
| Music Data | SoundStat, Spotify Web API, YouTube Data API |
| Food Data | Spoonacular API |

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- API keys for: Mistral, SoundStat, Spotify, YouTube, Spoonacular, ElevenLabs, Gemini

### Installation

```bash
git clone https://github.com/tmoody1973/sonic-sommelier.git
cd sonic-sommelier
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
```

### Convex Setup

```bash
npx convex dev
```

This starts the Convex dev server and syncs your schema/functions. You'll also need to set the server-side environment variables in the [Convex dashboard](https://dashboard.convex.dev) under Settings > Environment Variables:

- `MISTRAL_API_KEY`
- `SOUNDSTAT_API_KEY`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `SPOONACULAR_API_KEY`
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`

### Clerk Setup

Configure Clerk with a JWT template for Convex. Set the issuer domain in your `.env.local` as `CLERK_JWT_ISSUER_DOMAIN`. See the [Convex + Clerk docs](https://docs.convex.dev/auth/clerk) for details.

### Register Agents

Run once to create the 4 Mistral agents:

```bash
npx convex run setupAgents:setup
```

Save the returned agent IDs as Convex environment variables:
- `MAITRE_D_AGENT_ID`
- `MUSIC_CURATOR_AGENT_ID`
- `CULINARY_CHEF_AGENT_ID`
- `SOMMELIER_AGENT_ID`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
sonic-sommelier/
├── app/
│   ├── page.tsx                    # Auth gate + chat UI
│   ├── experience/[id]/page.tsx    # Real-time experience viewer
│   ├── menu/[slug]/page.tsx        # Public share page (no auth)
│   ├── layout.tsx                  # Root layout with providers
│   ├── providers.tsx               # Clerk + Convex provider wrapper
│   └── globals.css                 # Grain texture, ambient animations
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx       # Chat with the Maitre D'
│   │   └── MessageBubble.tsx       # Styled message bubbles
│   ├── experience/
│   │   ├── StoryFlow.tsx           # 8-screen tap/swipe story flow
│   │   ├── LoadingState.tsx        # Pipeline progress display
│   │   ├── RadarChart.tsx          # SVG radar chart (sonic profile)
│   │   ├── SonicProfileScreen.tsx  # "Your Sonic Profile" screen
│   │   ├── CourseCard.tsx          # Course card with Ken Burns + pairings
│   │   └── FullMenuScreen.tsx      # Complete tasting menu + share
│   └── ErrorBoundary.tsx           # React error boundary
├── convex/
│   ├── schema.ts                   # Database schema (experiences, users, trackCache)
│   ├── experiences.ts              # Queries + mutations for experiences
│   ├── users.ts                    # User management
│   ├── setupAgents.ts              # One-time agent registration
│   ├── actions/
│   │   ├── generate.ts             # Public entry point (creates experience)
│   │   ├── interpret.ts            # Step 1: Maitre D' agent
│   │   ├── curate.ts               # Step 2: Music Curator agent
│   │   ├── cook.ts                 # Step 3: Culinary Chef agent
│   │   ├── pair.ts                 # Step 4: Wine & Sake Sommelier agent
│   │   ├── media.ts                # Step 5: ElevenLabs + Gemini media
│   │   └── toolExecutor.ts         # Shared agent conversation loop
│   └── lib/
│       ├── agents.ts               # 4 Mistral agent definitions
│       ├── soundstat.ts            # SoundStat API wrapper
│       ├── spotify.ts              # Spotify Web API wrapper
│       ├── youtube.ts              # YouTube Data API wrapper
│       ├── spoonacular.ts          # Spoonacular API wrapper
│       ├── elevenlabs.ts           # ElevenLabs v3 TTS wrapper
│       ├── gemini.ts               # Gemini image generation wrapper
│       └── palette.ts              # Sonic-to-color palette derivation
├── lib/
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── palette.ts                  # Palette + sonic profile utilities
│   └── palette.test.ts             # Vitest tests for palette logic
└── package.json
```

## Environment Variables

| Variable | Description | Required | Where |
|----------|-------------|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Yes | `.env.local` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes | `.env.local` |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes | `.env.local` |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer for Convex | Yes | `.env.local` |
| `MISTRAL_API_KEY` | Mistral AI API key | Yes | Convex dashboard |
| `MAITRE_D_AGENT_ID` | Maitre D' agent ID (from setupAgents) | Yes | Convex dashboard |
| `MUSIC_CURATOR_AGENT_ID` | Music Curator agent ID | Yes | Convex dashboard |
| `CULINARY_CHEF_AGENT_ID` | Culinary Chef agent ID | Yes | Convex dashboard |
| `SOMMELIER_AGENT_ID` | Sommelier agent ID | Yes | Convex dashboard |
| `SOUNDSTAT_API_KEY` | SoundStat audio analysis | Yes | Convex dashboard |
| `SPOTIFY_CLIENT_ID` | Spotify Web API | Yes | Convex dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Web API | Yes | Convex dashboard |
| `YOUTUBE_API_KEY` | YouTube Data API | Yes | Convex dashboard |
| `SPOONACULAR_API_KEY` | Spoonacular recipe API | Yes | Convex dashboard |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS | Yes | Convex dashboard |
| `GEMINI_API_KEY` | Google Gemini image gen | Yes | Convex dashboard |

## The Sonic-to-Flavor Algorithm

Audio features map to culinary dimensions:

| Audio Feature | Culinary Dimension |
|---------------|-------------------|
| Energy | Spice intensity, cooking method (raw to charred) |
| Valence | Sweetness vs umami depth |
| Tempo | Plating complexity, portion rhythm |
| Danceability | Textural interplay, interactive elements |
| Acousticness | Ingredient purity, farm-to-table vs molecular |
| Mode (major/minor) | Bright citrus vs deep earthy tones |

The 5-course arc follows the sonic journey: **Opening**, **Rising**, **Crescendo**, **Reflection**, **Finale**.

## Pipeline Status Flow

```
interpreting → curating_music → designing_menu → pairing_beverages → generating_media → ready
```

The frontend subscribes to the experience in real-time via Convex `useQuery`, showing animated progress as each pipeline step completes.

## License

MIT

---

Built by [Tarik Moody](https://github.com/tmoody1973) — Certified Sake Professional + Music Curator
