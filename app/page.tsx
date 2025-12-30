// app/page.tsx
// Storefront homepage - fetches ONLY approved products from API

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Confetti effect that emerges from a button
const triggerConfetti = (e: React.MouseEvent<HTMLAnchorElement>) => {
  // Get button position immediately
  const button = e.currentTarget;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#ff69b4', '#00ffff', '#ff1493'];
  const confettiCount = 100;

  // Create confetti container to ensure proper stacking
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const size = Math.random() * 12 + 6;
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = Math.random() * 500 + 300;
    const endX = Math.cos(angle) * velocity;
    const endY = Math.sin(angle) * velocity - 150;
    const rotation = Math.random() * 720 - 360;
    const duration = Math.random() * 1040 + 780; // 30% slower

    confetti.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${originX}px;
      top: ${originY}px;
      pointer-events: none;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      transform: translate(-50%, -50%);
      transition: all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 1;
    `;
    container.appendChild(confetti);

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        confetti.style.transform = `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${rotation}deg) scale(0.3)`;
        confetti.style.opacity = '0';
      });
    });
  }

  // Cleanup after animation
  setTimeout(() => {
    container.remove();
  }, 1950);
};

// Kawaii trade messages with Japanese emoticons
const kawaiiTradeMessages = [
  "wanna trade? ୧( ˵ ° ~ ° ˵ )୨",
  "let's swap! (ﾉ◕ヮ◕)ﾉ*:・゚✧",
  "trade with me~ (◕‿◕✿)",
  "swap time! ٩(◕‿◕｡)۶",
  "got something cool? (づ｡◕‿‿◕｡)づ",
  "trade offer? ♡(˃͈ દ ˂͈ ༶ )",
  "wanna exchange? (≧◡≦) ♡",
  "let's barter! ヽ(>∀<☆)☆",
  "trade pls~ (っ˘ω˘ς )",
  "swap swap! ✧･ﾟ: *✧･ﾟ:*",
  "ur item 4 mine? (◠‿◠)♡",
  "trade time~! ₍ᐢ•ﻌ•ᐢ₎*ﾟ",
  "let's make a deal! ♪(´ε` )",
  "wanna swap? (✿◠‿◠)",
  "trade offer incoming~ ٩(♡ε♡ )۶",
  "your stuff looks cool! ( ˘▽˘)っ♨",
  "gimme gimme~ (っ´▽`)っ",
  "trade? trade! ⊂(◉‿◉)つ",
  "swap with me pls (｡♥‿♥｡)",
  "i want it! ☆*:.｡.o(≧▽≦)o.｡.:*☆",
  "trade buddies? ヾ(＾∇＾)",
  "let's exchange! (ノ´ヮ`)ノ*: ・゚✧",
  "swapsies? ♡＾▽＾♡",
  "wanna trade stuff? (◕ᴗ◕✿)",
  "deal? deal! ٩(｡•́‿•̀｡)۶",
  "trading hours~ ☆ﾐ(o*･ω･)ﾉ",
  "swap offer! (ﾉ´ з `)ノ♡",
  "trade vibes~ ✿◕ ‿ ◕✿",
];

// Kawaii floating emojis for decoration
const kawaiiFloatingEmojis = [
  "✧", "♡", "☆", "✿", "♪", "✦", "❀", "◕‿◕", "★", "♥",
  "✧･ﾟ", "｡ﾟ☆", "･ﾟ✧", "♡゜", "☆゜", "✿゜",
];

// Types
interface ProductReview {
  id: string;
  rating: number;
  content: string | null;
  userName: string;
  createdAt: string;
}

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
  bondingEnabled: boolean;
  bondingGoal: number;
  bondingCurrent: number;
  category: string;
  avgRating: number | null;
  reviewCount: number;
  reviews: ProductReview[];
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
    tradesEnabled?: boolean;
    ownerId?: string;
  };
}

interface FeaturedStore {
  id: string;
  name: string;
  slug: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  isNew: boolean;
  createdAt: string;
}

// Star rating component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
  };
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

  return <span className={sizeClasses[size]}>{stars}</span>;
}

// Fallback gradient colors for stores without banners
const gradientColors = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0d7377 0%, #14ffec 100%)',
  'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
  'linear-gradient(135deg, #5f27cd 0%, #341f97 100%)',
  'linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%)',
  'linear-gradient(135deg, #00d2d3 0%, #54a0ff 100%)',
];

// Main export - uses Solana wallet adapter
export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  // Only use wallet hooks after mounting (client-side)
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;
  const disconnect = wallet.disconnect;

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [featuredStores, setFeaturedStores] = useState<FeaturedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>('USDC');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(200); // Live SOL price
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatarUrl: string | null; username: string | null } | null>(null);

  // Check if connected wallet is admin from database
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!connected || !publicKey) {
        setIsAdmin(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/check-admin', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [connected, publicKey]);

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!connected || !publicKey) {
        setUserProfile(null);
        return;
      }

      try {
        const res = await fetch('/api/account/profile', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUserProfile({ avatarUrl: data.user.avatarUrl, username: data.user.username });
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, [connected, publicKey]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Fetch cart count
  const fetchCartCount = useCallback(async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/cart', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setCartCount(data.itemCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  }, [publicKey]);

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
    e.stopPropagation(); // Prevent card click
    if (!publicKey) {
      handleConnect();
      return;
    }

    const isInWishlist = wishlistIds.has(productId);

    try {
      if (isInWishlist) {
        // Remove from wishlist
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
        // Add to wishlist
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

  // Fetch cart count and wishlist when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchCartCount();
      fetchWishlist();
    } else {
      setCartCount(0);
      setWishlistIds(new Set());
    }
  }, [connected, publicKey, fetchCartCount, fetchWishlist]);

  // Function to fetch best sellers - can be called to refresh
  const fetchBestSellers = async () => {
    try {
      const res = await fetch('/api/products?sort=popular&limit=12');
      const data = await res.json();
      if (data.success) {
        // Best sellers = products with actual confirmed sales (totalSold > 0)
        const productsWithSales = data.products.filter((p: Product) => p.totalSold > 0);
        setBestSellers(productsWithSales);
        console.log('[Homepage] Best sellers refreshed:', productsWithSales.length);
      }
    } catch (error) {
      console.error('Failed to refresh best sellers:', error);
    }
  };

  // Fetch approved products, stores, and SOL price from API
  useEffect(() => {
    async function fetchData() {
      console.log('[Homepage] Starting data fetch...');
      try {
        // Fetch all data in parallel (including live SOL price)
        const [newRes, bestRes, storesRes, priceRes] = await Promise.all([
          fetch('/api/products?sort=newest&limit=12'),
          fetch('/api/products?sort=popular&limit=12'),
          fetch('/api/stores?limit=10'),
          fetch('/api/price'),
        ]);

        console.log('[Homepage] API responses received');

        const newData = await newRes.json();
        console.log('[Homepage] New products:', newData);
        if (newData.success) {
          setProducts(newData.products);
        }

        // Best sellers - sorted by totalSold
        const bestData = await bestRes.json();
        if (bestData.success) {
          const productsWithSales = bestData.products.filter((p: Product) => p.totalSold > 0);
          setBestSellers(productsWithSales);
          console.log('[Homepage] Best sellers (with sales):', productsWithSales.length);
        }

        // Set featured stores for the carousel
        const storesData = await storesRes.json();
        console.log('[Homepage] Stores:', storesData);
        if (storesData.success && storesData.stores?.length > 0) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const stores = storesData.stores.map((store: any) => ({
            id: store.id,
            name: store.name,
            slug: store.slug,
            bannerUrl: store.bannerUrl,
            logoUrl: store.logoUrl,
            createdAt: store.createdAt,
            // Mark as "new" only if created within the last week
            isNew: new Date(store.createdAt) > oneWeekAgo,
          }));
          setFeaturedStores(stores);
          console.log('[Homepage] Featured stores set:', stores);
        }

        // Set live SOL price
        const priceData = await priceRes.json();
        if (priceData.success && priceData.price) {
          setSolPriceUsd(priceData.price);
        }
      } catch (error) {
        console.error('[Homepage] Failed to fetch data:', error);
      } finally {
        setLoading(false);
        console.log('[Homepage] Loading complete');
      }
    }

    fetchData();

    // Refresh SOL price every 60 seconds and best sellers every 30 seconds
    const priceInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/price');
        const data = await res.json();
        if (data.success && data.price) {
          setSolPriceUsd(data.price);
        }
      } catch (error) {
        console.error('Failed to refresh SOL price:', error);
      }
    }, 60000);

    // Refresh best sellers every 30 seconds for real-time updates
    const bestSellersInterval = setInterval(fetchBestSellers, 30000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(bestSellersInterval);
    };
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (featuredStores.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredStores.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredStores.length]);

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Open wallet modal to connect
  const handleConnect = () => {
    setVisible(true);
  };

  // Format price - always show USDC
  const formatPrice = (product: Product) => {
    const usdcPrice = product.priceUsdc || (product.priceSol ? product.priceSol * solPriceUsd : 0);
    return `$${usdcPrice.toFixed(2)}`;
  };

  // Truncated wallet address
  const truncateWallet = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="flaunt.lol" className="w-14 h-14 rounded-lg object-cover" />
              <span className="text-xl font-bold hidden sm:block">flaunt.lol</span>
            </a>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1f2e] border border-gray-700 rounded-full py-2 px-4 pl-10 text-sm focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-gray-500 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Launch a Store Button */}
            <a
              href="/become-a-seller"
              onClick={(e) => {
                e.preventDefault();
                triggerConfetti(e);
                setTimeout(() => {
                  window.location.href = '/become-a-seller';
                }, 600);
              }}
              className="launch-store-btn hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launch a Store
            </a>

            {/* Cart */}
            <a href="/checkout" className="p-2 hover:bg-gray-800 rounded-lg relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </a>

            {/* Profile / Connect Wallet */}
            {connected && publicKey ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-lg transition-colors"
                >
                  {/* Profile Avatar */}
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {userProfile?.username ? (
                        <span className="text-white font-medium text-sm">{userProfile.username.charAt(0).toUpperCase()}</span>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-xs text-gray-400">{userProfile?.username ? `@${userProfile.username}` : 'Connected'}</div>
                    <div className="text-sm font-medium">{truncateWallet(publicKey.toBase58())}</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[#1f2937] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                      {/* Wallet Info */}
                      <div className="px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-400">Connected Wallet</span>
                        </div>
                        <p className="text-sm font-mono text-white mt-1 truncate">
                          {publicKey.toBase58()}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <a
                          href="/account/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </a>
                        <a
                          href="/account/orders"
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          My Orders
                        </a>
                        <a
                          href="/account/wishlist"
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Wishlist
                        </a>
                        <a
                          href="/account/messages"
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Messages
                        </a>
                        <a
                          href="/support"
                          className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Support
                        </a>
                      </div>

                      {/* Disconnect */}
                      <div className="border-t border-gray-700 py-2">
                        <button
                          onClick={() => {
                            handleDisconnect();
                            setProfileDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 w-full text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="hidden sm:block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
              >
                Connect
              </button>
            )}

            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Menu Dropdown */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-[#1f2937] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Navigation Links */}
                    <div className="py-2 border-b border-gray-700">
                      <a
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Home</span>
                      </a>
                      <a
                        href="/collections"
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="font-medium">Collections</span>
                      </a>
                      <a
                        href="/auctions"
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Auctions</span>
                      </a>
                    </div>

                    {/* Connect Wallet - Mobile Only */}
                    {!connected && (
                      <div className="py-2 border-b border-gray-700 sm:hidden">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleConnect();
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors w-full"
                        >
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <div>
                            <div className="font-medium">Connect Wallet</div>
                            <div className="text-xs text-gray-500">Sign in with Solana</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Portals */}
                    <div className="py-2 border-b border-gray-700">
                      <a
                        href="/merchant/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <div className="font-medium">Merchant Portal</div>
                          <div className="text-xs text-gray-500">Manage your store</div>
                        </div>
                      </a>
                      {isAdmin && (
                        <a
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#374151] hover:text-white transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <div className="font-medium">Admin Portal</div>
                            <div className="text-xs text-gray-500">Platform settings</div>
                          </div>
                        </a>
                      )}
                    </div>

                    {/* Launch Store CTA - Mobile Only */}
                    <div className="p-3 sm:hidden">
                      <a
                        href="/become-a-seller"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          triggerConfetti(e);
                          setTimeout(() => {
                            window.location.href = '/become-a-seller';
                          }, 600);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Launch a Store
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="pt-16">
        {/* Featured + Best Sellers - Two Column Layout */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Featured - Store Carousel (Left ~60%) */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Featured</h2>
                {featuredStores.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev - 1 + featuredStores.length) % featuredStores.length)}
                      className="p-1.5 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev + 1) % featuredStores.length)}
                      className="p-1.5 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="rounded-2xl h-[420px] bg-[#1a1f2e] animate-pulse" />
              ) : featuredStores.length > 0 ? (
                <a
                  href={`/store/${featuredStores[currentSlide]?.slug}`}
                  className="relative rounded-2xl overflow-hidden block hover:ring-2 hover:ring-blue-500 transition-all group h-[420px]"
                  style={{
                    background: featuredStores[currentSlide]?.bannerUrl
                      ? `url(${featuredStores[currentSlide].bannerUrl}) center/cover`
                      : gradientColors[currentSlide % gradientColors.length]
                  }}
                >
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                      featuredStores[currentSlide]?.isNew
                        ? 'bg-green-500 text-black'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {featuredStores[currentSlide]?.isNew ? 'NEW STORE' : 'Featured Store'}
                    </span>
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {featuredStores[currentSlide]?.logoUrl && (
                        <img
                          src={featuredStores[currentSlide].logoUrl!}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border-2 border-white/20"
                        />
                      )}
                      <div>
                        <h3 className="text-3xl font-bold text-white">{featuredStores[currentSlide]?.name}</h3>
                        <p className="text-gray-300 text-sm">Exclusive merchandise</p>
                      </div>
                    </div>
                    <span className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                      Visit Store
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>

                  {/* Carousel Dots */}
                  {featuredStores.length > 1 && (
                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                      {featuredStores.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentSlide(i);
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentSlide ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </a>
              ) : (
                <div className="rounded-2xl h-[420px] bg-[#1a1f2e] flex items-center justify-center text-gray-500">
                  <p>No featured stores yet</p>
                </div>
              )}
            </div>

            {/* Best Sellers - 2x2 Grid (Right ~40%) */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Best Sellers</h2>
                <a href="/products?sort=popular" className="text-gray-400 hover:text-white text-sm">
                  See All
                </a>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl h-[200px] bg-[#1a1f2e] animate-pulse" />
                  ))}
                </div>
              ) : (bestSellers.filter(p => p.totalSold > 0).length > 0 ? bestSellers.filter(p => p.totalSold > 0) : bestSellers).slice(0, 4).length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {(bestSellers.filter(p => p.totalSold > 0).length > 0 ? bestSellers.filter(p => p.totalSold > 0) : bestSellers).slice(0, 4).map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-[#1a1f2e] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                    >
                      {/* Image */}
                      <div className="aspect-square bg-[#252a3a] relative overflow-hidden">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="text-xs text-gray-400 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{product.store.name}</p>
                        {/* Rating */}
                        {product.avgRating && (
                          <div className="flex items-center gap-1 mt-1">
                            <StarRating rating={product.avgRating} size="xs" />
                            <span className="text-[10px] text-gray-500">({product.reviewCount})</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-blue-400">
                            ${(product.priceUsdc || product.priceSol * 100).toFixed(2)} USDC
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => toggleWishlist(product.id, e)}
                              className={`text-xl hover:scale-125 transition-transform ${wishlistIds.has(product.id) ? 'text-red-500' : 'text-pink-400 hover:text-pink-300'}`}
                              title={wishlistIds.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {wishlistIds.has(product.id) ? '♥' : '♡'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!publicKey) {
                                  handleConnect();
                                } else {
                                  setSelectedProduct(product);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            >
                              {publicKey ? 'Buy' : 'Connect'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl h-[420px] bg-[#1a1f2e] flex items-center justify-center text-gray-500">
                  <p>No best sellers yet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* New Products - Horizontal Scroll Row */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">New Products</h2>
            <a href="/products?sort=newest" className="text-gray-400 hover:text-white text-sm">
              See All
            </a>
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-52 rounded-xl h-72 bg-[#1a1f2e] animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {products.slice(0, 12).map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="flex-shrink-0 w-52 bg-[#1a1f2e] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                >
                  {/* Image */}
                  <div className="aspect-square bg-[#252a3a] relative overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs text-white font-medium truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{product.store.name}</p>
                    {/* Rating */}
                    {product.avgRating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <StarRating rating={product.avgRating} size="xs" />
                        <span className="text-[10px] text-gray-500">({product.reviewCount})</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-bold text-blue-400">
                        ${(product.priceUsdc || product.priceSol * 100).toFixed(2)}
                      </p>
                      <button
                        onClick={(e) => toggleWishlist(product.id, e)}
                        className={`text-xl hover:scale-125 transition-transform px-1 ${wishlistIds.has(product.id) ? 'text-red-500' : 'text-pink-400 hover:text-pink-300'}`}
                        title={wishlistIds.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {wishlistIds.has(product.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No products available yet. Check back soon!</p>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Selling Today</h2>
            <p className="text-gray-200 mb-6 max-w-xl mx-auto">
              Launch your own store and sell merchandise to crypto communities worldwide.
              No inventory required - we handle everything.
            </p>
            <a
              href="/merchant/dashboard"
              className="inline-block px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Launch Your Store
            </a>
          </div>
        </section>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
          onConnect={handleConnect}
          authenticated={connected}
          walletAddress={publicKey?.toBase58() || null}
          onCartUpdate={fetchCartCount}
        />
      )}

     {/* Footer */}
      <footer className="border-t border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top row - Links and Social */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-3 text-sm">
            <a href="/merchant/dashboard" className="text-gray-400 hover:text-white transition-colors">
              Merchant
            </a>
            <a href="/support" className="text-gray-400 hover:text-white transition-colors">
              Support
            </a>
            <a href="/auctions" className="text-gray-400 hover:text-orange-400 transition-colors">
              Auctions
            </a>
            {isAdmin && (
              <a href="/admin" className="text-gray-400 hover:text-white transition-colors">
                Admin
              </a>
            )}
            <span className="text-gray-700">|</span>
            <a
              href="https://t.me/flauntlol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
            <a
              href="https://x.com/flauntlol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>

          {/* Bottom row - Copyright */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-500 text-xs">
            <p>© 2025 flaunt.lol</p>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <span className="flex items-center gap-1">
              made with
              <svg className="w-3 h-3 text-red-500 fill-red-500" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              in portland
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  currency,
  onClick,
  isWishlisted,
  onToggleWishlist,
}: {
  product: Product;
  currency: 'SOL' | 'USDC';
  onClick: () => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string, e: React.MouseEvent) => void;
}) {
  const price = `$${(product.priceUsdc || product.priceSol * 100).toFixed(2)}`;

  const imageUrl = product.images?.[0] || '/placeholder.png';
  const bondingPercent = product.bondingEnabled
    ? Math.min((product.bondingCurrent / product.bondingGoal) * 100, 100)
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1f2e] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
    >
      {/* Image */}
      <div className="aspect-square bg-[#252a3a] relative overflow-hidden">
        {imageUrl !== '/placeholder.png' ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
        )}
        {product.quantity < 10 && product.quantity > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-xs font-bold rounded">
            Low Stock
          </span>
        )}
        {/* Wishlist Heart Icon */}
        {onToggleWishlist && (
          <button
            onClick={(e) => onToggleWishlist(product.id, e)}
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
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Store */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <span>{product.store.name}</span>
          {product.store.isVerified && (
            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Name */}
        <h3 className="font-medium text-sm mb-2 line-clamp-2">{product.name}</h3>

        {/* Bonding Progress */}
        {bondingPercent !== null && (
          <div className="mb-2">
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${bondingPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{product.bondingCurrent}/{product.bondingGoal} sold</p>
          </div>
        )}

        {/* Price */}
        <p className="font-bold text-blue-400">{price}</p>
      </div>
    </div>
  );
}

// Trade Offer Modal Component
function TradeOfferModal({
  product,
  walletAddress,
  onClose,
  onConnect,
  authenticated,
}: {
  product: Product;
  walletAddress: string | null;
  onClose: () => void;
  onConnect: () => void;
  authenticated: boolean;
}) {
  const [description, setDescription] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Downscale image using canvas
  const downscaleImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, 4 - images.length); i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const downscaled = await downscaleImage(file);
          newImages.push(downscaled);
        }
      }
      setImages([...images, ...newImages]);
    } catch (error) {
      console.error('Error processing images:', error);
      setMessage({ type: 'error', text: 'Failed to process images' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!authenticated || !walletAddress) {
      onConnect();
      return;
    }

    if (!description.trim()) {
      setMessage({ type: 'error', text: 'Please describe what you want to trade' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          productId: product.id,
          offerDescription: description,
          offerAmount: cashAmount ? parseFloat(cashAmount) : null,
          offerImages: images,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Trade offer submitted! The seller will review it.' });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit trade offer' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit trade offer' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-[#111827] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Submit Trade Offer</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Product info */}
          <div className="flex items-center gap-3 p-3 bg-[#1a1f2e] rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#252a3a]">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
              )}
            </div>
            <div>
              <p className="text-white font-medium">{product.name}</p>
              <p className="text-gray-400 text-sm">{product.store.name}</p>
              <p className="text-blue-400 text-sm font-medium">
                ${(product.priceUsdc || product.priceSol * 100).toFixed(2)} USDC
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What do you want to trade? *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item(s) you want to trade..."
              className="w-full p-3 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 resize-none"
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add photos of your item (optional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt={`Trade item ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-pink-500 hover:text-pink-400 transition-colors"
                >
                  {uploading ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs mt-1">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">Images auto-resize to save space (max 4)</p>
          </div>

          {/* Cash Amount (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add cash to sweeten the deal? (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full p-3 pl-8 bg-[#1a1f2e] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">USDC</span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Trade Offer'
            )}
          </button>

          {/* Beg button - DM the seller */}
          <div className="text-center pt-2">
            <span className="text-gray-500 text-sm">or try to </span>
            <a
              href={`/account/messages?merchant=${product.store.ownerId || product.store.id}`}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
            >
              [beg]
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Modal Component
function ProductModal({
  product,
  currency,
  onClose,
  onConnect,
  authenticated,
  walletAddress,
  onCartUpdate,
}: {
  product: Product;
  currency: 'SOL' | 'USDC';
  onClose: () => void;
  onConnect: () => void;
  authenticated: boolean;
  walletAddress: string | null;
  onCartUpdate?: () => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liveProduct, setLiveProduct] = useState(product);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [kawaiiMessage] = useState(() =>
    kawaiiTradeMessages[Math.floor(Math.random() * kawaiiTradeMessages.length)]
  );
  const kawaiiButtonRef = useRef<HTMLButtonElement>(null);

  // Sparkle effect on click
  const triggerSparkle = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const sparkles = ['✧', '✦', '★', '☆', '✿', '♡'];
    const colors = ['#ff69b4', '#ff1493', '#ffb6c1', '#da70d6', '#ffc0cb'];

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    document.body.appendChild(container);

    // Create 12 sparkles
    for (let i = 0; i < 12; i++) {
      const sparkle = document.createElement('div');
      const emoji = sparkles[Math.floor(Math.random() * sparkles.length)];
      const angle = (i / 12) * Math.PI * 2;
      const distance = 40 + Math.random() * 30;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      sparkle.textContent = emoji;
      sparkle.style.cssText = `
        position: absolute;
        font-size: ${12 + Math.random() * 8}px;
        left: ${originX}px;
        top: ${originY}px;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0);
        opacity: 1;
        color: ${colors[Math.floor(Math.random() * colors.length)]};
        text-shadow: 0 0 5px currentColor;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      container.appendChild(sparkle);

      requestAnimationFrame(() => {
        sparkle.style.transform = `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(1)`;
        setTimeout(() => {
          sparkle.style.opacity = '0';
          sparkle.style.transform = `translate(calc(-50% + ${endX * 1.5}px), calc(-50% + ${endY * 1.5}px)) scale(0.5)`;
        }, 250);
      });
    }

    setTimeout(() => container.remove(), 600);
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`);
        const data = await res.json();
        if (data.success && data.product) {
          setLiveProduct(data.product);
        }
      } catch (err) {
        // Silent fail - keep showing current data
      }
    };

    // Poll every 10 seconds
    const interval = setInterval(fetchLatest, 10000);

    return () => clearInterval(interval);
  }, [product.id]);

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!authenticated || !walletAddress) {
      onConnect();
      return;
    }

    setAddingToCart(true);
    setCartMessage(null);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ productId: liveProduct.id, quantity: 1 }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        setCartMessage('Added to cart!');
        onCartUpdate?.();
        setTimeout(() => setCartMessage(null), 2000);
      } else {
        setCartMessage(data.error || 'Failed to add to cart');
      }
    } catch (error) {
      setCartMessage('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Buy now handler - adds to cart and redirects to checkout
  const handleBuyNow = async () => {
    if (!authenticated || !walletAddress) {
      onConnect();
      return;
    }

    setAddingToCart(true);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ productId: liveProduct.id, quantity: 1 }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to checkout
        window.location.href = '/checkout';
      } else {
        setCartMessage(data.error || 'Failed to add to cart');
        setAddingToCart(false);
      }
    } catch (error) {
      setCartMessage('Failed to process');
      setAddingToCart(false);
    }
  };
  
  const price = `$${(liveProduct.priceUsdc || liveProduct.priceSol * 100).toFixed(2)}`;

  const bondingPercent = liveProduct.bondingEnabled 
    ? Math.min((liveProduct.bondingCurrent / liveProduct.bondingGoal) * 100, 100) 
    : null;

  // Get images array or create placeholder
  const images = liveProduct.images?.length > 0 ? liveProduct.images : ['/placeholder.png'];
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-[#111827] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg z-10 bg-black/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="md:flex">
          {/* Image Carousel */}
          <div className="md:w-1/2 aspect-square bg-[#1a1f2e] relative overflow-hidden">
            {/* Sliding Images Container */}
            <div 
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {images.map((img, index) => (
                <div key={index} className="w-full h-full flex-shrink-0">
                  {img !== '/placeholder.png' ? (
                    <img 
                      src={img} 
                      alt={`${product.name} - Image ${index + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl bg-[#1a1f2e]">🛍️</div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Dot Indicators */}
            {hasMultipleImages && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image Counter */}
            {hasMultipleImages && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 rounded text-xs">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:w-1/2 p-6">
            {/* Store - Clickable link */}
            <a
              href={`/store/${product.store.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors mb-2 group"
            >
              <span className="group-hover:underline">{product.store.name}</span>
              {product.store.isVerified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Name */}
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>

            {/* Price */}
            <p className="text-3xl font-bold text-blue-400 mb-4">{price}</p>

            {/* Description */}
            {product.description && (
              <p className="text-gray-400 text-sm mb-4">{product.description}</p>
            )}

            {/* Bonding Progress */}
            {bondingPercent !== null && (
              <div className="mb-4 p-3 bg-[#1a1f2e] rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-green-400 transition-all duration-300">
                    {liveProduct.bondingCurrent}/{liveProduct.bondingGoal}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${bondingPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Updates live as sales happen</p>
              </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              {liveProduct.quantity > 0 ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {liveProduct.quantity} in stock
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Out of stock
                </>
              )}
            </div>

            {/* Cart Message */}
            {cartMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium mb-3 ${
                cartMessage.includes('Added') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {cartMessage}
              </div>
            )}

            {/* Trade Offer Link - Positioned on far right above actions */}
            <div className="flex justify-end mb-4">
              <button
                ref={kawaiiButtonRef}
                onClick={(e) => {
                  if (kawaiiButtonRef.current) {
                    triggerSparkle(kawaiiButtonRef.current);
                  }
                  setTimeout(() => setShowTradeModal(true), 300);
                }}
                className="text-pink-400 hover:text-pink-300 text-xs cursor-pointer whitespace-nowrap hover:scale-110 transition-transform"
              >
                {kawaiiMessage}
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {authenticated ? (
                <button
                  onClick={handleBuyNow}
                  disabled={liveProduct.quantity === 0 || addingToCart}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {addingToCart ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : liveProduct.quantity > 0 ? 'Buy Now' : 'Out of Stock'}
                </button>
              ) : (
                <button
                  onClick={onConnect}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                >
                  Connect Wallet to Buy
                </button>
              )}
              <button
                onClick={handleAddToCart}
                disabled={liveProduct.quantity === 0 || addingToCart}
                className="w-full py-3 bg-[#1a1f2e] hover:bg-[#252a3a] disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Offer Modal */}
      {showTradeModal && (
        <TradeOfferModal
          product={product}
          walletAddress={walletAddress}
          onClose={() => setShowTradeModal(false)}
          onConnect={onConnect}
          authenticated={authenticated}
        />
      )}
    </div>
  );
}
