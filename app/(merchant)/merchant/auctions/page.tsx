// app/(merchant)/merchant/auctions/page.tsx
// Merchant auction management

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Gavel,
  Plus,
  Eye,
  Clock,
  DollarSign,
  TrendingDown,
  AlertCircle,
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
  };
}

interface Stats {
  total: number;
  live: number;
  scheduled: number;
  sold: number;
  totalRevenue: number;
}

export default function MerchantAuctionsPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) return;

    async function fetchAuctions() {
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') {
          params.set('status', filter);
        }

        const res = await fetch(`/api/merchant/auctions?${params}`, {
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
    }

    fetchAuctions();
  }, [connected, publicKey, filter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
            SCHEDULED
          </span>
        );
      case 'SOLD':
        return (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
            SOLD
          </span>
        );
      case 'ENDED_UNSOLD':
        return (
          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            ENDED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            {status}
          </span>
        );
    }
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
        <p className="text-gray-400">Connect your wallet to manage auctions</p>
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
            Dutch Auctions
          </h1>
          <p className="text-gray-400 mt-1">
            Create and manage your auctions
          </p>
        </div>
        <Link
          href="/merchant/auctions/new"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Auction
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <div className="text-2xl font-bold text-white">{stats.live}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Sold</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.sold}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Revenue</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.totalRevenue.toFixed(2)} SOL
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'LIVE', 'SCHEDULED', 'SOLD', 'ENDED_UNSOLD'].map((f) => (
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

      {/* Auctions List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1f2937] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : auctions.length > 0 ? (
        <div className="space-y-4">
          {auctions.map((auction) => (
            <Link
              key={auction.id}
              href={`/auction/${auction.slug}`}
              className="block bg-[#1f2937] rounded-xl p-4 hover:bg-[#2d3748] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  {auction.images[0] ? (
                    <img
                      src={auction.images[0]}
                      alt={auction.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gavel className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{auction.title}</h3>
                    {getStatusBadge(auction.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{auction.store.name}</span>
                    {auction.status === 'LIVE' && (
                      <>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {auction.viewerCount} watching
                        </span>
                        <span>
                          Current: {auction.currentPriceSol.toFixed(4)} SOL
                        </span>
                      </>
                    )}
                    {auction.status === 'SOLD' && auction.winningPriceSol && (
                      <span className="text-purple-400">
                        Sold for {auction.winningPriceSol.toFixed(4)} SOL
                      </span>
                    )}
                  </div>
                </div>

                {/* Temperature */}
                {auction.status === 'LIVE' && (
                  <div className="hidden md:block w-24">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          auction.temperature > 50
                            ? 'bg-gradient-to-r from-yellow-500 to-red-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}
                        style={{ width: `${auction.temperature}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {auction.temperature > 50 ? 'Hot' : 'Cool'}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#1f2937] rounded-xl">
          <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No Auctions Yet</h2>
          <p className="text-gray-400 mb-6">
            Create your first Dutch auction and watch prices drop in real-time!
          </p>
          <Link
            href="/merchant/auctions/new"
            className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            Create Your First Auction
          </Link>
        </div>
      )}
    </div>
  );
}
