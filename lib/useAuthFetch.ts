// lib/useAuthFetch.ts
// Hook to make authenticated API calls with wallet address

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';

export function useAuthFetch() {
  const { publicKey } = useWallet();

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);

      if (publicKey) {
        headers.set('x-wallet-address', publicKey.toBase58());
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    },
    [publicKey]
  );

  return authFetch;
}

// Simple helper for server components to pass wallet via body
export function addWalletToBody(body: any, walletAddress: string | null) {
  if (!walletAddress) return body;
  return { ...body, walletAddress };
}
