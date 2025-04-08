import { ChatInputCommandInteraction } from 'discord.js';
import { handleProfessionsCommand } from '../../../../src/handlers/commands/professionHandler';
import { getCharacterData } from '../../../../src/services/api';
import { listProfessionData } from '../../../../src/handlers/builders/professionBuilder';
import { noProfessionsFound, characterNotFound } from '../../../../src/handlers/builders/errorBuilders';

jest.mock('../../../../src/services/api');
jest.mock('../../../../src/handlers/builders/professionBuilder', () => ({
  listProfessionData: jest.fn()
}));
jest.mock('../../../../src/handlers/builders/errorBuilders', () => ({
  noProfessionsFound: jest.fn(),
  characterNotFound: jest.fn()
}));

describe('handleProfessionsCommand', () => {
  let mockInteraction: jest.Mocked<ChatInputCommandInteraction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInteraction = {
      commandName: 'professions',
      options: {
        getString: jest.fn()
      },
      deferReply: jest.fn(),
      editReply: jest.fn()
    } as unknown as jest.Mocked<ChatInputCommandInteraction>;
  });

  it('should defer the reply when the professions command is received', async () => {
    await handleProfessionsCommand(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
  });

  it('should extract character name and realm correctly from interaction options', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'character') return 'TestCharacter';
      if (name === 'realm') return 'TestRealm';
      return undefined;
    });

    await handleProfessionsCommand(mockInteraction);

    expect(getCharacterData).toHaveBeenCalledWith('TestCharacter', 'TestRealm');

    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'character') return 'TestCharacter';
      if (name === 'realm') return undefined;
      return undefined;
    });

    await handleProfessionsCommand(mockInteraction);

    expect(getCharacterData).toHaveBeenCalledWith('TestCharacter', undefined);
  });

  it('should call listProfessionData when valid profession data exists', async () => {
      mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'character') return 'TestCharacter';
      if (name === 'realm') return 'TestRealm';
      return null;
    });

    const mockData = {
      "_id": "67c1adbafbd6a923155d172a",
      "character_realm": "TestCharacter#TestRealm",
      "character_name": "TestCharacter",
      "khaz_algar_professions": [
        {
          "name": "Leatherworking",
          "recipes": [
            "Leatherworking Recipe1"
          ]
        },
        {
          "name": "Blacksmithing",
          "recipes": [
            "Smith Recipe1"
          ]
        }
      ]
    };
    (getCharacterData as jest.Mock).mockResolvedValue(mockData);

    await handleProfessionsCommand(mockInteraction);

    expect(getCharacterData).toHaveBeenCalledWith('TestCharacter', 'TestRealm');
    expect(listProfessionData).toHaveBeenCalledWith(mockData, mockInteraction);
  });

  it('should NOT call listProfessionData when no profession data is found', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'character') return 'TestCharacter';
      if (name === 'realm') return 'TestRealm';
      return null;
    });

    const mockData = {
      "_id": "67c1adbafbd6a923155d172a",
      "khaz_algar_professions": []
    };
    (getCharacterData as jest.Mock).mockResolvedValue(mockData);

    await handleProfessionsCommand(mockInteraction);

    expect(getCharacterData).toHaveBeenCalledWith('TestCharacter', 'TestRealm');
    expect(listProfessionData).not.toHaveBeenCalled();
    expect(noProfessionsFound).toHaveBeenCalledWith('TestCharacter');
  });

  it('should NOT call listProfessionData when API request fails', async () => {
    mockInteraction.options.getString = jest.fn().mockImplementation((name: string) => {
      if (name === 'character') return 'TestCharacter';
      if (name === 'realm') return 'TestRealm';
      return null;
    });

    (getCharacterData as jest.Mock).mockRejectedValue(new Error('API Error'));

    await handleProfessionsCommand(mockInteraction);

    expect(getCharacterData).toHaveBeenCalledWith('TestCharacter', 'TestRealm');
    expect(listProfessionData).not.toHaveBeenCalled();
    expect(characterNotFound).toHaveBeenCalledWith('TestCharacter');
  });
});
