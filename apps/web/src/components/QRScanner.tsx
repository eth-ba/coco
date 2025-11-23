'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
  onOpenAddressBook?: () => void;
}

export function QRScanner({ isOpen, onClose, onScan, onOpenAddressBook }: QRScannerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const hasScannedRef = useRef(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      hasScannedRef.current = false;
      startScanning();
    } else {
      setIsAnimating(false);
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startScanning = async () => {
    try {
      // Dynamically import html5-qrcode only on client side
      const { Html5Qrcode } = await import('html5-qrcode');
      setError('');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Make the scanning box cover most of the viewport
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent multiple scans
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // Extract address from different formats
          let address = decodedText;
          
          // Handle ethereum: URI format
          if (address.startsWith('ethereum:')) {
            address = address.replace('ethereum:', '');
          }
          
          // Handle URLs with address parameter
          const urlMatch = address.match(/address=([0-9a-fA-Fx]+)/);
          if (urlMatch) {
            address = urlMatch[1];
          }

          // Validate it looks like an Ethereum address
          if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
            onScan(address);
            handleClose();
          } else {
            setError('Invalid Ethereum address in QR code');
            hasScannedRef.current = false;
          }
        },
        () => {
          // Scanning error - ignore, this happens continuously
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        
        // Check if scanner is in a state where it can be stopped
        if (scanner.getState() === 2) { // 2 = SCANNING state
          await scanner.stop();
        }
      } catch (err) {
        // Silently handle transition errors
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('transition')) {
          console.error('Error stopping scanner:', err);
        }
      } finally {
        isStoppingRef.current = false;
      }
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setError('');
    }, 300);
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Full Screen Scanner */}
      <div 
        className="fixed inset-0 bg-black transition-opacity duration-300"
        style={{ 
          zIndex: 10000,
          opacity: isAnimating ? 1 : 0,
          pointerEvents: (isOpen && isAnimating) ? 'auto' : 'none',
        }}
      >
        {/* Camera Feed - Full Screen */}
        <div className="absolute inset-0 overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: `
            #qr-reader {
              width: 100% !important;
              height: 100% !important;
            }
            #qr-reader video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
            }
            #qr-reader__dashboard_section,
            #qr-reader__dashboard_section_csr {
              display: none !important;
            }
            #qr-reader__scan_region {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              border: 3px solid #7FFF00 !important;
            }
            #qr-reader__scan_region img {
              display: none !important;
            }
          `}} />
          <div id="qr-reader" className="w-full h-full" />
        </div>

        {/* Gradient Overlay - Darkens edges */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 25%, rgba(0, 0, 0, 0.6) 75%)',
          }}
        />

        {/* Back Button - Top Left */}
        <div className="absolute top-8 left-0 right-0 px-6 z-10">
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
        </div>

        {/* List Button - Bottom Left */}
        {onOpenAddressBook && (
          <button
            onClick={() => {
              handleClose();
              onOpenAddressBook();
            }}
            className="absolute bottom-24 left-6 transition-opacity hover:opacity-70 active:scale-95 z-10"
          >
            <Image
              src="/icons/qr-list.svg"
              alt="Address List"
              width={48}
              height={48}
            />
          </button>
        )}


        {/* Error Message */}
        {error && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl max-w-xs">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </>
  );
}

