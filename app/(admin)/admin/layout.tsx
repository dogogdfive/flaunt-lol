// app/(admin)/admin/layout.tsx
// Admin dashboard layout with sidebar navigation

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  ShoppingCart,
  Bell,
  Check,
  MessageSquare,
} from 'lucide-react';

interface PendingCounts {
  stores: number;
  products: number;
  payouts: number;
  unreadMessages: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}



export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ stores: 0, products: 0, payouts: 0, unreadMessages: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ avatarUrl: string | null; username: string | null } | null>(null);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;
  const walletAddress = publicKey?.toBase58();

  // Check admin status from database
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!walletAddress) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/check-admin', {
          headers: { 'x-wallet-address': walletAddress },
        });
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    if (mounted && walletAddress) {
      checkAdminStatus();
    } else if (mounted) {
      setAdminLoading(false);
    }
  }, [mounted, walletAddress]);

  const fetchPendingCounts = async () => {
    if (!publicKey) return;
    try {
      const [storesRes, productsRes, payoutsRes, messagesRes] = await Promise.all([
        fetch('/api/admin/stores?status=PENDING&limit=1', {
          credentials: 'include',
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
        fetch('/api/admin/products?status=PENDING&limit=1', {
          credentials: 'include',
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
        fetch('/api/admin/payouts', {
          credentials: 'include',
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
        fetch('/api/messages', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        }),
      ]);

      const storesData = await storesRes.json();
      const productsData = await productsRes.json();
      const payoutsData = await payoutsRes.json();
      const messagesData = await messagesRes.json();

      setPendingCounts({
        stores: storesData.pagination?.total || 0,
        products: productsData.pagination?.total || 0,
        payouts: payoutsData.pendingPayouts?.length || 0,
        unreadMessages: messagesData.conversations?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0,
      });
    } catch (error) {
      console.error('[Admin Layout] Failed to fetch pending counts:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=10', { credentials: 'include' });
      const data = await res.json();

      if (data.success && data.notifications) {
        // Map API response to match our interface (readAt -> read boolean)
        const mappedNotifications = data.notifications.map((n: any) => ({
          ...n,
          read: n.readAt !== null,
        }));
        setNotifications(mappedNotifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('[Admin Layout] Failed to fetch notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
        credentials: 'include',
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Admin Layout] Failed to mark notifications as read:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/account/profile', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUserProfile({ avatarUrl: data.user.avatarUrl, username: data.user.username });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPendingCounts();
      fetchNotifications();
      fetchUserProfile();

      // Refresh counts every 30 seconds
      const interval = setInterval(() => {
        fetchPendingCounts();
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, badge: 0 },
    { name: 'Stores', href: '/admin/stores', icon: Store, badge: pendingCounts.stores },
    { name: 'Products', href: '/admin/products', icon: Package, badge: pendingCounts.products },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, badge: 0 },
    { name: 'Users', href: '/admin/users', icon: Users, badge: 0 },
    { name: 'Payouts', href: '/admin/payouts', icon: DollarSign, badge: pendingCounts.payouts },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare, badge: pendingCounts.unreadMessages },
    { name: 'Settings', href: '/admin/settings', icon: Settings, badge: 0 },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="flaunt.lol" className="w-16 h-16 rounded-xl mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to access the admin dashboard</p>
          <button
            onClick={() => setVisible(true)}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
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

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="flaunt.lol" className="w-16 h-16 rounded-xl mx-auto mb-6 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">Checking access...</h1>
          <p className="text-gray-400">Verifying admin permissions</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">This wallet is not authorized to access the admin panel.</p>
          <p className="text-gray-500 text-sm mb-8 font-mono">{walletAddress}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => wallet.disconnect()}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Disconnect
            </button>
            <Link
              href="/"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#111827] border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">Admin</span>
          </Link>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </div>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-purple-500' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 bg-[#111827] border-b border-gray-800 flex items-center justify-between px-4 lg:px-8">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:flex-none">
            <h1 className="text-lg font-semibold text-white lg:hidden">Admin</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-400 hover:text-white"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-[#1f2937] border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                        >
                          <Check className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-700 last:border-0 ${
                              !notification.read ? 'bg-purple-500/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                !notification.read ? 'bg-purple-500' : 'bg-gray-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-gray-700">
                        <Link
                          href="/admin/notifications"
                          className="block text-center text-xs text-purple-400 hover:text-purple-300 py-2"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => wallet.disconnect()}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              {userProfile?.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <Shield className="w-4 h-4 text-purple-400" />
              )}
              <span className="text-sm text-purple-300 font-medium">Admin</span>
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}