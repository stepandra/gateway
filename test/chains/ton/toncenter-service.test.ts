import axios from 'axios';
import { ToncenterService } from '../../../src/chains/ton/toncenter-service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ToncenterService', () => {
  let service: ToncenterService;
  const apiKey = 'test-api-key';
  const baseUrl = 'https://toncenter.com';
  
  // Create a mock instance for the axios client created inside the service
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // When axios.create is called, return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    service = new ToncenterService(baseUrl, apiKey);
  });

  describe('sendMessage', () => {
    it('should send a BOC and return the message hash', async () => {
      const boc = 'test-boc-base64';
      const expectedResponse = {
        '@type': 'ok',
        '@extra': '12345',
        result: {
          '@type': 'raw.extMessageInfo',
          hash: 'msg-hash',
          hash_norm: 'msg-hash-norm',
        },
      };

      // Mock the post method on the instance
      mockAxiosInstance.post.mockResolvedValue({ data: expectedResponse });

      const result = await service.sendMessage(boc);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v3/message',
        { boc }
      );
      expect(result).toEqual({
        message_hash: 'msg-hash',
        message_hash_norm: 'msg-hash-norm',
      });
    });

    it('should throw an error if the API returns an error', async () => {
      const boc = 'test-boc-base64';
      const errorResponse = {
        response: {
          data: {
            error: 'Some error',
          },
          status: 400,
        },
      };

      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      await expect(service.sendMessage(boc)).rejects.toThrow();
    });
  });

  describe('transactionsByMessage', () => {
    it('should fetch transactions by message hash', async () => {
      const msgHash = 'test-msg-hash';
      const expectedResponse = {
        transactions: [
          {
            account: 'addr1',
            hash: 'tx-hash',
            lt: '12345',
            now: 1678900000,
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: expectedResponse });

      const result = await service.transactionsByMessage(msgHash);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v3/transactionsByMessage',
        {
          params: { msg_hash: msgHash, direction: 'in', limit: 1, offset: 0 },
        }
      );
      expect(result).toEqual(expectedResponse.transactions);
    });

    it('should return empty array if no transactions found', async () => {
      const msgHash = 'test-msg-hash';
      const expectedResponse = { transactions: [] };

      mockAxiosInstance.get.mockResolvedValue({ data: expectedResponse });

      const result = await service.transactionsByMessage(msgHash);

      expect(result).toEqual([]);
    });
  });
});
