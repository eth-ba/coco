"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCreateStrategy } from "@/hooks/useCreateStrategy";
import { TransactionSuccess } from "@/components/TransactionSuccess";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default function Strategies() {
  const { authenticated, ready, smartAccountAddress, logout } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const feeDisplay = '0.01'; // Display fee (hardcoded in contract)
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { createStrategy, isLoading, error, txHash, currentStep } = useCreateStrategy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (txHash && !isLoading) {
      setShowSuccess(true);
    }
  }, [txHash, isLoading]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-[#a3a3a5]">Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    const result = await createStrategy(amount, feeDisplay);
    
    if (result?.success) {
      console.log('✅ Strategy created successfully!');
      setAmount('');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.push('/home');
  };

  if (showSuccess && txHash) {
    return (
      <TransactionSuccess
        txHash={txHash}
        onClose={handleSuccessClose}
        title="Strategy Created!"
        message="Your flash loan strategy is now active and ready to earn fees"
      />
    );
  }

  const handleCopyAddress = async () => {
    if (smartAccountAddress) {
      await navigator.clipboard.writeText(smartAccountAddress);
      // Could add a toast notification here
      console.log('✅ Address copied to clipboard');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-end px-3 pt-6 pb-4 relative">
        {/* Wallet Address Badge - Clickable with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 bg-[#1c1c1e] rounded-full pl-3 pr-1 py-1 transition-opacity hover:opacity-70"
          >
            <span className="text-white text-[13px] font-mono">
              {smartAccountAddress ? formatAddress(smartAccountAddress) : 'Loading...'}
            </span>
            {/* Avatar Circle */}
            <div className="w-7 h-7 rounded-full bg-[#3a3a3c] flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-semibold">
                {smartAccountAddress ? smartAccountAddress.slice(2, 4).toUpperCase() : '??'}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown Content */}
              <div className="absolute right-0 mt-2 w-48 bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-lg z-20">
                <button
                  onClick={() => {
                    handleCopyAddress();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#2c2c2e] transition-colors"
                >
                  <Image
                    src="/icons/copy.svg"
                    alt="Copy"
                    width={16}
                    height={16}
                  />
                  <span className="text-[15px]">Copy Address</span>
                </button>
                
                <div className="h-px bg-[#48484a]/20" />
                
                <button
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#ff3b30] hover:bg-[#2c2c2e] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-[15px]">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="px-3 mb-6">
        <h1 className="text-white text-[34px] font-semibold leading-[41px] tracking-tight mb-2">
          Create Strategy
        </h1>
        <p className="text-[#a3a3a5] text-[12px] leading-[16px]">
          Provide liquidity to earn fees when others borrow your USDC via flash loans. 
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col px-3">
        {/* Main Input Sections - 12px gap */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Amount Input */}
          <div className="rounded-2xl bg-[#1c1c1e] p-6 overflow-hidden">
            <label className="text-[13px] text-[#a3a3a5] mb-3 block font-medium">
              Liquidity Amount
            </label>
            <div className="flex items-baseline gap-2 w-full">
              <span className="text-white text-[32px] font-normal shrink-0">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 min-w-0 bg-transparent text-white text-[32px] font-normal outline-none placeholder:text-[#48484a]"
                disabled={isLoading}
              />
              <span className="text-[#a3a3a5] text-[17px] font-medium shrink-0">
                USDC
              </span>
            </div>
          </div>

          {/* Fee Display (Hardcoded) */}
          <div className="rounded-2xl bg-[#1c1c1e] p-6 overflow-hidden">
            <label className="text-[13px] text-[#a3a3a5] mb-3 block font-medium">
              Flash Loan Fee (%)
            </label>
            <div className="flex items-baseline gap-2 w-full">
              <input
                type="text"
                value={feeDisplay}
                readOnly
                disabled
                className="flex-1 min-w-0 bg-transparent text-white/60 text-[32px] font-normal outline-none cursor-not-allowed"
              />
              <span className="text-[#a3a3a5] text-[17px] font-medium shrink-0">
                %
              </span>
            </div>
          </div>

          {/* Strategy Details */}
          <div className="rounded-2xl bg-[#1c1c1e] p-6">
            <p className="text-[13px] text-[#a3a3a5] mb-4 font-medium">Strategy Details</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-[#a3a3a5]">Contract</span>
                <span className="text-[15px] text-white font-mono">FlashLoan</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-[#a3a3a5]">Protocol</span>
                <span className="text-[15px] text-white font-mono">Aqua</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-[#a3a3a5]">Token</span>
                <span className="text-[15px] text-white font-mono">USDC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[15px] text-[#a3a3a5]">Network</span>
                <span className="text-[15px] text-white font-mono">Arc Testnet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-4">
            <p className="text-[13px] text-[#ff3b30] leading-[17px]">{error}</p>
          </div>
        )}

        {/* Transaction Progress */}
        {isLoading && (
          <div className="rounded-2xl bg-[#1c1c1e] p-5">
            <p className="text-[11px] text-[#a3a3a5] mb-3 font-medium uppercase tracking-wider">
              Transaction Progress
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${currentStep === 1 ? 'bg-[#007aff] animate-pulse' : currentStep > 1 ? 'bg-[#34c759]' : 'bg-[#48484a]'}`} />
                <span className={`text-[13px] ${currentStep >= 1 ? 'text-white' : 'text-[#a3a3a5]'}`}>
                  1. Registering strategy{currentStep > 1 && ' ✓'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${currentStep === 2 ? 'bg-[#007aff] animate-pulse' : currentStep > 2 ? 'bg-[#34c759]' : 'bg-[#48484a]'}`} />
                <span className={`text-[13px] ${currentStep >= 2 ? 'text-white' : 'text-[#a3a3a5]'}`}>
                  2. Approving USDC{currentStep > 2 && ' ✓'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${currentStep === 3 ? 'bg-[#007aff] animate-pulse' : currentStep > 3 ? 'bg-[#34c759]' : 'bg-[#48484a]'}`} />
                <span className={`text-[13px] ${currentStep >= 3 ? 'text-white' : 'text-[#a3a3a5]'}`}>
                  3. Shipping liquidity{currentStep > 3 && ' ✓'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        <button
          type="submit"
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
          className="w-full mt-2 px-6 py-4 bg-white text-black rounded-[14px] text-[17px] font-semibold hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Strategy...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Strategy
            </>
          )}
        </button>
      </form>
    </div>
  );
}
