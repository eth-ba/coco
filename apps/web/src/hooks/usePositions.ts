/**
 * Hook to fetch user's active positions in Aqua Protocol via Flash Loan contract
 * Shows liquidity provided and fees earned when others borrow
 */

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { formatUnits, parseAbiItem, keccak256 } from 'viem';
import { AQUA_PROTOCOL_ADDRESS, USDC_ADDRESS, FLASH_LOAN_ADDRESS } from '@/lib/constants';

export interface Position {
  strategyHash: string;
  liquidityAmount: string; // Formatted USDC amount
  liquidityRaw: bigint; // Raw balance from contract
  feesEarned: string; // Formatted total fees
  feesEarnedRaw: bigint; // Raw fees
  loanCount: number; // Number of loans executed
  lastActivity: Date | null;
  token: string; // Token address (USDC)
  isActive: boolean;
}

export function usePositions(userAddress?: string) {
  const { wallets } = useWallets();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress || !wallets.length) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    const fetchPositions = async () => {
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

        console.log(`📊 Querying from block ${fromBlock} to ${currentBlockNum} (${currentBlockNum - fromBlock} blocks)`);

        // Step 1: Get StrategyRegistered events for this user
        const strategyRegisteredEvent = parseAbiItem(
          'event StrategyRegistered(address indexed maker, address indexed token, bytes32 strategyHash)'
        );

        // Query events from recent blocks only (Arc free tier has 10k block limit)
        const logs = await provider.request({
          method: 'eth_getLogs',
          params: [
            {
              address: FLASH_LOAN_ADDRESS,
              topics: [
                keccak256(strategyRegisteredEvent.name),
                `0x000000000000000000000000${userAddress.slice(2)}`, // Filter by maker (user)
              ],
              fromBlock: fromBlockHex,
              toBlock: 'latest',
            },
          ],
        }) as any[];

        console.log(`📊 Found ${logs.length} registered strategies for user`);

        if (logs.length === 0) {
          setPositions([]);
          setIsLoading(false);
          return;
        }

        // Step 2: For each strategy, get the balance and loan activity
        const positionPromises = logs.map(async (log) => {
          const strategyHash = log.topics[3]; // 4th topic is strategyHash

          // Get balance from Aqua Protocol
          const balanceData = await provider.request({
            method: 'eth_call',
            params: [
              {
                to: AQUA_PROTOCOL_ADDRESS,
                data: encodeRawBalancesCall(userAddress, FLASH_LOAN_ADDRESS, strategyHash, USDC_ADDRESS),
              },
              'latest',
            ],
          }) as string;

          const balance = BigInt(balanceData);
          
          // Get loan events for this strategy to calculate fees
          const loanExecutedEvent = parseAbiItem(
            'event LoanExecuted(address indexed borrower, address indexed maker, address token, uint256 amount, uint256 fee, bytes32 strategyHash)'
          );

          const loanLogs = await provider.request({
            method: 'eth_getLogs',
            params: [
              {
                address: FLASH_LOAN_ADDRESS,
                topics: [
                  keccak256(loanExecutedEvent.name),
                  null, // any borrower
                  `0x000000000000000000000000${userAddress.slice(2)}`, // filter by maker
                ],
                fromBlock: fromBlockHex,
                toBlock: 'latest',
              },
            ],
          }) as any[];

          // Filter by strategyHash (it's in the event data, not indexed)
          const strategyLoanLogs = loanLogs.filter(loanLog => {
            // The strategyHash is the last 32 bytes of the data
            const dataStrategyHash = `0x${loanLog.data.slice(-64)}`;
            return dataStrategyHash.toLowerCase() === strategyHash.toLowerCase();
          });

          // Calculate total fees from all loans
          let totalFees = BigInt(0);
          strategyLoanLogs.forEach(loanLog => {
            // Parse the fee from event data
            // Event data structure: [token (32 bytes), amount (32 bytes), fee (32 bytes), strategyHash (32 bytes)]
            const feeHex = `0x${loanLog.data.slice(66, 130)}`; // 3rd 32-byte chunk
            totalFees += BigInt(feeHex);
          });

          // Get last activity timestamp
          let lastActivity: Date | null = null;
          if (strategyLoanLogs.length > 0) {
            const lastLog = strategyLoanLogs[strategyLoanLogs.length - 1];
            const block = await provider.request({
              method: 'eth_getBlockByNumber',
              params: [lastLog.blockNumber, false],
            }) as any;
            lastActivity = new Date(Number(block.timestamp) * 1000);
          }

          return {
            strategyHash,
            liquidityAmount: formatUnits(balance, 6),
            liquidityRaw: balance,
            feesEarned: formatUnits(totalFees, 6),
            feesEarnedRaw: totalFees,
            loanCount: strategyLoanLogs.length,
            lastActivity,
            token: USDC_ADDRESS,
            isActive: balance > 0,
          };
        });

        const fetchedPositions = await Promise.all(positionPromises);
        
        // Filter to only show active positions
        const activePositions = fetchedPositions.filter(p => p.isActive);
        
        console.log(`✅ Found ${activePositions.length} active positions`);
        setPositions(activePositions);
      } catch (err) {
        console.error('❌ Error fetching positions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch positions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, [userAddress, wallets]);

  return { positions, isLoading, error };
}

/**
 * Encode rawBalances function call manually
 */
function encodeRawBalancesCall(
  maker: string,
  app: string,
  strategyHash: string,
  token: string
): string {
  // Function signature: rawBalances(address,address,bytes32,address)
  const functionSelector = '0x1f64e7f7'; // First 4 bytes of keccak256("rawBalances(address,address,bytes32,address)")
  
  // Pad addresses to 32 bytes
  const makerPadded = maker.slice(2).padStart(64, '0');
  const appPadded = app.slice(2).padStart(64, '0');
  const hashPadded = strategyHash.slice(2).padStart(64, '0');
  const tokenPadded = token.slice(2).padStart(64, '0');
  
  return `${functionSelector}${makerPadded}${appPadded}${hashPadded}${tokenPadded}`;
}

