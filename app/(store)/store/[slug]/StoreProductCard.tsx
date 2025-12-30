'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  priceSol: number;
  images: string[];
  quantity: number;
  avgRating: number | null;
  reviewCount: number;
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    } else {
      stars.push(<span key={i} className="text-gray-600">★</span>);
    }
  }

  return <span className="text-xs">{stars}</span>;
}

export default function StoreProductCard({ product }: { product: Product }) {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [mounted, setMounted] = useState(false);

  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if product is in wishlist
  const checkWishlist = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success && data.items) {
        const isInWishlist = data.items.some((item: any) => item.product.id === product.id);
        setIsWishlisted(isInWishlist);
      }
    } catch (error) {
      console.error('Failed to check wishlist:', error);
    }
  }, [publicKey, product.id]);

  useEffect(() => {
    if (connected && publicKey) {
      checkWishlist();
    } else {
      setIsWishlisted(false);
    }
  }, [connected, publicKey, checkWishlist]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!publicKey) {
      setVisible(true);
      return;
    }

    try {
      if (isWishlisted) {
        await fetch(`/api/wishlist?productId=${product.id}`, {
          method: 'DELETE',
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        setIsWishlisted(false);
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': publicKey.toBase58(),
          },
          body: JSON.stringify({ productId: product.id }),
        });
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
    >
      <div className="aspect-square relative">
        <img
          src={product.images[0] || '/placeholder.png'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.quantity === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-semibold">Sold Out</span>
          </div>
        )}
        {/* Wishlist Heart Icon */}
        <button
          onClick={toggleWishlist}
          className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
            isWishlisted
              ? 'bg-pink-500 text-white'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-white font-medium truncate">{product.name}</h3>
        {/* Rating */}
        {product.avgRating && (
          <div className="flex items-center gap-1 mt-1">
            <StarRating rating={product.avgRating} />
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
        )}
        <p className="text-blue-400 font-semibold mt-1">${(Number(product.priceSol) * 200).toFixed(2)}</p>
      </div>
    </Link>
  );
}
