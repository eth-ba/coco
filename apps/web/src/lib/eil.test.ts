/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPrivyAccount, EILService } from '@/lib/eil';
import type { WalletClient, Address } from 'viem';

// ----- Mock the CrossChainSdk -----
jest.mock('@eil-protocol/sdk', () => {
  const mockExecute = jest.fn().mockResolvedValue({
    transactionHash: '0xdeadbeef',
  });

  const mockBuilder = {
    useAccount: jest.fn().mockReturnThis(),
    startBatch: jest.fn().mockReturnThis(),
    addVoucherRequest: jest.fn().mockReturnThis(),
    endBatch: jest.fn().mockReturnThis(),
    useVoucher: jest.fn().mockReturnThis(),
    buildAndSign: jest.fn().mockResolvedValue({ execute: mockExecute }),
  };

  const mockSdk = {
    createBuilder: jest.fn().mockReturnValue(mockBuilder),
    createToken: jest.fn().mockReturnValue({ name: 'USDC' }),
  };

  return {
    CrossChainSdk: jest.fn(() => mockSdk),
  };
});

// ----- Helper: a minimal fake WalletClient -----
function fakeWalletClient(): WalletClient {
  return {
    // The real WalletClient has many fields; we only need the ones we use.
    // @ts-ignore – we deliberately keep it minimal for the test.
    signUserOperation: jest.fn().mockResolvedValue('0xsigned'),
  } as unknown as WalletClient;
}

// ----- Test suite -----
describe('EIL integration – account adapter', () => {
  const address = '0x1234567890abcdef1234567890abcdef12345678' as Address;
  const walletClient = fakeWalletClient();

  test('createPrivyAccount returns a full EIP‑5792 compatible object', () => {
    const account = createPrivyAccount(walletClient, address);
    expect(account).toBeDefined();
    // Required methods
    expect(typeof account.getAddress).toBe('function');
    expect(typeof account.getAccount).toBe('function');
    expect(typeof account.signUserOps).toBe('function');
    // Verify that getAddress resolves to the supplied address
    return account.getAddress().then((addr: Address) => {
      expect(addr).toBe(address);
    });
  });

  test('EILService.createAndExecuteBridge works with a valid account', async () => {
    const eilService = new EILService();
    const account = createPrivyAccount(walletClient, address);

    const txHash = await eilService.createAndExecuteBridge(
      8453, // sourceChainId
      42161, // destinationChainId
      BigInt(1_000_000), // amountInUnits (6‑decimals USDC)
      address, // recipientAddress
      account, // the smart‑account adapter
      (status) => {
        // optional status callback – we just ignore in the test
      }
    );

    expect(txHash).toBe('0xdeadbeef');
  });

  test('EILService.createAndExecuteBridge throws when account is undefined', async () => {
    const eilService = new EILService();
    await expect(
      eilService.createAndExecuteBridge(
        8453,
        42161,
        BigInt(1_000_000),
        address,
        undefined as any,
        undefined
      )
    ).rejects.toThrow('Account adapter is undefined');
  });
});
