import { ChatInputCommandInteraction } from 'discord.js';
import { handleWhoCommand } from '../../../../src/handlers/commands/whoHandler';
import { listRecipeData } from '../../../../src/handlers/builders/whoBuilder';
import { getRecipeData } from '../../../../src/services/api';
import { recipeNotFound, noCrafterFound} from '../../../../src/handlers/builders/errorBuilders';

jest.mock('../../../../src/services/api');
jest.mock('../../../../src/handlers/builders/whoBuilder', () => ({
  listRecipeData: jest.fn()
}));
jest.mock('../../../../src/handlers/builders/errorBuilders', () => ({
  recipeNotFound: jest.fn(),
  noCrafterFound: jest.fn()
}));

describe('handleWhoCommand', () => {
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInteraction = {
      commandName: 'who',
      options: {
        getString: jest.fn()
      },
      deferReply: jest.fn(),
      editReply: jest.fn()
    } as unknown as jest.Mocked<ChatInputCommandInteraction>;
  });

  it('should defer the reply when the professions command is received', async () => {
    await handleWhoCommand(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
  });

  it('should extract recipe name correctly from interaction options', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'recipe') return 'TestRecipe';
      return undefined;
    });

    await handleWhoCommand(mockInteraction);

    expect(getRecipeData).toHaveBeenCalledWith('TestRecipe');
  });

  it('should call listRecipeData when valid crafter data exists', async () => {
      mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
        if (name === 'recipe') return 'TestRecipe';
        return undefined;
    });

    const mockData = {
      "recipe": "TestRecipe",
      "crafters": {
        "name": "TestRecipe",
        "mediaUrl": "TestMedia",
        "reagents": {
          "reagents": [
            {
              "name": "TestReagent1",
              "quantity": 1
            }
          ],
          "optionalReagents": [
            {
              "name": "TestReagent2",
              "quantity": 1
            }
          ]
        },
        "crafters": [
          {
            "character_name": "TestCharacter",
            "realm": "TestCharacter#TestRealm",
            "profession": {
              "final_score": 100
            }
          },
          {
            "character_name": "TestCharacter2",
            "realm": "TestCharacter2#TestRealm2",
            "profession": {
              "final_score": 120
            }
          }
        ]
      }
    };
    (getRecipeData as jest.Mock).mockResolvedValue(mockData);

    await handleWhoCommand(mockInteraction);

    expect(getRecipeData).toHaveBeenCalledWith('TestRecipe');
    expect(listRecipeData).toHaveBeenCalledWith(mockData.crafters, mockInteraction, 'test');
  });

  it('should NOT call listRecipeData when no crafter is found', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'recipe') return 'TestRecipe';
      return undefined;
    });

    const mockData = {
      "recipe": "TestRecipe",
      "crafters": {
        "crafters": []
      }
    };
    (getRecipeData as jest.Mock).mockResolvedValue(mockData);

    await handleWhoCommand(mockInteraction);

    expect(getRecipeData).toHaveBeenCalledWith('TestRecipe');
    expect(listRecipeData).not.toHaveBeenCalled();
    expect(noCrafterFound).toHaveBeenCalledWith('TestRecipe');
  });

  it('should NOT call listProfessionData when API request fails', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'recipe') return 'TestRecipe';
      return undefined;
    });

    (getRecipeData as jest.Mock).mockRejectedValue(new Error('API Error'));

    await handleWhoCommand(mockInteraction);

    expect(getRecipeData).toHaveBeenCalledWith('TestRecipe');
    expect(listRecipeData).not.toHaveBeenCalled();
    expect(recipeNotFound).toHaveBeenCalledWith('TestRecipe');
  });
});
