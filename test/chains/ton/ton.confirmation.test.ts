import { Ton } from '../../../src/chains/ton/ton';
import { ToncenterService } from '../../../src/chains/ton/toncenter-service';

// Mock ConfigManagerV2
jest.mock('../../../src/services/config-manager-v2', () => ({
  ConfigManagerV2: {
    getInstance: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key: string) => {
        // Use short timeout/interval for tests
        if (key.includes('txConfirmationTimeoutSeconds')) return 0.2;
        if (key.includes('txPollIntervalSeconds')) return 0.05;
        if (key.includes('useToncenterActions')) return true;
        return undefined;
      }),
    }),
  },
}));

// Mock TokenService & others to avoid Ton instantiation errors
jest.mock('../../../src/services/token-service', () => ({
  TokenService: {
    getInstance: jest.fn().mockReturnValue({
      loadTokenList: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../../src/services/config-manager-cert-passphrase', () => ({
  ConfigManagerCertPassphrase: {
    readPassphrase: jest.fn().mockReturnValue('pass'),
  },
}));

// Mock ToncenterService
jest.mock('../../../src/chains/ton/toncenter-service');

describe('Ton Transaction Confirmation', () => {
  let ton: Ton;
  let mockRpcProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (Ton as any)._instances = {};
    ton = Ton.getInstance('mainnet');
    mockRpcProvider = ton.rpcProvider;
  });

  it('should confirm success using actions', async () => {
    mockRpcProvider.actionsByMessage.mockResolvedValue([
      { status: 'ok', type: 'JettonTransfer' }
    ]);

    const result = await ton.waitForTransactionConfirmation('hash-success');
    expect(result.confirmed).toBe(true);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should confirm failure using actions', async () => {
    mockRpcProvider.actionsByMessage.mockResolvedValue([
      { status: 'failed', type: 'JettonTransfer' }
    ]);

    const result = await ton.waitForTransactionConfirmation('hash-fail');
    expect(result.confirmed).toBe(true);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(-1);
  });

  it('should fallback to transaction if actions return empty', async () => {
    mockRpcProvider.actionsByMessage.mockResolvedValue([]);
    mockRpcProvider.transactionsByMessage.mockResolvedValue([
      {
        description: {
          compute_ph: { exit_code: 0 },
          action_ph: { result_code: 0 }
        }
      }
    ]);

    const result = await ton.waitForTransactionConfirmation('hash-tx-fallback');
    expect(result.confirmed).toBe(true);
    expect(result.success).toBe(true);
  });

  it('should report failure if transaction compute phase failed', async () => {
    mockRpcProvider.actionsByMessage.mockResolvedValue([]);
    mockRpcProvider.transactionsByMessage.mockResolvedValue([
      {
        description: {
          compute_ph: { exit_code: 101 }, // Error
        }
      }
    ]);

    const result = await ton.waitForTransactionConfirmation('hash-tx-fail');
    expect(result.confirmed).toBe(true);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(101);
  });

  it('should timeout and return unconfirmed', async () => {
    mockRpcProvider.actionsByMessage.mockResolvedValue([]);
    mockRpcProvider.transactionsByMessage.mockResolvedValue([]);

    const result = await ton.waitForTransactionConfirmation('hash-timeout');
    expect(result.confirmed).toBe(false);
    expect(result.success).toBe(false);
  });
});
