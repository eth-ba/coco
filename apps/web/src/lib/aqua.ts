import { encodeFunctionData, encodeAbiParameters, keccak256 } from 'viem';

// Arc Testnet Contract Addresses
export const AQUA_CONTRACT = '0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425' as const;
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const FLASH_LOAN_ADDRESS = '0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82' as const;

// ERC20 ABI for approve function
const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

// Aqua Protocol ABI (from aqua.txt documentation)
const aquaAbi = [
  {
    type: 'function',
    name: 'ship',
    inputs: [
      { name: 'app', type: 'address' },
      { name: 'strategy', type: 'bytes' },
      { name: 'tokens', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' }
    ],
    outputs: [{ name: 'strategyHash', type: 'bytes32' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'dock',
    inputs: [
      { name: 'app', type: 'address' },
      { name: 'strategyHash', type: 'bytes32' },
      { name: 'tokens', type: 'address[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

/**
 * Strategy structure for FlashLoan contract (single token only)
 */
export interface AquaStrategy {
  maker: `0x${string}`;
  token: `0x${string}`;
  salt: `0x${string}`;
  feeBps: number; // Fee in basis points (e.g., 10 = 0.01%)
}

/**
 * Encode a strategy into bytes for FlashLoan contract
 */
export function encodeStrategy(strategy: AquaStrategy): `0x${string}` {
  return encodeAbiParameters(
    [
      {
        name: 'strategy',
        type: 'tuple',
        components: [
          { name: 'maker', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'salt', type: 'bytes32' },
          { name: 'feeBps', type: 'uint256' }
        ]
      }
    ],
    [strategy]
  );
}

/**
 * Calculate the strategy hash for a given strategy
 */
export function calculateStrategyHash(strategy: AquaStrategy): `0x${string}` {
  const encodedStrategy = encodeStrategy(strategy);
  return keccak256(encodedStrategy);
}

/**
 * Approve USDC to Aqua Protocol contract
 */
export function encodeApproveUSDC(amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [AQUA_CONTRACT, amount]
  });
}

/**
 * Ship liquidity to Aqua Protocol
 * Returns encoded transaction data for the ship function
 */
export function buildShipTransaction(
  smartAccountAddress: `0x${string}`,
  amount: bigint,
  appAddress: `0x${string}`
) {
  // Create a FlashLoan strategy (single token)
  const strategy: AquaStrategy = {
    maker: smartAccountAddress,
    token: USDC_ADDRESS,
    salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
    feeBps: 10 // 0.01% default fee
  };

  const encodedStrategy = encodeStrategy(strategy);
  const strategyHash = calculateStrategyHash(strategy);

  // Encode ship function call
  const data = encodeFunctionData({
    abi: aquaAbi,
    functionName: 'ship',
    args: [
      appAddress,
      encodedStrategy,
      [USDC_ADDRESS],
      [amount]
    ]
  });

  return {
    to: AQUA_CONTRACT,
    data,
    value: BigInt(0),
    strategyHash
  };
}

/**
 * Dock liquidity from Aqua Protocol
 * Returns encoded transaction data for the dock function
 */
export function buildDockTransaction(
  appAddress: `0x${string}`,
  strategyHash: `0x${string}`
) {
  const data = encodeFunctionData({
    abi: aquaAbi,
    functionName: 'dock',
    args: [
      appAddress,
      strategyHash,
      [USDC_ADDRESS]
    ]
  });

  return {
    to: AQUA_CONTRACT,
    data,
    value: BigInt(0)
  };
}

/**
 * Get the rawBalances ABI for querying Aqua Protocol balances
 */
export const rawBalancesAbi = [
  {
    type: 'function',
    name: 'rawBalances',
    inputs: [
      { name: 'maker', type: 'address' },
      { name: 'app', type: 'address' },
      { name: 'strategyHash', type: 'bytes32' },
      { name: 'token', type: 'address' }
    ],
    outputs: [
      { name: 'balance', type: 'uint248' },
      { name: 'tokensCount', type: 'uint8' }
    ],
    stateMutability: 'view'
  }
] as const;

// Export constants
export { erc20Abi, aquaAbi };
