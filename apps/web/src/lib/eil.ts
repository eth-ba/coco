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
        
        const manuallySignedOps = [];
        for (const op of ops) {
          const userOpHash = getUserOpHash(op);
          console.log('✍️ Signing hash:', userOpHash);
          
          // Sign the hash - note: some wallets might need signMessage(raw: hash)
          const signature = await walletClient.signMessage({ 
            account: address,
            message: { raw: userOpHash } 
          });
          
          console.log('✍️ Signature obtained:', signature);
          manuallySignedOps.push({ ...op, signature });
        }
        
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
    encodeCalls: async (chainId: bigint, calls: Array<unknown>) => {
      console.log('📝 encodeCalls called with chainId:', chainId);
      
      // Import encodeFunctionData from viem
      const { encodeFunctionData } = await import('viem');
      
      if (!calls || calls.length === 0) {
        return '0x' as Hex;
      }
      
      // EIL SDK passes calls in format: {target: MultichainToken/Contract, functionName: string, args: any[]}
      const callArray = calls as Array<{target: any, functionName: string, args: any[]}>;
      
      let destinations: Address[] = [];
      let values: bigint[] = [];
      let datas: Hex[] = [];
      
      for (const call of callArray) {
        try {
          // Log the deployments to understand the structure
          if (call.target?.deployments) {
            const deploymentChains = Array.from(call.target.deployments.keys());
            console.log(`📝 ${call.functionName}: Deployments available on chains:`, deploymentChains);
          }
          
          // Extract the contract address for this chain from the target's deployments Map
          const targetAddress = call.target?.deployments?.get?.(chainId) || 
                               call.target?.deployments?.get?.(Number(chainId)) ||
                               call.target?.address;
          
          if (!targetAddress) {
            console.error('❌ Could not find address for target on chain', chainId, call.target);
            throw new Error(`No deployment found for chain ${chainId}`);
          }
          
          console.log(`📝 Encoding ${call.functionName} on ${targetAddress}`);
          console.log(`📝 Raw args:`, JSON.stringify(call.args, (key, value) => {
            if (value?.deployments instanceof Map) {
              return `[MultichainObject with deployments on chains: ${Array.from(value.deployments.keys())}]`;
            }
            return typeof value === 'bigint' ? value.toString() : value;
          }, 2));
          
          // Recursively resolve any args that are MultichainToken/Contract objects to their addresses on this chain
          const resolveArg = (arg: any): any => {
            // If arg has deployments Map, it's a multichain object - get its address for this chain
            if (arg?.deployments?.get) {
              const resolvedAddr = arg.deployments.get(chainId) || arg.deployments.get(Number(chainId));
              console.log(`  📝 Resolved multichain arg to:`, resolvedAddr);
              return resolvedAddr;
            }
            // If arg is an array, recursively resolve each element
            if (Array.isArray(arg)) {
              return arg.map(resolveArg);
            }
            // If arg is an object (but not null), recursively resolve its properties
            if (arg && typeof arg === 'object' && arg.constructor === Object) {
              const resolved: any = {};
              for (const [key, value] of Object.entries(arg)) {
                resolved[key] = resolveArg(value);
              }
              return resolved;
            }
            return arg;
          };
          
          const resolvedArgs = call.args.map(resolveArg);
          
          // Convert numeric strings to BigInt for proper ABI encoding
          const convertNumericStrings = (value: any): any => {
            // If it's a string that looks like a number, convert to BigInt
            if (typeof value === 'string' && /^\d+$/.test(value)) {
              return BigInt(value);
            }
            // Recursively convert arrays
            if (Array.isArray(value)) {
              return value.map(convertNumericStrings);
            }
            // Recursively convert objects
            if (value && typeof value === 'object' && value.constructor === Object) {
              const converted: any = {};
              for (const [key, val] of Object.entries(value)) {
                converted[key] = convertNumericStrings(val);
              }
              return converted;
            }
            return value;
          };
          
          const finalArgs = resolvedArgs.map(convertNumericStrings);
          
          console.log(`📝 Resolved args:`, JSON.stringify(finalArgs, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value, 2));
          
          // Encode the function call
          const callData = encodeFunctionData({
            abi: call.target.abi,
            functionName: call.functionName,
            args: finalArgs
          });
          
          console.log(`📝 Encoded data:`, callData);
          
          destinations.push(targetAddress);
          values.push(BigInt(0)); // No ETH value for ERC20 calls
          datas.push(callData);
        } catch (error) {
          console.error('❌ Error encoding call:', error, call);
          throw error;
        }
      }
      
      console.log('📝 Final batch:', {
        destinations,
        values: values.map(v => v.toString()),
        datas
      });
      
      // Encode as executeBatch call
      const encoded = encodeFunctionData({
        abi: [{
          name: 'executeBatch',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'dest', type: 'address[]' },
            { name: 'value', type: 'uint256[]' },
            { name: 'func', type: 'bytes[]' }
          ],
          outputs: []
        }],
        functionName: 'executeBatch',
        args: [destinations, values, datas]
      });
      
      console.log('📝 Final encoded calls:', encoded);
      return encoded;
    },
    encodeStaticCalls: async (chainId: bigint, calls: Array<unknown>) => '0x' as Hex,
    
    /**
     * Broadcast the UserOperation to the network via the EntryPoint contract.
     * Since we don't have a bundler, we act as the bundler by calling handleOps directly.
     */
    sendUserOperation: async (userOp: any) => {
      console.log('🚀 sendUserOperation called with:', userOp);
      
      try {
        // Get the chain ID from the UserOp
        const chainId = Number(userOp.chainId);
        
        // Use EIL's Tenderly virtualnet bundler
        const bundlerUrl = `https://vnet.erc4337.io/bundler/${chainId}`;
        console.log('📡 Submitting to bundler:', bundlerUrl);
        
        // Format the UserOp for the bundler (v0.7 format)
        const formattedOp = {
          sender: userOp.sender,
          nonce: `0x${BigInt(userOp.nonce).toString(16)}`,
          callData: userOp.callData || '0x',
          signature: userOp.signature || '0x',
          initCode: userOp.initCode || '0x',
          paymasterAndData: userOp.paymasterAndData || '0x',
          // Pack gas limits for v0.7
          accountGasLimits: (() => {
            const verificationGasLimit = BigInt(userOp.verificationGasLimit || 0);
            const callGasLimit = BigInt(userOp.callGasLimit || 0);
            const packed = (verificationGasLimit << BigInt(128)) | callGasLimit;
            return `0x${packed.toString(16).padStart(64, '0')}`;
          })(),
          preVerificationGas: `0x${BigInt(userOp.preVerificationGas || 0).toString(16)}`,
          // Pack gas fees for v0.7
          gasFees: (() => {
            const maxPriorityFeePerGas = BigInt(userOp.maxPriorityFeePerGas || 0);
            const maxFeePerGas = BigInt(userOp.maxFeePerGas || 0);
            const packed = (maxPriorityFeePerGas << BigInt(128)) | maxFeePerGas;
            return `0x${packed.toString(16).padStart(64, '0')}`;
          })()
        };

        console.log('📦 Formatted UserOp:', formattedOp);

        // Submit to bundler via RPC
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_sendUserOperation',
            params: [
              formattedOp,
              userOp.entryPointAddress || '0x0000000071727De22E5E9d8baF0edAc6f37da032'
            ]
          })
        });

        const result = await response.json();
        
        if (result.error) {
          console.error('❌ Bundler error:', result.error);
          throw new Error(`Bundler error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        const userOpHash = result.result;
        console.log('✅ UserOperation submitted! Hash:', userOpHash);
        
        // Return the userOpHash (the bundler will handle the actual tx submission)
        return userOpHash as Hex;
      } catch (error) {
        console.error('❌ Failed to send UserOperation:', error);
        throw error;
      }
    },
    
    verifyBundlerConfig: async (_chainId: bigint, _entryPoints: Address) => {},

    // Bundler manager placeholder
    bundlerManager: null,
  };
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
      // 2. Build cross-chain operation with voucher pattern
      statusCallback?.('Building cross-chain operation...');
      
      // Create a plain object adapter to ensure methods are present
      const accountAdapter = {
        ...account, // Spread all methods from the original account (including encodeCalls, etc.)
        getAddress: async () => {
          // Use recipientAddress directly to avoid potential issues with account object
          return recipientAddress as Address;
        },
        getOwnerAddress: async () => recipientAddress as Address,
        getAccount: function () { return this; },
      };

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
