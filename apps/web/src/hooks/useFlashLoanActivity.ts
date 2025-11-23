/**
 * Hook to fetch recent flash loan activity for user's positions
 * Shows when others borrow from your liquidity
 */

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { formatUnits, parseAbiItem, keccak256 } from 'viem';
import { FLASH_LOAN_ADDRESS, USDC_ADDRESS } from '@/lib/constants';

export interface LoanActivity {
  id: string;
  borrower: string;
  amount: string; // Formatted USDC amount
  fee: string; // Formatted fee earned
  timestamp: Date;
  transactionHash: string;
  blockNumber: number;
}

export function useFlashLoanActivity(userAddress?: string, limit: number = 10) {
  const { wallets } = useWallets();
  const [activities, setActivities] = useState<LoanActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !wallets.length) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    const fetchActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
        if (!smartAccount) {
          console.log('❌ No smart account found');
          setIsLoading(false);
          return;
        }

        const provider = await smartAccount.getEthereumProvider();

        // Get current block number
        const currentBlock = await provider.request({
          method: 'eth_blockNumber',
          params: [],
        }) as string;
        const currentBlockNum = parseInt(currentBlock, 16);
        
        // Query last 5000 blocks (Arc free tier limit is 10k)
        const fromBlock = Math.max(0, currentBlockNum - 5000);
        const fromBlockHex = `0x${fromBlock.toString(16)}`;

        console.log(`💫 Querying activity from block ${fromBlock} to ${currentBlockNum}`);

        // Get LoanExecuted events where this user is the maker (liquidity provider)
        const loanExecutedEvent = parseAbiItem(
          'event LoanExecuted(address indexed borrower, address indexed maker, address token, uint256 amount, uint256 fee, bytes32 strategyHash)'
        );

        const logs = await provider.request({
          method: 'eth_getLogs',
          params: [
            {
              address: FLASH_LOAN_ADDRESS,
              topics: [
                keccak256(loanExecutedEvent.name),
                null, // any borrower
                `0x000000000000000000000000${userAddress.slice(2)}`, // filter by maker (user)
              ],
              fromBlock: fromBlockHex,
              toBlock: 'latest',
            },
          ],
        }) as any[];

        console.log(`📊 Found ${logs.length} loan executions for user`);

        if (logs.length === 0) {
          setActivities([]);
          setIsLoading(false);
          return;
        }

        // Parse and format loan activities
        const activityPromises = logs.slice(-limit).reverse().map(async (log) => {
          // Parse event data
          // Event data structure: [token (32 bytes), amount (32 bytes), fee (32 bytes), strategyHash (32 bytes)]
          const borrower = `0x${log.topics[1].slice(26)}`; // Remove padding
          const amountHex = `0x${log.data.slice(2, 66)}`;
          const feeHex = `0x${log.data.slice(66, 130)}`;
          
          const amount = BigInt(amountHex);
          const fee = BigInt(feeHex);

          // Get timestamp from block
          const block = await provider.request({
            method: 'eth_getBlockByNumber',
            params: [log.blockNumber, false],
          }) as any;

          return {
            id: log.transactionHash,
            borrower,
            amount: formatUnits(amount, 6),
            fee: formatUnits(fee, 6),
            timestamp: new Date(Number(block.timestamp) * 1000),
            transactionHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16),
          };
        });

        const fetchedActivities = await Promise.all(activityPromises);
        setActivities(fetchedActivities);
      } catch (err) {
        console.error('❌ Error fetching flash loan activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch activity');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [userAddress, wallets, limit]);

  return { activities, isLoading, error };
}

