import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { capitalizeName } from '../../utils/helpers';

const MAX_RECIPES_PER_PAGE = 10;

async function professionEmbed(
  data: any,
  page: number,
  totalPages: number,
  recipeText: string,
) {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`${capitalizeName(data.character_name)}'s Crafting Professions`)
    .setDescription(`📍 Realm: **${capitalizeName(data.realm)}**`)
    .setImage(data.media)
    .setFooter({ text: "Brought to you by Tarq's Crafty Bot" })
    .addFields({
      name: `📜 Recipes (Page ${page}/${totalPages})`,
      value: recipeText,
      inline: false,
    });
}

async function multipleCharacterEmbed (character: string) {
  return new EmbedBuilder()
    .setTitle(`Multiple Characters Found`)
    .setDescription(`More than one character matches **${character}**. Please select a realm below.`)
    .setColor(0xFFA500);
}

async function paginationComponent(
  data: any,
  page: number,
  totalPages: number,
) {
  const row = new ActionRowBuilder();
  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `pagination#back_${data.character_name}_${data.realm}_${page - 1}`,
        )
        .setLabel('⬅️ Back')
        .setStyle(ButtonStyle.Secondary),
    );
  }
  if (page < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `pagination#more_${data.character_name}_${data.realm}_${page + 1}`,
        )
        .setLabel('More ➡️')
        .setStyle(ButtonStyle.Primary),
    );
  }

  if (row.components.length > 0) {
    return row;
  }
  return []; //
}

async function multipleCharactersComponent(
  data: any
) {
  const row = new ActionRowBuilder();

  data.characters.forEach((char) => {
      row.addComponents(
          new ButtonBuilder()
              .setCustomId(`multi#select_${char.name}_${char.realm}`)
              .setLabel(`${capitalizeName(char.name)} - ${capitalizeName(char.realm)}`)
              .setStyle(ButtonStyle.Primary)
      );
  });

  if (row.components.length > 0) {
    return row;
  }
  return []; //
}

export async function multipleCharacters(data: any, interaction: any, character: string) {
  await interaction.editReply({
    embeds: [await multipleCharacterEmbed(character)],
    components: [
      (await multipleCharactersComponent(data)) as ActionRowBuilder<ButtonBuilder>,
    ],
  });
}

export async function listProfessionData(
  data: any,
  interaction: any,
  page = 1,
) {
  const allRecipes: string[] = data.khaz_algar_professions.flatMap(
    (profession) =>
      Array.isArray(profession.recipes) ? profession.recipes : [],
  );

  const totalPages = Math.ceil(allRecipes.length / MAX_RECIPES_PER_PAGE);

  const pageRecipes = allRecipes.slice(
    (page - 1) * MAX_RECIPES_PER_PAGE,
    page * MAX_RECIPES_PER_PAGE,
  );

  const recipeText =
    pageRecipes.length > 0
      ? pageRecipes.map((recipe) => `🔹 ${recipe}`).join('\n')
      : 'None';

  await interaction.editReply({
    embeds: [await professionEmbed(data, page, totalPages, recipeText)],
    components: [
      (await paginationComponent(
        data,
        page,
        totalPages,
      )) as ActionRowBuilder<ButtonBuilder>,
    ],
  });
}
