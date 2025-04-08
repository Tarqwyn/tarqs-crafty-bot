import * as cdk from 'aws-cdk-lib';
import { DiscordBotCdkStack } from '../lib/discord-bot-cdk-stack';
import { Template } from 'aws-cdk-lib/assertions';

describe('DiscordBotCdkStack', () => {
  let app: cdk.App;
  let stack: DiscordBotCdkStack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new DiscordBotCdkStack(app, 'DiscordBotCdkStack');
  });

  it('should create a Lightsail instance with the correct properties', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lightsail::Instance', {
      InstanceName: 'discord-bot',
      BlueprintId: 'ubuntu_22_04',
      BundleId: 'nano_3_0',
    });
  });

  it('should create a Lightsail static IP', () => {
    const template = Template.fromStack(stack);

    template.hasResource('AWS::Lightsail::StaticIp', {
        Properties: {
            StaticIpName: 'discord-bot-ip',
        },
    });
  });

  it('should output the Lightsail static IP', () => {
    const template = Template.fromStack(stack);

    template.hasOutput('LightsailStaticIp', {
      Value: {
        Ref: 'DiscordBotStaticIp',
      },
    });
  });

  it('should output the Lightsail instance name', () => {
    const template = Template.fromStack(stack);

    template.hasOutput('LightsailInstanceName', {
      Value: {
        Ref: 'DiscordBotInstance',
      },
    });
  });
});
