import { ChatInputCommandInteraction } from 'discord.js';
import { getCharacterData } from '../../services/api';
import {
  noProfessionsFound,
  characterNotFound,
} from '../builders/errorBuilders';
import {
  listProfessionData,
  multipleCharacters,
} from '../builders/professionBuilder';

export const handleProfessionsCommand = async (
  interaction: ChatInputCommandInteraction,
) => {
  await interaction.deferReply();
  if (interaction.commandName !== 'professions') return;

  const characterName = interaction.options.getString('character');
  const realm = interaction.options.getString('realm');

  try {
    const data = await getCharacterData(characterName, realm);
    if (data?._id) {
      if (
        !data ||
        !data.khaz_algar_professions ||
        data.khaz_algar_professions.length === 0
      ) {
        await interaction.editReply({
          embeds: [noProfessionsFound(characterName)],
        });
        return;
      }
      await listProfessionData(data, interaction);
    } else if (
      typeof data === 'object' &&
      'characters' in data &&
      Array.isArray((data as any).characters) &&
      (data as any).characters.length > 0
    ) {
      await multipleCharacters(data, interaction, characterName);
    } else {
      await interaction.editReply({
        embeds: [characterNotFound(characterName)],
      });
    }
  } catch (error) {
    console.error('❌ API Fetch Error:', error);
    await interaction.editReply({ embeds: [characterNotFound(characterName)] });
  }
};
