"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { PrivyWagmiConnector } from "@privy-io/wagmi-connector";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet", "google", "apple"],
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {/* @ts-expect-error PrivyWagmiConnector types might conflict with React 19 */}
          <PrivyWagmiConnector wagmiChainsConfig={wagmiConfig}>
            {children}
          </PrivyWagmiConnector>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

