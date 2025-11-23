"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DepositForm } from "@/components/DepositForm";
import { WithdrawModal } from "@/components/WithdrawModal";
import { useWithdraw } from "@/hooks/useWithdraw";
import { formatUnits, createPublicClient, http } from "viem";
import { USDC_ADDRESS } from "@/lib/constants";
import { useWallets } from "@privy-io/react-auth";
import { customBase } from "@/lib/chains";

export default function Dashboard() {
  const { authenticated, ready, smartAccountAddress, logout } = useAuth();
  const { wallets } = useWallets();
  const router = useRouter();
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositedAmount] = useState<string>("0");
  
  const { withdraw, isLoading: isWithdrawing } = useWithdraw();

  // Get USDC and ETH balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!smartAccountAddress) return;
      
      try {
        const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
        if (!smartAccount) {
          console.log('❌ No smart account found');
          return;
        }

        // Use custom RPC from chains.ts instead of Privy's provider
        const customRpcUrl = customBase.rpcUrls.default.http[0];
        const publicClient = createPublicClient({
          chain: customBase,
          transport: http(customRpcUrl)
        });

        console.log('🔍 Fetching balances for:', smartAccountAddress);
        console.log('📍 USDC Contract:', USDC_ADDRESS);
        console.log('🌐 Using RPC:', customRpcUrl);
        console.log('⛓️ Chain:', customBase.name, '(ID:', customBase.id, ')');
        
        // Get ETH balance using custom RPC
        const ethBal = await publicClient.getBalance({
          address: smartAccountAddress as `0x${string}`
        });
        const formattedEth = formatUnits(ethBal, 18);
        console.log('💎 ETH Balance:', formattedEth, 'ETH');
        setEthBalance(formattedEth);
        
        // Get USDC balance using custom RPC
        try {
          const balance = await publicClient.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }],
            functionName: 'balanceOf',
            args: [smartAccountAddress as `0x${string}`]
          });

          const formattedBalance = formatUnits(balance, 6);
          console.log('💰 USDC Balance:', formattedBalance, 'USDC');
          
          setUsdcBalance(formattedBalance);
        } catch (usdcError) {
          console.warn('⚠️ Could not fetch USDC balance (contract may not exist on fork):', usdcError);
          setUsdcBalance('0.00');
        }
      } catch (error) {
        console.error('❌ Error fetching balances:', error);
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

      // Use custom RPC
      const customRpcUrl = customBase.rpcUrls.default.http[0];
      const publicClient = createPublicClient({
        chain: customBase,
        transport: http(customRpcUrl)
      });

      const balance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [smartAccountAddress as `0x${string}`]
      });

      setUsdcBalance(formatUnits(balance, 6));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWithdraw = async (amount: string) => {
    const result = await withdraw(amount);
    if (result?.success) {
      // Refresh balances after successful withdrawal
      await refreshBalance();
      // TODO: Refresh deposited amount from Aqua Protocol
    }
    return result;
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
              Available to deposit • {customBase.name}
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
            <p className="text-2xl font-bold">${parseFloat(depositedAmount).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Earning yield via Aqua
            </p>
          </div>
        </div>

        {/* Withdraw Button */}
        <div className="mt-6">
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            className="w-full px-6 py-4 bg-linear-to-r from-red-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-red-600 hover:to-pink-600 transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Withdraw Funds
          </button>
        </div>

        {/* Deposit Form */}
        <div className="mt-4">
          <DepositForm />
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onWithdraw={handleWithdraw}
        currentBalance={depositedAmount}
        isLoading={isWithdrawing}
      />
    </div>
  );
}
