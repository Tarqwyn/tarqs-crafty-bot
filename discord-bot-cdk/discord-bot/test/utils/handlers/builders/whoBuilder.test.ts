import { EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listRecipeData } from '../../../../src/handlers/builders/whoBuilder';

jest.mock('discord.js', () => {
    const originalModule = jest.requireActual('discord.js');
    
    return {
      ...originalModule,
      EmbedBuilder: jest.fn().mockImplementation(() => ({
        setColor: jest.fn().mockReturnThis(),
        setTitle: jest.fn().mockReturnThis(),
        setThumbnail: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        setImage: jest.fn().mockReturnThis(),
        setFooter: jest.fn().mockReturnThis(),
        addFields: jest.fn().mockReturnThis(),
      })),
      ChatInputCommandInteraction: jest.fn().mockImplementation(() => ({
        editReply: jest.fn(),
      })),
    };
  });

describe('listRecipeData - Embed Structure', () => {
  let mockData: any;
  let mockInteraction: ChatInputCommandInteraction;

  beforeEach(() => {
    // Reset the mock data before each test
    mockData = {
      recipe: 'TestRecipe',
      crafters: {
        name: 'TestRecipe',
        mediaUrl: 'TestMedia',
        reagents: {
          reagents: Array.from({ length: 5 }, (_, i) => ({
            name: `Reagent${i + 1}`,
            quantity: i + 1,
          })),
          optionalReagents: Array.from({ length: 5 }, (_, i) => ({
            name: `OptionalReagent${i + 1}`,
            quantity: i + 1,
          })),
        },
        crafters: Array.from({ length: 15 }, (_, i) => ({
          character_name: `Character${i + 1}`,
          realm: `Character${i + 1}#Realm${(i % 3) + 1}`, 
          profession: {
            final_score: 100 - i,
          },
        })),
      },
    };
    
    mockInteraction = { editReply: jest.fn() } as unknown as ChatInputCommandInteraction;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Ensure no test leaks mock data
  });

  it('should build the embed with basic information', async () => {
    await listRecipeData(mockData.crafters, mockInteraction, "test");

    expect(EmbedBuilder).toHaveBeenCalledTimes(1);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;

    expect(embedInstance.setTitle).toHaveBeenCalledWith("👨‍🏭 Who can craft **TestRecipe**?");
    expect(embedInstance.setThumbnail).toHaveBeenCalledWith("TestMedia");
    expect(embedInstance.setFooter).toHaveBeenCalledWith({ text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" });

  });

  it('should display the Reageants needed for the recipe', async () => {
    await listRecipeData(mockData.crafters, mockInteraction, "test");

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Required Reagents'),
        value: expect.stringContaining('Reagent1')
          && expect.stringContaining('Reagent5')
      })
    );
  });

  it('should display the Optional Reageants allowed for the recipe', async () => {
    await listRecipeData(mockData.crafters, mockInteraction, "test");

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Optional Reagents'),
        value: expect.stringContaining('OptionalReagent1')
          && expect.stringContaining('OptionalReagent5')
      })
    );
  });

  it('should display the top Crafter allowed for the recipe', async () => {
    await listRecipeData(mockData.crafters, mockInteraction, "test");

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('═══**Top TCP Crafter**═══'),
        value: expect.stringContaining('Character1')
      })
    );
  });


  it('should display upto 10 additional crafters a for the recipe', async () => {
    await listRecipeData(mockData.crafters, mockInteraction, "test");

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Other Crafters (Top 10)'),
        value: expect.stringContaining('Character2')
         && expect.stringContaining('Character10')
      })
    );
  });
});
