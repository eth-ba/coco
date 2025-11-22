import { base, arbitrum, optimism, baseSepolia } from "viem/chains";
import { defineChain, createPublicClient, http, type Chain } from "viem";

// Helper to create custom chain config if RPC is provided
const createCustomChain = (chain: Chain, rpcUrl?: string) => {
  if (!rpcUrl) return chain;
  return defineChain({
    ...chain,
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
};

export const customBase = createCustomChain(base, process.env.NEXT_PUBLIC_BASE_RPC_URL);
export const customArbitrum = createCustomChain(arbitrum, process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL);
export const customOptimism = createCustomChain(optimism, process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL);

export const supportedChains = [customBase, customArbitrum, customOptimism, baseSepolia];

// Create public clients for each chain to fetch balances
export const publicClients = {
  [base.id]: createPublicClient({ chain: customBase, transport: http() }),
  [arbitrum.id]: createPublicClient({ chain: customArbitrum, transport: http() }),
  [optimism.id]: createPublicClient({ chain: customOptimism, transport: http() }),
};
