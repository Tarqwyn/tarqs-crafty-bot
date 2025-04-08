require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!CLIENT_ID || !DISCORD_TOKEN) {
    console.error("❌ Error: CLIENT_ID or DISCORD_TOKEN is missing in .env file.");
    process.exit(1);
}

// Define the commands
const commands = [
    new SlashCommandBuilder()
        .setName('who')
        .setDescription('Find out who can craft a recipe.')
        .addStringOption(option =>
            option.setName('recipe')
                .setDescription('The recipe name')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    new SlashCommandBuilder()
        .setName('professions')
        .setDescription('Find crafting professions for a character.')
        .addStringOption(option =>
            option.setName('character')
                .setDescription('Character name')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('realm')
                .setDescription('Realm name (optional)')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('crafthelp')
        .setDescription('Shows the available crafting bot commands.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Registering global slash commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Global slash commands registered successfully!');
    } catch (error) {
        console.error("❌ Failed to register global commands:", error);
        process.exit(1);
    }
})();
