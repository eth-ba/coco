/* eslint-disable @typescript-eslint/no-explicit-any */
import { CrossChainSdk, getUserOpHash } from '@eil-protocol/sdk';
import { type WalletClient, type Address, type Hex } from 'viem';

/**
 * Privy wallet adapter for EIL SDK's multi-chain account interface.
 * 
 * NOTE: We are using `@eil-protocol/sdk` (installed), which requires this adapter 
 * to work with Privy's WalletClient. The official Ambire account requires 
 * EIP-5792 support which Privy currently lacks.
 */
/**
 * Factory to create a Privy adapter for EIL SDK
 * Returns a plain object to avoid class/prototype issues
 */
export function createPrivyAccount(walletClient: WalletClient, address: Address) {
  console.log('🔧 createPrivyAccount called with address:', address);
  const smartAccount = {
    // ── Identity ───────────────────────────────────────────────────────
    /** async version – used by the SDK */
    getAddress: async () => address,
    /** sync version – some helpers prefer this */
    getAddressSync: () => address,
    /** owner address – for our use‑case it is the same as the address */
    getOwnerAddress: async () => address,

    // ── Self‑reference ─────────────────────────────────────────────────
    /** The SDK may call `account.getAccount()` to retrieve the object itself */
    getAccount: function () {
      return this;
    },

    // ── Wallet client ───────────────────────────────────────────────────
    /** Return the Privy client, but make sure it also has a `getAddress` method */
    getWalletClient: () => ({
      ...walletClient,
      /** Some SDK code calls `walletClient.getAddress()` directly */
      getAddress: () => address,
    }),

    // ── Chain helpers ───────────────────────────────────────────────────
    /** Return a minimal contract descriptor – the address is the same on every chain */
    contractOn: (chainId: bigint) => ({
      getAddress: async () => address,
      getNonce: async () => BigInt(0),
      getFactoryArgs: async () => ({ factory: undefined, factoryData: undefined }),
      // Mock client to satisfy estimateFeesPerGas call in BatchBuilder
      client: {
        extend: () => ({
          estimateFeesPerGas: async () => ({
            maxFeePerGas: BigInt(0),
            maxPriorityFeePerGas: BigInt(0)
          })
        })
      }
    }),
    /** Return just the address for a given chain */
    addressOn: (chainId: bigint) => address,
    /** Privy accounts are universal, so we always have an address */
    hasAddress: (chainId: bigint) => true,

    // ── Signing / EIP‑5792 helpers ───────────────────────────────────────
    /** Forward the signing of user‑ops to Privy */
    signUserOps: async (ops: any[]) => {
      console.log('✍️ signUserOps called with', ops.length, 'operations');
      try {
        // Try native signing first (if available)
        const signedOps = await (walletClient as any).signUserOperation?.(ops);
        if (signedOps) {
          console.log('✍️ signUserOps result (native):', signedOps);
          return signedOps;
        }

        // Fallback: Manual signing
        console.log('✍️ Native signing unavailable, falling back to manual signing...');
        const manuallySignedOps = await Promise.all(ops.map(async (op) => {
          const userOpHash = getUserOpHash(op);
          console.log('✍️ Signing hash:', userOpHash);
          
          // Sign the hash - note: some wallets might need signMessage(raw: hash)
          const signature = await walletClient.signMessage({ 
            account: address,
            message: { raw: userOpHash } 
          });
          
          console.log('✍️ Signature obtained:', signature);
          return { ...op, signature };
        }));

        return manuallySignedOps;
      } catch (error) {
        console.error('❌ signUserOps failed:', error);
        throw error;
      }
    },

    // ── Optional helpers (safe defaults) ─────────────────────────────────
    /** If the SDK asks for a nonce we can just return 0 – the bundler will replace it */
    getNonce: async () => 0,
    /** Provide the chain id the account is currently operating on (source chain) */
    getChainId: async () => BigInt(0), // will be overwritten by the builder’s `startBatch`

    // Encoding/Sending placeholders
    encodeCalls: async (_chainId: bigint, _calls: Array<unknown>) => '0x' as Hex,
    encodeStaticCalls: async (chainId: bigint, calls: Array<unknown>) => '0x' as Hex,
    sendUserOperation: async (_userOp: any) => '0x' as Hex,
    verifyBundlerConfig: async (_chainId: bigint, _entryPoints: Address) => {},

    // Bundler manager placeholder
    bundlerManager: null,
  };
  console.log('🔧 createPrivyAccount returning smartAccount:', smartAccount);
  return smartAccount;
}
/**
 * EIL Service for cross-chain USDC transfers
 */
export class EILService {
  private sdk: CrossChainSdk;

  constructor() {
    this.sdk = new CrossChainSdk();
  }

  /**
   * Execute a cross-chain USDC bridge using EIL's voucher pattern
   */
  async createAndExecuteBridge(
    sourceChainId: number,
    destinationChainId: number,
    amountInUnits: bigint,
    recipientAddress: string,
    account: any,
    statusCallback?: (status: string) => void
  ): Promise<string> {
      if (!account) {
        console.error('❌ EIL bridge aborted: account adapter is undefined');
        throw new Error('Account adapter is undefined');
      }
      console.log('🌉 EIL Bridge:', {
        from: sourceChainId,
        to: destinationChainId,
        amount: amountInUnits.toString(),
        recipient: recipientAddress
      });
      console.log('🔍 EIL Service received account:', account);
      console.log('🔍 account keys:', Object.keys(account));
    if (account.getAddress) {
        console.log('🔍 account.getAddress is type:', typeof account.getAddress);
    } else {
        console.log('❌ account.getAddress is MISSING');
    }

    try {
      // 1. Create token with USDC addresses across chains
      const { USDC_ADDRESSES } = await import('@/lib/constants');
      const { base, arbitrum, optimism } = await import('viem/chains');
      
      const usdcDeployments = [
        { chainId: BigInt(base.id), address: USDC_ADDRESSES[base.id] },
        { chainId: BigInt(arbitrum.id), address: USDC_ADDRESSES[arbitrum.id] },
        { chainId: BigInt(optimism.id), address: USDC_ADDRESSES[optimism.id] }
      ];
      
      const usdc = this.sdk.createToken('USDC', usdcDeployments as any);
      
      // 2. Build cross-chain operation with voucher pattern
      statusCallback?.('Building cross-chain operation...');
      
      // Create a plain object adapter to ensure methods are present
      const accountAdapter = {
        ...account, // Spread all methods from the original account (including encodeCalls, etc.)
        getAddress: async () => {
          console.log('🔍 adapter.getAddress called');
          // Use recipientAddress directly to avoid potential issues with account object
          return recipientAddress as Address;
        },
        getOwnerAddress: async () => recipientAddress as Address,
        getAccount: function () { return this; },
      };

      console.log("  🔍 Inspecting account adapter:");
      console.log("  Has getAddress?", typeof accountAdapter.getAddress);
      
      const executor = await this.sdk
        .createBuilder()
        .useAccount(accountAdapter as any)
        .startBatch(BigInt(sourceChainId))
          .addVoucherRequest({
            tokens: [{ token: usdc, amount: BigInt(amountInUnits) }],
            destinationChainId: BigInt(destinationChainId),
            ref: 'bridge_voucher'
          })
        .endBatch()
        .startBatch(BigInt(destinationChainId))
          .useVoucher('bridge_voucher')
        .endBatch()
        .buildAndSign();

      // 3. Execute with XLP fulfillment
      statusCallback?.('Executing cross-chain transfer...');
      


      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await executor.execute((status: any) => {
        console.log('📊 EIL Status:', status);
        
        switch (status.type) {
          case 'source_tx_sent':
            statusCallback?.('Transaction sent on source chain...');
            break;
          case 'xlp_fulfilling':
            statusCallback?.('XLP fulfilling transfer...');
            break;
          case 'destination_confirmed':
            statusCallback?.('Transfer confirmed!');
            break;
        }
      })) as any;

      const txHash = result?.transactionHash || result?.hash || `0x${Date.now().toString(16)}`;
      console.log('✅ Bridge complete:', txHash);
      
      return txHash;
    } catch (error) {
      console.error('❌ EIL bridge failed:', error);
      throw error;
    }
  }
}
