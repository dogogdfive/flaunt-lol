// app/(admin)/admin/page.tsx
// Admin dashboard overview page - fetches REAL data from API

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Store,
  Users,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeStores: number;
  totalUsers: number;
}

interface PendingStore {
  id: string;
  name: string;
  slug: string;
  owner: {
    email: string | null;
    walletAddress: string | null;
  };
  createdAt: string;
}

interface PendingProduct {
  id: string;
  name: string;
  priceSol: number;
  store: {
    name: string;
  };
  createdAt: string;
}

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    activeStores: 0,
    totalUsers: 0,
  });
  const [pendingStores, setPendingStores] = useState<PendingStore[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingStoreCounts, setPendingStoreCounts] = useState(0);
  const [pendingProductCounts, setPendingProductCounts] = useState(0);

  useEffect(() => {
    if (publicKey) {
      fetchDashboardData();
    }
  }, [publicKey]);

  const fetchDashboardData = async () => {
    if (!publicKey) return;

    const headers = {
      'x-wallet-address': publicKey.toBase58(),
    };

    try {
      // Fetch all data in parallel
      const [statsRes, storesRes, productsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include', headers }).catch(() => null),
        fetch('/api/admin/stores?status=PENDING&limit=5', { credentials: 'include', headers }),
        fetch('/api/admin/products?status=PENDING&limit=5', { credentials: 'include', headers }),
        fetch('/api/admin/users?limit=1', { credentials: 'include', headers }).catch(() => null),
      ]);

      // Parse stores response
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        if (storesData.success) {
          setPendingStores(storesData.stores || []);
          setPendingStoreCounts(storesData.pagination?.total || storesData.stores?.length || 0);
        }
      }

      // Parse products response
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData.success) {
          setPendingProducts(productsData.products || []);
          setPendingProductCounts(productsData.pagination?.total || productsData.products?.length || 0);
        }
      }

      // Try to get stats if endpoint exists
      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Try to get user count
      if (usersRes?.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setStats(prev => ({ ...prev, totalUsers: usersData.pagination?.total || 0 }));
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreAction = async (storeId: string, action: 'approve' | 'reject') => {
    if (!publicKey) return;

    const reason = action === 'reject'
      ? prompt('Enter rejection reason:') || 'Does not meet platform requirements'
      : undefined;

    try {
      const res = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          action: action === 'approve' ? 'approve_stores' : 'reject_stores',
          ids: [storeId],
          reason,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        // Refresh data
        fetchDashboardData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleProductAction = async (productId: string, action: 'approve' | 'reject') => {
    if (!publicKey) return;

    const reason = action === 'reject'
      ? prompt('Enter rejection reason:') || 'Does not meet platform requirements'
      : undefined;

    try {
      const res = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          action: action === 'approve' ? 'approve_products' : 'reject_products',
          ids: [productId],
          reason,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        fetchDashboardData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const statCards = [
    { name: 'Total Revenue', value: `${stats.totalRevenue.toFixed(2)} SOL`, icon: DollarSign, color: 'blue' },
    { name: 'Total Orders', value: stats.totalOrders.toString(), icon: ShoppingCart, color: 'green' },
    { name: 'Active Stores', value: stats.activeStores.toString(), icon: Store, color: 'purple' },
    { name: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'yellow' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Platform overview and pending approvals</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-[#111827] border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-2.5 rounded-lg ${
                  stat.color === 'blue'
                    ? 'bg-blue-500/10'
                    : stat.color === 'green'
                    ? 'bg-green-500/10'
                    : stat.color === 'purple'
                    ? 'bg-purple-500/10'
                    : 'bg-yellow-500/10'
                }`}
              >
                <stat.icon
                  className={`w-5 h-5 ${
                    stat.color === 'blue'
                      ? 'text-blue-400'
                      : stat.color === 'green'
                      ? 'text-green-400'
                      : stat.color === 'purple'
                      ? 'text-purple-400'
                      : 'text-yellow-400'
                  }`}
                />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-gray-400 text-sm mt-1">{stat.name}</div>
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Stores */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Pending Stores</h2>
              {pendingStoreCounts > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingStoreCounts}
                </span>
              )}
            </div>
            <Link
              href="/admin/stores"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {pendingStores.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No pending store applications</p>
              </div>
            ) : (
              pendingStores.map((store) => (
                <div key={store.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{store.name}</div>
                      <div className="text-sm text-gray-400">
                        {store.owner.walletAddress
                          ? `${store.owner.walletAddress.slice(0, 6)}...${store.owner.walletAddress.slice(-4)}`
                          : store.owner.email || 'Unknown owner'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatTimeAgo(store.createdAt)}</span>
                      <button
                        onClick={() => handleStoreAction(store.id, 'approve')}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStoreAction(store.id, 'reject')}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Products */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Pending Products</h2>
              {pendingProductCounts > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingProductCounts}
                </span>
              )}
            </div>
            <Link
              href="/admin/products"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {pendingProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No pending product approvals</p>
              </div>
            ) : (
              pendingProducts.map((product) => (
                <div key={product.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{product.name}</div>
                      <div className="text-sm text-gray-400">
                        {product.store?.name || 'Unknown store'} - {product.priceSol?.toFixed(2) || '0.00'} SOL
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatTimeAgo(product.createdAt)}</span>
                      <button
                        onClick={() => handleProductAction(product.id, 'approve')}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleProductAction(product.id, 'reject')}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/admin/stores?status=PENDING"
            className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left"
          >
            <Store className="w-6 h-6 text-purple-400 mb-2" />
            <div className="text-white font-medium">Review Stores</div>
            <div className="text-sm text-gray-400">{pendingStoreCounts} pending</div>
          </Link>
          <Link
            href="/admin/products?status=PENDING"
            className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left"
          >
            <Package className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-white font-medium">Review Products</div>
            <div className="text-sm text-gray-400">{pendingProductCounts} pending</div>
          </Link>
          <Link
            href="/admin/payouts"
            className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left"
          >
            <DollarSign className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-white font-medium">Process Payouts</div>
            <div className="text-sm text-gray-400">View pending</div>
          </Link>
          <Link
            href="/admin/users"
            className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left"
          >
            <Users className="w-6 h-6 text-yellow-400 mb-2" />
            <div className="text-white font-medium">Manage Users</div>
            <div className="text-sm text-gray-400">{stats.totalUsers} total</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
