// components/RecentlyViewed.tsx
// Recently viewed products component with localStorage persistence

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  storeName: string;
  viewedAt: number;
}

const STORAGE_KEY = 'flaunt_recently_viewed';
const MAX_ITEMS = 12;

// Add a product to recently viewed
export function addToRecentlyViewed(product: Omit<RecentProduct, 'viewedAt'>) {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let items: RecentProduct[] = stored ? JSON.parse(stored) : [];

    // Remove if already exists
    items = items.filter(p => p.id !== product.id);

    // Add to front
    items.unshift({
      ...product,
      viewedAt: Date.now(),
    });

    // Keep only MAX_ITEMS
    items = items.slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving recently viewed:', e);
  }
}

// Get recently viewed products
export function getRecentlyViewed(): RecentProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Clear recently viewed
export function clearRecentlyViewed() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  currentProductId?: string;
  maxItems?: number;
}

export default function RecentlyViewed({ currentProductId, maxItems = 4 }: Props) {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const items = getRecentlyViewed()
      .filter(p => p.id !== currentProductId)
      .slice(0, maxItems);
    setProducts(items);
  }, [currentProductId, maxItems]);

  if (!mounted || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-white">Recently Viewed</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="group bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
          >
            <div className="aspect-square relative">
              <img
                src={product.image || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h4 className="text-white text-sm font-medium truncate">{product.name}</h4>
              <p className="text-gray-500 text-xs truncate">{product.storeName}</p>
              <p className="text-blue-400 font-semibold mt-1">{product.price} SOL</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
