'use client';

import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Toaster } from 'react-hot-toast';
import LoadingScreen from '@/components/LoadingScreen';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Get RPC URL from environment or use default
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  useEffect(() => {
    setMounted(true);
    // Hide loading screen after a short delay to ensure smooth transition
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Always wrap in providers, but only autoConnect after mount
  // This ensures useWallet hooks always have a context
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={mounted}>
        <WalletModalProvider>
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1F2937',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }}
          />
          {showLoading && <LoadingScreen />}
          <div className={showLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
            {children}
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
