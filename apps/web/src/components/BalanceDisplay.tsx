"use client";

import { useState } from "react";
import Image from "next/image";

interface BalanceDisplayProps {
  balance: string;
}

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Parse balance into dollars and centsgit
  const parts = balance.split(".");
  const dollars = parts[0];
  const cents = parts[1] || "00";

  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-4 pb-8 mb-4">
      {/* Account Balance Label */}
      <p className="text-[#a3a3a5] text-base font-medium">
        Account Balance
      </p>

      {/* Balance Amount */}
      <div className="flex items-center gap-3">
        <div className="text-white">
          {isVisible ? (
            <span className="font-normal">
              <span className="text-[42px]">$</span>
              <span className="text-[42px]">{dollars}</span>
              <span className="text-base">.</span>
              <span className="text-base">{cents}</span>
            </span>
          ) : (
            <span className="text-[42px]">••••••</span>
          )}
        </div>

        {/* Toggle Visibility Button */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="w-6 h-6 transition-opacity hover:opacity-70"
        >
          <Image
            src="/icons/see.svg"
            alt={isVisible ? "Hide balance" : "Show balance"}
            width={24}
            height={24}
            className="w-full h-full"
          />
        </button>
      </div>

      {/* APY Badge */}
      <div className="px-2.5 py-1 bg-[#abff71]/30 rounded-[19px] outline-1 -outline-offset-1 outline-[#abff71] inline-flex justify-center items-center gap-2.5">
        <div className="text-white text-xs font-medium leading-[17.40px]">6% APY</div>
      </div>
    </div>
  );
}

