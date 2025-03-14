require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');


const WHO_API_URL = "https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/who";
const PROFESSIONS_API_URL = "https://j3fjpcj7b3.execute-api.eu-west-1.amazonaws.com/prod/professions";
function generateSalt() {
    return Date.now().toString(); 
}
const orderMessages = new Map();

const capitalizeName = (name) => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function handlePagination(interaction, data) {
    const [action, name, realm, page] = data.split("_"); // Split on underscores for detailed data

    if (action === "more" || action === "back") {
        try {
            await interaction.deferUpdate(); // Acknowledge button press
            const characterData = await getCharacterData(name, realm);
            await listProfessionData(characterData, interaction, parseInt(page)); // Load requested page
        } catch (error) {
            console.error("Error loading recipes:", error);
            await interaction.followUp({ content: "❌ Failed to load recipes.", ephemeral: true });
        }
    }
}

async function handleMultiSelect(interaction, data) {
    const [action, name, realm] = data.split("_"); // Split on underscores for detailed data

    try {
        await interaction.deferUpdate(); // Acknowledge the button press
        if (action === "select") {
            const characterData = await getCharacterData(name, realm);
            await listProfessionData(characterData, interaction); // Show data for the selected character
        }
    } catch (error) {
        console.error("Error fetching character details:", error);
        await interaction.followUp({ content: "❌ Failed to fetch character data.", ephemeral: true });
    }
}

async function handleOrder(interaction, data) {
    const [action] = data.split("_");
    
    if (action === "place") {
        const [, name, user, salt] = data.split("_");
        
        // Defer update to acknowledge the interaction and process it
        await interaction.deferUpdate();
        
        const orderData = orderMessages.get(salt);
        orderData.userId = interaction.user.id;
        orderData.username = interaction.user.username;
        orderData.messageId = interaction.message.id;

        // Create confirmation embed
        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Confirm Order Placement")
            .setDescription(`Please confirm that the order for **${name}** has been placed in the game.`);
        
        // Create Yes/No buttons
        const confirmationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`order#confirm_${salt}`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success),
        );

        // Send ephemeral confirmation message to the user
        await interaction.followUp({
            embeds: [confirmationEmbed],
            components: [confirmationRow],
            ephemeral: true
        });
    } else if (action === "confirm") {
        const [, salt] = data.split("_");

        // Defer the update to acknowledge that the interaction is being handled
        await interaction.deferUpdate();

        const orderData = orderMessages.get(salt);
        const confirmMessage = await interaction.channel.messages.fetch(orderData.messageId);

        const confirmEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`👨‍🏭 Who can craft **${orderData.recipe}**?`)
            .setThumbnail(orderData.thumbnail)
            .setDescription("Your order has been successfully placed! Here's the summary:")
            .addFields(
                { name: 'Ordered By', value: `<@${orderData.userId}> (${orderData.username})`, inline: true },
                { name: 'Order ID', value: orderData.messageId, inline: false },
                orderData.requiredReagents,
                orderData.optionalReagent,
                orderData.topCrafter,
            )
            .setFooter({ 
                text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" 
            });

        if (orderData.otherCrafters.value.length > 0) {
            confirmEmbed.addFields(orderData.otherCrafters);
        }

        // Create a new "Complete Order" button
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`order#complete_${salt}`)
                .setLabel("🏁 Complete Order")
                .setStyle(ButtonStyle.Primary)
        );

        // Edit the original message with the updated embed and new button
        await confirmMessage.edit({
            embeds: [confirmEmbed],
            components: [confirmRow]
        });


        // Delete the ephemeral confirmation message after confirmation
        await interaction.deleteReply();
    } else if (action === "complete") {
        const [, salt] = data.split("_");
        
        // Defer the update to acknowledge the interaction
        await interaction.deferUpdate();

        // Retrieve the order data from the map using the salt
        const orderData = orderMessages.get(salt);

        // Fetch the original message
        const completeMessage = await interaction.channel.messages.fetch(orderData.messageId);

        const completeEmbed = new EmbedBuilder()
            .setColor(0xF39C12) // For Order Completed (orange)
            .setTitle(`👨‍🏭 Who can craft **${orderData.recipe}**?`)
            .setThumbnail(orderData.thumbnail)
            .setDescription("Your order has been completed! 🎉")
            .addFields(
                { name: 'Ordered By', value: `<@${orderData.userId}> (${orderData.username})`, inline: true },
                { name: 'Order ID', value: orderData.messageId, inline: false },
                { name: 'Completed By', value: `@${interaction.member.displayName} (${interaction.user.username})`, inline: true },
                orderData.requiredReagents,
                orderData.optionalReagent,
                orderData.topCrafter,
            )
            .setFooter({ 
                text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" 
            });

        if (orderData.otherCrafters.value.length > 0) {
            completeEmbed.addFields(orderData.otherCrafters);
        }

        // Edit the original message with the updated embed
        const completeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`order#complete_${salt}`)
                .setLabel("🏁 Order Complete")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true) // Disable the button to stop further interaction
        );
    
        // Edit the original message with the updated embed and the "Order Complete" button
        await completeMessage.edit({
            embeds: [completeEmbed],
            components: [completeRow]  // No further interaction buttons, just the "Order Complete" button
        });

        orderMessages.delete(salt);
    }
}


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
                .setCustomId(`pagination#back_${data.character_name}_${data.realm}_${page - 1}`)
                .setLabel("⬅️ Back")
                .setStyle(ButtonStyle.Secondary)
        );
    }
    if (page < totalPages) { // Add "More" button if more pages exist
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`pagination#more_${data.character_name}_${data.realm}_${page + 1}`)
                .setLabel("More ➡️")
                .setStyle(ButtonStyle.Primary)
        );
    }

    await interaction.editReply({ embeds: [embed], components: row.components.length > 0 ? [row] : [] });
}

const buttonHandlers = {
    pagination: handlePagination,
    multi: handleMultiSelect,
    order: handleOrder,
};


async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    const [namespace, data] = customId.split("#");

    const handler = buttonHandlers[namespace];
    if (handler) {
        await handler(interaction, data); 
    } else {
        console.warn(`No handler found for ${namespace}`);
    }
}

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
            .setDescription('We currently only support Crafting professions.. but are considering Cooking..\nPlease report bugs to tarqwyndandy')
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
        const salt = generateSalt();
    
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
    

            const embedRequiredReagents = { name: "Required Reagents", value: reagentList, inline: false }
            const embedOptionalReagents = { name: "Optional Reagents", value: optionalReagentList, inline: false }
            const embedTopCrafter = {
                name: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                value: `🏆 __**Top TCP* Crafter**__\n🔶 **${capitalizeName(topCrafter.character_name)} - ${capitalizeName(topCrafter.realm)}** 🔶\n🛠 **${topCrafter.profession.name}** (TCP's: ${topCrafter.profession.final_score})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                inline: false
            }
            const craftersList = otherCrafters
                .map(crafter => `**${capitalizeName(crafter.character_name)}** - ${capitalizeName(crafter.realm)} | **${crafter.profession.name}** (TCP's: ${crafter.profession.final_score})`)
                .join("\n");
            const embedOtherCrafters = { name: "Other Crafters (Top 10)", value: craftersList, inline: false }
            
            // Create embed response
            const embed = new EmbedBuilder()
                .setColor(0x7289DA)  // Dynamic color
                .setTitle(`👨‍🏭 Who can craft **${recipeData.name}**?`)
                .setThumbnail(recipeData.mediaUrl)
                .addFields(
                    embedRequiredReagents,
                    embedOptionalReagents
                )
                .setFooter({ 
                    text: "Brought to you by Tarq's Crafty Bot\n*TCP's (Tarq's Crafty Points) - Shows most likely to be able to craft at top rank based on available data" 
                });
            
                embed.addFields(embedTopCrafter);
            if (otherCrafters.length > 0) {
                embed.addFields(embedOtherCrafters);
            }

            orderMessages.set(salt, {
                recipe: recipeData.name,
                userId: null,
                username: null,
                messageId: null,
                thumbnail: recipeData.mediaUrl,
                requiredReagents : embedRequiredReagents,
                optionalReagent: embedOptionalReagents,
                topCrafter: embedTopCrafter,
                otherCrafters: embedOtherCrafters,
            });

            const orderRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`order#place_${recipeData.name}_${interaction.user.id}_${salt}`)
                    .setLabel("Place Order")
                    .setStyle(ButtonStyle.Primary)
            );

            interaction.editReply({ embeds: [embed], components: [orderRow] });
    
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
                        .setCustomId(`multi#select_${char.name}_${char.realm}`) // Unique button ID
                        .setLabel(`${capitalizeName(char.name)} - ${capitalizeName(char.realm)}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });

            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
