# Sonic Sommelier

> Where music meets cuisine. AI transforms your favorite tracks into a personalized 5-course dining experience with wine pairings — built for the **Mistral AI Hackathon 2026**.

**Live Demo:** [sonic-sommelier.vercel.app](https://sonic-sommelier-7gbm6f861-tmoody1973s-projects.vercel.app)

---

## Overview

Sonic Sommelier is an AI-powered multi-agent system that translates the *feeling* of music into food. Tell it a mood, drop an artist name, mention a specific instrument, or describe a craving — and four Mistral AI agents collaborate to produce a complete 5-course dining experience: curated Spotify tracks, AI-generated home-cookable recipes, wine pairings, narrated audio, and AI-generated food photography.

The result is delivered as a tap-through story flow (like Spotify Wrapped), narrated by a voice that blends late-night radio host with fine-dining waiter.

### What Makes This Special

- **Sonic Fingerprinting** — Instead of relying on raw audio numbers, the Music Curator writes natural language "sonic character" descriptions for each track ("warm analog bass with humid bossa nova guitar, languid shuffle at 92 BPM"). The Chef and Sommelier *read* these descriptions like a chef reads a season, translating texture and mood into flavor.
- **Rhythm Lab Radio DNA** — All music curation is anchored in a 150-track seed list from [Rhythm Lab Radio](https://rhythmlab.com), Tarik Moody's genre-defying show. The AI curator selects tracks that share sonic DNA with this curated taste profile.
- **Instrument-Aware Curation** — Say "flute jazz" and the curator will specifically seek tracks with prominent flute — Herbie Mann, Yusef Lateef, Bobbi Humphrey. The raw user input passes through the entire pipeline so every agent honors the specifics.
- **AI-Generated Recipes** — The Culinary Chef agent generates complete, home-cookable recipes (ingredients with measurements + step-by-step instructions) directly from each track's sonic character. No recipe API needed — the AI designs dishes that precisely match the music.
- **Home Cooking Philosophy** — Dishes are designed to be cookable at home tonight, not Michelin-star pretension. Real food, real ingredients, real techniques.
- **Progressive Loading** — The experience uses a restaurant metaphor: narration text loads instantly, then audio and images "arrive" course by course via Convex real-time subscriptions.

---

## How It Works

```
User Input → Maitre D' → Music Curator → Culinary Chef → Sommelier → Media Generation → Experience
     │              │            │               │              │
     │         Interprets    Selects 5       Designs 5      Pairs each
     │         mood/cuisine  Spotify tracks  courses with   course with
     │         from free     with sonic      full AI        wine using
     │         text input    fingerprints    recipes        sonic profile
     │
     └──── Raw input preserved and passed to ALL agents ────────────────►
```

1. **Chat with the Maitre D'** — Type anything: a mood ("melancholic evening"), an artist ("Coltrane"), a genre+instrument ("flute jazz"), a food craving ("I want something Brazilian"), or any combination
2. **AI Agent Pipeline** — Four Mistral agents work sequentially, each passing structured data to the next:
   - **Maitre D'** interprets your input into a creative brief (mood, cuisine direction, occasion, title)
   - **Music Curator** finds 5 real Spotify tracks with sonic fingerprints, honoring your specific requests
   - **Culinary Chef** designs 5 home-cookable courses with full recipes, each inspired by its track's sonic character
   - **Wine Sommelier** pairs each course with wine, guided by both dish and sonic profile
3. **Media Generation** — ElevenLabs narrates the experience, Gemini generates dish photography + a share poster
4. **Experience** — Tap through your personalized tasting menu with animations, audio narration, and downloadable recipe cards

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion | Tap-through story flow UI |
| Backend | Convex (real-time database + serverless functions) | Pipeline orchestration, real-time updates |
| Auth | Clerk (Google/GitHub social login) | User authentication |
| **AI Agents** | **Mistral Agents API (beta)** | **4 specialized agents with function calling** |
| **AI Model** | **`mistral-large-latest`** (128K context) | **All agent reasoning and generation** |
| Voice | ElevenLabs v3 TTS (`eleven_v3` model) | Narration audio |
| Images | Google Gemini 2.0 Flash | Food photography + poster generation |
| Music Data | Spotify Web API, YouTube search | Track metadata, album art, video playback |
| Wine Data | Spoonacular API | Wine pairing data, bottle recommendations |

---

## Mistral AI — Deep Dive

This is the core of the application. We use the **Mistral Agents API (beta)** to create 4 persistent, specialized agents that collaborate through a sequential pipeline. Each agent has its own system prompt, tool definitions, and structured JSON output format.

### Why Mistral Agents API?

We chose the Mistral Agents API over raw chat completions for several reasons:

1. **Persistent Agent Identity** — Each agent is created once via `client.beta.agents.create()` with a unique system prompt. The agent ID is stored as an environment variable. This means the agent's personality, rules, and knowledge are embedded at the agent level, not re-sent every call.

2. **Conversation State Management** — The Conversations API (`client.beta.conversations.start()` / `.append()`) handles multi-turn tool calling automatically. The agent can make multiple tool calls in sequence, receive results, and reason before responding — all within a single managed conversation.

3. **Built-in Function Calling** — Tools are defined as JSON Schema objects on the agent. Mistral handles the function call/result protocol. Our code just dispatches tool calls to the right API and feeds results back.

4. **Built-in Web Search** — The Music Curator uses Mistral's native `web_search` tool to discover tracks and verify artist information, alongside custom Spotify search tools.

### Agent Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Mistral Agents API (Beta)                        │
│                    Model: mistral-large-latest                      │
├─────────────┬──────────────┬──────────────────┬─────────────────────┤
│  Maitre D'  │ Music Curator│  Culinary Chef   │  Wine Sommelier     │
│             │              │                  │                     │
│  No tools   │ Spotify      │  No tools        │  Spoonacular        │
│  Pure       │ search +     │  Pure reasoning  │  wine pairing +     │
│  reasoning  │ web search   │  + recipe gen    │  wine recs +        │
│             │              │                  │  wine descriptions  │
│  1 turn     │ Up to 20     │  Up to 3 turns   │  Up to 20 turns     │
│             │ turns        │                  │                     │
├─────────────┼──────────────┼──────────────────┼─────────────────────┤
│  Output:    │ Output:      │ Output:          │ Output:             │
│  Creative   │ 5 tracks +   │ 5 courses +      │ 5 wine pairings     │
│  brief JSON │ sonic chars  │ full recipes     │ + tasting notes     │
└─────────────┴──────────────┴──────────────────┴─────────────────────┘
```

All agents are created via `client.beta.agents.create()` and stored as persistent agent IDs in Convex environment variables. Conversations are managed through `client.beta.conversations.start()` and `client.beta.conversations.append()`.

### The Conversation Loop (`convex/actions/toolExecutor.ts`)

Every agent interaction uses a shared conversation loop that handles multi-turn tool calling with retry logic:

```typescript
// 1. Start a conversation with the agent
let response = await client.beta.conversations.start({
  agentId,
  inputs: [{ type: "message.input", role: "user", content: input }],
});

// 2. Loop: check for tool calls, execute them, feed results back
for (let turn = 0; turn < maxTurns; turn++) {
  // If the agent returned a final message, we're done
  const messageOutput = response.outputs.find(o => o.type === "message.output");
  if (messageOutput) return messageOutput.content;

  // Collect ALL function calls and execute them in parallel
  const functionCalls = response.outputs.filter(o => o.type === "function.call");
  const toolResults = await Promise.all(
    functionCalls.map(async (fc) => {
      const result = await executeToolCall(fc.name, fc.arguments);
      return { type: "function.result", toolCallId: fc.toolCallId, result };
    })
  );

  // Feed results back and continue the conversation
  response = await client.beta.conversations.append({
    conversationId: response.conversationId,
    conversationAppendRequest: { inputs: toolResults },
  });
}
```

Key implementation details:
- **Parallel tool execution** — When an agent makes multiple tool calls in a single turn, they're executed concurrently via `Promise.all()`
- **Retry with exponential backoff** — All API calls use `withRetry()` (3 attempts, 2s/4s/8s backoff) for timeout and connection errors
- **JSON extraction** — `parseAgentJson()` strips markdown code fences from responses before parsing, handling the common case where agents wrap JSON in ` ```json ` blocks
- **Error resilience** — Failed tool calls return error JSON to the agent rather than crashing, letting the agent adapt

The `executeToolCall()` dispatcher routes tool calls to the appropriate API:
- `search_spotify_tracks` → Spotify Web API
- `get_wine_pairing` / `get_wine_recommendation` / `get_wine_description` → Spoonacular Wine API
- `web_search` → Mistral's built-in web search (no dispatcher needed)

---

### Agent 1: The Maitre D' (Orchestrator)

**File:** `convex/actions/interpret.ts` | **Prompt:** `convex/lib/agents.ts` (`maitreDInstructions`)
**Agent ID env var:** `MAITRE_D_AGENT_ID`
**Tools:** None (pure reasoning)
**Max turns:** 10

**Purpose:** Interprets raw user input — a mood, artist, song, instrument, cuisine preference, or any combination — into a structured creative brief that drives the entire pipeline.

#### System Prompt Details

The Maitre D' handles 7 input types: mood, artist, song, playlist, food, wine, or mixed. Its interpretation rules:

1. **Identify the primary input type** — What is the user really asking for?
2. **Infer mood even when not stated** — "Radiohead" → introspective/melancholic; "Fela Kuti" → energetic/rhythmic
3. **Infer cuisine direction from mood** — Melancholic → Japanese/French; Euphoric → Italian/Spanish
4. **Determine occasion feel** — Intimate dinner, celebration, contemplative solo meal, casual gathering
5. **Create evocative titles** — Not generic restaurant names, but poetic titles that feel personal:
   - "brazilian soul food" → *"Saudade on a Slow Flame"*
   - "rainy jazz evening" → *"Blue Notes in the Rain"*
   - "Radiohead" → *"OK Computer Eats Dinner"*

#### Output Format

```json
{
  "mood": "the interpreted mood/emotional tone",
  "cuisineDirection": "the inferred cuisine direction or style",
  "occasion": "intimate/celebratory/contemplative/casual",
  "inputType": "mood|artist|song|playlist|food|wine|mixed",
  "title": "A Poetic Title Here",
  "subtitle": "A brief evocative subtitle"
}
```

**Critical:** The user's raw input text is also preserved on the experience record and passed downstream to the Music Curator and Chef, so specifics like "flute jazz" or "Brazilian bossa nova" are never lost in interpretation.

**Pipeline handoff:** After interpretation, schedules `curate.ts` via Convex scheduler.

---

### Agent 2: The Music Curator

**File:** `convex/actions/curate.ts` | **Prompt:** `convex/lib/agents.ts` (`musicCuratorInstructions`)
**Agent ID env var:** `MUSIC_CURATOR_AGENT_ID`
**Tools:** `search_spotify_tracks` (custom), `web_search` (Mistral built-in)
**Max turns:** 20

**Purpose:** Selects 5 real Spotify tracks that form a narrative dining arc, writes sonic fingerprints for each, and honors the user's specific requests (instruments, genres, artists, eras).

#### System Prompt Details

The curator operates as Rhythm Lab Radio's sonic architect. The prompt includes:

**1. The Dining Arc** — 5 positions with specific sonic profiles:
- Track 1: Amuse-bouche / The Arrival (lower energy, moderate tempo — the opening gesture)
- Track 2: Appetizer / The Opening (building energy, increasing warmth — the invitation)
- Track 3: Second Course / The Deepening (mid-range, rich instrumentation — the conversation)
- Track 4: Main Course / The Peak (highest energy, strongest emotional impact — the centerpiece)
- Track 5: Dessert / The Resolution (decreasing energy, contemplative warmth — the farewell)

**2. Taste DNA** — The full 150-track Rhythm Lab Radio seed list is injected into the prompt, grouped by category (Hip-Hop, Neo-Soul/R&B, Jazz, Electronic, Afrobeat, Brazilian/Latin, World/Fusion, Ambient, Funk/Disco, Classic Soul/Jazz). The curator must select tracks that share sonic DNA with these references.

**3. User Input Passthrough** — The user's original request is injected verbatim:
```
USER'S ORIGINAL REQUEST: "flute jazz"
^^^ THIS IS CRITICAL. If the user mentions a specific instrument (flute, piano,
saxophone, guitar, etc.), genre, artist, era, or style — you MUST honor it.
Select tracks that prominently FEATURE what they asked for.
```

**4. Cultural Rootedness** — When the user specifies a genre or culture, the curator must select artists FROM that tradition:
- "Brazilian" → Tim Maia, Jorge Ben Jor, Seu Jorge, Gilberto Gil, Marcos Valle
- "Soul" → Marvin Gaye, Erykah Badu, D'Angelo, Curtis Mayfield, Jill Scott
- "Japanese" → Haruomi Hosono, Hiroshi Yoshimura, Nujabes, Cornelius
- "Afrobeat" → Fela Kuti, Tony Allen, Burna Boy, Angelique Kidjo
- "Jazz" → Miles Davis, Kamasi Washington, Robert Glasper, Nubya Garcia

**5. Sonic Fingerprinting** — For each track, the curator writes a `sonicCharacter` field:
> "A 2-3 sentence portrait of this track's sonic feel, texture, mood, instrumentation, and cultural DNA. Write this for a chef to read — describe warmth, rhythm, atmosphere, what it feels like in a room."

#### Tool Usage Flow

```
Curator receives brief + seed list + user input
  → Agent reasons about which tracks fit the arc
  → Calls search_spotify_tracks("herbie mann flute jazz") to verify tracks exist
  → Calls web_search to discover lesser-known artists
  → Repeats for each position in the dining arc
  → Returns 5 tracks with sonic fingerprints
```

#### Output Format

```json
[
  {
    "spotifyId": "spotify_track_id",
    "name": "Track Name",
    "artist": "Artist Name",
    "audioFeatures": {
      "energy": 0.4, "valence": 0.6, "tempo": 95,
      "danceability": 0.5, "acousticness": 0.7
    },
    "sonicCharacter": "Warm analog bass with humid bossa nova guitar, languid shuffle at 92 BPM. Feels like a late afternoon in Rio with windows open. The vocal sits in a bed of Rhodes keys and lazy percussion."
  }
]
```

#### Post-Processing (After Agent Response)

Each track is enriched with real data from external APIs:
- **Spotify metadata** — Album art, artist images, verified track IDs
- **YouTube video IDs** — Fetched via HTML scraping for background music playback
- **Aggregate sonic profile** — Computed from all 5 tracks' audio features
- **Color palette** — Derived algorithmically from the sonic profile (energy→hue, valence→saturation, tempo→lightness) — used to theme the entire UI for each experience

---

### Agent 3: The Culinary Chef

**File:** `convex/actions/cook.ts` | **Prompt:** `convex/lib/agents.ts` (`culinaryChefInstructions`)
**Agent ID env var:** `CULINARY_CHEF_AGENT_ID`
**Tools:** None (pure reasoning — the chef generates recipes entirely from AI knowledge)
**Max turns:** 3

**Purpose:** Designs a 5-course home-cookable menu with complete recipes where each dish is directly inspired by its paired track's sonic character.

#### System Prompt — The Sonic-to-Flavor Translation Algorithm

This is the core creative engine. The chef receives sonic character descriptions as the PRIMARY inspiration:

| Audio Feature | Culinary Dimension | Low End | High End |
|---------------|-------------------|---------|----------|
| **Energy** (0.0–1.0) | Intensity | Fresh salad, ceviche, crudo | Braised short rib, curry, stew |
| **Valence** (0.0–1.0) | Flavor spectrum | Umami/earthy (mushroom, miso) | Bright/citrus (mango, lemon) |
| **Tempo** (BPM) | Cooking technique | Slow-cooked (50-80 BPM) | Quick assembly (120+ BPM) |
| **Danceability** (0.0–1.0) | Service style | Individual plated | Family-style, shared |
| **Acousticness** (0.0–1.0) | Cuisine tradition | Modern fusion, contemporary | Heritage, soul food, cast-iron |

#### Recipe Generation

The chef generates **complete recipes** for every dish — no external recipe API is used:

```json
{
  "courseNumber": 1,
  "courseType": "Amuse-bouche",
  "arcRole": "The Arrival",
  "dishName": "Miso-Glazed Radishes with Sesame",
  "dishDescription": "Crisp spring radishes roasted with white miso and butter, finished with toasted sesame and a squeeze of yuzu.",
  "cuisineType": "Japanese-inspired",
  "prepTime": 20,
  "servings": 4,
  "ingredients": [
    {"name": "radishes", "amount": "2 bunches fresh radishes, trimmed and halved"},
    {"name": "white miso", "amount": "2 tablespoons white (shiro) miso paste"},
    {"name": "butter", "amount": "1 tablespoon unsalted butter, melted"}
  ],
  "instructions": [
    "Preheat oven to 425°F. Toss halved radishes with melted butter on a rimmed baking sheet.",
    "Roast for 15 minutes until tender and slightly caramelized at the edges.",
    "Whisk miso with 1 tablespoon warm water. Drizzle over hot radishes and toss gently.",
    "Finish with toasted sesame seeds and a squeeze of yuzu or lemon juice."
  ]
}
```

**Ingredient rules:**
- Full measurements with prep notes ("1/2 cup fresh basil, torn" not just "basil")
- 6-12 ingredients per dish (amuse-bouche can have fewer)
- Common grocery store ingredients only

**Instruction rules:**
- 4-8 clear steps per dish
- Each step is one action, written conversationally
- Include cooking times and visual cues ("until golden brown, about 3 minutes")

**Home Cooking Philosophy:**
> ALL DISHES MUST BE HOME-COOKABLE. No foams, gels, spherification, or molecular gastronomy. No "deconstructed" anything. Name dishes like you'd tell a friend: "Garlic Butter Shrimp" not "Deconstructed Citrus Crustacean Experience."

---

### Agent 4: The Wine Sommelier

**File:** `convex/actions/pair.ts` | **Prompt:** `convex/lib/agents.ts` (`sommelierInstructions`)
**Agent ID env var:** `SOMMELIER_AGENT_ID`
**Tools:** `get_wine_pairing`, `get_wine_recommendation`, `get_wine_description` (all via Spoonacular API)
**Max turns:** 20

**Purpose:** Pairs each course with wine, guided primarily by the track's sonic profile and sonic character, secondarily by the dish. Uses Spoonacular tools for bottle recommendations and supplementary data, but the sonic-to-beverage mapping logic is encoded in the prompt.

#### System Prompt — The Sommelier's Knowledge Base (~650 lines)

The sommelier prompt is the most detailed agent prompt in the system, containing CSP (Certified Sake Professional) level knowledge organized into 9 sections:

**Section 1: Identity & Philosophy**
> "Wine, sake, and music share the same architecture: tension and release, harmony and dissonance, body and finish. A Barolo and a minor-key cello suite both carry weight, tannin-like gravity, and a slow, aching resolution."

**Section 2: Sonic-to-Beverage Mapping** — Detailed tables mapping each audio dimension to beverage selection:

| Dimension | Low Range | High Range |
|-----------|-----------|------------|
| **Energy → Body** | Muscadet, Albarino, Gruner Veltliner | Barolo, Cabernet Sauvignon, Shiraz |
| **Valence → Sweet/Bitter** | Aged Bordeaux, Amarone, dry sherry | Moscato d'Asti, late-harvest Riesling |
| **Tempo → Aging** | Gran Reserva Rioja, Vintage Port (50-80 BPM) | Champagne, Prosecco (140+ BPM) |
| **Danceability → Formality** | Grand Cru Burgundy, single-vineyard | Lambrusco, natural wines, magnums |
| **Acousticness → Tradition** | Orange wines, pet-nat, amphora-aged | Old-vine Grenache, traditional Champagne |
| **Key/Mode** | Minor → red-dominant, earthy | Major → white/rosé, bright citrus |

**Section 3: Comprehensive Wine Knowledge** — 60+ varietals across all categories with tasting note vocabulary: light reds (Pinot Noir, Gamay, Nerello Mascalese), medium reds (Sangiovese, Tempranillo, Barbera), full reds (Barolo, Cabernet, Aglianico), whites from crisp (Muscadet, Assyrtiko) to rich (Viognier, Chenin Blanc), rosé, sparkling, dessert & fortified, orange & natural.

**Section 4: Sake Knowledge (CSP-Level)** — Classification by polishing ratio (Junmai Daiginjo ≤50% to Honjozo ≤70%), brewing method (Kimoto, Yamahai, Sokujo, Bodaimoto), treatment (Nama, Nigori, Genshu, Koshu, Taruzake), 5 key rice varieties, and a 10-step serving temperature guide from Yukibie (5°C) to Tobikirikan (55°C+).

**Section 5: Pairing Rules** — Course-specific guidance:
- Course 1 (Arrival): Light whites, sparkling — "The first sip should be a revelation, not a punch"
- Course 4 (Peak): Full-bodied reds, bold whites — "The one judges will remember"
- Course 5 (Resolution): Explicit variety rule — "Do NOT default to Sauternes. Rotate through: Moscato d'Asti, Tokaji Aszu, Vin Santo, Banyuls, PX Sherry..." with 12+ alternatives

**Section 6: Tasting Note Writing Style** — Each note must weave three threads:
1. THE WINE: What it tastes like (specific flavors, textures)
2. THE DISH: How it interacts with the food
3. THE MUSIC: How the sonic profile connects

Example output:
> "A structured Barolo from Serralunga brings tar, dried roses, and firm tannins that mirror the track's brooding intensity — both demand your full attention. The wine's iron-like minerality cuts through the unctuous short rib, while its slow, tannic fade echoes the song's lingering, unresolved tension. Serve at 18°C and let it breathe, the way this track needs space to unfold."

**The sonic profile is the PRIMARY pairing driver, not the dish.** If the sonic profile says "delicate" but the dish is steak, the sommelier leans into lighter wines that cut through richness rather than defaulting to Cabernet.

#### Tool Usage Flow

```
Sommelier receives 5 courses + tracks + sonic profiles
  → Reads each track's sonicCharacter description
  → Calls get_wine_pairing("grilled salmon") for dish-based suggestions
  → Calls get_wine_recommendation("barolo", maxPrice=80) for specific bottles
  → Calls get_wine_description("nebbiolo") for supplementary context
  → Synthesizes sonic mapping + dish pairing + Spoonacular data
  → Returns 5 pairings with evocative tasting notes
```

---

### Agent 5 (Re-use): The Maitre D' as Narrator

**File:** `convex/actions/media.ts`
**Agent:** Re-uses the Maitre D' agent (`MAITRE_D_AGENT_ID`)

After all 4 agents complete, the Maitre D' is called again with a different prompt to write narration text. The narration blends two personas:
- **Radio Host** — "Now let me set the mood with...", "This next track is going to change the temperature in the room..."
- **Fine-Dining Waiter** — "For your next course, we've prepared...", "Paired beautifully with a..."

The narration is generated as JSON with an `intro` and 5 `courses`, each naming the dish, track, and wine. This text is then synthesized to audio via ElevenLabs.

---

### Data Flow Between Agents

```
User: "flute jazz"
         │
         ▼
┌─── Maitre D' ───┐
│ Input: "flute jazz"
│ Output: {
│   mood: "contemplative jazz, flute-forward",
│   cuisineDirection: "Japanese-French fusion",
│   occasion: "intimate",
│   title: "Breath & Bamboo",
│   subtitle: "A meditation in reed and flavor"
│ }
│ Also stores: userInput = "flute jazz"
└────────┬─────────┘
         │
         ▼
┌── Music Curator ─┐
│ Input: brief + seed list + "USER'S ORIGINAL REQUEST: flute jazz"
│ Uses: search_spotify_tracks("herbie mann flute jazz")
│       search_spotify_tracks("yusef lateef eastern sounds")
│       web_search("best flute jazz tracks")
│ Output: 5 tracks with sonicCharacter, e.g.:
│   Track 1: "Memphis Underground" by Herbie Mann
│   sonicCharacter: "Liquid flute lines float over a Memphis funk groove,
│   humid and loose. The flute doesn't just play melody — it breathes,
│   bends, and sweats like a summer night on Beale Street..."
└────────┬─────────┘
         │
         ▼
┌── Culinary Chef ─┐
│ Input: 5 tracks with sonic characters + cuisine direction + user input
│ Reads: "Liquid flute lines float over a Memphis funk groove..."
│ Translates: Humid + funky + Southern → Cajun-spiced shrimp
│ Output: 5 courses with full recipes (ingredients + instructions)
│   Course 1: "Cajun Butter Shrimp with Charred Lemon"
│   Ingredients: [{amount: "1 lb large shrimp, peeled"}, ...]
│   Instructions: ["Heat butter in a cast-iron skillet...", ...]
└────────┬─────────┘
         │
         ▼
┌── Wine Sommelier ┐
│ Input: 5 courses + tracks + sonic profiles
│ Reads: sonicCharacter + dish + audio features
│ Uses: get_wine_pairing("cajun shrimp")
│       get_wine_recommendation("gruner veltliner")
│ Output: 5 pairings with tasting notes
│   "A crisp Gruner Veltliner from Kamptal — white pepper and
│   green bean crunch that mirrors the flute's airy precision..."
└──────────────────┘
```

---

## The Rhythm Lab Radio Seed List

All music curation is anchored in **Rhythm Lab Radio** — Tarik Moody's genre-defying show that has aired on 88Nine Radio Milwaukee since 2005, weaving hip-hop, electronic, soul, jazz, Afrobeat, and world music into intentional sets.

The 150-track seed list (`convex/lib/rhythm_lab_seed_list.json`) defines "Rhythm Lab Radio quality" across 10 categories:

| Category | Example Artists |
|----------|----------------|
| Hip-Hop | Little Simz, Ghetts, Noname, JID, Saba |
| Neo-Soul / R&B | Erykah Badu, D'Angelo, Solange, Jordan Rakei |
| Jazz (Modern) | Nubya Garcia, Shabaka Hutchings, Kamasi Washington |
| Electronic | Flying Lotus, Floating Points, Four Tet, Bonobo |
| Afrobeat / African | Fela Kuti, Ebo Taylor, Tinariwen, Mulatu Astatke |
| Brazilian / Latin | Marcos Valle, Tim Maia, Suba, Nicola Cruz |
| World / Fusion | Khruangbin, SAULT, Hiatus Kaiyote |
| Ambient / Experimental | Hiroshi Yoshimura, Ryuichi Sakamoto |
| Funk / Disco | Cymande, The Blackbyrds, Roy Ayers |
| Classic Soul / Jazz | Miles Davis, John Coltrane, Marvin Gaye |

Each entry includes `why` fields explaining the curatorial rationale:
```json
{
  "artist": "Khruangbin",
  "track": "Time (You and I)",
  "genre_tags": ["psychedelic-soul", "Thai-funk-influenced", "groove"],
  "category": "GLOBAL-FUSION",
  "origin": "Houston, TX, USA",
  "why": "Genre-fluid trio blending Thai funk, dub, and soul. Epitomizes Rhythm Lab's love for music that defies easy categorization while remaining deeply groovy."
}
```

The seed list also includes **key labels** (34 record labels) that define the sonic ecosystem: Brainfeeder, Stones Throw, Warp, Ninja Tune, Brownswood, Blue Note, Far Out Recordings, and more.

---

## ElevenLabs Integration

**Model:** `eleven_v3`
**File:** `convex/lib/elevenlabs.ts`

Audio is generated for:
1. An intro narration (2-3 sentences setting the scene)
2. Each of the 5 course narrations (2-3 sentences each, naming dish, track, and wine)

Audio files are stored in Convex storage and pushed to the frontend progressively.

---

## Gemini Integration

**Model:** Gemini 2.0 Flash
**File:** `convex/lib/gemini.ts`

Two types of images are generated:
1. **Dish photography** — Professional food photography for each course, styled to match the experience's mood
2. **Share poster** — A social-ready poster with dark background, gold accents, hand-drawn food illustrations, and vinyl record aesthetic

---

## Pipeline Status Flow

```
interpreting → curating_music → designing_menu → pairing_beverages → generating_media → ready
     │               │               │                │                    │
  Maitre D'     Music Curator    Culinary Chef    Sommelier        ElevenLabs +
  (~2s)         (~15-30s)        (~10-15s)        (~15-30s)        Gemini (~30s)
```

The frontend subscribes to the experience in real-time via Convex `useQuery`. During the pipeline, "agent thoughts" are displayed in the loading UI — you can watch each agent thinking and working in real time:

> "Good evening. Let me study your request..."
> "I sense contemplative jazz. This calls for Japanese-French cuisine."
> "Building your sonic journey. Let me find the perfect tracks..."
> "Track 1: 'Memphis Underground' by Herbie Mann"
> "Translating sound into flavor. Designing your menu..."
> "Course 1: 'Cajun Butter Shrimp' — Cajun (8 ingredients)"
> "Examining the menu and sonic profiles. Selecting wines..."
> "Course 1: Gruner Veltliner, Kamptal"

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- API keys for: Mistral, Spotify, Spoonacular, ElevenLabs, Gemini

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

This starts the Convex dev server and syncs your schema/functions. Set the server-side environment variables in the [Convex dashboard](https://dashboard.convex.dev) under Settings > Environment Variables:

- `MISTRAL_API_KEY`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
- `SPOONACULAR_API_KEY`
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`

### Clerk Setup

Configure Clerk with a JWT template for Convex. Set the issuer domain in your `.env.local` as `CLERK_JWT_ISSUER_DOMAIN`. See the [Convex + Clerk docs](https://docs.convex.dev/auth/clerk).

### Register Mistral Agents

Run once to create the 4 Mistral agents:

```bash
npx convex run setupAgents:setup
```

This calls `client.beta.agents.create()` for each agent with its system prompt and tools. Save the returned agent IDs as Convex environment variables:
- `MAITRE_D_AGENT_ID`
- `MUSIC_CURATOR_AGENT_ID`
- `CULINARY_CHEF_AGENT_ID`
- `SOMMELIER_AGENT_ID`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
sonic-sommelier/
├── app/
│   ├── page.tsx                    # Landing page (vintage restaurant menu design)
│   ├── dashboard/page.tsx          # Auth gate + gallery + create experience
│   ├── experience/[id]/page.tsx    # Real-time experience viewer (story flow)
│   ├── menu/[slug]/page.tsx        # Public share page (no auth required)
│   ├── api/seed-art/route.ts       # Spotify album art for landing page
│   ├── layout.tsx                  # Root layout with providers
│   ├── providers.tsx               # Clerk + Convex provider wrapper
│   └── globals.css                 # Grain texture, ambient animations, marquees
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx       # Chat with the Maitre D'
│   │   └── MessageBubble.tsx       # Styled message bubbles
│   ├── experience/
│   │   ├── StoryFlow.tsx           # 8-screen tap/swipe story flow
│   │   ├── LoadingState.tsx        # Pipeline progress with agent thoughts
│   │   ├── RadarChart.tsx          # SVG radar chart (sonic profile)
│   │   ├── SonicProfileScreen.tsx  # "Your Sonic Profile" visualization
│   │   ├── CourseCard.tsx          # Course card with Ken Burns zoom + album art
│   │   ├── FullMenuScreen.tsx      # Complete tasting menu + share + YouTube + recipes
│   │   └── ShareModal.tsx          # Share experience via URL + poster download
│   ├── gallery/
│   │   ├── ExperienceGallery.tsx   # Gallery of past experiences
│   │   └── RecipeRolodex.tsx       # Full-screen recipe viewer (portaled modal)
│   └── ErrorBoundary.tsx           # React error boundary
├── convex/
│   ├── schema.ts                   # Database schema (experiences, users, trackCache)
│   ├── experiences.ts              # Queries + mutations for experiences
│   ├── users.ts                    # User management
│   ├── setupAgents.ts              # One-time Mistral agent registration
│   ├── actions/
│   │   ├── generate.ts             # Public entry point (creates experience doc)
│   │   ├── interpret.ts            # Step 1: Maitre D' agent
│   │   ├── curate.ts               # Step 2: Music Curator agent
│   │   ├── cook.ts                 # Step 3: Culinary Chef agent
│   │   ├── pair.ts                 # Step 4: Wine Sommelier agent
│   │   ├── media.ts                # Step 5: ElevenLabs + Gemini media
│   │   └── toolExecutor.ts         # Shared agent conversation loop + tool dispatcher
│   └── lib/
│       ├── agents.ts               # 4 Mistral agent definitions + full system prompts
│       ├── rhythm_lab_seed_list.json # 150-track taste DNA seed list
│       ├── spotify.ts              # Spotify Web API wrapper
│       ├── youtube.ts              # YouTube video search (HTML scraping)
│       ├── spoonacular.ts          # Wine pairing + recommendation API wrapper
│       ├── elevenlabs.ts           # ElevenLabs v3 TTS wrapper
│       ├── gemini.ts               # Gemini image generation wrapper
│       └── palette.ts              # Sonic-to-color palette derivation
├── lib/
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── palette.ts                  # Palette + sonic profile utilities
│   └── palette.test.ts             # Vitest tests
└── package.json
```

---

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
| `SPOTIFY_CLIENT_ID` | Spotify Web API client ID | Yes | Convex dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Web API secret | Yes | Convex dashboard |
| `SPOONACULAR_API_KEY` | Spoonacular wine API | Yes | Convex dashboard |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS | Yes | Convex dashboard |
| `GEMINI_API_KEY` | Google Gemini image generation | Yes | Convex dashboard |

---

## Features

- **4-agent Mistral pipeline** with function calling and persistent conversations
- **Sonic Fingerprinting** — natural language music-to-food translation
- **AI-generated recipes** — complete ingredients + instructions for every dish
- **Instrument-aware curation** — honors specific requests like "flute jazz" or "piano soul"
- **Culturally rooted** — deep artist selection from specific musical traditions
- **Real-time experience** — Convex subscriptions push media as it generates
- **Downloadable recipe cards** — per-course and full-menu text file downloads
- **Recipe Rolodex** — full-screen recipe viewer accessible from gallery and experience
- **Shareable experiences** — public URL-based sharing with AI-generated poster images
- **Audio narration** — ElevenLabs TTS with radio host + waiter persona
- **AI food photography** — Gemini generates dish images per course
- **Sonic-derived color palettes** — every experience has a unique UI theme derived from its music
- **Responsive story flow** — 8-screen tap/swipe experience with Framer Motion animations
- **YouTube background music** — tracks play under narration during the story flow

---

## License

MIT

---

Built by [Tarik Moody](https://github.com/tmoody1973) — Certified Sake Professional, Music Curator, and creator of [Rhythm Lab Radio](https://rhythmlab.com)
