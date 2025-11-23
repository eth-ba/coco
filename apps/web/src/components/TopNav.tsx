"use client";

import Image from "next/image";
import Link from "next/link";

interface TopNavProps {
  onQRClick: () => void;
}

export function TopNav({ onQRClick }: TopNavProps) {
  return (
    <div className="flex items-center justify-between px-6 pt-8 pb-4 w-full">
      {/* Settings Icon - Left */}
      <Link 
        href="/settings"
        className="w-6 h-6 transition-opacity hover:opacity-70"
      >
        <Image
          src="/icons/settings.svg"
          alt="Settings"
          width={24}
          height={24}
          className="w-full h-full"
        />
      </Link>

      {/* QR Code Icon - Right */}
      <button 
        onClick={onQRClick}
        className="w-6 h-6 transition-opacity hover:opacity-70"
      >
        <Image
          src="/icons/qr.svg"
          alt="QR Code"
          width={24}
          height={24}
          className="w-full h-full"
        />
      </button>
    </div>
  );
}

