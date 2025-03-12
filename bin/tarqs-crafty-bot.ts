#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TarqsCraftyBotStack } from "../lib/tarqs-crafty-bot-stack";

const app = new cdk.App();
new TarqsCraftyBotStack(app, "TarqsCraftyBotStack");

console.log(
  "Registered stacks:",
  app.node.children.map((child) => child.toString()),
);
console.log(
  "Stack contents:",
  app.node.children[0].node.children.map((child) => child.toString()),
);

console.log("Starting synthesis...");
app.synth();
console.log("Synthesis completed!");
