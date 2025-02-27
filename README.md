# Tarqwyn's Crafting Bot - AWS CDK Deployment

## Description
Ever found yourself needing that perfect crafted piece of gear but unsure who in your guild can make it—at the quality you want?
Or maybe you’ve got the materials, but you're missing key reagents and need to know exactly what’s required to guarantee success?

And once you’ve figured all that out—how do you even let your guildmate know an order is coming their way?

Sure, you could manage all this in-game, but what if some of it could be streamlined through Discord while you're offline?

That’s where this API and Discord bot come in. It bridges the gap between World of Warcraft crafting and guild coordination outside the game, making it easier than ever to:
✅ Find out who in your guild can craft what you need
✅ See what reagents are required, including quality tiers
✅ Ensure your order will succeed with the right materials
✅ Notify the crafter via Discord so they know an order is incoming

I originally built this for my own guild, but if you’ve got AWS access and a Blizzard developer key, feel free to fork, use, and tweak it however you like!
The Discord bot code will also be released soon, making it even easier to integrate.

## Overview
This project is an AWS-powered Discord Crafting Bot that:
- Stores WoW guild members and their professions in AWS DocumentDB.
- Fetches real-time data from the Blizzard API 
- Provides an API Gateway to:
  - Lookup character professions (`/professions/{name}/{realm}`)
  - Find who can craft a specific recipe (`/who/{recipe}`)
  - Handle realm-less character searches (`/professions/{name}`)

Built using **AWS CDK (TypeScript)** for infrastructure and **Node.js (TypeScript) Lambda functions** for business logic.

## Features
- **AWS Lambda**: Handles API requests & Blizzard API integration.
- **AWS DocumentDB**: Stores guild members, professions & crafting recipes.
- **AWS API Gateway**: Public API for fetching character & recipe data.
- **AWS Secrets Manager**: Stores Blizzard API credentials securely.
- **Blizzard API Integration**: Fetches real-time WoW profession data.

## Project Structure (WIP)
```bash
/cdk
 ├── bin/                      # Entry point for the CDK app
 ├── lib/                      # CDK stack definitions
 │   ├── tarqs-crafty-bot-stack.ts  # Defines AWS infrastructure
 ├── lambda/                   # AWS Lambda function source
 │   ├── bot.ts                # Main bot logic
 │   ├── database.ts           # Database interactions (DocumentDB)
 │   ├── blizzard-api.ts       # Blizzard API calls
 │   ├── handlers/             # API handlers for different routes
 ├── package.json              # Dependencies
 ├── cdk.json                  # CDK configuration
 ├── tsconfig.json             # TypeScript configuration
 └── README.md                 # This file!
```

## Deployment Guide
### Prerequisites
- Install AWS CDK:
```sh
npm install -g aws-cdk
```
- Ensure AWS CLI is configured:
```sh
aws configure
```
- Install dependencies:
```sh
npm install
```

### Deploy the Stack
```sh
cdk deploy
```
This will:
- Create **API Gateway, Lambda, DocumentDB, and Secrets Manager**.
- Store the **API URL** in the output.

### Get API URL
After deployment, run:
```sh
cdk output
```
You'll see:
```sh
DiscordBotAPIEndpoint = https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod
```

## API Usage
### Fetch Professions for a Character
**GET** `/professions/{name}/{realm}`
```sh
curl -X GET "https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod/professions/tarqwyn/azjolnerub"
```
Example Response:
```json
{
  "character_name": "tarqwyn",
  "realm": "azjolnerub",
  "level": 80,
  "khaz_algar_professions": [
    {
      "name": "Skinning",
      "skill_points": "100/100",
      "recipes": "Thunderous Hide, Sunless Carapace"
    },
    {
      "name": "Leatherworking",
      "skill_points": "100/100",
      "recipes": "Algari Competitor's Chain Treads, Glyph-Etched Binding"
    }
  ]
}
```

### Find All Crafters for a Recipe
**GET** `/who/{recipe}`
```sh
curl -X GET "https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod/who/Algari%20Competitor's%20Chain%20Treads"
```
Example Response:
```json
{
  "recipe": "Algari Competitor's Chain Treads",
  "crafters": [
    {
      "character_name": "tarqwyn",
      "realm": "azjolnerub",
      "level": 80,
      "profession": [{ "name": "Leatherworking", "skill_points": "100/100" }]
    }
  ]
}
```

### Search for a Character Without Knowing Realm
**GET** `/professions/{name}`
```sh
curl -X GET "https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod/professions/tarqwyn"
```
Example Responses:
- **If only one character exists:**
```json
{
  "character_name": "tarqwyn",
  "realm": "azjolnerub",
  "level": 80,
  "khaz_algar_professions": [...]
}
```
- **If multiple matches exist:**
```json
{
  "message": "Multiple matches found",
  "characters": [
    { "name": "tarqwyn", "realm": "azjolnerub", "level": 80 },
    { "name": "tarqwyn", "realm": "quelthalas", "level": 75 }
  ]
}
```

## Updating the Stack
To deploy new changes:
```sh
cdk deploy
```
To destroy all AWS resources:
```sh
cdk destroy
```

## Next Steps
- **Refactor Code**: Organize into modular files (`blizzard-api.ts`, `database.ts`, `handlers.ts`).
- **Discord Bot**: Make the discord bot configuable and deployable - Runs local ATM
- **Batch updating**: allow more granular and batch updating of data.. including removing Characters
- **Improve latency**: Enable API Gateway caching
- **Improve DB indexing**: Speed database queries on the things we care about
- **Cost reduction**: Its pretty cheap but as lot is on free tier.. but there may be oppurtunities to reduce even further, especially when we need to run the Dicord bot 24/7
- **Expand Features**: Support **localized recipe searches**, **filters**, and **real-time/scheduled profession syncing**, **Reageants lists** and loads more..
- **Explore running as a service model**: Is there a model where other guilds could use the infrastructure but pay a small subscription to cover infrastructure costs..

## Contributors
- **Tarqwyn**