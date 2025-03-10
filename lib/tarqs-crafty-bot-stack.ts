import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as docdb from "aws-cdk-lib/aws-docdb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { JsonSchemaType } from "aws-cdk-lib/aws-apigateway";

export class TarqsCraftyBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCs for the the bot and it data
    const vpc = new ec2.Vpc(this, "CraftingBotVPC", {
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
      timeout: cdk.Duration.seconds(120),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [lambdaSecurityGroup],
      allowPublicSubnet: true,
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
    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: api.url || "API Gateway deployment failed",
    });

    new cdk.CfnOutput(this, "DocumentDBEndpoint", {
      value: craftingDBCluster.clusterEndpoint.hostname,
    });

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: craftingDBCluster.secret?.secretArn || "No secret found",
    });
  }
}
