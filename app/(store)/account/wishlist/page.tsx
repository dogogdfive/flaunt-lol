// app/(store)/account/wishlist/page.tsx
// Customer wishlist page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  Heart,
  Trash2,
  ShoppingCart,
  Loader2,
} from 'lucide-react';

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    priceSol: number;
    images: string[];
    quantity: number;
    status: string;
    store: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;

  useEffect(() => {
    if (connected && publicKey) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchWishlist = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!publicKey) return;
    setRemoving(productId);
    try {
      await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      setItems(items.filter(i => i.productId !== productId));
    } catch (error) {
      console.error('Failed to remove:', error);
    } finally {
      setRemoving(null);
    }
  };

  const addToCart = async (productId: string) => {
    if (!publicKey) return;
    setAddingToCart(productId);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        // Optionally remove from wishlist after adding to cart
        // await removeItem(productId);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Your Wishlist</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to view your saved items.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/account/orders" className="text-gray-400 hover:text-white">Orders</Link>
            <Link href="/account/trades" className="text-gray-400 hover:text-white">Trades</Link>
            <Link href="/account/wishlist" className="text-white font-medium">Wishlist</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">
          My Wishlist {items.length > 0 && <span className="text-gray-500">({items.length})</span>}
        </h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading wishlist...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Your wishlist is empty</h2>
            <p className="text-gray-400 mb-6">Save items you like by clicking the heart icon!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isSoldOut = item.product.quantity === 0;
              const isAvailable = item.product.status === 'APPROVED';

              return (
                <div
                  key={item.id}
                  className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden"
                >
                  <Link href={`/product/${item.product.slug}`} className="block relative">
                    <div className="aspect-square">
                      <img
                        src={item.product.images[0] || '/placeholder.png'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                      {(isSoldOut || !isAvailable) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {isSoldOut ? 'Sold Out' : 'Unavailable'}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/store/${item.product.store.slug}`} className="text-sm text-gray-500 hover:text-gray-300">
                      {item.product.store.name}
                    </Link>
                    <Link href={`/product/${item.product.slug}`}>
                      <h3 className="text-white font-medium mt-1 hover:text-blue-400">{item.product.name}</h3>
                    </Link>
                    <p className="text-blue-400 font-semibold mt-2">{item.product.priceSol} SOL</p>
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => addToCart(item.productId)}
                        disabled={isSoldOut || !isAvailable || addingToCart === item.productId}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {addingToCart === item.productId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        disabled={removing === item.productId}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        {removing === item.productId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
