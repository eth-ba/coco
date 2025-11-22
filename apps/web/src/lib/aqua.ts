import { AquaProtocolContract, AQUA_CONTRACT_ADDRESSES, Address, HexString } from '@1inch/aqua-sdk';
import { encodeFunctionData, encodeAbiParameters, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

// Aqua Protocol contract address (same across all chains)
// Using the universal Aqua contract address for Base
export const AQUA_CONTRACT = '0x499943e74fb0ce105688beee8ef2abec5d936d31' as const;

// Base Sepolia USDC address (you'll need to replace with actual testnet address)
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const; // Base Sepolia USDC

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
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

// Initialize Aqua SDK
export const aqua = new AquaProtocolContract(new Address(AQUA_CONTRACT));

/**
 * Strategy structure for Aqua Protocol
 * This defines how liquidity is allocated
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
export function calculateStrategyHash(strategy: AquaStrategy): string {
  const encodedStrategy = encodeStrategy(strategy);
  const hash = AquaProtocolContract.calculateStrategyHash(new HexString(encodedStrategy));
  return hash.toString();
}

/**
 * Approve USDC to Aqua Protocol contract
 * This needs to be called once before shipping liquidity
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
 * This creates a new strategy and deposits virtual balances
 * 
 * @param smartAccountAddress - The address of the user's smart account (maker)
 * @param amount - Amount of USDC to deposit (in smallest unit, e.g., 1000000 for 1 USDC)
 * @param appAddress - The Aqua app contract address (e.g., XYCSwap)
 * @returns Transaction data for shipping liquidity
 */
export function buildShipTransaction(
  smartAccountAddress: `0x${string}`,
  amount: bigint,
  appAddress: `0x${string}`
) {
  // Create a simple strategy
  // For now, we'll use a basic USDC strategy
  // In production, you'd want to support multiple strategies
  const strategy: AquaStrategy = {
    maker: smartAccountAddress,
    token0: USDC_ADDRESS,
    token1: USDC_ADDRESS, // Same token for simplicity in MVP
    feeBps: BigInt(0), // 0% fee for now
    salt: '0x0000000000000000000000000000000000000000000000000000000000000001'
  };

  const encodedStrategy = encodeStrategy(strategy);

  // Build ship transaction using Aqua SDK
  const shipTx = aqua.ship({
    app: new Address(appAddress),
    strategy: new HexString(encodedStrategy),
    amountsAndTokens: [
      {
        token: new Address(USDC_ADDRESS),
        amount: amount
      }
    ]
  });

  return {
    ...shipTx,
    strategyHash: calculateStrategyHash(strategy)
  };
}

/**
 * Dock liquidity from Aqua Protocol
 * This withdraws virtual balances and closes the strategy
 * 
 * @param appAddress - The Aqua app contract address
 * @param strategyHash - The hash of the strategy to dock
 * @returns Transaction data for docking liquidity
 */
export function buildDockTransaction(
  appAddress: `0x${string}`,
  strategyHash: `0x${string}`
) {
  const dockTx = aqua.dock({
    app: new Address(appAddress),
    strategyHash: new HexString(strategyHash),
    tokens: [new Address(USDC_ADDRESS)]
  });

  return dockTx;
}

/**
 * Get USDC balance of an address
 */
export function encodeBalanceOf(address: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address]
  });
}

// Export constants
export { erc20Abi };

