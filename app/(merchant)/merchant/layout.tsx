// app/(merchant)/merchant/layout.tsx
// Merchant dashboard layout with sidebar navigation

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Loader2,
  Clock,
  XCircle,
  ChevronDown,
  Plus,
  Store as StoreIcon,
  MessageSquare,
} from 'lucide-react';

interface NotificationCounts {
  pendingOrders: number;
  pendingPayouts: number;
  unreadMessages: number;
}

const navigation = [
  { name: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard, countKey: null },
  { name: 'Products', href: '/merchant/products', icon: Package, countKey: null },
  { name: 'Orders', href: '/merchant/orders', icon: ShoppingCart, countKey: 'pendingOrders' as const },
  { name: 'Payouts', href: '/merchant/payouts', icon: DollarSign, countKey: 'pendingPayouts' as const },
  { name: 'Messages', href: '/merchant/messages', icon: MessageSquare, countKey: 'unreadMessages' as const },
  { name: 'Store Settings', href: '/merchant/settings', icon: Settings, countKey: null },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [store, setStore] = useState<any>(null);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    pendingOrders: 0,
    pendingPayouts: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;

  useEffect(() => {
    if (connected && publicKey) {
      fetchStore();
      fetchNotificationCounts();
    }
  }, [connected, publicKey]);

  const fetchNotificationCounts = async () => {
    if (!publicKey) return;
    try {
      const [ordersRes, messagesRes] = await Promise.all([
        fetch('/api/merchant/orders?status=PAID', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
        fetch('/api/messages', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
      ]);

      const ordersData = await ordersRes.json();
      const messagesData = await messagesRes.json();

      setNotificationCounts({
        pendingOrders: ordersData.orders?.length || 0,
        pendingPayouts: 0, // Will be calculated from orders needing action
        unreadMessages: messagesData.conversations?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0,
      });
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    }
  };

  const fetchStore = async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/merchant/stores', {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      console.log('[Merchant Layout] Stores data:', data);
      if (data.stores && data.stores.length > 0) {
        setAllStores(data.stores);
        // Set the first approved store as active, or first store if none approved
        const approvedStore = data.stores.find((s: any) => s.status === 'APPROVED');
        setStore(approvedStore || data.stores[0]);
      }
    } catch (err) {
      console.error('[Merchant Layout] Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Not authenticated
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="flaunt.lol" className="w-16 h-16 rounded-xl mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Merchant Portal</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to access your store</p>
          <button
            onClick={() => setVisible(true)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
          <div className="mt-6">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              ← Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // No store found
  if (!store) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <img src="/logo.png" alt="flaunt.lol" className="w-16 h-16 rounded-xl mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">No Store Found</h1>
          <p className="text-gray-400 mb-8">You haven't applied to become a seller yet.</p>
          <Link
            href="/become-a-seller"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Apply to Sell
          </Link>
          <div className="mt-6">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              ← Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Store pending approval
  if (store.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Pending</h1>
          <p className="text-gray-400 mb-4">
            Your store "{store.name}" is currently under review. We'll notify you once it's approved.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            This usually takes 24-48 hours.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => wallet.disconnect()}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Disconnect
            </button>
            <Link
              href="/"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Store rejected
  if (store.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Rejected</h1>
          <p className="text-gray-400 mb-4">
            Unfortunately, your store "{store.name}" was not approved.
          </p>
          {store.rejectionReason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-400">{store.rejectionReason}</p>
            </div>
          )}
          <div className="flex gap-4 justify-center">
            <Link
              href="/become-a-seller"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Apply Again
            </Link>
            <Link
              href="/"
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Store approved - show full dashboard
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#111827] border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <Link href="/merchant/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">Merchant</span>
          </Link>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Store Selector */}
        <div className="p-4 border-b border-gray-800 relative">
          <button
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors"
          >
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                {store.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-white truncate">{store.name}</div>
              <div className={`text-xs ${store.status === 'APPROVED' ? 'text-green-400' : store.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>
                {store.status === 'APPROVED' ? 'Active' : store.status}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {storeDropdownOpen && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-[#1f2937] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {/* All user's stores */}
              {allStores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStore(s);
                    setStoreDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#374151] transition-colors ${s.id === store.id ? 'bg-blue-600/20' : ''}`}
                >
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-white truncate">{s.name}</div>
                    <div className={`text-xs ${s.status === 'APPROVED' ? 'text-green-400' : s.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.status === 'APPROVED' ? 'Active' : s.status}
                    </div>
                  </div>
                  {s.id === store.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-gray-700" />

              {/* New Store Button */}
              <Link
                href="/become-a-seller?from=merchant"
                onClick={() => setStoreDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#374151] transition-colors text-blue-400"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Create New Store</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const count = item.countKey ? notificationCounts[item.countKey] : 0;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span className="flex-1">{item.name}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1f2937] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#111827] border-b border-gray-800 flex items-center justify-between px-4 lg:px-8">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:flex-none">
            <h1 className="text-lg font-semibold text-white lg:hidden">Merchant</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/merchant/messages" className="relative p-2 text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notificationCounts.unreadMessages > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                  {notificationCounts.unreadMessages > 9 ? '9+' : notificationCounts.unreadMessages}
                </span>
              )}
            </Link>

            <button
              onClick={() => wallet.disconnect()}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                {store.name.charAt(0)}
              </div>
              <span className="text-sm text-white hidden sm:block truncate max-w-[100px]">
                {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}