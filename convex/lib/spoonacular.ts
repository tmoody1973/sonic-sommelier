/**
 * Spoonacular API — wine and recipe data.
 * Base URL: https://api.spoonacular.com
 * Auth: apiKey query parameter.
 *
 * All functions return null on error (fallback logic handles missing data).
 */

const BASE_URL = "https://api.spoonacular.com";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WinePairing {
  pairedWines: string[];
  pairingText: string;
  productMatches: Array<{
    id: number;
    title: string;
    description: string;
    price: string;
    imageUrl: string;
    averageRating: number;
    ratingCount: number;
    score: number;
    link: string;
  }>;
  [key: string]: unknown;
}

export interface WineRecommendation {
  recommendedWines: Array<{
    id: number;
    title: string;
    description: string;
    price: string;
    imageUrl: string;
    averageRating: number;
    ratingCount: number;
    score: number;
    link: string;
  }>;
  totalFound: number;
  [key: string]: unknown;
}

export interface WineDescription {
  wineDescription: string;
  [key: string]: unknown;
}

export interface RecipeSearchResult {
  results: Array<{
    id: number;
    title: string;
    image: string;
    imageType: string;
    summary?: string;
    cuisines?: string[];
    readyInMinutes?: number;
    servings?: number;
    sourceUrl?: string;
    [key: string]: unknown;
  }>;
  totalResults: number;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function spoonacularGet(
  path: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<unknown | null> {
  try {
    const searchParams = new URLSearchParams({
      apiKey,
      ...params,
    });

    const url = `${BASE_URL}${path}?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Spoonacular ${path} failed (${response.status}): ${await response.text().catch(() => "")}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Spoonacular ${path} error:`, error);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get wine pairing suggestions for a food.
 * GET /food/wine/pairing?food={food}&apiKey={apiKey}
 */
export async function getWinePairing(
  food: string,
  apiKey: string
): Promise<WinePairing | null> {
  return (await spoonacularGet("/food/wine/pairing", apiKey, {
    food: food,
  })) as WinePairing | null;
}

/**
 * Get specific wine recommendations for a wine type.
 * GET /food/wine/recommendation?wine={type}&maxPrice={maxPrice}&minRating={minRating}&number=3&apiKey={apiKey}
 */
export async function getWineRecommendation(
  wineType: string,
  apiKey: string,
  maxPrice: number = 80,
  minRating: number = 0.7
): Promise<WineRecommendation | null> {
  return (await spoonacularGet("/food/wine/recommendation", apiKey, {
    wine: wineType,
    maxPrice: String(maxPrice),
    minRating: String(minRating),
    number: "3",
  })) as WineRecommendation | null;
}

/**
 * Get a description for a wine type.
 * GET /food/wine/description?wine={type}&apiKey={apiKey}
 */
export async function getWineDescription(
  wineType: string,
  apiKey: string
): Promise<WineDescription | null> {
  return (await spoonacularGet("/food/wine/description", apiKey, {
    wine: wineType,
  })) as WineDescription | null;
}

/**
 * Search for recipes by query, optionally filtered by cuisine.
 * GET /recipes/complexSearch?query={query}&number=3&addRecipeInformation=true&apiKey={apiKey}
 */
export async function searchRecipes(
  query: string,
  apiKey: string,
  cuisine?: string
): Promise<RecipeSearchResult | null> {
  const params: Record<string, string> = {
    query: query,
    number: "3",
    addRecipeInformation: "true",
  };

  if (cuisine) {
    params.cuisine = cuisine;
  }

  return (await spoonacularGet(
    "/recipes/complexSearch",
    apiKey,
    params
  )) as RecipeSearchResult | null;
}
