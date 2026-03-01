export interface AudioFeatures {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  key: number;
  mode: number;
}

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

export interface Track {
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  artistImage: string;
  youtubeVideoId: string;
  audioFeatures: AudioFeatures;
}

export interface Course {
  courseNumber: number;
  courseType: string;
  arcRole: string;
  dishName: string;
  dishDescription: string;
  cuisineType: string;
  recipeImageUrl?: string;
  aiImageUrl?: string;
  beverageType?: "wine" | "sake";
  beverageName?: string;
  classification?: string;
  region?: string;
  servingTemp?: string;
  tastingNote?: string;
  narrationText?: string;
  narrationAudioUrl?: string;
  // Recipe data
  recipeTitle?: string;
  ingredients?: Array<{ name: string; amount: string }>;
  instructions?: string[];
  prepTime?: number;
  servings?: number;
  recipeSourceUrl?: string;
}

export interface Experience {
  _id: string;
  userId: string;
  title: string;
  subtitle: string;
  status: string;
  palette: Palette;
  sonicProfile?: SonicProfile;
  tracks?: Track[];
  courses?: Course[];
  introNarrationUrl?: string;
  heroImageUrl?: string;
  shareSlug?: string;
  thoughts?: Array<{ agent: string; message: string; timestamp: number }>;
  introNarrationText?: string;
  createdAt: number;
}
