'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SendModalContextType {
  isSendModalOpen: boolean;
  openSendModal: () => void;
  closeSendModal: () => void;
}

const SendModalContext = createContext<SendModalContextType | undefined>(undefined);

export function SendModalProvider({ children }: { children: ReactNode }) {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const openSendModal = () => setIsSendModalOpen(true);
  const closeSendModal = () => setIsSendModalOpen(false);

  return (
    <SendModalContext.Provider value={{ isSendModalOpen, openSendModal, closeSendModal }}>
      {children}
    </SendModalContext.Provider>
  );
}

export function useSendModal() {
  const context = useContext(SendModalContext);
  if (context === undefined) {
    throw new Error('useSendModal must be used within a SendModalProvider');
  }
  return context;
}

