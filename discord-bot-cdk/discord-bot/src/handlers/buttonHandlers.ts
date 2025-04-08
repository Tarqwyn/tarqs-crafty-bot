import { ButtonInteraction } from 'discord.js';
import { getCharacterData } from '../services/api';
import { listProfessionData } from '../handlers/builders/professionBuilder';

export const buttonHandlers: Record<
  string,
  (_interaction: ButtonInteraction, _instruction: string) => Promise<void>
> = {
  multi: async (_interaction, _instruction) => {
    const [action, name, realm] = _instruction.split("_");
    try {
      await _interaction.deferUpdate();
      if (action === "multi#select") {
          const characterData = await getCharacterData(name, realm);
          await listProfessionData(characterData, _interaction);
      }
    } catch (error) {
        console.error("Error fetching character details:", error);
        await _interaction.followUp({ content: "❌ Failed to fetch character data.", ephemeral: true });
    }
  },
  pagination: async (_interaction, _instruction) => {
    const [action, name, realm, page] = _instruction.split('_');
    if (action === 'pagination#more' || action === 'pagination#back') {
      try {
        await _interaction.deferUpdate();
        const data = await getCharacterData(name, realm);
        await listProfessionData(data, _interaction, parseInt(page));
      } catch (error) {
        console.error('Error loading recipes:', error);
        await _interaction.update({
          content: '❌ Failed to load recipes.',
          components: [],
        });
      }
    }
  },
};
