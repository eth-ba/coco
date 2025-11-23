'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWallets } from '@privy-io/react-auth';
import { parseUnits } from 'viem';
import { QRScanner } from './QRScanner';
import { AddressBook } from './AddressBook';
import { TransactionSuccess } from './TransactionSuccess';
import { USDC_ADDRESS, FLARE_MAINNET_CHAIN_ID } from '@/lib/constants';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (amount: string, toAddress: string) => Promise<void>;
}

export function SendModal({
  isOpen,
  onClose,
  onSend,
}: SendModalProps) {
  const router = useRouter();
  const { wallets } = useWallets();
  const [amount, setAmount] = useState('0');
  const [toAddress, setToAddress] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    onClose(); // Close modal state immediately
    setAmount('0');
    setToAddress('');
    setShowInfo(false);
    setIsScannerOpen(false);
    setIsAddressBookOpen(false);
    setIsSuccessOpen(false);
    setTxHash('');
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  const handleAmountChange = (value: string) => {
    // Remove any non-digit characters except decimal
    const cleaned = value.replace(/[^\d]/g, '');
    
    if (cleaned === '') {
      setAmount('0');
      return;
    }

    // Convert to number and back to ensure valid format
    const numValue = parseInt(cleaned, 10);
    setAmount(numValue.toString());
  };

  const handleAmountClick = () => {
    // Focus the hidden input
    amountInputRef.current?.focus();
  };

  const handleScanQR = () => {
    setIsScannerOpen(true);
  };

  const handleQRScanned = (address: string) => {
    setToAddress(address);
    setIsScannerOpen(false);
  };

  const handleAddressSelected = (address: string) => {
    setToAddress(address);
    setIsAddressBookOpen(false);
  };

  const handleSend = async () => {
    if (!toAddress || amount === '0' || isSending) return;
    
    try {
      setIsSending(true);
      
      // Get the smart account wallet
      const smartAccount = wallets.find((w) => w.walletClientType === 'privy');
      if (!smartAccount) {
        throw new Error('No smart account found');
      }

      await smartAccount.switchChain(FLARE_MAINNET_CHAIN_ID);
      const provider = await smartAccount.getEthereumProvider();

      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount, 6);

      // ERC20 transfer function signature: transfer(address to, uint256 amount)
      const transferData = `0xa9059cbb${
        toAddress.slice(2).padStart(64, '0')
      }${amountInUnits.toString(16).padStart(64, '0')}`;

      // Prepare transaction params
      const txParams = {
        from: smartAccount.address,
        to: USDC_ADDRESS,
        data: transferData,
        value: '0x0',
      };

      // Estimate gas for the transaction
      const gasEstimate = await provider.request({
        method: 'eth_estimateGas',
        params: [txParams]
      });

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

      // Send the transaction with gas limit
      const txHashResult = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          ...txParams,
          gas: `0x${gasLimit.toString(16)}`,
        }]
      });

      console.log('✅ Transaction sent:', txHashResult);
      setTxHash(txHashResult as string);
      
      // Close send modal and show success
      setIsAnimating(false);
      setIsSuccessOpen(true);
      
      // Call the optional onSend callback
      await onSend?.(amount, toAddress);
    } catch (error) {
      console.error('❌ Send failed:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Calculate font size based on number of digits
  const getAmountFontSize = () => {
    const displayAmount = `${amount}.00`;
    const length = displayAmount.length;
    
    if (length <= 6) return 'text-[48px]';
    if (length <= 8) return 'text-[40px]';
    if (length <= 10) return 'text-[32px]';
    return 'text-[24px]';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 cursor-pointer`}
        style={{ 
          zIndex: 9998,
          opacity: isAnimating ? 1 : 0,
          pointerEvents: (isAnimating && !isScannerOpen && !isAddressBookOpen) ? 'auto' : 'none'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
      />

      {/* Modal */}
      <div 
        className={`fixed inset-0 transition-all duration-300`}
        style={{ 
          zIndex: 9999,
          opacity: isAnimating ? 1 : 0,
          pointerEvents: isAnimating ? 'auto' : 'none'
        }}
      >
        {/* Top Header with Back button and Title - Fixed at top */}
        <div className="absolute top-8 left-0 right-0 px-6">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              type="button"
              className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-70 cursor-pointer relative z-[10002]"
            >
              <Image
                src="/icons/back.svg"
                alt="Back"
                width={24}
                height={24}
                className="pointer-events-none"
              />
            </button>
            
            <h2 className="text-white text-xl font-medium">Send</h2>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Centered Card */}
        <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
          <div 
            className="bg-[#1c1c1e] rounded-2xl w-full max-w-md relative pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              transform: isAnimating ? 'scale(1)' : 'scale(0.95)',
              transition: 'transform 300ms'
            }}
          >
          {/* Card Header with List and QR buttons */}
          <div className="flex items-center justify-between p-6 pb-0">
            <button
              onClick={() => setIsAddressBookOpen(true)}
              className="w-6 h-6 transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/list.svg"
                alt="Address Book"
                width={24}
                height={24}
                className="w-full h-full"
              />
            </button>
            
            <button
              onClick={handleScanQR}
              className="w-6 h-6 transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/qr.svg"
                alt="Scan QR"
                width={24}
                height={24}
                className="w-full h-full"
              />
            </button>
          </div>

          {/* Amount Section */}
          <div className="flex flex-col items-center gap-1 py-8 px-6">
            <p className="text-[#a3a3a5] text-base font-normal mb-2">
              Enter Amount
            </p>
            
            {/* Amount Display - Click to edit - Fixed height container */}
            <div 
              onClick={handleAmountClick}
              className="flex items-center justify-center cursor-text h-[58px]"
            >
              <p 
                className={`${getAmountFontSize()} font-medium text-white transition-all duration-200`}
              >
                {amount}.00
              </p>
              {/* Hidden input for keyboard */}
              <input
                ref={amountInputRef}
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                style={{ caretColor: 'transparent' }}
              />
            </div>
            
            <p className="text-[#a3a3a5] text-base font-normal">
              USDC
            </p>
          </div>

          {/* Address Input Section */}
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2">
                <p className="text-[#a3a3a5] text-sm font-normal">
                  Sending to Address
                </p>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="w-4 h-4 rounded-full border border-[#a3a3a5] flex items-center justify-center transition-opacity hover:opacity-70"
                >
                  <span className="text-[#a3a3a5] text-xs font-bold">i</span>
                </button>
              </div>

              {/* Info Box */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showInfo ? 'max-h-[200px] opacity-100 mb-2' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="bg-[#262528] rounded-lg p-3 transform transition-transform duration-300 ease-in-out"
                  style={{
                    transform: showInfo ? 'translateY(0)' : 'translateY(-10px)'
                  }}
                >
                  <p className="text-xs text-[#a3a3a5] leading-relaxed">
                    You are sending USDC on Flare mainnet. Make sure the recipient address is correct. Transactions cannot be reversed once confirmed.
                  </p>
                </div>
              </div>
              
              <textarea
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
                rows={2}
                className="bg-transparent text-white text-sm font-normal w-full pb-2 border-b border-white/20 focus:border-white/40 outline-none transition-colors placeholder:text-[#a3a3a5]/50 resize-none break-all"
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleSend}
              disabled={!toAddress || amount === '0' || isSending}
              className="w-full bg-white text-black py-3 rounded-full font-medium text-base transition-all hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* QR Scanner */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScanned}
        onOpenAddressBook={() => {
          setIsScannerOpen(false);
          setIsAddressBookOpen(true);
        }}
      />

      {/* Address Book */}
      <AddressBook
        isOpen={isAddressBookOpen}
        onClose={() => setIsAddressBookOpen(false)}
        onSelectAddress={handleAddressSelected}
      />

      {/* Transaction Success */}
      <TransactionSuccess
        isOpen={isSuccessOpen}
        amount={amount}
        toAddress={toAddress}
        txHash={txHash}
        onClose={() => {
          setIsSuccessOpen(false);
          onClose();
          setAmount('0');
          setToAddress('');
          setTxHash('');
        }}
      />
    </>
  );
}

