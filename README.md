# Tarqwyn's Crafting Bot - AWS CDK Deployment

## Description

Ever found yourself needing that perfect crafted piece of gear but unsure who in your guild can make it—at the quality you want?  
Or maybe you’ve got the materials, but you're missing key reagents and need to know exactly what’s required to guarantee success?

And once you’ve figured all that out—how do you even let your guildmate know an order is coming their way?

Sure, you could manage all this in-game, but what if some of it could be streamlined through Discord while you're offline?

That’s where this API and Discord bot come in. It bridges the gap between World of Warcraft crafting and guild coordination outside the game, making it easier than ever to:

- 🛠️ Find out who in your guild can craft what you need
- 🔍 See what reagents are required, including quality tiers
- ✅ Ensure your order will succeed with the right materials
- 🔔 Notify the crafter via Discord so they know an order is incoming

I originally built this for my own guild, but if you’ve got AWS access and a Blizzard developer key, feel free to fork, use, and tweak it however you like!  

---

## Overview

This project is an **AWS-powered Discord Crafting Bot** that:

- 🏰 Stores WoW guild members and their professions in **AWS DocumentDB**
- 🌐 Fetches real-time data from the **Blizzard API**
- 🔗 Provides an **API Gateway** to:
  - 🔍 Lookup character professions: `GET /professions/{name}/{realm}`
  - 🛠️ Find who can craft a specific recipe: `GET /who/{recipe}`
  - 🌍 Handle realm-less character searches: `GET /professions/{name}`

Built using **AWS CDK (TypeScript)** for infrastructure and **Node.js (TypeScript) Lambda functions** for business logic.

---

## Features

- **AWS Lambda**: Handles API requests & Blizzard API integration.
- **AWS DocumentDB**: Stores guild members, professions & crafting recipes.
- **AWS API Gateway**: Public API for fetching character & recipe data.
- **AWS Secrets Manager**: Stores Blizzard API credentials securely.
- **AWS Lightsail**: Runs the actual bot and is deployed via Github Actions
- **Blizzard API Integration**: Fetches real-time WoW profession data.

---

## Project Structure

```sh
/cdk
├── bin
│   └── tarqs-crafty-bot.ts
├── discord-bot-cdk
│   ├── lib
│   │   └── discord-bot-cdk-stack.ts # Set up lightsail and Elastic IP 
│   ├── discord-bot
│   │   └── tarqsCraftyBot.js        # The actual bot
├── lambda
│   ├── bot.ts                       # Entrypoint for the backend
│   ├── handlers
│   │   ├── api-gateway.ts
│   │   ├── api-handlers.ts
│   │   ├── item-collection-handler.ts
│   │   └── update-handler.ts
│   ├── scripts
│   │   └── ensureIndexes.ts
│   ├── services
│   │   ├── blizzard-api.ts
│   │   ├── database.ts
│   │   └── utils.ts
│   ├── static
│   │   ├── khaz_algar_recipes.json
│   │   └── specialism.json
│   └── types
│       └── types.ts
├── lib
│   └── tarqs-crafty-bot-stack.ts     # Main stack
├── test
│   └── tarqs-crafty-bot.test.ts
└── utils
    ├── fetch_khaz_algar_recipes.mjs  # Regenerate khaz_algar_recipes.json
    └── mocks
        └── secrets-manager
```

## Deployment Guide

### 1️⃣ Prerequisites

Ensure you have the necessary dependencies installed.

**Install AWS CDK:**

```sh
npm install -g aws-cdk
```

**Ensure AWS CLI is configured:**

```sh
aws configure
```

**Install Node.js dependencies:**

```sh
npm install
```

---

### 2️⃣ Using the Makefile

A **Makefile** is provided to simplify development, testing, and deployment.

#### **🛠️ Development Mode**

This starts TypeScript watch mode and automatically restarts the Lambda container when code changes.

```sh
make dev
```

#### **💜 Viewing Logs**

To view real-time logs from the local Lambda container:

```sh
make logs
```

---

### 3️⃣ Deploy the Stack

To deploy everything, including API Gateway, Lambda, DocumentDB, and Secrets Manager:

```sh
make deploy
```

This will:

- Create the required AWS infrastructure.
- Output the **API Gateway endpoint**.

---

### 4️⃣ Get API URL

After deployment, run:

```sh
cdk output
```

You'll see:

```sh
DiscordBotAPIEndpoint = https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod
```

---

## API Usage

### **Fetch Professions for a Character**

**GET** `/professions/{name}/{realm}`

```sh
curl -X GET "https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod/professions/tarqwyn/azjolnerub"
```

### **Find All Crafters for a Recipe**

**GET** `/who/{recipe}`

```sh
curl -X GET "https://your-api-id.execute-api.eu-west-1.amazonaws.com/prod/who/Algari%20Competitor's%20Chain%20Treads"
```

---

## Destroy the Stack

If you need to remove all AWS resources:

```sh
cdk destroy
```

---

## 🛠️ Makefile Commands

#### **🔄 Update Guild Member Data**

```sh
make updateGuild
```

#### **📦 Initialize Item Collection**

```sh
make initItemCollection
```

#### **🔍 Ensure Indexes Exist**

```sh
make ensureIndexes
```

#### **🔎 Query Who Can Craft a Recipe**

```sh
make who RECIPE="Radiant Mastery"
```

#### **🔍 Look Up Professions by Character**

```sh
make profession CHARACTER=tarqwyn
```

#### **🔍 Look Up Professions by Character & Realm**

```sh
make realm CHARACTER=tarqwyn REALM=azjolnerub
```

---

## Next Steps

🚀 Planned improvements:

- **Performance**: Enable API Gateway caching.
- **Multi-Guild Support**: Consider shared subscription model.

---

## Contributors

- **Tarqwyn**
