// app/(store)/collections/page.tsx
// Public collections page - browse all stores

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Package, Star, ArrowLeft } from 'lucide-react';

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  avgRating: number | null;
  reviewCount: number;
  _count: {
    products: number;
  };
}

export default function CollectionsPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/stores?limit=50');
        const data = await res.json();
        if (data.success && data.stores) {
          setStores(data.stores);
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Stores</h1>
          <p className="text-gray-400">
            Discover unique stores and collections from verified sellers
          </p>
        </div>

        {/* Stores Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#111827] rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : stores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/store/${store.slug}`}
                className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500 transition-colors group"
              >
                {/* Banner */}
                <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-700 relative">
                  {store.bannerUrl && (
                    <img
                      src={store.bannerUrl}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
                </div>

                {/* Store Info */}
                <div className="p-4 -mt-10 relative">
                  {/* Logo */}
                  <div className="w-16 h-16 rounded-xl bg-[#1f2937] border-4 border-[#111827] overflow-hidden mb-3">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Name & Verified */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {store.name}
                    </h3>
                    {store.isVerified && (
                      <svg className="w-5 h-5 text-pink-500" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
                      </svg>
                    )}
                  </div>

                  {/* Description */}
                  {store.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {store.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {store._count?.products || 0} products
                    </span>
                    {store.reviewCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {store.avgRating?.toFixed(1)} ({store.reviewCount})
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold text-white mb-2">No Stores Yet</h2>
            <p className="text-gray-400 mb-6">Be the first to launch a store!</p>
            <Link
              href="/become-a-seller"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Launch Your Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
