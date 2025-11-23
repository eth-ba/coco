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

import { type ConnectedWallet } from '@privy-io/react-auth';

export function useDepositWithAccount(smartAccount?: ConnectedWallet) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

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

      // Step 1: Approve USDC to YieldAutomator contract
      const approveTxHash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [YIELD_AUTOMATOR_ADDRESS as `0x${string}`, amount]
      });

      // Wait for approval to be mined
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTxHash,
        timeout: 30_000 // 30 seconds
      });

      if (approvalReceipt.status !== 'success') {
        throw new Error('Approval transaction failed');
      }

      // Step 2: Call YieldAutomator.deposit()
      const depositTxHash = await walletClient.writeContract({
        address: YIELD_AUTOMATOR_ADDRESS as `0x${string}`,
        abi: yieldAutomatorAbi,
        functionName: 'deposit',
        args: [amount, BigInt(SIMPLE_VAULT_STRATEGY)]
      });

      setTxHash(depositTxHash);
      
      return {
        success: true,
        txHash: depositTxHash,
        strategy: SIMPLE_VAULT_STRATEGY
      };
    } catch (err) {
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

export function useDeposit() {
  const { wallets } = useWallets();
  // Get the Privy embedded wallet (Smart Account)
  const smartAccount = wallets.find((wallet) => wallet.walletClientType === 'privy');
  return useDepositWithAccount(smartAccount);
}

