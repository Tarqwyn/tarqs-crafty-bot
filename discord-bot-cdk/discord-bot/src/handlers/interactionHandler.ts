import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from 'discord.js';
import { commandHandlers } from './commandHandlers';
import { buttonHandlers } from './buttonHandlers';

export async function interactionHandler(interaction: Interaction) {
  try {
    if (interaction.isCommand()) {
      const command = interaction as ChatInputCommandInteraction;
      const handler = commandHandlers[command.commandName];
      if (handler) await handler(command);
    } else if (interaction.isButton()) {
      const button = interaction as ButtonInteraction;
      const [action] = button.customId.split('_')[0].split('#');
      const instruction = button.customId;
      const handler = buttonHandlers[action];
      if (handler) await handler(button, instruction);
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
  }
}
