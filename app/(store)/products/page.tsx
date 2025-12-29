// app/(store)/products/page.tsx
// Products listing page with search, sort, and filtering

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Heart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceSol: number;
  priceUsdc: number | null;
  images: string[];
  quantity: number;
  totalSold: number;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
  };
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Fetch wishlist IDs
  const fetchWishlist = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success && data.items) {
        const ids = new Set<string>(data.items.map((item: any) => item.product.id));
        setWishlistIds(ids);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  }, [publicKey]);

  // Toggle wishlist item
  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!publicKey) {
      setVisible(true);
      return;
    }

    const isInWishlist = wishlistIds.has(productId);

    try {
      if (isInWishlist) {
        await fetch(`/api/wishlist?productId=${productId}`, {
          method: 'DELETE',
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': publicKey.toBase58(),
          },
          body: JSON.stringify({ productId }),
        });
        setWishlistIds(prev => new Set(prev).add(productId));
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  // Fetch wishlist when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchWishlist();
    } else {
      setWishlistIds(new Set());
    }
  }, [connected, publicKey, fetchWishlist]);

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'popular', label: 'Best Selling' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
  ];

  useEffect(() => {
    fetchProducts();
  }, [sort, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', '24');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const getTitle = () => {
    switch (sort) {
      case 'popular':
        return 'Best Sellers';
      case 'newest':
        return 'New Products';
      case 'price_low':
      case 'price_high':
        return 'All Products';
      default:
        return 'All Products';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-xl font-bold hidden sm:block">flaunt.lol</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-gray-700 rounded-full py-2 px-4 pl-10 text-sm focus:outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </form>

          {/* Wallet */}
          {connected && publicKey ? (
            <div className="px-3 py-2 bg-[#1a1f2e] rounded-lg text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </div>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
            >
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{getTitle()}</h1>
            <p className="text-gray-400 mt-1">{total} products found</p>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="bg-[#1a1f2e] border border-gray-700 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="rounded-xl h-72 bg-[#1a1f2e] animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="bg-[#1a1f2e] rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all group"
                >
                  {/* Image */}
                  <div className="aspect-square bg-[#252a3a] relative overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🛍️
                      </div>
                    )}
                    {product.quantity < 10 && product.quantity > 0 && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-xs font-bold rounded">
                        Low Stock
                      </span>
                    )}
                    {product.quantity === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-1 bg-gray-600 text-xs font-bold rounded">
                        Out of Stock
                      </span>
                    )}
                    {/* Wishlist Heart Icon */}
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                        wishlistIds.has(product.id)
                          ? 'bg-pink-500 text-white'
                          : 'bg-black/50 text-white hover:bg-black/70'
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={wishlistIds.has(product.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {/* Store */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <span>{product.store.name}</span>
                      {product.store.isVerified && (
                        <svg
                          className="w-3 h-3 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-medium text-sm mb-2 line-clamp-2">{product.name}</h3>

                    {/* Sales count for best sellers */}
                    {sort === 'popular' && product.totalSold > 0 && (
                      <p className="text-xs text-gray-500 mb-1">{product.totalSold} sold</p>
                    )}

                    {/* Price */}
                    <p className="font-bold text-blue-400">
                      ${(product.priceUsdc || product.priceSol * 200).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-[#1a1f2e] hover:bg-[#252a3a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-[#1a1f2e] hover:bg-[#252a3a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-4">
            <p>© 2025 flaunt.lol</p>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
          <div className="flex items-center gap-1">
            <span>made with</span>
            <svg className="w-4 h-4 text-red-500 fill-red-500" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>in portland</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
