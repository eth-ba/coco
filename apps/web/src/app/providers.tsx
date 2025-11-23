"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "@/lib/chains";
import { SendModalProvider } from "@/contexts/SendModalContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
        },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
      }}
    >
      <SendModalProvider>
        {children}
      </SendModalProvider>
    </PrivyProvider>
  );
}
