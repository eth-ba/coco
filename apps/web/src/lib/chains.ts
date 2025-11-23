/**
 * Flare Mainnet Chain Configuration
 * Flare Network - EVM-compatible Layer 1 for data
 * Official RPC: https://flare-api.flare.network/ext/C/rpc
 */

import { defineChain } from 'viem';

export const flare = defineChain({
  id: 14,
  name: 'Flare',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://flare-api.flare.network/ext/C/rpc'],
    },
    public: {
      http: ['https://flare-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://flare-explorer.flare.network',
    },
  },
  testnet: false,
});

/**
 * Arc Testnet Chain Configuration (Deprecated)
 * Arc Network is an open Layer-1 blockchain from Circle built for stablecoin finance
 * Official RPC: https://rpc.testnet.arc.network
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

