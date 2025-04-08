import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { capitalizeName } from '../../utils/helpers';
import { Crafter, CrafterData, Reagent, OptionalReagent } from '../../utils/types';

const TOP_CRAFTER_QTY = 10;
const LINE = '════════════════';

function formatCraftersList(crafters: Crafter[]): { topCrafter: Crafter; craftersList: string } {
    const sorted = [...crafters].sort((a, b) => b.profession.final_score - a.profession.final_score);

    const topCrafter = sorted[0];
    const otherCrafters = sorted.slice(1, TOP_CRAFTER_QTY + 1);

    const craftersList = otherCrafters
          .map(crafter => `**${capitalizeName(crafter.character_name)}** - ${capitalizeName(crafter.realm)} |(TCP's: ${crafter.profession.final_score})`)
          .join("\n");

    return { topCrafter, craftersList };
}

function formatReagentLists(recipeData: CrafterData): { reagentList: string; optionalReagentList: string } {
  const reagentList = recipeData.reagents.reagents
        .map(r => `• ${r.name} x${r.quantity}`)
        .slice(0, 10)
        .join("\n") || "None";

    const optionalReagentList = recipeData.reagents.optionalReagents
        .map(r => `• ${r.name} x${r.quantity}`)
        .slice(0, 5)
        .join("\n") || "None";
        
    return { reagentList, optionalReagentList };
}

async function whoEmbed(
  recipe: string,
  media: string,
  requiredReagents: string,
  optionalReagents: string,
  topCrafter: Crafter,
  craftersList: string,
) {
  return new EmbedBuilder()
    .setColor(0x7289DA)
    .setTitle(`👨‍🏭 Who can craft **${recipe}**?`)
    .setThumbnail(media)
    .addFields({ name: "Required Reagents", value: requiredReagents, inline: false })
    .addFields({ name: "Optional Reagents", value: optionalReagents, inline: false })
    .addFields({
        name: `═══**Top TCP Crafter**═══`,
        value: `🏆 ${capitalizeName(topCrafter.character_name)} - ${capitalizeName(topCrafter.realm)}** 🔶\n(TCP's: ${topCrafter.profession.final_score})\n${LINE}`,
        inline: false
    })
    .addFields({ name: `Other Crafters (Top ${TOP_CRAFTER_QTY})`, value: craftersList, inline: false })
    .setFooter({ 
        text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" 
    });
}

export async function listRecipeData(
  recipeData: any,
  interaction: any,
  salt: string
) {
  const recipe = recipeData.name;
  const thumbnail = recipeData.mediaUrl;
  const { reagentList, optionalReagentList } = formatReagentLists(recipeData);
  const { topCrafter, craftersList } = formatCraftersList(recipeData.crafters);

  await interaction.editReply({
    embeds: [await whoEmbed(recipe, thumbnail, reagentList, optionalReagentList, topCrafter, craftersList)],
    components: [],
  });
}
