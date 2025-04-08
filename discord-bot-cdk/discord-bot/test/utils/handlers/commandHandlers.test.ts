import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { commandHandlers } from '../../../src/handlers/commandHandlers';
import { helpEmbed } from '../../../src/handlers/commands/helpHandler';
import { handleProfessionsCommand } from '../../../src/handlers/commands/professionHandler';
import { handleWhoCommand } from '../../../src/handlers/commands/whoHandler';

jest.mock('../../../src/handlers/commands/helpHandler', () => ({
  helpEmbed: jest.fn(),
}));

jest.mock('../../../src/handlers/commands/whoHandler', () => ({
  handleWhoCommand: jest.fn(),
}));

jest.mock('../../../src/handlers/commands/professionHandler', () => ({
  handleProfessionsCommand: jest.fn(),
}));

const createMockCommandInteraction = (
  overrides?: Partial<ChatInputCommandInteraction>,
): ChatInputCommandInteraction => {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    options: {
      getString: jest.fn().mockImplementation((name: string) => {
        if (name === 'recipe') return 'TestRecipe';
        if (name === 'character') return 'TestCharacter';
        if (name === 'realm') return 'TestRealm';
        return null;
      }),
    },
    ...overrides,
  } as unknown as ChatInputCommandInteraction;
};

describe('commandHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crafthelp interactions should be passed to its handler', async () => {
    const mockInteraction = createMockCommandInteraction();
    await commandHandlers.crafthelp(mockInteraction);
    expect(helpEmbed).toHaveBeenCalledWith(mockInteraction);
  });

  it('who interactions should be passed to its handler', async () => {
    const mockInteraction = createMockCommandInteraction();
    await commandHandlers.who(mockInteraction);
    expect(handleWhoCommand).toHaveBeenCalledWith(mockInteraction);
  });

  it('professions interactions should be passed to its handler', async () => {
    const mockInteraction = createMockCommandInteraction();
    await commandHandlers.professions(mockInteraction);
    expect(handleProfessionsCommand).toHaveBeenCalledWith(mockInteraction);
  });
});
