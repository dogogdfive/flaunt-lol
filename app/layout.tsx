// app/layout.tsx
// Root layout with Privy authentication provider

import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'flaunt.lol | Merch Marketplace on Solana',
  description: 'The easiest way to create and sell merchandise with crypto payments.',
  keywords: ['solana', 'crypto', 'merchandise', 'ecommerce', 'nft', 'web3'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
