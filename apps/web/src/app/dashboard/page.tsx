"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DepositForm } from "@/components/DepositForm";
import { formatUnits } from "viem";
import { USDC_ADDRESS } from "@/lib/constants";
import { useWallets } from "@privy-io/react-auth";

export default function Dashboard() {
  const { authenticated, ready, smartAccountAddress, logout } = useAuth();
  const { wallets } = useWallets();
  const router = useRouter();
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get USDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!smartAccountAddress) return;
      
      try {
        const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
        if (!smartAccount) {
          console.log('❌ No smart account found');
          return;
        }

        console.log('🔍 Fetching USDC balance for:', smartAccountAddress);
        console.log('📍 USDC Contract:', USDC_ADDRESS);
        console.log('🌐 Network: Base Sepolia (Chain ID: 84532)');

        const provider = await smartAccount.getEthereumProvider();
        
        // Check current chain
        const chainId = await provider.request({ method: 'eth_chainId' });
        console.log('⛓️ Current Chain ID:', chainId);
        
        // Get ETH balance
        const ethBalanceHex = await provider.request({
          method: 'eth_getBalance',
          params: [smartAccountAddress, 'latest']
        });
        const ethBal = BigInt(ethBalanceHex as string);
        const formattedEth = formatUnits(ethBal, 18);
        console.log('💎 ETH Balance:', formattedEth, 'ETH');
        setEthBalance(formattedEth);
        
        // ERC20 balanceOf call for USDC
        const balanceHex = await provider.request({
          method: 'eth_call',
          params: [{
            to: USDC_ADDRESS,
            data: `0x70a08231000000000000000000000000${smartAccountAddress.slice(2)}` // balanceOf(address)
          }, 'latest']
        });

        console.log('📊 USDC Balance (hex):', balanceHex);
        const balance = BigInt(balanceHex as string);
        const formattedBalance = formatUnits(balance, 6);
        console.log('💰 USDC Balance (formatted):', formattedBalance, 'USDC');
        
        setUsdcBalance(formattedBalance);
      } catch (error) {
        console.error('❌ Error fetching USDC balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [smartAccountAddress, wallets]);

  const copyAddress = () => {
    if (smartAccountAddress) {
      navigator.clipboard.writeText(smartAccountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshBalance = async () => {
    setIsRefreshing(true);
    if (!smartAccountAddress) return;
    
    try {
      const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
      if (!smartAccount) return;

      const provider = await smartAccount.getEthereumProvider();
      
      const balanceHex = await provider.request({
        method: 'eth_call',
        params: [{
          to: USDC_ADDRESS,
          data: `0x70a08231000000000000000000000000${smartAccountAddress.slice(2)}`
        }, 'latest']
      });

      const balance = BigInt(balanceHex as string);
      setUsdcBalance(formatUnits(balance, 6));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 pt-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign Out
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Smart Account Info with Copy */}
        <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">
              Your Coco Account
            </p>
            <button
              onClick={copyAddress}
              className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Address"}
            </button>
          </div>
          <p className="text-xs font-mono break-all text-muted-foreground">
            {smartAccountAddress || "Generating account..."}
          </p>
        </div>

        {/* Balance Cards */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-secondary p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">USDC Balance</p>
              <button
                onClick={refreshBalance}
                disabled={isRefreshing}
                className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {isRefreshing ? "⟳" : "🔄"} Refresh
              </button>
            </div>
            <p className="text-4xl font-bold">{parseFloat(usdcBalance).toFixed(2)} USDC</p>
            <p className="text-xs text-muted-foreground mt-1">
              Available to deposit • Base Sepolia
            </p>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-muted">
              ETH: {parseFloat(ethBalance).toFixed(4)} ETH (for gas)
            </p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">Current APY</p>
            <p className="text-2xl font-bold text-green-500">8.50%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Simple Vault Strategy
            </p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Deposited Amount
            </p>
            <p className="text-2xl font-bold">$0.00</p>
            <p className="text-xs text-muted-foreground mt-1">
              Earning yield via Aqua
            </p>
          </div>
        </div>

        {/* Deposit Form */}
        <div className="mt-6">
          <DepositForm />
        </div>
      </div>
    </div>
  );
}
