// app/(admin)/admin/analytics/page.tsx
// Admin analytics dashboard

'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Package,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface Analytics {
  overview: {
    totalRevenue: number;
    revenueGrowth: number;
    platformFees: number;
    totalOrders: number;
    orderGrowth: number;
    totalUsers: number;
    newUsers: number;
    totalStores: number;
    activeStores: number;
    totalProducts: number;
    pendingProducts: number;
    pendingStores: number;
  };
  charts: {
    dailyRevenue: {
      date: string;
      revenue: number;
      orders: number;
    }[];
  };
  topStores: {
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    image: string | null;
    storeName: string;
    unitsSold: number;
    revenue: number;
  }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [platformFeePercent, setPlatformFeePercent] = useState(3.5);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
        if (data.platformFeePercent !== undefined) {
          setPlatformFeePercent(data.platformFeePercent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(4)} SOL`;
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  const { overview, charts, topStores, topProducts } = analytics;

  // Simple bar chart renderer
  const maxRevenue = Math.max(...charts.dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Platform performance overview</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${overview.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {overview.revenueGrowth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {Math.abs(overview.revenueGrowth)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(overview.totalRevenue)}</div>
          <div className="text-gray-400 text-sm mt-1">Total Revenue</div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-purple-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(overview.platformFees)}</div>
          <div className="text-gray-400 text-sm mt-1">Platform Fees ({platformFeePercent}%)</div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${overview.orderGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {overview.orderGrowth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {Math.abs(overview.orderGrowth)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{overview.totalOrders}</div>
          <div className="text-gray-400 text-sm mt-1">Orders</div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-yellow-500/10 rounded-lg">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-green-400 text-sm font-medium">+{overview.newUsers}</div>
          </div>
          <div className="text-2xl font-bold text-white">{overview.totalUsers}</div>
          <div className="text-gray-400 text-sm mt-1">Total Users</div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xl font-bold text-white">{overview.activeStores}</div>
              <div className="text-sm text-gray-400">Active Stores</div>
            </div>
          </div>
          {overview.pendingStores > 0 && (
            <div className="mt-2 text-xs text-yellow-400">{overview.pendingStores} pending</div>
          )}
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xl font-bold text-white">{overview.totalProducts}</div>
              <div className="text-sm text-gray-400">Products</div>
            </div>
          </div>
          {overview.pendingProducts > 0 && (
            <div className="mt-2 text-xs text-yellow-400">{overview.pendingProducts} pending</div>
          )}
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xl font-bold text-white">
                {overview.totalOrders > 0 ? (overview.totalRevenue / overview.totalOrders).toFixed(4) : '0'} SOL
              </div>
              <div className="text-sm text-gray-400">Avg Order Value</div>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-xl font-bold text-white">
                {((overview.newUsers / Math.max(overview.totalUsers, 1)) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">New User Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Revenue Over Time</h2>
        
        {charts.dailyRevenue.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No revenue data for this period
          </div>
        ) : (
          <div className="space-y-2">
            {/* Simple bar chart */}
            <div className="flex items-end gap-1 h-48">
              {charts.dailyRevenue.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:from-purple-500 hover:to-purple-300"
                    style={{
                      height: `${(day.revenue / maxRevenue) * 100}%`,
                      minHeight: day.revenue > 0 ? '4px' : '0',
                    }}
                    title={`${new Date(day.date).toLocaleDateString()}: ${day.revenue.toFixed(4)} SOL`}
                  />
                </div>
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="flex gap-1 text-xs text-gray-500 pt-2 border-t border-gray-800">
              {charts.dailyRevenue.filter((_, i) => i % Math.ceil(charts.dailyRevenue.length / 7) === 0).map((day, i) => (
                <div key={i} className="flex-1 text-center truncate">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Stores & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Top Stores</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {topStores.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No store data yet</div>
            ) : (
              topStores.map((store, i) => (
                <div key={store.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{store.name}</div>
                      <div className="text-sm text-gray-500">{store.orders} orders</div>
                    </div>
                  </div>
                  <div className="text-green-400 font-semibold">{formatCurrency(store.revenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Top Products</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {topProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No product data yet</div>
            ) : (
              topProducts.map((product, i) => (
                <div key={product.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {i + 1}
                    </div>
                    {product.image && (
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover" />
                    )}
                    <div>
                      <div className="text-white font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.storeName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">{formatCurrency(product.revenue)}</div>
                    <div className="text-sm text-gray-500">{product.unitsSold} sold</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
