import { lambdaHandler, LambdaEvent } from "../../lambda/bot"; // Adjust this path
import { getBlizzardToken } from "../../lambda/services/blizzard-api";
import { updateGuildMembers } from "../../lambda/handlers/update-handler";
import { initItemCollection, initSpecialismCollection } from "../../lambda/handlers/item-collection-handler";
import ensureIndexes from "../../lambda/scripts/ensureIndexes";
import { APIGatewayEvent } from "aws-lambda";

// Mocking the required services
jest.mock("../../lambda/services/blizzard-api");
jest.mock("../../lambda/handlers/update-handler");
jest.mock("../../lambda/handlers/item-collection-handler");
jest.mock("../../lambda/scripts/ensureIndexes");

describe("lambdaHandler", () => {
  // Mock API Gateway Event
  const mockEvent: APIGatewayEvent = {
    body: null,
    resource: "",
    path: "",
    httpMethod: "GET",
    headers: {},
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle updateGuild action successfully", async () => {
    const mockAccessToken = "test-access-token";
    const mockResponse = {
      statusCode: 200,
      body: JSON.stringify({ message: "Guild members updated!" }),
    };

    // Mock the service calls
    (getBlizzardToken as jest.Mock).mockResolvedValue(mockAccessToken);
    (updateGuildMembers as jest.Mock).mockResolvedValue({});

    // Correctly typed event with valid action
    const event = { action: "updateGuild" } as { action: "updateGuild" };
    const result = await lambdaHandler(event);

    expect(result).toEqual(mockResponse);
    expect(getBlizzardToken).toHaveBeenCalled();
    expect(updateGuildMembers).toHaveBeenCalledWith("the-asylum", "quelthalas", mockAccessToken);
  });

  it("should handle initItemCollection action successfully", async () => {
    const mockCollection = { total: 10 };
    const mockSpecialism = { total: 5 };
    const mockResponse = {
      statusCode: 200,
      body: JSON.stringify({
        message: "Item & Specialism collections initialized!",
        totalRecipes: mockCollection.total,
        specialisms: mockSpecialism.total,
      }),
    };

    // Mock the service calls
    (initItemCollection as jest.Mock).mockResolvedValue(mockCollection);
    (initSpecialismCollection as jest.Mock).mockResolvedValue(mockSpecialism);

    // Correctly typed event with valid action
    const event = { action: "initItemCollection" } as { action: "initItemCollection" };
    const result = await lambdaHandler(event);

    expect(result).toEqual(mockResponse);
    expect(initItemCollection).toHaveBeenCalled();
    expect(initSpecialismCollection).toHaveBeenCalled();
  });

  it("should handle ensureIndexes action successfully", async () => {
    const mockResponse = {
      statusCode: 200,
      body: JSON.stringify({ message: "Indexes ensured!" }),
    };

    // Mock the service call
    (ensureIndexes as jest.Mock).mockResolvedValue(undefined);

    // Correctly typed event with valid action
    const event = { action: "ensureIndexes" } as { action: "ensureIndexes" };
    const result = await lambdaHandler(event);

    expect(result).toEqual(mockResponse);
    expect(ensureIndexes).toHaveBeenCalled();
  });

  it("should return 400 for invalid action", async () => {
    const event = { action: "invalidAction" } as unknown as LambdaEvent; 
    const result = await lambdaHandler(event);
  
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("Invalid request");
  });

  it("should handle errors within actions", async () => {
    const mockErrorResponse = {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process updateGuild" }),
    };

    // Mock the service call to throw an error
    (getBlizzardToken as jest.Mock).mockRejectedValue(new Error("Token fetch failed"));

    const event = { action: "updateGuild" } as { action: "updateGuild" };
    const result = await lambdaHandler(event);

    expect(result).toEqual(mockErrorResponse);
    expect(console.error).toHaveBeenCalledWith(
      "❌ Error in Lambda execution (updateGuild):",
      "Token fetch failed"
    );
  });

  it("should handle missing action in event", async () => {
    const event = {}; // No action is provided, expecting a 400 response
    const result = await lambdaHandler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("Invalid request");
  });

  it("should handle ApiGatewayEvent", async () => {
    const event = mockEvent; // APIGatewayEvent mock
    const result = await lambdaHandler(event);

    // Mock the handleApiGateway function to test it
    expect(result).toBeDefined(); // Assuming handleApiGateway will return something
  });
});
