import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseUnits } from 'viem';
import { 
  buildShipTransaction, 
  encodeApproveUSDC, 
  AQUA_CONTRACT, 
  USDC_ADDRESS 
} from '@/lib/aqua';

// Placeholder app address - will need to be replaced with actual Aqua app
const AQUA_APP_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useDeposit() {
  const { user } = usePrivy();
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
      // Parse amount to smallest unit (USDC has 6 decimals)
      const amount = parseUnits(amountUSDC, 6);

      // Step 1: Approve USDC to Aqua contract
      console.log('Step 1: Approving USDC...');
      const approveData = encodeApproveUSDC(amount);
      
      const approveTx = await smartAccount.sendTransaction({
        to: USDC_ADDRESS,
        data: approveData,
        value: BigInt(0)
      });

      console.log('Approval transaction sent:', approveTx);

      // Wait a bit for approval to be mined (in production, wait for receipt)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Ship liquidity to Aqua
      console.log('Step 2: Shipping liquidity to Aqua...');
      const shipTx = buildShipTransaction(
        smartAccount.address as `0x${string}`,
        amount,
        AQUA_APP_ADDRESS
      );

      const shipResult = await smartAccount.sendTransaction({
        to: shipTx.to as `0x${string}`,
        data: shipTx.data as `0x${string}`,
        value: shipTx.value
      });

      console.log('Ship transaction sent:', shipResult);
      console.log('Strategy hash:', shipTx.strategyHash);

      setTxHash(shipResult.hash || shipResult.transactionHash || 'unknown');
      
      return {
        success: true,
        txHash: shipResult.hash || shipResult.transactionHash,
        strategyHash: shipTx.strategyHash
      };
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit. Please try again.');
      return {
        success: false,
        error: err.message
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

