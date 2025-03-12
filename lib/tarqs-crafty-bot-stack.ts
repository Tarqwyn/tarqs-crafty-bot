import {
  aws_ec2 as ec2,
  aws_lambda as lambda,
  aws_docdb as docdb,
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy,
  Duration
} from "aws-cdk-lib";

import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { JsonSchemaType } from "aws-cdk-lib/aws-apigateway";

import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

export class TarqsCraftyBotStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPCs for the the bot and it data
    const vpc = new ec2.Vpc(this, "CraftingBotVPC", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Security Groups so Lambda and DB can chat over the network
    const docdbSecurityGroup = new ec2.SecurityGroup(
      this,
      "DocumentDBSecurityGroup",
      {
        vpc,
        description: "Security group for DocumentDB cluster",
        allowAllOutbound: true,
      },
    );

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      "LambdaSecurityGroup",
      {
        vpc,
        description: "Security group for Lambda function",
        allowAllOutbound: true,
      },
    );

    const publicSg = new ec2.SecurityGroup(this, "publicSg", {
      vpc,
      allowAllOutbound: true,
    });

    publicSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "allow ssh access",
    );
    publicSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "allow http access",
    );

    publicSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "allow https access",
    );
    
    const customNat = new ec2.Instance(this, `customNatInstance`, {
      vpc,
      securityGroup: publicSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      keyName: "natKey",
      sourceDestCheck: false, 
      associatePublicIpAddress: true, 
    });

    const initScriptPath = path.join(`${__dirname}/`, "init-script.sh");
    const userData = fs.readFileSync(initScriptPath, "utf8");
    customNat.addUserData(userData);


    const privateSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    }).subnets as ec2.Subnet[];
    privateSubnets[0].addRoute(`NAT-route-0`, {
      routerId: customNat.instanceId,
      routerType: ec2.RouterType.INSTANCE,
      destinationCidrBlock: "0.0.0.0/0",
    });
    privateSubnets[1].addRoute(`NAT-route-1`, {
      routerId: customNat.instanceId,
      routerType: ec2.RouterType.INSTANCE,
      destinationCidrBlock: "0.0.0.0/0",
    });

    const elasticIp = new ec2.CfnEIP(this, "ElasticIp");
    new ec2.CfnEIPAssociation(this, "EipAssociation", {
      eip: elasticIp.ref,
      instanceId: customNat.instanceId,
    });

    customNat.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Database and Code
    const craftingDBCluster = new docdb.DatabaseCluster(
      this,
      "CraftingDatabase",
      {
        masterUser: { username: "craftingbotuser" },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM,
        ),
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroup: docdbSecurityGroup,
        storageEncrypted: true,
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _secretsManagerEndpoint = vpc.addInterfaceEndpoint(
      "SecretsManagerVPCEndpoint",
      {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: { subnetType: ec2.SubnetType.PUBLIC }, // Attach to the public subnet where Lambda runs
        securityGroups: [lambdaSecurityGroup],
      },
    );

    const botLambda = new lambda.Function(this, "DiscordBotLambda", {
      functionName: "DiscordBotLambda",
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "bot.lambdaHandler",
      code: lambda.Code.fromAsset("lambda", {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: ["bash", "-c", "npm install && cp -r . /asset-output"],
        },
      }),
      timeout: Duration.seconds(240),
      vpc,
      securityGroups: [lambdaSecurityGroup],
      reservedConcurrentExecutions: 1,
    });

    // Lets the two of them chat if they want
    docdbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(27017),
      "Allow Lambda to connect to DocumentDB",
    );

    // API this is how we ensure our Discord bot has something to hit
    const api = new apigateway.RestApi(this, "DiscordBotAPI", {
      restApiName: "DiscordBotAPI",
      description: "API for retrieving character professions.",
      deployOptions: {
        stageName: "prod",
      },
    });

    // Routes all requests to the llambda
    const lambdaIntegration = new apigateway.LambdaIntegration(botLambda);

    // Schemas (WIP)
    const requestModel = api.addModel("ProfessionsRequestModel", {
      contentType: "application/json",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          name: { type: JsonSchemaType.STRING, pattern: "^[a-zA-Z0-9-]+$" },
          realm: { type: JsonSchemaType.STRING, pattern: "^[a-zA-Z0-9-]+$" },
        },
        required: ["name", "realm"],
      },
    });

    const professionsResource = api.root.addResource("professions");
    const nameResource = professionsResource.addResource("{name}");
    const realmResource = nameResource.addResource("{realm}");
    const whoResource = api.root.addResource("who");
    const recipeResource = whoResource.addResource("{recipe}");

    //Routes
    realmResource.addMethod("GET", lambdaIntegration, {
      requestModels: {
        "application/json": requestModel,
      },
      requestValidatorOptions: {
        validateRequestBody: false,
        validateRequestParameters: true,
      },
    });

    nameResource.addMethod("GET", lambdaIntegration, {
      requestValidatorOptions: {
        validateRequestBody: false,
        validateRequestParameters: true,
      },
    });

    recipeResource.addMethod("GET", lambdaIntegration, {
      requestValidatorOptions: {
        validateRequestBody: false,
        validateRequestParameters: true,
      },
    });

    // Where we might keep our Blizzard API credentials - It must already exist
    const blizzardSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "BlizzardAPICredentials",
      "BlizzardAPICredentials",
    );

    // Let the Lambda read the Secret
    blizzardSecret.grantRead(botLambda);
    if (craftingDBCluster.secret) {
      botLambda.addEnvironment(
        "DOCUMENTDB_SECRET_ARN",
        craftingDBCluster.secret.secretArn,
      );
      craftingDBCluster.secret.grantRead(botLambda);
    }

    // Add DB host variable for the lambda
    botLambda.addEnvironment(
      "DOCUMENTDB_CLUSTER_URI",
      craftingDBCluster.clusterEndpoint.hostname,
    );

    // Outputs so other services can reference them
    new CfnOutput(this, "ApiGatewayUrl", {
      value: api.url || "API Gateway deployment failed",
    });

    new CfnOutput(this, "DocumentDBEndpoint", {
      value: craftingDBCluster.clusterEndpoint.hostname,
    });

    new CfnOutput(this, "DatabaseSecretArn", {
      value: craftingDBCluster.secret?.secretArn || "No secret found",
    });
  }
}
