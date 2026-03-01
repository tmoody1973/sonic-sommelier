import { describe, it, expect } from "vitest";
import { derivePalette, computeAggregateProfile } from "./palette";

describe("derivePalette", () => {
  it("returns Golden Hour for high energy + high valence", () => {
    const palette = derivePalette({
      energy: 0.8,
      valence: 0.8,
      tempo: 0.5,
      danceability: 0.5,
      acousticness: 0.3,
      mode: 0.5,
    });
    expect(palette.primary).toBe("#B8621B");
  });

  it("returns Midnight Cellar for low energy + low valence", () => {
    const palette = derivePalette({
      energy: 0.2,
      valence: 0.2,
      tempo: 0.5,
      danceability: 0.5,
      acousticness: 0.3,
      mode: 0.5,
    });
    expect(palette.primary).toBe("#4A1942");
  });

  it("returns Terroir for high acousticness + low tempo", () => {
    const palette = derivePalette({
      energy: 0.5,
      valence: 0.5,
      tempo: 0.25,
      danceability: 0.5,
      acousticness: 0.8,
      mode: 0.5,
    });
    expect(palette.primary).toBe("#2D4A22");
  });

  it("returns Electric Izakaya for high danceability + high tempo", () => {
    const palette = derivePalette({
      energy: 0.5,
      valence: 0.5,
      tempo: 0.8,
      danceability: 0.8,
      acousticness: 0.3,
      mode: 0.5,
    });
    expect(palette.primary).toBe("#FF6B6B");
  });

  it("returns Twilight for balanced profile", () => {
    const palette = derivePalette({
      energy: 0.5,
      valence: 0.5,
      tempo: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      mode: 0.5,
    });
    expect(palette.primary).toBe("#2D3142");
  });
});

describe("computeAggregateProfile", () => {
  it("returns default profile for empty array", () => {
    const profile = computeAggregateProfile([]);
    expect(profile.energy).toBe(0.5);
  });

  it("averages audio features across tracks", () => {
    const tracks = [
      {
        audioFeatures: {
          energy: 0.2,
          valence: 0.4,
          tempo: 80,
          danceability: 0.3,
          acousticness: 0.9,
          key: 5,
          mode: 0,
        },
      },
      {
        audioFeatures: {
          energy: 0.8,
          valence: 0.6,
          tempo: 160,
          danceability: 0.7,
          acousticness: 0.1,
          key: 7,
          mode: 1,
        },
      },
    ];
    const profile = computeAggregateProfile(tracks);
    expect(profile.energy).toBe(0.5);
    expect(profile.valence).toBe(0.5);
    expect(profile.danceability).toBe(0.5);
    expect(profile.acousticness).toBe(0.5);
  });

  it("normalizes tempo to 0-1 range (divides by 200)", () => {
    const tracks = [
      {
        audioFeatures: {
          energy: 0.5,
          valence: 0.5,
          tempo: 100,
          danceability: 0.5,
          acousticness: 0.5,
          key: 0,
          mode: 1,
        },
      },
    ];
    const profile = computeAggregateProfile(tracks);
    expect(profile.tempo).toBe(0.5); // 100/200
  });
});
