import { ChatInputCommandInteraction } from 'discord.js';
import { getRecipeData } from '../../services/api';
import { recipeNotFound, noCrafterFound } from '../builders/errorBuilders';
import { listRecipeData } from '../builders/whoBuilder';
//import { nanoid } from 'nanoid';

export const handleWhoCommand = async (
    interaction: ChatInputCommandInteraction,
  ) => {
    await interaction.deferReply();
    if (interaction.commandName !== 'who') return;
    //const salt = nanoid();
    const recipe = interaction.options.getString('recipe');
    try {
        const data = await getRecipeData(recipe)
        if (!data.crafters || !data.crafters.crafters || data.crafters.crafters.length === 0) {
            return interaction.editReply({ embeds: [noCrafterFound(recipe)] });
        }
        await listRecipeData(data.crafters, interaction, 'test');
    } catch (error) {
        console.error('❌ API Fetch Error:', error);
        await interaction.editReply({ embeds: [recipeNotFound(recipe)] });
    }
  }