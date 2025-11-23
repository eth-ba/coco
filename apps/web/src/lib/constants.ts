/**
 * Contract addresses for Coco platform
 * Network: Arc Testnet (Chain ID: 5042002)
 * RPC: https://arc-testnet.drpc.org
 * Explorer: https://testnet.arcscan.app
 */

// Arc Testnet - Flash Loan Contracts
export const AQUA_PROTOCOL_ADDRESS = '0x33Fb47472D03Ce0174830A6bD21e39F65d6d5425' as const;
export const FLASH_LOAN_ADDRESS = '0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82' as const;
export const FLASH_LOAN_BORROWER_ADDRESS = '0x524902FA5e3535117E24e9D6826e5950bfbEF94E' as const;

// Arc Testnet Native USDC (used for gas and transfers)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;

// Chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Re-export Aqua utility functions
export { 
  buildDockTransaction, 
  calculateStrategyHash,
  type AquaStrategy 
} from './aqua';

