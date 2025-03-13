import * as cdk from 'aws-cdk-lib';
import * as lightsail from 'aws-cdk-lib/aws-lightsail';
import { Construct } from 'constructs';

const userDataScript = `
#!/bin/bash
# Update system packages
sudo apt update -y

# Install required dependencies
sudo apt install -y awscli npm git unzip

# Install PM2 globally
sudo npm install -g pm2

# Ensure the deployment directory exists
sudo mkdir -p /home/ubuntu/discord-bot
sudo chown ubuntu:ubuntu /home/ubuntu/discord-bot

# Fetch environment variables from AWS SSM (Modify the path if needed)
aws ssm get-parameter --name "DiscordBotEnv" --with-decryption --query "Parameter.Value" --output text > /home/ubuntu/discord-bot/.env
chmod 600 /home/ubuntu/discord-bot/.env
chown ubuntu:ubuntu /home/ubuntu/discord-bot/.env

# Setup SSH for GitHub Actions
mkdir -p /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC6UA/CsiNyU9RiHqb66l43+ofSm6h3yht5HmFQhpoijEJbBLqIXd9FQpaa3Fulg8QxESnBaPDWf3lGDIOMj07u37Vj4u9LzxKdR1FLZFi5v/sph5s8Y1hbQXfN170pTZrObt9w7dvhBXd6AkobA7H/cncx7BF3TDscp+9lF+Eq5OYO6EjpUwZNWe4BlAErEd3HKkALZ9CY9gdNq/RRW6Vjew7r/LrmifqI5ACGF4VgKJxgA+lUHolUCUI4+tUzeGDmCAsd55UbSH5lI06y0INVAWAmlUmSYE20zEExRTPlJWHrwHKz7hup/NrJyJzdkVKG3XMdZVNzoi+qD5vTw91X5Vp+STfRNZk2Ex25BfmoOISLQ7Ci66sRNfXST2jieY/WSKHbZ9433put3OxzB9J8C9EcqjNRqjxxtI7av/u3HUAiafEB6IIEjuXux24swAimBDAE4IuHAdm+k/BSwBwYvm8wpEWUssIB/HbvheqUr7KFnJ73rhaXuDGLlW/DNpDCSFHy1g/Vo+VIsqLgWeByIseUTc34kKJeEcqO5de22WAOT5+8LXXI8HNKFLs1jj5GUqOTg+xKhR5GEJKlMonfsKYiZM8QNiXCct0CCHLlQ6yunIdTuKKKRERlwUEAegcMrIFvGdHe1+aRJI75jzDZH2q/njlvlf6JCBtkCfrqdQ== root@Tarqwyn-Media" > /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh

# Set permissions for Node.js (optional but avoids permission issues)
sudo chown -R ubuntu:ubuntu /usr/bin/npm
sudo chown -R ubuntu:ubuntu /usr/bin/node

# Start PM2 on boot (optional, but useful)
sudo su - ubuntu -c "pm2 startup systemd"
`;

export class DiscordBotCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lightsail instance for the Discord Bot
    const discordBotInstance = new lightsail.CfnInstance(this, 'DiscordBotInstance', {
      instanceName: 'discord-bot',
      blueprintId: 'ubuntu_22_04',
      bundleId: 'nano_3_0',
      keyPairName: 'botKey',
      userData: userDataScript,
    });

    // Attach a static IP
    const staticIp = new lightsail.CfnStaticIp(this, 'DiscordBotStaticIp', {
      staticIpName: 'discord-bot-ip',
    });


    new cdk.CfnOutput(this, 'LightsailStaticIp', {
      value: staticIp.ref,
      description: 'Static IP Address for SSH & GitHub Actions Deployment',
    });

    new cdk.CfnOutput(this, 'LightsailInstanceName', {
      value: discordBotInstance.ref,
      description: 'Lightsail Instance Name',
    });
  }
}
