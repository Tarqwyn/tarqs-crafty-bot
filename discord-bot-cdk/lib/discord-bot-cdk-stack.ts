import * as cdk from 'aws-cdk-lib';
import * as lightsail from 'aws-cdk-lib/aws-lightsail';
import { Construct } from 'constructs';

export class DiscordBotCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const discordBotInstance = new lightsail.CfnInstance(this, 'DiscordBotInstance', {
      instanceName: 'discord-bot',
      blueprintId: 'nodejs', 
      bundleId: 'nano_3_0', 
      keyPairName: 'botKey',
    });

    const staticIp = new lightsail.CfnStaticIp(this, 'DiscordBotStaticIp', {
      staticIpName: 'discord-bot-ip',
    });


    new cdk.CfnOutput(this, 'LightsailStaticIp', {
      value: staticIp.ref,
      description: 'Static IP Address',
    });

    new cdk.CfnOutput(this, 'LightsailInstanceName', {
      value: discordBotInstance.ref,
      description: 'Lightsail Instance Name',
    });
  }
}
