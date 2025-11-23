/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPrivyAccount, EILService } from '@/lib/eil';
import type { WalletClient, Address } from 'viem';

// Mock the SDK to avoid real network calls, but we want to inspect the adapter passed to it
jest.mock('@eil-protocol/sdk', () => {
  return {
    CrossChainSdk: jest.fn().mockImplementation(() => ({
      createToken: jest.fn().mockReturnValue({}),
      createBuilder: jest.fn().mockReturnValue({
        useAccount: jest.fn().mockReturnThis(),
        startBatch: jest.fn().mockReturnThis(),
        addVoucherRequest: jest.fn().mockReturnThis(),
        endBatch: jest.fn().mockReturnThis(),
        useVoucher: jest.fn().mockReturnThis(),
        buildAndSign: jest.fn().mockResolvedValue({
          execute: jest.fn().mockImplementation(async (cb) => {
            // Simulate the SDK flow
            cb({ type: 'source_tx_sent' });
            return { transactionHash: '0xmock_tx_hash' };
          })
        }),
      }),
    })),
    getUserOpHash: jest.fn().mockReturnValue('0xhash'),
  };
});

function fakeWalletClient(): WalletClient {
  return {
    signUserOperation: undefined, // Force manual signing
    signMessage: jest.fn().mockResolvedValue('0xsigned'),
  } as unknown as WalletClient;
}

describe('EIL Debugging', () => {
  const address = '0x1234567890abcdef1234567890abcdef12345678' as Address;
  const walletClient = fakeWalletClient();

  test('Adapter has sendUserOperation and it returns 0x placeholder', async () => {
    const account = createPrivyAccount(walletClient, address);
    
    expect(account.sendUserOperation).toBeDefined();
    
    const result = await account.sendUserOperation({} as any);
    expect(result).toBe('0x');
    
    // This confirms that if the SDK calls this, it gets '0x'.
    // If the SDK expects a real hash, this is the bug.
  });

  test('Adapter signUserOps performs sequential signing', async () => {
    const account = createPrivyAccount(walletClient, address);
    const ops = [{ sender: address }, { sender: address }];
    
    const signedOps = await account.signUserOps(ops);
    
    expect(signedOps).toHaveLength(2);
    expect(walletClient.signMessage).toHaveBeenCalledTimes(2);
  });
});
