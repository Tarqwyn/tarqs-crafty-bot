import { Client, GatewayIntentBits } from 'discord.js';

import * as dotenv from 'dotenv';

import { interactionHandler } from './handlers/interactionHandler';

dotenv.config();
const token =
  process.env.NODE_ENV === 'production'
    ? process.env.DISCORD_TOKEN
    : process.env.DISCORD_TOKEN_TEST;

if (!token) {
  console.error('Discord token is not defined');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('interactionCreate', interactionHandler);

client.once('ready', () => {
  if (client.user) {
    console.info(`✅ Logged in as ${client.user.tag}`);
  } else {
    console.error('Failed to log in, client.user is null.');
  }
});

client.login(token);
