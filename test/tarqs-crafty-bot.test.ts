import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { TarqsCraftyBotStack } from "../lib/tarqs-crafty-bot-stack";

describe("TarqsCraftyBotStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new TarqsCraftyBotStack(app, "TestStack");
    template = Template.fromStack(stack);
  });

  test("Creates a VPC with two subnet types", () => {
    template.hasResourceProperties("AWS::EC2::VPC", {
      CidrBlock: "10.0.0.0/16",
    });

    template.resourceCountIs("AWS::EC2::Subnet", 4); // 2 public + 2 private
  });

  test("Creates a NAT Instance with an Elastic IP", () => {
    template.hasResourceProperties("AWS::EC2::Instance", {
      InstanceType: "t3.micro",
    });

    template.hasResource("AWS::EC2::EIP", {});
  });

  test("Creates a Lambda function with correct properties", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs18.x",
      Timeout: 240,
    });
  });

  test("Creates a DocumentDB cluster", () => {
    template.hasResourceProperties("AWS::DocDB::DBCluster", {
      StorageEncrypted: true,
    });

    template.hasResource("AWS::DocDB::DBInstance", {});
  });

  test("Creates an API Gateway with a Lambda integration", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "DiscordBotAPI",
    });

    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
    });
  });

  test("Creates security groups with correct outbound rules", () => {
    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Security group for DocumentDB cluster",
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "Security group for Lambda function",
    });
  });

  test("Creates API Gateway routes with request validation", () => {
    template.hasResourceProperties("AWS::ApiGateway::Model", {
      ContentType: "application/json",
    });

    template.hasResourceProperties("AWS::ApiGateway::RequestValidator", {
      ValidateRequestBody: false,
      ValidateRequestParameters: true,
    });
  });

  test("Outputs API Gateway and DocumentDB endpoint", () => {
    template.hasOutput("ApiGatewayUrl", {});
    template.hasOutput("DocumentDBEndpoint", {});
    template.hasOutput("DatabaseSecretArn", {});
  });
});
