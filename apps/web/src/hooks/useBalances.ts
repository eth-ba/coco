import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { formatUnits, parseAbi } from 'viem';
import { publicClients } from '@/lib/chains';

import { base, arbitrum, optimism } from 'viem/chains';

// USDC addresses on different chains
const USDC_ADDRESSES: Record<number, string> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf992cL9d187800', // Placeholder
};

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export interface ChainBalance {
  chainId: number;
  balance: string;
  symbol: string;
  rawBalance: bigint;
}

export function useBalances() {
  const { wallets } = useWallets();
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the Privy embedded wallet (Smart Account)
  const smartAccount = wallets.find((wallet) => wallet.walletClientType === 'privy');

  const fetchBalances = useCallback(async () => {
    if (!smartAccount?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      const balancePromises = Object.entries(publicClients).map(async ([chainIdStr, client]) => {
        const chainId = parseInt(chainIdStr);
        const usdcAddress = USDC_ADDRESSES[chainId];
        
        if (!usdcAddress) return null;

        try {
          const balance = await client.readContract({
            address: usdcAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [smartAccount.address as `0x${string}`],
          });

          return {
            chainId,
            balance: formatUnits(balance, 6), // USDC has 6 decimals
            symbol: 'USDC',
            rawBalance: balance,
          };
        } catch (err) {
          console.warn(`Failed to fetch balance for chain ${chainId}`, err);
          return {
            chainId,
            balance: '0',
            symbol: 'USDC',
            rawBalance: BigInt(0),
          };
        }
      });

      const results = await Promise.all(balancePromises);
      const validBalances = results.filter((b): b is ChainBalance => b !== null);
      
      setBalances(validBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [smartAccount?.address]);

  useEffect(() => {
    fetchBalances();
    // Poll every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    balances,
    isLoading,
    error,
    refetch: fetchBalances,
  };
}
