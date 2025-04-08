import { EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

const embed = new EmbedBuilder()
  .setColor(0x3498db)
  .setTitle('🛠 Crafting Bot Commands')
  .setDescription(
    'We currently only support Crafting professions... but are considering Cooking..\nPlease report bugs to tarqwyndandy',
  )
  .addFields(
    {
      name: '`/who <recipe>`',
      value: 'Find out which guild members can craft a specific recipe.',
      inline: false,
    },
    {
      name: '`/professions <character> [realm]`',
      value: 'Find professions for a character with optional realm input.',
      inline: false,
    },
    { name: '`/crafthelp`', value: 'Show this help menu.', inline: false },
  )
  .setFooter({ text: "Happy crafting with Tarq's Crafty Bot" });

export const helpEmbed = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({ embeds: [embed] });
};
