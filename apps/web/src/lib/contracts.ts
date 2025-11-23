/**
 * Deployed contract addresses for Coco Protocol
 * 
 * Aqua Protocol is deployed at the same address on most chains:
 * 0x499943E74FB0cE105688beeE8Ef2ABec5D936d31
 * 
 * Exception: Arc Testnet has a separate deployment
 */

export const CONTRACTS = {
  // Arc Testnet
  5042002: {
    aqua: '0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425',
    flashLoan: '0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82',
    borrower: '0x524902FA5e3535117E24e9D6826e5950bfbEF94E',
  },
  
  // Ethereum Mainnet
  1: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
  },
  
  // Base
  8453: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
  },
  
  // Optimism
  10: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
  },
  
  // Arbitrum
  42161: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
  },
  
  // Polygon
  137: {
    aqua: '0x499943E74FB0cE105688beeE8Ef2ABec5D936d31',
    flashLoan: null, // Not deployed yet
    borrower: null,
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

