import axios from 'axios';
import * as api from '../../../src/services/api';
import { CharacterData, RecipeData } from '../../../src/utils/types';
const { getCharacterData, getRecipeData } = api;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  // Mock console.error to suppress error logs during tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console.error after tests are done
  jest.restoreAllMocks();
});

describe('API Functions', () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
  });
  describe('getCharacterData', () => {
    const mockCharacterData: CharacterData = {
      _id: '123',
      character_realm: 'realm1',
      character_name: 'character1',
      khaz_algar_professions: [
        {
          id: 1,
          name: 'Profession1',
          skill_points: '100',
          recipes: ['Recipe1'],
        },
      ],
      level: 50,
      realm: 'realm1',
      media: 'media-url',
    };
    const expectedUrl = 'https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/professions/character1/realm1';

    it('should fetch character data successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCharacterData });

      const result = await getCharacterData('character1', 'realm1');

      expect(result).toEqual(mockCharacterData);
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch character data from cache', async () => {
      // This relies on the data having been cached in the previous test
      const result = await getCharacterData('character1', 'realm1');

      expect(result).toEqual(mockCharacterData);
      expect(mockedAxios.get).not.toHaveBeenCalled()
    });

    it('should handle error when fetching character data fails', async () => {
      mockedAxios.get.mockRejectedValue(
        new Error('Failed to fetch character data'),
      );

      await expect(getCharacterData('character-fail')).rejects.toThrow(
        'Failed to fetch character data',
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    });
  });

  describe('getRecipeData', () => {
    const mockRecipeData: RecipeData = {
      recipe: 'Recipe1',
      crafters: {
        name: 'Crafter1',
        mediaUrl: 'media-url',
        reagents: {
          reagents: [{ name: 'Reagent1', quantity: 10 }],
          optionalReagents: [{ name: 'OptionalReagent1', quantity: 5 }],
        },
        crafters: [],
      },
    };
    const expectedUrl =
        'https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/who/Recipe1';

    it('should fetch recipe data successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockRecipeData });
      const result = await getRecipeData('Recipe1');

      expect(result).toEqual(mockRecipeData);
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should fetch recipe data from cache', async () => {
      // This relies on the data having been cached in the previous test
      const result = await getRecipeData('Recipe1');

      expect(result).toEqual(mockRecipeData);
      expect(mockedAxios.get).not.toHaveBeenCalled()
    });

    it('should handle error when fetching recipe data fails', async () => {
      mockedAxios.get.mockRejectedValue(
        new Error('Failed to fetch recipe data'),
      );

      await expect(getRecipeData('Recipe-fail')).rejects.toThrow(
        'Failed to fetch a recipe',
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    });
  });

  describe('cache expiry behaviour (real timers)', () => {
    const mockRecipeData: RecipeData = {
      recipe: 'Recipe1',
      crafters: {
        name: 'Crafter1',
        mediaUrl: 'media-url',
        reagents: {
          reagents: [{ name: 'Reagent1', quantity: 10 }],
          optionalReagents: [{ name: 'OptionalReagent1', quantity: 5 }],
        },
        crafters: [],
      },
    };
  
    beforeEach(() => {
      jest.useRealTimers(); // important!
      if ('__clearApiCache' in api) {
        console.log("Cache cleared");
        (api as any).__clearApiCache(); // clear the in-memory cache
      }
    });
  
    it('should return cached data before expiry and refetch after expiry', async () => {
      // First call - API hit
      mockedAxios.get.mockResolvedValueOnce({ data: mockRecipeData });
      const result1 = await getRecipeData('Recipe1');
      expect(result1).toEqual(mockRecipeData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  
      //Wait under 100ms - still cached
      await new Promise(resolve => setTimeout(resolve, 50));
      const result2 = await getRecipeData('Recipe1');
      expect(result2).toEqual(mockRecipeData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  
      // Wait until after cache expiry
      mockedAxios.get.mockResolvedValueOnce({ data: mockRecipeData });
      await new Promise(resolve => setTimeout(resolve, 60));
      const result3 = await getRecipeData('Recipe1');
      expect(result3).toEqual(mockRecipeData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
  
});


