// app/(admin)/admin/auctions/page.tsx
// Admin auction overview with history

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import {
  Gavel,
  Eye,
  Users,
  DollarSign,
  TrendingDown,
  Clock,
  Search,
  RefreshCw,
} from 'lucide-react';

interface Auction {
  id: string;
  slug: string;
  title: string;
  images: string[];
  status: string;
  currentPriceSol: number;
  startPriceSol: number;
  floorPriceSol: number;
  winningPriceSol: number | null;
  temperature: number;
  viewerCount: number;
  messageCount: number;
  createdAt: string;
  startsAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
  };
  merchant: {
    id: string;
    name: string | null;
    username: string | null;
    walletAddress: string | null;
  };
  winner?: {
    id: string;
    name: string | null;
    walletAddress: string | null;
  } | null;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  totalRevenueSol: number;
  totalSold: number;
  activeViewers: number;
  activeAuctions: number;
}

export default function AdminAuctionsPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAuctions = async () => {
    if (!connected || !publicKey) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/admin/auctions?${params}`, {
        headers: {
          'x-wallet-address': publicKey!.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setAuctions(data.auctions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAuctions, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey, filter]);

  const filteredAuctions = auctions.filter((auction) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      auction.title.toLowerCase().includes(searchLower) ||
      auction.store.name.toLowerCase().includes(searchLower) ||
      auction.merchant.walletAddress?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      LIVE: { bg: 'bg-green-500/20', text: 'text-green-400' },
      SCHEDULED: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      SOLD: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      ENDED_UNSOLD: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
      CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400' },
      DRAFT: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    };
    const style = badges[status] || badges.DRAFT;
    return (
      <span className={`px-2 py-0.5 ${style.bg} ${style.text} text-xs font-medium rounded-full`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-center py-16">
        <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Gavel className="w-7 h-7 text-orange-400" />
            Auction Management
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor all auctions and viewer activity
          </p>
        </div>
        <button
          onClick={fetchAuctions}
          className="px-4 py-2 bg-[#1f2937] hover:bg-[#2d3748] text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Gavel className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">Live</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.byStatus.LIVE || 0}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.byStatus.SCHEDULED || 0}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Sold</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalSold}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Viewers Now</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeViewers}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Revenue</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.totalRevenueSol.toFixed(2)} SOL
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {['all', 'LIVE', 'SCHEDULED', 'SOLD', 'ENDED_UNSOLD', 'CANCELLED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1f2937] text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auctions..."
            className="w-full pl-9 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Auctions Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#1f2937] rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : filteredAuctions.length > 0 ? (
        <div className="bg-[#1f2937] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Auction</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Store</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Price</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Viewers</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Messages</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuctions.map((auction) => (
                <tr key={auction.id} className="border-b border-gray-800 hover:bg-[#2d3748]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/auction/${auction.slug}`}
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800">
                        {auction.images[0] ? (
                          <img
                            src={auction.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gavel className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{auction.title}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(auction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-300">{auction.store.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px]">
                      {auction.merchant.walletAddress?.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(auction.status)}
                  </td>
                  <td className="px-4 py-3">
                    {auction.status === 'SOLD' ? (
                      <div className="text-purple-400 font-medium text-sm">
                        {auction.winningPriceSol?.toFixed(4)} SOL
                      </div>
                    ) : auction.status === 'LIVE' ? (
                      <div className="text-white font-medium text-sm">
                        {auction.currentPriceSol.toFixed(4)} SOL
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        {auction.startPriceSol.toFixed(4)} SOL
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {auction.status === 'LIVE' && auction.viewerCount > 0 ? (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <Eye className="w-4 h-4" />
                        {auction.viewerCount}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{auction.messageCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#1f2937] rounded-xl">
          <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No Auctions Found</h2>
          <p className="text-gray-400">
            {filter !== 'all'
              ? `No ${filter.replace('_', ' ').toLowerCase()} auctions`
              : 'No auctions have been created yet'}
          </p>
        </div>
      )}
    </div>
  );
}
