"use client";

import { useState } from "react";
import Image from "next/image";

interface StrategyCardProps {
  onDismiss?: () => void;
  onClick?: () => void;
}

export function StrategyCard({ onDismiss, onClick }: StrategyCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      onClick={onClick}
      className="relative bg-[#1c1c1e] rounded-2xl p-6 w-full h-44 overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
      style={{
        backgroundImage: "url(/images/card-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "right center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-5 right-5 w-3.5 h-3.5 transition-opacity hover:opacity-70"
      >
        <Image
          src="/icons/close.svg"
          alt="Close"
          width={14}
          height={14}
          className="w-full h-full"
        />
      </button>

      {/* Title */}
      <h2 className="text-white text-[30px] font-medium leading-[39px] max-w-[241px] mb-auto">
        Open your first strategy
      </h2>

      {/* Arrow Icon */}
      <div className="absolute bottom-6 left-6 w-6 h-6">
        <Image
          src="/icons/arrow-right.svg"
          alt="Open strategy"
          width={24}
          height={24}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

