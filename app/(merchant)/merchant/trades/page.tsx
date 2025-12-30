// app/(merchant)/merchant/trades/page.tsx
// Merchant trade offers management

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeftRight,
  Check,
  X,
  Clock,
  Eye,
  Package,
  User,
  DollarSign,
  Image as ImageIcon,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react';

interface Trade {
  id: string;
  status: string;
  offerDescription: string;
  offerAmount: number | null;
  offerImages: string[];
  buyerMessage: string | null;
  merchantReply: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  isNew: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    priceSol: number;
    priceUsdc: number | null;
  };
  buyer: {
    id: string;
    name: string;
    walletAddress: string | null;
    avatarUrl: string | null;
  };
}

interface Stats {
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
  completed: number;
  total: number;
}

interface StoreInfo {
  id: string;
  name: string;
  tradesEnabled: boolean;
}

export default function MerchantTradesPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) return;
    fetchTrades();
  }, [connected, publicKey, filter]);

  async function fetchTrades() {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/merchant/trades?${params}`, {
        headers: {
          'x-wallet-address': publicKey!.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        setTrades(data.trades);
        setStats(data.stats);
        setStore(data.store);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTradesEnabled() {
    if (!store || !publicKey) return;

    try {
      const res = await fetch('/api/merchant/trades', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ tradesEnabled: !store.tradesEnabled }),
      });
      const data = await res.json();

      if (data.success) {
        setStore({ ...store, tradesEnabled: data.tradesEnabled });
      }
    } catch (error) {
      console.error('Failed to toggle trades:', error);
    }
  }

  async function handleAccept(tradeId: string) {
    if (!publicKey) return;
    setActionLoading(tradeId);

    try {
      const res = await fetch(`/api/trades/${tradeId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ merchantReply: replyText || null }),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedTrade(null);
        setReplyText('');
        fetchTrades();
      } else {
        alert(data.error || 'Failed to accept trade');
      }
    } catch (error) {
      console.error('Failed to accept trade:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(tradeId: string) {
    if (!publicKey) return;
    setActionLoading(tradeId);

    try {
      const res = await fetch(`/api/trades/${tradeId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ merchantReply: replyText || null }),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedTrade(null);
        setReplyText('');
        fetchTrades();
      } else {
        alert(data.error || 'Failed to decline trade');
      }
    } catch (error) {
      console.error('Failed to decline trade:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(tradeId: string) {
    if (!publicKey) return;
    setActionLoading(tradeId);

    try {
      const res = await fetch(`/api/trades/${tradeId}/cancel`, {
        method: 'POST',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success) {
        fetchTrades();
      } else {
        alert(data.error || 'Failed to cancel trade');
      }
    } catch (error) {
      console.error('Failed to cancel trade:', error);
    } finally {
      setActionLoading(null);
    }
  }

  const getStatusBadge = (status: string, isNew?: boolean) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full flex items-center gap-1">
            {isNew && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />}
            PENDING
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
            ACCEPTED
          </span>
        );
      case 'DECLINED':
        return (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
            DECLINED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            CANCELLED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
            COMPLETED
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage trade offers</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowLeftRight className="w-7 h-7 text-cyan-400" />
            Trade Offers
          </h1>
          <p className="text-gray-400 mt-1">
            Manage barter offers from customers
          </p>
        </div>
        {store && (
          <button
            onClick={toggleTradesEnabled}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              store.tradesEnabled
                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
            }`}
          >
            {store.tradesEnabled ? (
              <>
                <ToggleRight className="w-5 h-5" />
                Trades Enabled
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                Trades Disabled
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Pending</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Check className="w-4 h-4" />
              <span className="text-sm">Accepted</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.accepted}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <X className="w-4 h-4" />
              <span className="text-sm">Declined</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.declined}</div>
          </div>
          <div className="bg-[#1f2937] rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.completed}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1f2937] text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f}
            {f === 'PENDING' && stats?.pending ? ` (${stats.pending})` : ''}
          </button>
        ))}
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1f2937] rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : trades.length > 0 ? (
        <div className="space-y-4">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className={`bg-[#1f2937] rounded-xl p-4 transition-colors ${
                trade.isNew ? 'ring-2 ring-yellow-500/50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                  {trade.product.image ? (
                    <img
                      src={trade.product.image}
                      alt={trade.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-white truncate">
                      {trade.product.name}
                    </h3>
                    {getStatusBadge(trade.status, trade.isNew)}
                    {trade.isNew && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <User className="w-3 h-3" />
                    <span>{trade.buyer.name}</span>
                    <span className="text-gray-600">|</span>
                    <span>{formatDate(trade.createdAt)}</span>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3 mb-2">
                    <p className="text-sm text-gray-300 mb-2">
                      <span className="text-gray-500">Offering:</span>{' '}
                      {trade.offerDescription}
                    </p>
                    {trade.offerAmount && (
                      <p className="text-sm text-cyan-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        + {trade.offerAmount} USDC cash
                      </p>
                    )}
                    {trade.offerImages.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                        <ImageIcon className="w-3 h-3" />
                        {trade.offerImages.length} image(s) attached
                      </div>
                    )}
                    {trade.buyerMessage && (
                      <p className="text-sm text-gray-400 mt-2 flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        &quot;{trade.buyerMessage}&quot;
                      </p>
                    )}
                  </div>

                  {/* Merchant Reply */}
                  {trade.merchantReply && (
                    <div className="bg-cyan-900/20 rounded-lg p-2 mb-2">
                      <p className="text-sm text-cyan-300">
                        <span className="text-cyan-500">Your reply:</span>{' '}
                        {trade.merchantReply}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {trade.status === 'PENDING' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => setSelectedTrade(trade)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View & Respond
                      </button>
                      <button
                        onClick={() => handleAccept(trade.id)}
                        disabled={actionLoading === trade.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(trade.id)}
                        disabled={actionLoading === trade.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Decline
                      </button>
                    </div>
                  )}

                  {trade.status === 'ACCEPTED' && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-green-400">
                        Trade accepted - arrange exchange with buyer
                      </span>
                      <button
                        onClick={() => handleCancel(trade.id)}
                        disabled={actionLoading === trade.id}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel Trade
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Info */}
                <div className="hidden md:block text-right">
                  <div className="text-sm text-gray-400">Product Value</div>
                  <div className="text-lg font-bold text-white">
                    {trade.product.priceSol.toFixed(4)} SOL
                  </div>
                  {trade.product.priceUsdc && (
                    <div className="text-sm text-gray-400">
                      ~{trade.product.priceUsdc.toFixed(2)} USDC
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#1f2937] rounded-xl">
          <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No Trade Offers</h2>
          <p className="text-gray-400 mb-2">
            {store?.tradesEnabled
              ? 'No trade offers yet. When customers make offers, they\'ll appear here.'
              : 'Enable trades to start receiving barter offers from customers.'}
          </p>
          {!store?.tradesEnabled && (
            <button
              onClick={toggleTradesEnabled}
              className="mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
            >
              Enable Trade Offers
            </button>
          )}
        </div>
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f2937] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Trade Offer Details</h2>
                <button
                  onClick={() => {
                    setSelectedTrade(null);
                    setReplyText('');
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Product */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
                  {selectedTrade.product.image ? (
                    <img
                      src={selectedTrade.product.image}
                      alt={selectedTrade.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {selectedTrade.product.name}
                  </h3>
                  <p className="text-gray-400">
                    Value: {selectedTrade.product.priceSol.toFixed(4)} SOL
                  </p>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">From</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    {selectedTrade.buyer.avatarUrl ? (
                      <img
                        src={selectedTrade.buyer.avatarUrl}
                        alt={selectedTrade.buyer.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedTrade.buyer.name}</p>
                    {selectedTrade.buyer.walletAddress && (
                      <p className="text-gray-400 text-sm">
                        {selectedTrade.buyer.walletAddress.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="bg-cyan-900/20 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-cyan-400 mb-2">Their Offer</h4>
                <p className="text-white mb-2">{selectedTrade.offerDescription}</p>
                {selectedTrade.offerAmount && (
                  <p className="text-cyan-400 flex items-center gap-1 mb-2">
                    <DollarSign className="w-4 h-4" />
                    + {selectedTrade.offerAmount} USDC cash component
                  </p>
                )}
                {selectedTrade.buyerMessage && (
                  <p className="text-gray-300 italic">
                    &quot;{selectedTrade.buyerMessage}&quot;
                  </p>
                )}
              </div>

              {/* Offer Images */}
              {selectedTrade.offerImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Images of Offered Items
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTrade.offerImages.map((img, i) => (
                      <a
                        key={i}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                      >
                        <img
                          src={img}
                          alt={`Offer image ${i + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your Reply (optional)
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add a message with your response..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAccept(selectedTrade.id)}
                  disabled={actionLoading === selectedTrade.id}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  Accept Trade
                </button>
                <button
                  onClick={() => handleDecline(selectedTrade.id)}
                  disabled={actionLoading === selectedTrade.id}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                  Decline Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
