import axios from 'axios';
import { CharacterData, RecipeData } from '../utils/types';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  'https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/';

class ApiCache {
  private cache: Map<string, { data: any; expiry: number }>;
  private cacheDuration: number;

  constructor(cacheDurationMs: number = 60000) {
    this.cache = new Map();
    this.cacheDuration = cacheDurationMs;

    // Auto-cleanup every 5 minutes to prevent memory bloat
    setInterval(() => this.cleanup(), 300000).unref();
  }

  async fetch<T>(
    endpoint: string,
    fetchFunction: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();

    if (this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint);
      if (now < cached.expiry) {
        console.info(`Returning cached data for ${endpoint}`);
        return cached.data as T;
      }
      this.cache.delete(endpoint);
    }

    console.info(`Fetching fresh data for ${endpoint}`);
    const data = await fetchFunction();
    this.cache.set(endpoint, { data, expiry: now + this.cacheDuration });

    return data;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    }
    console.info('Cache cleanup complete.');
  }
}

const apiCache = new ApiCache(process.env.NODE_ENV === 'test' ? 100 : 60000);

export async function getCharacterData(
  characterName: string,
  realm?: string,
): Promise<CharacterData> {
  const apiUrl = realm
    ? `${API_BASE_URL}professions/${characterName}/${realm}`
    : `${API_BASE_URL}professions/${characterName}`;

  try {
    return await apiCache.fetch(apiUrl, async () => {
      const response = await axios.get<CharacterData>(apiUrl);
      return response.data;
    });
  } catch (error) {
    console.error(`Error fetching character data: ${error}`);
    throw new Error('Failed to fetch character data');
  }
}

export async function getRecipeData(recipe: string): Promise<RecipeData> {
  const apiUrl = `${API_BASE_URL}who/${recipe}`;

  try {
    return await apiCache.fetch(apiUrl, async () => {
      const response = await axios.get<RecipeData>(apiUrl);
      return response.data;
    });
  } catch (error) {
    console.error(`Error fetching recipe data: ${error}`);
    throw new Error('Failed to fetch a recipe');
  }
}

if (process.env.NODE_ENV === 'test') {
  // @ts-ignore
  module.exports.__clearApiCache = () => apiCache['cache'].clear();
}
