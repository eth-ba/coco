import { encodeFunctionData, encodeAbiParameters, keccak256 } from 'viem';

// Aqua Protocol contract address (same across all chains)
export const AQUA_CONTRACT = '0x499943e74fb0ce105688beee8ef2abec5d936d31' as const;

// Base Sepolia USDC address
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// YieldAutomator contract address (Base Sepolia)
export const YIELD_AUTOMATOR_ADDRESS = '0xA802994c344d3e9635277C6bD6475ce901edbB9e' as const;

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
 * Strategy structure for Aqua Protocol
 */
export interface AquaStrategy {
  maker: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  feeBps: bigint;
  salt: `0x${string}`;
}

/**
 * Encode a strategy into bytes for Aqua Protocol
 */
export function encodeStrategy(strategy: AquaStrategy): `0x${string}` {
  return encodeAbiParameters(
    [
      {
        name: 'strategy',
        type: 'tuple',
        components: [
          { name: 'maker', type: 'address' },
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'feeBps', type: 'uint256' },
          { name: 'salt', type: 'bytes32' }
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
  // Create a simple strategy
  const strategy: AquaStrategy = {
    maker: smartAccountAddress,
    token0: USDC_ADDRESS,
    token1: USDC_ADDRESS, // Same token for simplicity in MVP
    feeBps: BigInt(0), // 0% fee
    salt: '0x0000000000000000000000000000000000000000000000000000000000000001'
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
