'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TransactionSuccessProps {
  isOpen?: boolean;  // Optional for simpler usage
  amount?: string;
  toAddress?: string;
  title?: string;
  message?: string;
  txHash?: string;
  onClose: () => void;
}

export function TransactionSuccess({
  isOpen = true,  // Default to true for simpler usage
  amount,
  toAddress,
  title,
  message,
  txHash,
  onClose,
}: TransactionSuccessProps) {
  const router = useRouter();
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay checkmark animation slightly for better effect
      setTimeout(() => setShowCheck(true), 100);
    } else {
      setShowCheck(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackToHome = () => {
    onClose();
    router.push('/home');
  };

  const handleViewTransaction = () => {
    if (txHash) {
      // Open Arc Testnet explorer
      window.open(`https://testnet.arcscan.app/tx/${txHash}`, '_blank');
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-[10000] flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-center py-4 px-6">
        <p className="text-[#a3a3a5] text-base font-medium">
          {title ? title.replace('!', '') : 'Send'}
        </p>
      </div>

      {/* Content Card - Centered with equal spacing */}
      <div className="flex-1 bg-[#1c1c1e] rounded-t-3xl mt-16 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center w-full max-w-md py-12">
          {/* Success Icon with Animation */}
          <div className="relative w-[120px] h-[120px] mb-8">
            {/* Outer circle with scale animation */}
            <div 
              className="absolute inset-0 rounded-full bg-[#3a4a3a] transition-all duration-500"
              style={{
                transform: showCheck ? 'scale(1)' : 'scale(0.8)',
                opacity: showCheck ? 1 : 0,
              }}
            />
            {/* Inner green circle with bounce animation */}
            <div 
              className="absolute inset-[20px] rounded-full bg-[#ABFF72] flex items-center justify-center transition-all duration-700"
              style={{
                transform: showCheck ? 'scale(1)' : 'scale(0)',
                opacity: showCheck ? 1 : 0,
                animation: showCheck ? 'bounce-in 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none',
              }}
            >
              {/* Checkmark with draw animation */}
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none"
                className="text-black"
                style={{
                  opacity: showCheck ? 1 : 0,
                  transition: 'opacity 0.3s ease-in',
                  transitionDelay: '0.4s',
                }}
              >
                <path 
                  d="M20 6L9 17L4 12" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  strokeDasharray="24"
                  strokeDashoffset={showCheck ? "0" : "24"}
                  style={{
                    transition: 'stroke-dashoffset 0.5s ease-out',
                    transitionDelay: '0.5s',
                  }}
                />
              </svg>
            </div>
          </div>
          
          <style jsx global>{`
            @keyframes bounce-in {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
              }
              70% {
                transform: scale(0.9);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>

          {/* Success Title with fade-in */}
          <h2 
            className="text-white text-2xl font-medium mb-4 transition-all duration-500"
            style={{
              opacity: showCheck ? 1 : 0,
              transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
              transitionDelay: '0.6s',
            }}
          >
            {title || 'Transfer Success'}
          </h2>

          {/* Message with fade-in */}
          {message && (
            <p 
              className="text-[#a3a3a5] text-[15px] text-center mb-8 px-4 transition-all duration-500"
              style={{
                opacity: showCheck ? 1 : 0,
                transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
                transitionDelay: '0.65s',
              }}
            >
              {message}
            </p>
          )}

          {/* Amount Section with fade-in (only for send transactions) */}
          {amount && (
            <div 
              className="flex flex-col items-center gap-2 mb-8 transition-all duration-500"
              style={{
                opacity: showCheck ? 1 : 0,
                transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
                transitionDelay: '0.7s',
              }}
            >
              <p className="text-[#a3a3a5] text-sm">Amount</p>
              <p className="text-white text-[48px] font-medium leading-none">
                {amount}
              </p>
              <p className="text-[#a3a3a5] text-sm">USDC</p>
            </div>
          )}

          {/* To Address with fade-in (only for send transactions) */}
          {toAddress && (
            <div 
              className="flex flex-col items-center gap-1 mb-6 transition-all duration-500"
              style={{
                opacity: showCheck ? 1 : 0,
                transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
                transitionDelay: '0.8s',
              }}
            >
              <p className="text-white text-base">To:</p>
              <p className="text-white text-base font-mono">
                {truncateAddress(toAddress)}
              </p>
            </div>
          )}

          {/* View Transaction Link with fade-in */}
          {txHash && (
            <button
              onClick={handleViewTransaction}
              className="flex items-center gap-1.5 mb-8 transition-all hover:opacity-70 duration-500"
              style={{
                opacity: showCheck ? 1 : 0,
                transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
                transitionDelay: '0.9s',
              }}
            >
              <p className="text-white text-xs">View Transaction</p>
              <Image
                src="/icons/external.svg"
                alt="External link"
                width={14}
                height={14}
              />
            </button>
          )}

          {/* Back to Home Button with fade-in */}
          <button
            onClick={handleBackToHome}
            className="w-full max-w-md bg-white text-black py-3 rounded-full font-medium text-base transition-all hover:bg-white/90 active:scale-[0.98] duration-500"
            style={{
              opacity: showCheck ? 1 : 0,
              transform: showCheck ? 'translateY(0)' : 'translateY(10px)',
              transitionDelay: '1s',
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

