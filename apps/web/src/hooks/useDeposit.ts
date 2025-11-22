import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits, encodeFunctionData } from 'viem';
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
      // Get the Ethereum provider from the wallet
      const provider = await smartAccount.getEthereumProvider();
      
      // Parse amount to smallest unit (USDC has 6 decimals)
      const amount = parseUnits(amountUSDC, 6);

      console.log('💰 Depositing', amountUSDC, 'USDC via YieldAutomator');
      console.log('📍 YieldAutomator:', YIELD_AUTOMATOR_ADDRESS);
      console.log('📊 Strategy:', SIMPLE_VAULT_STRATEGY);

      // Step 1: Approve USDC to YieldAutomator contract
      console.log('Step 1/2: Approving USDC to YieldAutomator...');
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [YIELD_AUTOMATOR_ADDRESS as `0x${string}`, amount]
      });

      // Estimate gas for approval
      const approveGasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          from: smartAccount.address,
          to: USDC_ADDRESS,
          data: approveData
        }]
      });

      console.log('⛽ Approval gas estimate:', approveGasEstimate);
      
      const approveTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: smartAccount.address,
          to: USDC_ADDRESS,
          data: approveData,
          gas: approveGasEstimate
        }]
      });

      console.log('✅ Approval transaction sent:', approveTxHash);

      // Wait for approval to be mined (wait for receipt)
      console.log('⏳ Waiting for approval to be confirmed...');
      let approvalConfirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      
      while (!approvalConfirmed && attempts < maxAttempts) {
        try {
          const receipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [approveTxHash]
          });
          
          if (receipt && receipt.status === '0x1') {
            approvalConfirmed = true;
            console.log('✅ Approval confirmed in block:', receipt.blockNumber);
          } else if (receipt && receipt.status === '0x0') {
            throw new Error('Approval transaction failed');
          } else {
            // Not mined yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        } catch (err) {
          if (attempts >= maxAttempts - 1) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      if (!approvalConfirmed) {
        throw new Error('Approval transaction timeout - please try again');
      }

      // Step 2: Call YieldAutomator.deposit()
      console.log('Step 2/2: Calling YieldAutomator.deposit()...');
      const depositData = encodeFunctionData({
        abi: yieldAutomatorAbi,
        functionName: 'deposit',
        args: [amount, BigInt(SIMPLE_VAULT_STRATEGY)]
      });

      console.log('📝 Deposit transaction params:', {
        from: smartAccount.address,
        to: YIELD_AUTOMATOR_ADDRESS,
        data: depositData,
        amount: amount.toString(),
        strategyIndex: SIMPLE_VAULT_STRATEGY
      });

      // Estimate gas for the deposit transaction
      const gasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          from: smartAccount.address,
          to: YIELD_AUTOMATOR_ADDRESS,
          data: depositData
        }]
      });

      console.log('⛽ Gas estimate:', gasEstimate);

      const depositTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: smartAccount.address,
          to: YIELD_AUTOMATOR_ADDRESS,
          data: depositData,
          gas: gasEstimate
        }]
      });

      console.log('✅ Deposit transaction sent:', depositTxHash);
      console.log('🎉 Funds deposited to strategy', SIMPLE_VAULT_STRATEGY);

      setTxHash(depositTxHash as string);
      
      return {
        success: true,
        txHash: depositTxHash as string,
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

