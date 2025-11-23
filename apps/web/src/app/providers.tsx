"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia } from "viem/chains";
import { SendModalProvider } from "@/contexts/SendModalContext";

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
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <SendModalProvider>
        {children}
      </SendModalProvider>
    </PrivyProvider>
  );
}
