import * as cdk from 'aws-cdk-lib';
import * as lightsail from 'aws-cdk-lib/aws-lightsail';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
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

    const codedeployRole = new iam.Role(this, 'CodeDeployRole', {
      assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    const codedeployApp = new codedeploy.ServerApplication(this, 'DiscordBotDeployApp', {
      applicationName: 'DiscordBotDeploy',
    });

    new codedeploy.ServerDeploymentGroup(this, 'DiscordBotDeployGroup', {
      application: codedeployApp,
      deploymentGroupName: 'DiscordBotDeployGroup',
      ec2InstanceTags: new codedeploy.InstanceTagSet({
        'Name': ['discord-bot'],
      }),
      role: codedeployRole,
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
