// components/merchant/SalesChart.tsx
// Sales analytics chart for merchant dashboard

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Calendar } from 'lucide-react';

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  revenueChange: number;
  ordersChange: number;
  dailySales: DailySales[];
  topProducts: { name: string; sold: number; revenue: number }[];
}

interface Props {
  period?: '7d' | '30d' | '90d';
}

export default function SalesChart({ period = '30d' }: Props) {
  const { publicKey } = useWallet();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    if (!publicKey) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/merchant/analytics?period=${selectedPeriod}`, {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Analytics fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [publicKey, selectedPeriod]);

  if (loading) {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-center text-gray-500">
        No analytics data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.dailySales.map(d => d.revenue), 1);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Sales Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1f2937] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Revenue</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.totalRevenue.toFixed(2)} SOL</div>
          <div className={`text-sm flex items-center gap-1 mt-1 ${data.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(data.revenueChange).toFixed(1)}% vs prev
          </div>
        </div>

        <div className="bg-[#1f2937] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm">Orders</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.totalOrders}</div>
          <div className={`text-sm flex items-center gap-1 mt-1 ${data.ordersChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.ordersChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(data.ordersChange).toFixed(1)}% vs prev
          </div>
        </div>

        <div className="bg-[#1f2937] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Avg Order</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.averageOrderValue.toFixed(2)} SOL</div>
        </div>

        <div className="bg-[#1f2937] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Customers</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.uniqueCustomers}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Revenue Over Time</h3>
        <div className="h-48 flex items-end gap-1">
          {data.dailySales.map((day, i) => (
            <div
              key={i}
              className="flex-1 group relative"
            >
              <div
                className="bg-blue-600 hover:bg-blue-500 rounded-t transition-colors cursor-pointer"
                style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: day.revenue > 0 ? '4px' : '0' }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                  <div className="text-gray-400">{day.date}</div>
                  <div className="text-white font-medium">{day.revenue.toFixed(2)} SOL</div>
                  <div className="text-gray-400">{day.orders} orders</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{data.dailySales[0]?.date}</span>
          <span>{data.dailySales[data.dailySales.length - 1]?.date}</span>
        </div>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Top Products</h3>
          <div className="space-y-2">
            {data.topProducts.slice(0, 5).map((product, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">{i + 1}.</span>
                  <span className="text-white">{product.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{product.revenue.toFixed(2)} SOL</div>
                  <div className="text-gray-500 text-sm">{product.sold} sold</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
