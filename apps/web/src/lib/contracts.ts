/**
 * Deployed contract addresses for Coco Protocol
 * 
 * Aqua Protocol is deployed at the same address on most chains:
 * 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31
 * 
 * Exception: Arc Testnet has a separate deployment
 */

export const CONTRACTS = {
  14: {
    aqua: '0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82',
    flashLoan: '0x1854C0EB9d9b8CABF76B00a0420F43139F0Be51d',
    borrower: '0x8062Dc6B0f837524c03A8d90bC8C5d6bBe880E9d',
    usdc: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6',
  },
  
  // Arc Testnet (Deprecated)
  5042002: {
    aqua: '0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425',
    flashLoan: '0xDDB29c3d9F7C0de0667E5C7027ba3c1dBBC52481',
    borrower: '0x55EA85557dE34CAe524C97D056698ae19F3C411c',
    usdc: '0x3600000000000000000000000000000000000000',
  },
  
  // Ethereum Mainnet
  1: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  
  // Base
  8453: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  
  // Base Sepolia
  84532: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  
  // Optimism
  10: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  
  // Arbitrum
  42161: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  
  // Polygon
  137: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;

/**
 * Get contract addresses for a specific chain
 */
export function getContracts(chainId: number) {
  return CONTRACTS[chainId as ChainId] || null;
}

/**
 * Get Aqua Protocol address for a chain
 */
export function getAquaAddress(chainId: number): string | null {
  const contracts = getContracts(chainId);
  return contracts?.aqua || null;
}

/**
 * Get FlashLoan contract address for a chain
 */
export function getFlashLoanAddress(chainId: number): string | null {
  const contracts = getContracts(chainId);
  return contracts?.flashLoan || null;
}

/**
 * Check if FlashLoan is deployed on a chain
 */
export function isFlashLoanDeployed(chainId: number): boolean {
  const contracts = getContracts(chainId);
  return !!(contracts?.flashLoan && contracts?.borrower);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(CONTRACTS).map(Number);
}

/**
 * Get chains where FlashLoan is deployed
 */
export function getDeployedChains(): number[] {
  return getSupportedChains().filter(isFlashLoanDeployed);
}

/**
 * Get USDC address for a chain
 */
export function getUSDCAddress(chainId: number): string | null {
  const contracts = getContracts(chainId);
  return contracts?.usdc || null;
}

