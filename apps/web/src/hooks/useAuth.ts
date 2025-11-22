import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export function useAuth() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );

  // Find the embedded wallet which acts as the signer for the Smart Account
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  useEffect(() => {
    if (user?.wallet?.address) {
      // In a real implementation with Smart Accounts enabled in Privy Dashboard,
      // the smart wallet address would be available here or via a specific hook.
      // For now, we'll use the embedded wallet address as a placeholder
      // until the Smart Account integration is fully active.
      setSmartAccountAddress(user.wallet.address);
    }
  }, [user]);

  return {
    login,
    logout,
    authenticated,
    user,
    ready,
    smartAccountAddress,
    embeddedWallet,
  };
}
