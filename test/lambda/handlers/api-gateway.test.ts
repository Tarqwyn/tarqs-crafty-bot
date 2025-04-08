import { APIGatewayEvent } from "aws-lambda";
import { handleApiGateway } from "../../../lambda/handlers/api-gateway";
import * as apiHandlers from  "../../../lambda/handlers/api-handlers";
import { cleanCharacterName } from "../../../lambda/services/utils";
const createEvent = require("aws-event-mocks");

// Mocking external dependencies
jest.mock("../../../lambda/handlers/api-handlers", () => ({
    fetchCharacterFromDB: jest.fn(),
    fetchCraftersForRecipe: jest.fn(),
  }));
  
  jest.mock("../../../lambda/services/utils", () => ({
    cleanCharacterName: jest.fn(),
  }));
  
  describe("handleApiGateway", () => {
    const baseMockEvent = createEvent({
      template: "aws:apiGateway",
      httpMethod: "GET",
      path: "/path",
      resource: "/resource",
    });
  
    it("should return a successful response for a valid character lookup with realm", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { name: "characterName", realm: "realmName" },
      };
  
      (apiHandlers.fetchCharacterFromDB as jest.Mock).mockResolvedValueOnce([
        { character_name: "characterName", realm: "realmName", level: 50 },
      ]);
      (cleanCharacterName as jest.Mock).mockReturnValueOnce("cleanedCharacterName");
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain("characterName");
      expect(result.body).toContain("realmName");
    });
  
    it("should return 400 if character name is missing", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { realm: "realmName" },
      };
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(400);
      expect(result.body).toContain("Missing character name");
    });
  
    it("should return 404 if character not found in database", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { name: "characterName", realm: "realmName" },
      };
  
      (apiHandlers.fetchCharacterFromDB as jest.Mock).mockResolvedValueOnce(null); // No character data
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(404);
      expect(result.body).toContain("Character not found");
    });
  
    it("should return a successful response when multiple matches are found", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { name: "characterName" },
      };
  
      (apiHandlers.fetchCharacterFromDB as jest.Mock).mockResolvedValueOnce([
        { character_name: "characterName1", realm: "realm1", level: 50 },
        { character_name: "characterName2", realm: "realm2", level: 45 },
      ]);
      (cleanCharacterName as jest.Mock).mockReturnValueOnce("cleanedCharacterName");
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain("Multiple matches found");
      expect(result.body).toContain("characterName1");
      expect(result.body).toContain("characterName2");
    });
  
    it("should return a successful response when a unique character match is found", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { name: "characterName" },
      };
  
      (apiHandlers.fetchCharacterFromDB as jest.Mock).mockResolvedValueOnce([
        { character_name: "characterName", realm: "realmName", level: 50 },
      ]);
      (cleanCharacterName as jest.Mock).mockReturnValueOnce("cleanedCharacterName");
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain("characterName");
    });
  
    it("should return 404 if no crafters are found for a recipe", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { recipe: "recipeName" },
      };
  
      (apiHandlers.fetchCraftersForRecipe as jest.Mock).mockResolvedValueOnce(null); // No crafters found
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(404);
      expect(result.body).toContain("No crafters found for this recipe");
    });
  
    it("should return a successful response when crafters are found for a recipe", async () => {
      const mockEvent: APIGatewayEvent = {
        ...baseMockEvent,
        pathParameters: { recipe: "recipeName" },
      };
  
      (apiHandlers.fetchCraftersForRecipe as jest.Mock).mockResolvedValueOnce([
        { name: "crafter1" },
        { name: "crafter2" },
      ]);
  
      const result = await handleApiGateway(mockEvent);
  
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain("crafters");
      expect(result.body).toContain("crafter1");
      expect(result.body).toContain("crafter2");
    });
  
  });