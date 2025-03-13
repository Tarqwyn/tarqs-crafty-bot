require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const WHO_API_URL = "https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/who";
const PROFESSIONS_API_URL = "https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/professions";

const capitalizeName = (name) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function getCharacterData(characterName, realm) {
    let apiUrl = `${PROFESSIONS_API_URL}/${characterName}`;
    if (realm) {
        apiUrl += `/${realm}`;
    }
    const response = await axios.get(apiUrl);
    return response.data
}

async function listProfessionData(data, interaction, page = 1) {
    const craftingProfessions = data.khaz_algar_professions;
    if (craftingProfessions.length === 0) {
        return interaction.editReply(`❌ No crafting professions found for **${capitalizeName(data.character_name)}** on **${capitalizeName(data.realm)}**.`);
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${capitalizeName(data.character_name)}'s Crafting Professions`)
        .setDescription(`📍 Realm: **${capitalizeName(data.realm)}**`)
        .setImage(data.media)
        .setFooter({ text: "Brought to you by Tarq's Crafty Bot" });

    const MAX_RECIPES_PER_PAGE = 10;
    let profession = craftingProfessions[0]; // Assuming one profession at a time
    let recipes = Array.isArray(profession.recipes) ? profession.recipes : [];
    let totalPages = Math.ceil(recipes.length / MAX_RECIPES_PER_PAGE);

    let pageRecipes = recipes.slice((page - 1) * MAX_RECIPES_PER_PAGE, page * MAX_RECIPES_PER_PAGE);
    let recipeText = pageRecipes.map(recipe => `🔹 ${recipe}`).join("\n") || "None";

    embed.addFields({ name: `📜 Recipes (Page ${page}/${totalPages})`, value: recipeText, inline: false });

    // Buttons for pagination
    const row = new ActionRowBuilder();
    if (page > 1) { // Add "Back" button if not on first page
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`back_${data.character_name}_${data.realm}_${page - 1}`)
                .setLabel("⬅️ Back")
                .setStyle(ButtonStyle.Secondary)
        );
    }
    if (page < totalPages) { // Add "More" button if more pages exist
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`more_${data.character_name}_${data.realm}_${page + 1}`)
                .setLabel("More ➡️")
                .setStyle(ButtonStyle.Primary)
        );
    }

    await interaction.editReply({ embeds: [embed], components: row.components.length > 0 ? [row] : [] });
}

async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;
    const [action, name, realm, page] = interaction.customId.split("_"); // Extract name & realm from button ID
    if (action === "more" || action === "back") {
        try {
            await interaction.deferUpdate(); // Acknowledge button press
            const data = await getCharacterData(name, realm);
            await listProfessionData(data, interaction, parseInt(page)); // Load requested page
        } catch (error) {
            console.error("Error loading recipes:", error);
            await interaction.followUp({ content: "❌ Failed to load recipes.", ephemeral: true });
        }
    } else {
        await interaction.reply({
            content: "⏳ Fetching profession data..."
        });
        try {
            // Fetch the selected character’s profession data
            const data = await getCharacterData(name, realm);
            await listProfessionData(data, interaction);
        } catch (error) {
            console.error("Error fetching character details:", error);
            await interaction.followUp({ content: "❌ Failed to fetch character data.", ephemeral: true });
        }
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }

    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'crafthelp') {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🛠 Crafting Bot Commands')
            .setDescription('Supported professions:\nLeatherworking\nTailoring\nBlacksmithing\nAlchemy\nJewelcrafting\nInscription\nEnchanting\nUse the following slash commands:\n')
            .addFields(
                { name: '`/who <recipe>`', value: 'Find out which guild members can craft a specific recipe.', inline: false },
                { name: '`/professions <character> [realm]`', value: 'Find professions for a character with optional realm input.', inline: false },
                { name: '`/crafthelp`', value: 'Show this help menu.', inline: false }
            )
            .setFooter({ text: "Happy crafting with Tarq's Crafty Bot" });

        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'who') {
        await interaction.deferReply();
    
        const recipeQuery = interaction.options.getString('recipe');
        const apiUrl = `${WHO_API_URL}/${encodeURIComponent(recipeQuery)}`;
    
        try {
            const response = await axios.get(apiUrl);
            const data = response.data;
    
            if (!data.crafters || !data.crafters.crafters || data.crafters.crafters.length === 0) {
                return interaction.editReply(`❌ No crafters found for **${data.recipe}**.`);
            }
    
            const recipeData = data.crafters;
    
            // Sort crafters by highest final_score
            recipeData.crafters.sort((a, b) => b.profession.final_score - a.profession.final_score);
            // Extract top crafter separately
            const topCrafter = recipeData.crafters[0];
            const otherCrafters = recipeData.crafters.slice(1, 10); // **Limit to Top 10**
    
            // Set embed color dynamically based on profession
            const professionColors = {
                "Leatherworking": 0x00A36C,  // Green
                "Blacksmithing": 0x3498DB,   // Blue
                "Inscription": 0x8E44AD,    // Purple
                "Alchemy": 0xE67E22,        // Orange
                "Jewelcrafting": 0xF1C40F,  // Yellow
            };
    
            const embedColor = professionColors[topCrafter.profession.name] || 0x00A36C;  // Default to green
    
            // Format required reagents list (truncate if needed)
            const reagentList = recipeData.reagents.reagents
                .map(r => `• ${r.name} x${r.quantity}`)
                .slice(0, 10) // **Limit reagents to prevent overflow**
                .join("\n") || "None";
    
            // Format optional reagents list (truncate if needed)
            const optionalReagentList = recipeData.reagents.optionalReagents
                .map(r => `• ${r.name} x${r.quantity}`)
                .slice(0, 5) // **Limit optional reagents**
                .join("\n") || "None";
    
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor(embedColor)  // Dynamic color
                .setTitle(`👨‍🏭 Who can craft **${recipeData.name}**?`)
                .setDescription(`🛠 **Category:** ${recipeData.category || "Unknown"}`)
                .setThumbnail(recipeData.mediaUrl)
                .addFields(
                    { name: "Required Reagents", value: reagentList, inline: false },
                    { name: "Optional Reagents", value: optionalReagentList, inline: false }
                )
                .setFooter({ 
                    text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" 
                });
    
            // **Highlight Top Crafter with separator lines**
            embed.addFields({
                name: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                value: `🏆 __**Top TCP* Crafter**__\n🔶 **${capitalizeName(topCrafter.character_name)} - ${capitalizeName(topCrafter.realm)}** 🔶\n🛠 **${topCrafter.profession.name}** (TCP's: ${topCrafter.profession.final_score})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                inline: false
            });
    
            // **List other crafters (Top 10 only)**
            if (otherCrafters.length > 0) {
                const craftersList = otherCrafters
                    .map(crafter => `**${capitalizeName(crafter.character_name)}** - ${capitalizeName(crafter.realm)} | **${crafter.profession.name}** (TCP's: ${crafter.profession.final_score})`)
                    .join("\n");
    
                embed.addFields({ name: "Other Crafters (Top 10)", value: craftersList, inline: false });
            }
    
            interaction.editReply({ embeds: [embed] });
    
        } catch (error) {
            console.error("❌ API Fetch Error:", error);
            interaction.editReply('⚠️ Error fetching crafter data. Please try again later.');
        }
    }
    
    if (interaction.commandName === 'professions') {
        await interaction.deferReply();
        const characterName = interaction.options.getString('character');
        const realm = interaction.options.getString('realm');
        let data;
        try {
            data = await getCharacterData(
                characterName,
                realm
            );
        } catch (error) {
            console.error("❌ API Fetch Error:", error);
            await interaction.editReply("⚠️ Error fetching profession data. Please try again later");
            return;
        }

        if (!data.characters){
            await listProfessionData(data, interaction);
        } else {
        // Multiple characters found - create an embed and buttons
            const embed = new EmbedBuilder()
                .setTitle(`Multiple Characters Found`)
                .setDescription(`More than one character matches **${characterName}**. Please select a realm below.`)
                .setColor(0xFFA500);

            // Buttons for selecting a character
            const row = new ActionRowBuilder();

            data.characters.forEach((char) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`select_${char.name}_${char.realm}`) // Unique button ID
                        .setLabel(`${capitalizeName(char.name)} - ${capitalizeName(char.realm)}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });

            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
