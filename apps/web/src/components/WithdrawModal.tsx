'use client';

import { useState, useEffect, useRef } from 'react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw: (amount: string) => Promise<{ success: boolean; txHash?: string } | undefined>;
  currentBalance: string;
  isLoading?: boolean;
}

export function WithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  currentBalance,
  isLoading = false
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure initial render happens before animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      setDragOffset(0);
      setShowSuccess(false);
      setTxHash(null);
      setError('');
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Add global mouse move and up listeners when dragging
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

  // Always render when open, but control visibility with CSS
  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Match animation duration
  };

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    
    const delta = clientY - startYRef.current;
    // Only allow dragging down (positive delta)
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    // If dragged more than 150px, close the sheet
    if (dragOffset > 150) {
      handleClose();
    } else {
      // Snap back to original position
      setDragOffset(0);
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const hasBalance = parseFloat(currentBalance) > 0;

  const handleWithdraw = async () => {
    setError('');

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const balance = parseFloat(currentBalance);

    if (withdrawAmount > balance) {
      setError(`Insufficient balance. Maximum: ${currentBalance} USDC`);
      return;
    }

    try {
      const result = await onWithdraw(amount);
      // Show success state
      setShowSuccess(true);
      setTxHash(result?.txHash || null);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    }
  };

  const handleMaxClick = () => {
    setAmount(currentBalance);
    setError('');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
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
        className={`fixed inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-2xl border-t border-border ${
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
          className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 32px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pt-2">
            <div>
              <h2 className="text-2xl font-bold">Withdraw</h2>
              <p className="text-sm text-muted-foreground mt-1">From Aqua Protocol</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {showSuccess ? (
            /* Success State */
            <div className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-300">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Withdrawal Successful!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Your funds have been withdrawn from Aqua Protocol and returned to your wallet.
              </p>
              
              {txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
                >
                  View transaction
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
                {/* Debug button - remove in production */}
                {parseFloat(currentBalance) === 0 && (
                  <button
                    onClick={() => setShowSuccess(false)}
                    className="px-6 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors text-sm"
                  >
                    ← Back
                  </button>
                )}
              </div>
            </div>
          ) : !hasBalance ? (
            /* Empty State */
            <div className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Funds to Withdraw</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You don&apos;t have any deposited funds in Aqua Protocol yet. Make a deposit to start earning yield!
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(true);
                    setTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
                  }}
                  className="px-6 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                >
                  Preview Success
                </button>
              </div>
            </div>
          ) : (
            /* Withdraw Form */
            <div className="space-y-6">
              {/* Balance Display */}
              <div className="rounded-2xl bg-secondary p-6 border border-border">
                <p className="text-sm text-muted-foreground mb-2 font-medium">Available to Withdraw</p>
                <p className="text-4xl font-bold">
                  {currentBalance} USDC
                </p>
                <p className="text-xs text-muted-foreground mt-2">Currently earning yield in Aqua Protocol</p>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label htmlFor="withdraw-amount" className="block text-sm font-semibold">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <input
                    id="withdraw-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    disabled={isLoading}
                    className="w-full px-5 py-4 pr-24 text-2xl font-semibold bg-background border-2 border-input rounded-2xl focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    step="0.01"
                    min="0"
                    max={currentBalance}
                  />
                  <button
                    onClick={handleMaxClick}
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    MAX
                  </button>
                </div>
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-secondary/50 border border-border rounded-2xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Withdrawal Process</p>
                    <p className="text-muted-foreground">Funds will be withdrawn from Aqua Protocol and returned to your wallet. Gas fees apply.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-6 py-4 bg-secondary text-foreground rounded-2xl font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isLoading || !amount || parseFloat(amount) <= 0}
                  className="flex-1 px-6 py-4 text-primary-foreground bg-primary rounded-2xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Withdrawing...
                    </>
                  ) : (
                    'Confirm Withdrawal'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

