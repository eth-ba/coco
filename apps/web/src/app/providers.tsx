"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, arbitrum, optimism, baseSepolia } from "viem/chains";
import { addRpcUrlOverrideToChain } from "@privy-io/chains";

// Use Privy's official method to override RPC URLs
// This ensures Privy's internal services (including the approval modal) use the custom RPC
const customBase = process.env.NEXT_PUBLIC_BASE_RPC_URL 
  ? addRpcUrlOverrideToChain(base, process.env.NEXT_PUBLIC_BASE_RPC_URL)
  : base;

const customArbitrum = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
  ? addRpcUrlOverrideToChain(arbitrum, process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL)
  : arbitrum;

const customOptimism = process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL
  ? addRpcUrlOverrideToChain(optimism, process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL)
  : optimism;

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
