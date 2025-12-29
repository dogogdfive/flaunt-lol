// app/(store)/auctions/page.tsx
// Public auctions listing page

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel, Flame, Filter } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';

interface Auction {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  images: string[];
  status: string;
  currentPriceSol: number;
  startPriceSol: number;
  floorPriceSol: number;
  temperature: number;
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  };
  viewerCount: number;
  startsAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
  };
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'LIVE' | 'SCHEDULED'>('all');

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') {
          params.set('status', filter);
        }
        params.set('limit', '50');

        const res = await fetch(`/api/auctions?${params}`);
        const data = await res.json();

        if (data.success) {
          setAuctions(data.auctions);
        }
      } catch (error) {
        console.error('Failed to fetch auctions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAuctions();

    // Refresh data every 10 seconds for viewer counts
    const interval = setInterval(fetchAuctions, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const liveCount = auctions.filter((a) => a.status === 'LIVE').length;
  const scheduledCount = auctions.filter((a) => a.status === 'SCHEDULED').length;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Gavel className="w-8 h-8 text-orange-400" />
              <h1 className="text-3xl font-bold text-white">Dutch Auctions</h1>
            </div>
            <p className="text-gray-400">
              Watch prices drop in real-time. Buy when the price is right!
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({auctions.length})
            </button>
            <button
              onClick={() => setFilter('LIVE')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                filter === 'LIVE'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live ({liveCount})
            </button>
            <button
              onClick={() => setFilter('SCHEDULED')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'SCHEDULED'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Upcoming ({scheduledCount})
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white mb-1">How Dutch Auctions Work</h3>
              <p className="text-sm text-gray-400">
                Prices start high and drop over time until someone buys. The thermometer shows
                how "hot" (expensive) or "cold" (cheap) the current price is. Watch, wait, and
                buy when you're ready!
              </p>
            </div>
          </div>
        </div>

        {/* Auctions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#111827] rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold text-white mb-2">No Auctions Yet</h2>
            <p className="text-gray-400 mb-6">
              {filter === 'LIVE'
                ? 'No live auctions at the moment. Check back soon!'
                : filter === 'SCHEDULED'
                ? 'No upcoming auctions scheduled.'
                : 'Be the first to create a Dutch auction!'}
            </p>
            <Link
              href="/merchant/auctions/new"
              className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Auction
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
