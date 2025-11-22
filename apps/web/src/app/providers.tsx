"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, arbitrum, optimism, baseSepolia } from "viem/chains";
import { defineChain, type Chain } from "viem";

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

const customBase = createCustomChain(base, process.env.NEXT_PUBLIC_BASE_RPC_URL);
const customArbitrum = createCustomChain(arbitrum, process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL);
const customOptimism = createCustomChain(optimism, process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL);

const supportedChains = [customBase, customArbitrum, customOptimism, baseSepolia];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: customBase,
        supportedChains: supportedChains,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
