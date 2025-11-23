'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AddressEntry {
  address: string;
  lastSent: string; // ISO date string
  lastAmount: string;
  nickname?: string;
}

interface AddressBookProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
}

// Mock data - replace with actual transaction history
const mockAddresses: AddressEntry[] = [
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    lastSent: '2025-01-20T14:30:00Z',
    lastAmount: '100.00',
  },
  {
    address: '0x9fO08f2jhf237wfef22r1egDF9',
    lastSent: '2025-01-18T09:15:00Z',
    lastAmount: '50.00',
  },
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    lastSent: '2025-01-15T16:45:00Z',
    lastAmount: '250.00',
  },
];

export function AddressBook({ isOpen, onClose, onSelectAddress }: AddressBookProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addresses] = useState<AddressEntry[]>(mockAddresses);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
      setSearchQuery('');
    }, 300);
  };

  const handleSelectAddress = (address: string) => {
    // Trigger slide-out animation
    setIsClosing(true);
    
    // Wait for slide animation, then close and call parent
    setTimeout(() => {
      setIsAnimating(false);
      onSelectAddress(address);
      onClose();
      setSearchQuery('');
    }, 300);
  };

  // Filter addresses based on search
  const filteredAddresses = addresses.filter(entry => 
    entry.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Truncate address for display
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black transition-opacity duration-300"
        style={{ 
          zIndex: 10000,
          opacity: isAnimating ? 1 : 0,
          pointerEvents: isOpen && isAnimating ? 'auto' : 'none'
        }}
      />

      {/* Address Book Full Screen */}
      <div 
        className="fixed inset-0 transition-all duration-300 ease-in-out"
        style={{ 
          zIndex: 10001,
          opacity: (isAnimating && !isClosing) ? 1 : 0,
          transform: (isAnimating && !isClosing) ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: (isOpen && isAnimating && !isClosing) ? 'auto' : 'none'
        }}
      >
        {/* Top Header with Back button and Title */}
        <div className="absolute top-8 left-0 right-0 px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/back.svg"
                alt="Back"
                width={24}
                height={24}
              />
            </button>
            
            <h2 className="text-white text-xl font-medium">Recent Contacts</h2>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content Area */}
        <div className="pt-24 pb-6 px-6 h-full flex flex-col">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address..."
                className="w-full bg-[#1c1c1e] text-white text-sm px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-[#a3a3a5]/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a5] hover:text-white transition-colors"
                >
                  <Image
                    src="/icons/close.svg"
                    alt="Clear"
                    width={16}
                    height={16}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Address List Card Container */}
          <div className="bg-[#1c1c1e] rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {filteredAddresses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#a3a3a5] text-sm">
                    {searchQuery ? 'No addresses found' : 'No recent contacts'}
                  </p>
                </div>
              ) : (
                <div>
                  {filteredAddresses.map((entry, index) => (
                    <button
                      key={`${entry.address}-${index}`}
                      onClick={() => handleSelectAddress(entry.address)}
                      className={`w-full px-4 py-5 transition-all hover:bg-white/5 active:scale-[0.98] flex items-center justify-between ${
                        index !== filteredAddresses.length - 1 ? 'border-b border-white/10' : ''
                      }`}
                      disabled={isClosing}
                    >
                      <p className="text-white font-medium text-base font-mono">
                        {truncateAddress(entry.address)}
                      </p>
                      
                      {/* Chevron Right */}
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="text-[#a3a3a5]"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

