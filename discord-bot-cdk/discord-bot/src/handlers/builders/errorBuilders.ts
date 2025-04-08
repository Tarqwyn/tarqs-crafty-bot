import { EmbedBuilder } from 'discord.js';

export const noProfessionsFound = (characterName: string) =>
  new EmbedBuilder()
    .setTitle('No Professions Found')
    .setDescription(`**${characterName}** has no visible profession data.`)
    .setColor(0xffcc00);

export const characterNotFound = (characterName: string) =>
  new EmbedBuilder()
    .setTitle('Character Not Found')
    .setDescription(
      `Something went wrong trying to find **${characterName}**. Please check the name or try again later.`,
    )
    .setColor(0xff0000);

export const recipeNotFound = (recipe: string) =>
  new EmbedBuilder()
    .setTitle('Recipe Not Found')
    .setDescription(
      `Something went wrong trying to find **${recipe}**. Please check the name or try again later.`,
    )
    .setColor(0xff0000);

export const noCrafterFound = (recipe: string) =>
  new EmbedBuilder()
    .setTitle('No Crafter Found')
    .setDescription(
      `Something went wrong trying to a crafter for **${recipe}**. Please check the name or try again later.`,
    )
    .setColor(0xff0000);
