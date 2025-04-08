import { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { interactionHandler } from '../../../src/handlers/interactionHandler';
import { commandHandlers } from '../../../src/handlers/commandHandlers';
import { buttonHandlers } from '../../../src/handlers/buttonHandlers';

jest.mock('../../../src/handlers/commandHandlers', () => ({
  commandHandlers: {
    crafthelp: jest.fn(),
  },
}));

jest.mock('../../../src/handlers/buttonHandlers', () => ({
  buttonHandlers: {
    multi: jest.fn(),
  },
}));

describe('Interaction Handler', () => {
  it('should call the correct command handler for a command interaction', async () => {
    const fakeCommandInteraction = {
      isCommand: () => true,
      commandName: 'crafthelp',
      reply: jest.fn().mockResolvedValue(undefined),
      options: { getString: jest.fn().mockReturnValue('dummy') },
    } as unknown as ChatInputCommandInteraction;

    await interactionHandler(fakeCommandInteraction);

    expect(commandHandlers.crafthelp).toHaveBeenCalledWith(
      fakeCommandInteraction,
    );
  });

  it('should call the correct button handler for a button interaction', async () => {
    const fakeButtonInteraction = {
      isCommand: () => false,
      isButton: () => true,
      customId: 'multi',
      reply: jest.fn().mockResolvedValue(undefined),
    } as unknown as ButtonInteraction;

    await interactionHandler(fakeButtonInteraction);

    expect(buttonHandlers.multi).toHaveBeenCalledWith(fakeButtonInteraction, 'multi');
  });
});
