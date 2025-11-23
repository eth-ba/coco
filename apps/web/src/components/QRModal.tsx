'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export function QRModal({
  isOpen,
  onClose,
  address
}: QRModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  // Format address for display (truncate middle)
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      setDragOffset(0);
      setCopied(false);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startYRef.current;
      if (delta > 0) {
        setDragOffset(delta);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      if (dragOffset > 150) {
        setIsAnimating(false);
        setTimeout(onClose, 300);
      } else {
        setDragOffset(0);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragOffset, onClose]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const delta = clientY - startYRef.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragOffset > 150) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Coco Wallet Address',
          text: `Send crypto to my Coco Wallet: ${address}`,
        });
      } catch (err) {
        // User cancelled share or share failed
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300`}
        style={{ 
          zIndex: 9998,
          opacity: isAnimating ? Math.max(0, 1 - dragOffset / 400) : 0,
          pointerEvents: isAnimating ? 'auto' : 'none'
        }}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 bg-[#1c1c1e] rounded-t-3xl shadow-2xl ${
          isDragging ? '' : 'transition-transform duration-300 ease-out'
        }`}
        style={{ 
          zIndex: 9999,
          maxHeight: '90vh',
          transform: isAnimating 
            ? `translateY(${dragOffset}px)` 
            : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 300ms ease-out'
        }}
      >
        {/* Handle Bar - Draggable Area */}
        <div 
          className="flex justify-center pt-2.5 pb-6 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-[140px] h-1 bg-[#a3a3a5] rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* QR Code Container */}
          <div className="bg-[#262528] backdrop-blur-[10px] rounded-2xl p-6 mb-6">
            {/* Title */}
            <p className="text-[#a3a3a5] text-base text-center mb-6 font-normal">
              Coco Wallet
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG 
                  value={`ethereum:${address}`}
                  size={245}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Address Display with Copy Icon */}
            <div className="flex items-center justify-center gap-2">
              <p className="text-white text-sm font-normal text-center">
                {formatAddress(address)}
              </p>
              <button
                onClick={handleCopy}
                className="transition-opacity hover:opacity-70"
              >
                <Image
                  src="/icons/copy.svg"
                  alt="Copy address"
                  width={11}
                  height={11}
                  className="w-[11px] h-[11px]"
                />
              </button>
            </div>
            
            {copied && (
              <p className="text-xs text-green-500 text-center mt-2">Address copied!</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-[60px] h-[60px] bg-[#29282b] rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/share.svg"
                alt="Share"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="w-[60px] h-[60px] bg-[#29282b] rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/copy.svg"
                alt="Copy"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

