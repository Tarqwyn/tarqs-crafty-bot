#!/bin/bash
cd /opt/bitnami/discord-bot
pm2 restart tarqysCraftyBot || pm2 start tarqysCraftyBot.js --name "tarqysCraftyBot"
pm2 save
