import { ChatInputCommandInteraction } from 'discord.js';
import { helpEmbed } from '../handlers/commands/helpHandler';
import { handleProfessionsCommand } from '../handlers/commands/professionHandler';
import { handleWhoCommand } from '../handlers/commands/whoHandler';

export const commandHandlers: Record<
  string,
  (_interaction: ChatInputCommandInteraction) => Promise<void>
> = {
  crafthelp: async (_interaction) => {
    await helpEmbed(_interaction);
  },

  who: async (_interaction) => {
    await handleWhoCommand(_interaction);
  },

  professions: async (_interaction) => {
    await handleProfessionsCommand(_interaction);
  },
};
