import { ButtonInteraction } from 'discord.js';
import { buttonHandlers } from '../../../src/handlers/buttonHandlers';
import { getCharacterData } from '../../../src/services/api';
import { listProfessionData } from '../../../src/handlers/builders/professionBuilder';

const mockApiResponse = {
  "_id": "67c1adbafbd6a923155d172a",
  "character_realm": "testcharacter#testrealm",
  "character_name": "testcharacter",
  "khaz_algar_professions": []
};

jest.mock('../../../src/services/api', () => ({
  getCharacterData: jest.fn(() => mockApiResponse)
}));
jest.mock('../../../src/handlers/builders/professionBuilder', () => ({
  listProfessionData: jest.fn()
}));

describe('Button Interaction Handler', () => {
  it('should reply with a message when customId is multi', async () => {
    const mockInteraction = {
      customId: 'multi#select_testcharacter_testrealm',
      reply: jest.fn(),
      deferReply: jest.fn(),
      deferUpdate: jest.fn(),
      update: jest.fn(),
    } as unknown as ButtonInteraction;

    // Call the handler with the mock interaction
    await buttonHandlers.multi(mockInteraction, mockInteraction.customId);

    // Assert that the reply method was called
    expect(getCharacterData).toHaveBeenCalledWith("testcharacter", "testrealm");
    expect(mockInteraction.deferUpdate).toHaveBeenCalledWith();
    expect(listProfessionData).toHaveBeenCalledWith(mockApiResponse, mockInteraction)
  });

  it('should request next recipe page if pagination#more', async () => {
    const mockInteraction = {
      customId: 'pagination#more_testcharacter_testrealm_2',
      reply: jest.fn(),
      deferReply: jest.fn(),
      deferUpdate: jest.fn(),
      update: jest.fn(),
    } as unknown as ButtonInteraction;

    // Call the handler with the mock interaction
    await buttonHandlers.pagination(mockInteraction, mockInteraction.customId);
    expect(getCharacterData).toHaveBeenCalledWith("testcharacter", "testrealm");
    expect(mockInteraction.deferUpdate).toHaveBeenCalledWith();
    expect(listProfessionData).toHaveBeenCalledWith(mockApiResponse, mockInteraction, 2)
  });

  it('should request next recipe page if pagination#back', async () => {
    const mockInteraction = {
      customId: 'pagination#back_testcharacter_testrealm_1',
      reply: jest.fn(),
      deferReply: jest.fn(),
      deferUpdate: jest.fn(),
      update: jest.fn(),
    } as unknown as ButtonInteraction;

    // Call the handler with the mock interaction
    await buttonHandlers.pagination(mockInteraction, mockInteraction.customId);

    expect(getCharacterData).toHaveBeenCalledWith("testcharacter", "testrealm");
    expect(listProfessionData).toHaveBeenCalledWith(mockApiResponse, mockInteraction, 1)
  });
});
