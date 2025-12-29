// app/(merchant)/merchant/dashboard/page.tsx
// Merchant dashboard overview page with real data

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  Plus,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  productsSold: number;
  pendingPayout: number;
  weekOrders: number;
  pendingOrdersCount: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  time: string;
}

interface TopProduct {
  id: string;
  name: string;
  image: string | null;
  sold: number;
  revenue: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-500/10 text-gray-400',
  PAID: 'bg-blue-500/10 text-blue-400',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  SHIPPED: 'bg-yellow-500/10 text-yellow-400',
  DELIVERED: 'bg-green-500/10 text-green-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
};

export default function MerchantDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [store, setStore] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dashboard stats
        const [dashboardRes, storeRes] = await Promise.all([
          fetch('/api/merchant/dashboard'),
          fetch('/api/merchant/store'),
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders || []);
          setTopProducts(data.topProducts || []);
        }

        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData.store) {
            setStore({ name: storeData.store.name, slug: storeData.store.slug });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Revenue',
      value: `$${stats?.totalRevenue?.toFixed(2) || '0'} USDC`,
      change: `+${stats?.weekOrders || 0} orders this week`,
      trend: 'up',
      icon: DollarSign,
      color: 'blue',
    },
    {
      name: 'Total Orders',
      value: String(stats?.totalOrders || 0),
      change: `${stats?.pendingOrdersCount || 0} pending`,
      trend: 'neutral',
      icon: ShoppingCart,
      color: 'green',
    },
    {
      name: 'Products Sold',
      value: String(stats?.productsSold || 0),
      change: 'All time',
      trend: 'neutral',
      icon: Package,
      color: 'purple',
    },
    {
      name: 'Pending Payout',
      value: `$${stats?.pendingPayout?.toFixed(2) || '0'} USDC`,
      change: 'Available for payout',
      trend: 'neutral',
      icon: Clock,
      color: 'yellow',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with your store.</p>
        </div>
        <div className="flex gap-3">
          {store && (
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              className="px-4 py-2 bg-[#1f2937] text-gray-300 rounded-lg hover:bg-[#374151] transition-colors text-sm font-medium flex items-center gap-2"
            >
              View Store
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/merchant/products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-[#111827] border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
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
              {stat.trend === 'up' && (
                <span className="flex items-center text-green-400 text-sm font-medium">
                  <TrendingUp className="w-4 h-4 mr-1" />
                </span>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <p className="text-gray-400 text-sm mt-1">{stat.name}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            <Link
              href="/merchant/orders"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{order.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || statusColors.PENDING}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {order.product} • {order.customer}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{order.amount}</div>
                      <div className="text-xs text-gray-500">{order.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No orders yet</p>
              <p className="text-sm text-gray-500 mt-1">Orders will appear here once customers start buying</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Top Products</h2>
            <Link
              href="/merchant/products"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {topProducts.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {topProducts.map((product) => (
                <div key={product.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1f2937] rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{product.name}</div>
                      <div className="text-sm text-gray-400">{product.sold} sold</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{product.revenue}</div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No products yet</p>
              <Link
                href="/merchant/products/new"
                className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                Add your first product →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/merchant/products/new" className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left">
            <Package className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-white font-medium">Add Product</div>
            <div className="text-sm text-gray-400">List a new item</div>
          </Link>
          <Link href="/merchant/orders" className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left">
            <ShoppingCart className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-white font-medium">Fulfill Orders</div>
            <div className="text-sm text-gray-400">{stats?.pendingOrdersCount || 0} pending</div>
          </Link>
          <Link href="/merchant/payouts" className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left">
            <DollarSign className="w-6 h-6 text-yellow-400 mb-2" />
            <div className="text-white font-medium">View Payouts</div>
            <div className="text-sm text-gray-400">${stats?.pendingPayout?.toFixed(2) || '0'} USDC ready</div>
          </Link>
          <Link href="/merchant/settings" className="p-4 bg-[#1f2937] rounded-lg hover:bg-[#374151] transition-colors text-left">
            <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
            <div className="text-white font-medium">Store Settings</div>
            <div className="text-sm text-gray-400">Customize store</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
