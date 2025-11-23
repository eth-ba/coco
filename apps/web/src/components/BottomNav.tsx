"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSendModal } from "@/contexts/SendModalContext";

const navItems = [
  { id: "home", name: "Home", path: "/home", icon: "/icons/home.svg", action: null },
  { id: "add-money", name: "Add money", path: null, icon: "/icons/money.svg", action: "add-money" },
  { id: "move", name: "Move", path: null, icon: "/icons/move.svg", action: "send" },
  { id: "strategies", name: "Strategies", path: "/dashboard", icon: "/icons/more.svg", action: null },
];

export function BottomNav() {
  const pathname = usePathname();
  const { openSendModal } = useSendModal();

  // Hide navigation on splash screen
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[11.85px] bg-black/[0.42] safe-area-inset-bottom w-full">
      <div className="flex items-center justify-center px-6 py-4 w-full">
        <div className="flex gap-[53px] items-center justify-around w-full max-w-md">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            
            // Handle action buttons (not wired up yet - always grayed)
            if (item.action === "send") {
              return (
                <button
                  key={item.id}
                  onClick={openSendModal}
                  type="button"
                  className="flex flex-col gap-1 items-center w-[53px] transition-opacity hover:opacity-80 cursor-pointer opacity-40"
                >
                  <div className="w-[26px] h-[26px] relative">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      width={26}
                      height={26}
                      className="block"
                    />
                  </div>
                  <p className="text-[#f3f3f5] text-[10px] text-center leading-normal font-normal whitespace-nowrap font-sans">
                    {item.name}
                  </p>
                </button>
              );
            }
            
            if (item.action === "add-money") {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // TODO: Wire up add money functionality
                    console.log('Add money clicked - to be implemented');
                  }}
                  type="button"
                  className="flex flex-col gap-1 items-center w-[53px] transition-opacity hover:opacity-80 cursor-pointer opacity-40"
                >
                  <div className="w-[26px] h-[26px] relative">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      width={26}
                      height={26}
                      className="block"
                    />
                  </div>
                  <p className="text-[#f3f3f5] text-[10px] text-center leading-normal font-normal whitespace-nowrap font-sans">
                    {item.name}
                  </p>
                </button>
              );
            }
            
            // Regular navigation links
            return (
              <Link
                key={item.id}
                href={item.path!}
                className={`flex flex-col gap-1 items-center w-[53px] transition-opacity hover:opacity-80 ${
                  isActive ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className="w-[26px] h-[26px] relative">
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={26}
                    height={26}
                    className="block"
                  />
                </div>
                <p className="text-[#f3f3f5] text-[10px] text-center leading-normal font-normal whitespace-nowrap font-sans">
                  {item.name}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

