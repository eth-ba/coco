"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { StrategyCard } from "@/components/StrategyCard";
import { TransactionsList } from "@/components/TransactionsList";
import { QRModal } from "@/components/QRModal";
import { SendModal } from "@/components/SendModal";
import { useSendModal } from "@/contexts/SendModalContext";
import { formatUnits } from "viem";
import { USDC_ADDRESS } from "@/lib/constants";
import { useWallets } from "@privy-io/react-auth";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { authenticated, ready, smartAccountAddress } = useAuth();
  const { wallets } = useWallets();
  const { isSendModalOpen, closeSendModal } = useSendModal();
  const router = useRouter();
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Get USDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      // Wait for Privy to be ready before accessing wallets
      if (!ready || !authenticated || !smartAccountAddress || !wallets?.length) return;
      
      try {
        const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
        if (!smartAccount) {
          console.log('❌ No smart account found');
          return;
        }

        const provider = await smartAccount.getEthereumProvider();
        
        // ERC20 balanceOf call for USDC
        const balanceHex = await provider.request({
          method: 'eth_call',
          params: [{
            to: USDC_ADDRESS,
            data: `0x70a08231000000000000000000000000${smartAccountAddress.slice(2)}` // balanceOf(address)
          }, 'latest']
        });

        const balance = BigInt(balanceHex as string);
        const formattedBalance = formatUnits(balance, 6);
        setUsdcBalance(formattedBalance);
      } catch (error) {
        console.error('❌ Error fetching USDC balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [ready, smartAccountAddress, wallets]);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-[#a3a3a5]">Loading...</p>
      </div>
    );
  }

  const handleStrategyClick = () => {
    // TODO: Navigate to strategy selection or open strategy modal
    console.log("Open strategy selection");
  };

  const handleSend = async (amount: string, toAddress: string) => {
    // TODO: Implement actual send transaction
    console.log('Sending', amount, 'USDC to', toAddress);
    // This will integrate with your smart contract send function
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pb-24">
      {/* Top Navigation */}
      <TopNav onQRClick={() => setIsQRModalOpen(true)} />

      {/* Balance Display */}
      <BalanceDisplay balance={usdcBalance} />

      {/* Strategy Card */}
      <div className="px-3 mb-3">
        <StrategyCard onClick={handleStrategyClick} />
      </div>

      {/* Transactions List - Same width as card above */}
      <div className="px-3">
        <TransactionsList />
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        address={smartAccountAddress || ""}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={closeSendModal}
        onSend={handleSend}
      />
    </div>
  );
}

