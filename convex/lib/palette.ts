/**
 * Palette utilities for Convex actions.
 * Copied from lib/palette.ts to avoid cross-boundary imports that
 * may not work with the Convex bundler.
 */

export interface SonicProfile {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  mode: number;
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
}

const PALETTES = {
  goldenHour: {
    primary: "#B8621B",
    secondary: "#1a0f05",
    accent: "#E09F3E",
    surface: "rgba(26,15,5,0.85)",
    text: "#FFF3E0",
    gradientStart: "#1a0f05",
    gradientMid: "#B8621B",
    gradientEnd: "#2a1a0a",
  },
  midnightCellar: {
    primary: "#4A1942",
    secondary: "#0D0D0D",
    accent: "#C9B96B",
    surface: "rgba(13,13,13,0.85)",
    text: "#F0E6D3",
    gradientStart: "#0D0D0D",
    gradientMid: "#4A1942",
    gradientEnd: "#1a0a1a",
  },
  terroir: {
    primary: "#2D4A22",
    secondary: "#0f1a0a",
    accent: "#A0785A",
    surface: "rgba(15,26,10,0.85)",
    text: "#F0E6D3",
    gradientStart: "#0f1a0a",
    gradientMid: "#2D4A22",
    gradientEnd: "#1a2a15",
  },
  electricIzakaya: {
    primary: "#FF6B6B",
    secondary: "#1a0a15",
    accent: "#9B59B6",
    surface: "rgba(26,10,21,0.85)",
    text: "#FDE8EF",
    gradientStart: "#1a0a15",
    gradientMid: "#FF6B6B",
    gradientEnd: "#2a1020",
  },
  twilight: {
    primary: "#2D3142",
    secondary: "#0f1015",
    accent: "#7C9082",
    surface: "rgba(15,16,21,0.85)",
    text: "#F1E8D9",
    gradientStart: "#0f1015",
    gradientMid: "#2D3142",
    gradientEnd: "#1a1b22",
  },
} as const;

export function derivePalette(profile: SonicProfile): Palette {
  const scores = {
    goldenHour: profile.energy * 0.5 + profile.valence * 0.5,
    midnightCellar:
      (1 - profile.energy) * 0.5 + (1 - profile.valence) * 0.5,
    terroir: profile.acousticness * 0.5 + (1 - profile.tempo) * 0.5,
    electricIzakaya: profile.danceability * 0.5 + profile.tempo * 0.5,
    twilight: 0.501,
  };

  const best = Object.entries(scores).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );
  return PALETTES[best[0] as keyof typeof PALETTES];
}

export function computeAggregateProfile(
  tracks: {
    audioFeatures: {
      energy: number;
      valence: number;
      tempo: number;
      danceability: number;
      acousticness: number;
      key: number;
      mode: number;
    };
  }[]
): SonicProfile {
  if (tracks.length === 0) {
    return {
      energy: 0.5,
      valence: 0.5,
      tempo: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      mode: 0.5,
    };
  }

  const sum = tracks.reduce(
    (acc, t) => ({
      energy: acc.energy + t.audioFeatures.energy,
      valence: acc.valence + t.audioFeatures.valence,
      tempo: acc.tempo + Math.min(t.audioFeatures.tempo / 200, 1),
      danceability: acc.danceability + t.audioFeatures.danceability,
      acousticness: acc.acousticness + t.audioFeatures.acousticness,
      mode: acc.mode + t.audioFeatures.mode,
    }),
    { energy: 0, valence: 0, tempo: 0, danceability: 0, acousticness: 0, mode: 0 }
  );

  const n = tracks.length;
  return {
    energy: sum.energy / n,
    valence: sum.valence / n,
    tempo: sum.tempo / n,
    danceability: sum.danceability / n,
    acousticness: sum.acousticness / n,
    mode: sum.mode / n,
  };
}
