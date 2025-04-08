import { ChatInputCommandInteraction } from 'discord.js';
import { helpEmbed } from '../../../../src/handlers/commands/helpHandler';

jest.mock('discord.js', () => ({
    ...jest.requireActual('discord.js'),
    ChatInputCommandInteraction: jest.fn().mockImplementation(() => ({
        reply: jest.fn().mockResolvedValue(undefined), 
        options: {
        getString: jest.fn().mockReturnValue('dummy'),
        },
    })),
    }));

    describe('HelpEmbed', () => {
        it('should send the correct help embed', async () => {
            const mockInteraction = new (ChatInputCommandInteraction as jest.Mock)();
        
            await helpEmbed(mockInteraction);
        
            const replyArgument = mockInteraction.reply.mock.calls[0][0];

            expect(replyArgument).toHaveProperty('embeds');
            expect(replyArgument.embeds).toHaveLength(1);
        
            const embedData = replyArgument.embeds[0].data;
        
            expect(embedData.color).toBe(3447003);
            expect(embedData.description).toContain('We currently only support Crafting professions');

            expect(embedData.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "`/who <recipe>`" }),
                    expect.objectContaining({ name: "`/professions <character> [realm]`" }),
                    expect.objectContaining({ name: "`/crafthelp`" }),
                ])
            );
            
            expect(embedData.footer.text).toBe("Happy crafting with Tarq's Crafty Bot")
        });
      });