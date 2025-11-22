import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits, createWalletClient, http, createPublicClient } from 'viem';
import { customBase } from '@/lib/chains';
import { 
  YIELD_AUTOMATOR_ADDRESS,
  USDC_ADDRESS,
  SIMPLE_VAULT_STRATEGY
} from '@/lib/constants';

// ERC20 ABI for approve function
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

// YieldAutomator ABI for deposit function
const yieldAutomatorAbi = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'strategyIndex', type: 'uint256' }
    ],
    outputs: []
  }
] as const;

export function useDeposit() {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get the Privy embedded wallet (Smart Account)
  const smartAccount = wallets.find((wallet) => wallet.walletClientType === 'privy');

  const deposit = async (amountUSDC: string) => {
    if (!smartAccount) {
      setError('No smart account found. Please log in.');
      return;
    }

    if (!smartAccount.address) {
      setError('Smart account address not available.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Create wallet client using custom Tenderly RPC
      const customRpcUrl = customBase.rpcUrls.default.http[0];
      
      const walletClient = createWalletClient({
        account: smartAccount.address as `0x${string}`,
        chain: customBase,
        transport: http(customRpcUrl) // Use Tenderly fork RPC
      });

      const publicClient = createPublicClient({
        chain: customBase,
        transport: http(customRpcUrl)
      });
      
      // Parse amount to smallest unit (USDC has 6 decimals)
      const amount = parseUnits(amountUSDC, 6);

      console.log('💰 Depositing', amountUSDC, 'USDC via YieldAutomator');
      console.log('📍 YieldAutomator:', YIELD_AUTOMATOR_ADDRESS);
      console.log('📊 Strategy:', SIMPLE_VAULT_STRATEGY);
      console.log('🌐 Using RPC:', customRpcUrl);

      // Step 1: Approve USDC to YieldAutomator contract
      console.log('Step 1/2: Approving USDC to YieldAutomator...');
      
      const approveTxHash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [YIELD_AUTOMATOR_ADDRESS as `0x${string}`, amount]
      });

      console.log('✅ Approval transaction sent:', approveTxHash);

      // Wait for approval to be mined
      console.log('⏳ Waiting for approval to be confirmed...');
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTxHash,
        timeout: 30_000 // 30 seconds
      });

      if (approvalReceipt.status !== 'success') {
        throw new Error('Approval transaction failed');
      }

      console.log('✅ Approval confirmed in block:', approvalReceipt.blockNumber);

      // Step 2: Call YieldAutomator.deposit()
      console.log('Step 2/2: Calling YieldAutomator.deposit()...');

      const depositTxHash = await walletClient.writeContract({
        address: YIELD_AUTOMATOR_ADDRESS as `0x${string}`,
        abi: yieldAutomatorAbi,
        functionName: 'deposit',
        args: [amount, BigInt(SIMPLE_VAULT_STRATEGY)]
      });

      console.log('✅ Deposit transaction sent:', depositTxHash);
      console.log('🎉 Funds deposited to strategy', SIMPLE_VAULT_STRATEGY);

      setTxHash(depositTxHash);
      
      return {
        success: true,
        txHash: depositTxHash,
        strategy: SIMPLE_VAULT_STRATEGY
      };
    } catch (err) {
      console.error('❌ Deposit error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit. Please try again.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deposit,
    isLoading,
    error,
    txHash,
    smartAccount
  };
}

