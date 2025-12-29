// app/(store)/product/[slug]/ProductClient.tsx
// Client component for product interactions

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  ShoppingCart,
  Heart,
  Share2,
  Store,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Minus,
  Plus,
  AlertTriangle,
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  priceSol: number | null;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceSol: number;
  images: string[];
  quantity: number;
  status: string;
  variants: Variant[];
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
  };
  category: { id: string; name: string; slug: string } | null;
  bondingEnabled: boolean;
  bondingGoal: number;
  bondingCurrent: number;
  isPreview?: boolean;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  priceSol: number;
  image: string;
  quantity: number;
}

interface Props {
  product: Product;
  relatedProducts: RelatedProduct[];
}

export default function ProductClient({ product, relatedProducts }: Props) {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;

  const variant = product.variants.find(v => v.id === selectedVariant);
  const currentPrice = variant?.priceSol ?? product.priceSol;
  const currentStock = variant?.quantity ?? product.quantity;
  const isSoldOut = currentStock === 0;

  const handleAddToCart = async () => {
    if (!connected || !wallet.publicKey) {
      setVisible(true);
      return;
    }

    setAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': wallet.publicKey.toBase58(),
        },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant,
          quantity,
        }),
      });

      if (res.ok) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      }
    } catch (error) {
      console.error('Add to cart error:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!connected || !wallet.publicKey) {
      setVisible(true);
      return;
    }

    try {
      if (wishlisted) {
        await fetch(`/api/wishlist?productId=${product.id}`, {
          method: 'DELETE',
          headers: { 'x-wallet-address': wallet.publicKey.toBase58() },
        });
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': wallet.publicKey.toBase58(),
          },
          body: JSON.stringify({ productId: product.id }),
        });
      }
      setWishlisted(!wishlisted);
    } catch (error) {
      console.error('Wishlist error:', error);
    }
  };

  const bondingPercent = product.bondingEnabled 
    ? Math.min((product.bondingCurrent / product.bondingGoal) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Preview Banner */}
      {product.isPreview && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <span className="text-yellow-400 font-medium">Preview Mode</span>
              <span className="text-yellow-400/80 text-sm ml-2">
                This product is {product.status === 'PENDING' ? 'pending approval' : product.status === 'DRAFT' ? 'a draft' : product.status === 'REJECTED' ? 'rejected' : 'not live'} and cannot be purchased.
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <Link href="/checkout" className="p-2 text-gray-400 hover:text-white">
            <ShoppingCart className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link href={`/store/${product.store.slug}`} className="hover:text-white">{product.store.name}</Link>
          <span>/</span>
          <span className="text-gray-300">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-[#111827] rounded-2xl overflow-hidden relative">
              <img
                src={product.images[selectedImage] || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(i => i > 0 ? i - 1 : product.images.length - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(i => i < product.images.length - 1 ? i + 1 : 0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      selectedImage === i ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Store */}
            <Link href={`/store/${product.store.slug}`} className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-full bg-[#1f2937] overflow-hidden">
                {product.store.logoUrl ? (
                  <img src={product.store.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-full h-full p-1.5 text-gray-500" />
                )}
              </div>
              <span className="text-gray-400 group-hover:text-white">{product.store.name}</span>
              {product.store.isVerified && (
                <span className="text-blue-400 text-xs">✓</span>
              )}
            </Link>

            <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
            
            {product.category && (
              <span className="inline-block px-3 py-1 bg-[#1f2937] text-gray-400 text-sm rounded-full mb-4">
                {product.category.name}
              </span>
            )}

            <div className="text-3xl font-bold text-blue-400 mb-6">${(currentPrice * 200).toFixed(2)}</div>

            {/* Bonding Curve */}
            {product.bondingEnabled && (
              <div className="mb-6 p-4 bg-[#111827] rounded-xl">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Bonding Progress</span>
                  <span className="text-white">{product.bondingCurrent} / {product.bondingGoal}</span>
                </div>
                <div className="h-2 bg-[#1f2937] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${bondingPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Options</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                      disabled={v.quantity === 0}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedVariant === v.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : v.quantity === 0
                          ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {v.name}
                      {v.quantity === 0 && ' (Sold Out)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Quantity</label>
              <div className="inline-flex items-center gap-3 bg-[#1f2937] rounded-lg p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#374151] rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-white font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(currentStock, q + 1))}
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#374151] rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="ml-4 text-sm text-gray-500">{currentStock} available</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut || addingToCart || product.isPreview}
                className={`flex-1 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                  product.isPreview
                    ? 'bg-yellow-600/20 text-yellow-400 cursor-not-allowed border border-yellow-500/30'
                    : isSoldOut
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : addedToCart
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {product.isPreview ? (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    Preview Only
                  </>
                ) : addingToCart ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added!
                  </>
                ) : isSoldOut ? (
                  'Sold Out'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={handleWishlist}
                className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-colors ${
                  wishlisted
                    ? 'border-pink-500 bg-pink-500/10 text-pink-500'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => navigator.share?.({ url: window.location.href, title: product.name })}
                className="w-14 h-14 flex items-center justify-center rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="prose prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-gray-400 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-white mb-6">More from {product.store.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
                >
                  <div className="aspect-square relative">
                    <img
                      src={p.image || '/placeholder.png'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {p.quantity === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-white text-sm font-medium truncate">{p.name}</h3>
                    <p className="text-blue-400 font-semibold mt-1">${(p.priceSol * 200).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
