import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { 
  buildDockTransaction,
  calculateStrategyHash,
  USDC_ADDRESS,
  SIMPLE_AQUA_APP_ADDRESS
} from '@/lib/constants';
import type { AquaStrategy } from '@/lib/aqua';

export function useWithdraw() {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Get the Privy embedded wallet (Smart Account)
  const smartAccount = wallets.find((wallet) => wallet.walletClientType === 'privy');

  const withdraw = async (amountUSDC: string) => {
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

      console.log('💸 Withdrawing', amountUSDC, 'USDC from Aqua Protocol');
      console.log('📍 User Address:', smartAccount.address);
      console.log('📍 SimpleAquaApp:', SIMPLE_AQUA_APP_ADDRESS);

      // Create the strategy that was used for deposit
      // This must match the strategy used in the deposit
      const strategy: AquaStrategy = {
        maker: smartAccount.address as `0x${string}`,
        token0: USDC_ADDRESS,
        token1: USDC_ADDRESS, // Same token for simplicity
        feeBps: BigInt(0), // 0% fee
        salt: '0x0000000000000000000000000000000000000000000000000000000000000001'
      };

      // Calculate strategy hash
      const strategyHash = calculateStrategyHash(strategy);
      console.log('🔑 Strategy Hash:', strategyHash);

      // Build dock transaction
      const dockTx = buildDockTransaction(
        SIMPLE_AQUA_APP_ADDRESS as `0x${string}`,
        strategyHash
      );

      console.log('📝 Dock transaction params:', {
        from: smartAccount.address,
        to: dockTx.to,
        data: dockTx.data
      });

      // Estimate gas for the dock transaction
      const gasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          from: smartAccount.address,
          to: dockTx.to,
          data: dockTx.data
        }]
      });

      console.log('⛽ Gas estimate:', gasEstimate);

      // Execute dock transaction
      const withdrawTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: smartAccount.address,
          to: dockTx.to,
          data: dockTx.data,
          gas: gasEstimate
        }]
      });

      console.log('✅ Withdraw transaction sent:', withdrawTxHash);
      console.log('🎉 Funds withdrawn from Aqua Protocol');

      setTxHash(withdrawTxHash as string);
      
      return {
        success: true,
        txHash: withdrawTxHash as string
      };
    } catch (err) {
      console.error('❌ Withdraw error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw. Please try again.';
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
    withdraw,
    isLoading,
    error,
    txHash,
    smartAccount
  };
}

