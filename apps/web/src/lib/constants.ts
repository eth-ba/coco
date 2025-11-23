/**
 * Contract addresses for Coco platform
 * Network: Flare Mainnet (Chain ID: 14)
 * RPC: https://flare-api.flare.network/ext/C/rpc
 * Explorer: https://flare-explorer.flare.network
 */

export const AQUA_PROTOCOL_ADDRESS = '0x6c86812F1a5aeb738951B6f8A0b3b3FB4C856f82' as const;
export const FLASH_LOAN_ADDRESS = '0x1854C0EB9d9b8CABF76B00a0420F43139F0Be51d' as const;
export const FLASH_LOAN_BORROWER_ADDRESS = '0x8062Dc6B0f837524c03A8d90bC8C5d6bBe880E9d' as const;
export const DEPOSIT_HELPER_ADDRESS = '0x299182bbe03Af978B831E73D1514b3768D5E162D' as const;

export const USDC_ADDRESS = '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as const;

// Chain ID
export const FLARE_MAINNET_CHAIN_ID = 14;

// Re-export Aqua utility functions
export { 
  buildDockTransaction, 
  calculateStrategyHash,
  type AquaStrategy 
} from './aqua';

