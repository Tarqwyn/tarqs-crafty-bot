import { EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listProfessionData, multipleCharacters } from '../../../../src/handlers/builders/professionBuilder';

jest.mock('discord.js', () => {
    const originalModule = jest.requireActual('discord.js');
    
    return {
      ...originalModule,
      EmbedBuilder: jest.fn().mockImplementation(() => ({
        setColor: jest.fn().mockReturnThis(),
        setTitle: jest.fn().mockReturnThis(),
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

describe('listProfessionData - Embed Structure', () => {
  let mockData: any;
  let mockInteraction: ChatInputCommandInteraction;

  beforeEach(() => {
    // Reset the mock data before each test
    mockData = {
      character_name: 'TestCharacter',
      realm: 'TestRealm',
      media: 'test_image_url',
      khaz_algar_professions: [
        {
          name: 'Leatherworking',
          recipes: Array.from({ length: 21 }, (_, i) => `Leather Recipe ${i + 1}`),
        },
        {
          name: 'Blacksmithing',
          recipes: Array.from({ length: 21 }, (_, i) => `Smith Recipe ${i + 1}`),
        },
      ],
    };

    mockInteraction = { editReply: jest.fn() } as unknown as ChatInputCommandInteraction;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Ensure no test leaks mock data
  });

  it('should build the embed with basic information', async () => {

    await listProfessionData(mockData, mockInteraction);

    expect(EmbedBuilder).toHaveBeenCalledTimes(1);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;

    expect(embedInstance.setTitle).toHaveBeenCalledWith("Testcharacter's Crafting Professions");
    expect(embedInstance.setDescription).toHaveBeenCalledWith("📍 Realm: **Testrealm**");
    expect(embedInstance.setImage).toHaveBeenCalledWith('test_image_url');
    expect(embedInstance.setFooter).toHaveBeenCalledWith({ text: "Brought to you by Tarq's Crafty Bot" });

    
  });

  it('should display the first 10 recipes for the  1st Profession (Leatherworking)', async () => {
    await listProfessionData(mockData, mockInteraction, 1);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Recipes'),
        value: expect.stringContaining('Leather Recipe 1')
          && expect.stringContaining('Leather Recipe 10')
      })
    );
  });

  it('should display the second page of recipes for the 1st Profession', async () => {
    await listProfessionData(mockData, mockInteraction, 2);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Recipes'),
        value: expect.stringContaining('Leather Recipe 11')
          && expect.stringContaining('Leather Recipe 20')
      })
    );
  });

  it('should display the third page with last recipe for the 1st Profession and the 1st recipe of the 2nd profession (Blacksmithing)', async () => {
    await listProfessionData(mockData, mockInteraction, 3);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Recipes'),
        value: expect.stringContaining('Leather Recipe 21')
          && expect.stringContaining('Smith Recipe 1')
      })
    );
  });

  it('should display the last page with last recipe for the 2nd profession', async () => {
    await listProfessionData(mockData, mockInteraction, 5);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;
    expect(embedInstance.addFields).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('Recipes'),
        value: expect.stringContaining('Smith Recipe 21')
      })
    );
  });
});

describe('Multiple Characters with same name - Embed Structure', () => {
  let mockData: any;
  let mockInteraction: ChatInputCommandInteraction;

  beforeEach(() => {
    // Reset the mock data before each test
    mockData = {
      characters: [
        {
          "name": "testCharacter1",
          "realm": "testRealm1"
        },
        {
          "name": "testCharacter1",
          "realm": "testRealm1",
        }
      ]
    };
    mockInteraction = { editReply: jest.fn() } as unknown as ChatInputCommandInteraction;
  });

  afterEach(() => {
    jest.clearAllMocks(); 
  });

  it('should display an embed with appropriate interaction options', async () => {
    await multipleCharacters(mockData, mockInteraction, "testCharacter1");
    expect(EmbedBuilder).toHaveBeenCalledTimes(1);

    const embedInstance = (EmbedBuilder as unknown as jest.Mock).mock.results[0].value;

    expect(embedInstance.setTitle).toHaveBeenCalledWith("Multiple Characters Found");
    expect(embedInstance.setDescription).toHaveBeenCalledWith("More than one character matches **testCharacter1**. Please select a realm below.");
    expect(mockInteraction.editReply).toHaveBeenCalled();
  });
});
