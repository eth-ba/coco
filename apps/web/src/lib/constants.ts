/**
 * Contract addresses for Coco platform
 */

// Base Sepolia Testnet
export const YIELD_AUTOMATOR_ADDRESS = '0xA802994c344d3e9635277C6bD6475ce901edbB9e' as const;
export const SIMPLE_AQUA_APP_ADDRESS = '0x9c5f1fc4EF27A5816e7F56f60AA076379aF05331' as const;
export const AQUA_PROTOCOL_ADDRESS = '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31' as const;

// USDC addresses across different chains
export const USDC_ADDRESSES: Record<number, string> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base mainnet
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',    // Optimism (correct checksum)
};

// Default USDC address for Base (backwards compatibility)
export const USDC_ADDRESS = USDC_ADDRESSES[8453];

// Chain ID
export const BASE_SEPOLIA_CHAIN_ID = 84532;

// Strategy indices
export const SIMPLE_VAULT_STRATEGY = 0; // SimpleAquaApp strategy index

// Re-export Aqua utilities
export { 
  buildDockTransaction, 
  calculateStrategyHash,
  type AquaStrategy 
} from './aqua';

