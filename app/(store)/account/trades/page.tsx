// app/(store)/account/trades/page.tsx
// Customer trade offers page - view sent trades and their status

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  Edit2,
  ExternalLink,
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
  updatedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    priceSol: number;
    priceUsdc: number | null;
  };
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  DECLINED: { label: 'Declined', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  COMPLETED: { label: 'Completed', icon: CheckCircle, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function AccountTradesPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;

  useEffect(() => {
    if (connected && publicKey) {
      fetchTrades();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, filter]);

  const fetchTrades = async () => {
    if (!publicKey) return;
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/trades?${params}`, {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setTrades(data.trades);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (tradeId: string) => {
    if (!publicKey) return;
    setCancellingId(tradeId);
    try {
      const res = await fetch(`/api/trades/${tradeId}/cancel`, {
        method: 'POST',
        headers: { 'x-wallet-address': publicKey.toBase58() },
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
      setCancellingId(null);
    }
  };

  const handleEdit = async () => {
    if (!publicKey || !editTrade) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/trades/${editTrade.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          offerDescription: editDescription,
          offerAmount: editAmount || null,
          buyerMessage: editMessage || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditTrade(null);
        fetchTrades();
      } else {
        alert(data.error || 'Failed to update trade');
      }
    } catch (error) {
      console.error('Failed to update trade:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (trade: Trade) => {
    setEditTrade(trade);
    setEditDescription(trade.offerDescription);
    setEditAmount(trade.offerAmount?.toString() || '');
    setEditMessage(trade.buyerMessage || '');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <ArrowLeftRight className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">View Your Trades</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to view your trade offers.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/account/orders" className="text-gray-400 hover:text-white">Orders</Link>
            <Link href="/account/trades" className="text-white font-medium">Trades</Link>
            <Link href="/account/wishlist" className="text-gray-400 hover:text-white">Wishlist</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowLeftRight className="w-7 h-7 text-cyan-400" />
            My Trade Offers
          </h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'].map((f) => (
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
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No trade offers</h2>
            <p className="text-gray-400 mb-6">
              When you make trade offers on products, they&apos;ll appear here.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => {
              const status = statusConfig[trade.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <div
                  key={trade.id}
                  className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Trade Header */}
                  <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {trade.store.logoUrl ? (
                        <img
                          src={trade.store.logoUrl}
                          alt={trade.store.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/store/${trade.store.slug}`}
                          className="text-white font-medium hover:text-cyan-400"
                        >
                          {trade.store.name}
                        </Link>
                        <p className="text-xs text-gray-500">{formatDate(trade.createdAt)}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bgColor} ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>
                  </div>

                  {/* Trade Content */}
                  <div className="px-6 py-4">
                    <div className="flex gap-4">
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

                      {/* Product & Offer Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${trade.product.slug}`}
                          className="text-white font-medium hover:text-cyan-400 flex items-center gap-1"
                        >
                          {trade.product.name}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <p className="text-sm text-gray-400 mt-1">
                          Value: {trade.product.priceSol.toFixed(4)} SOL
                        </p>

                        <div className="mt-3 bg-gray-800/50 rounded-lg p-3">
                          <p className="text-sm text-gray-300">
                            <span className="text-cyan-400">Your offer:</span>{' '}
                            {trade.offerDescription}
                          </p>
                          {trade.offerAmount && (
                            <p className="text-sm text-cyan-400 flex items-center gap-1 mt-1">
                              <DollarSign className="w-3 h-3" />
                              + {trade.offerAmount} USDC
                            </p>
                          )}
                          {trade.offerImages.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                              <ImageIcon className="w-3 h-3" />
                              {trade.offerImages.length} image(s) attached
                            </div>
                          )}
                          {trade.buyerMessage && (
                            <p className="text-sm text-gray-400 mt-2 italic">
                              &quot;{trade.buyerMessage}&quot;
                            </p>
                          )}
                        </div>

                        {/* Merchant Reply */}
                        {trade.merchantReply && (
                          <div className="mt-2 bg-cyan-900/20 rounded-lg p-3">
                            <p className="text-sm text-cyan-300">
                              <span className="text-cyan-500">Seller reply:</span>{' '}
                              {trade.merchantReply}
                            </p>
                          </div>
                        )}

                        {/* Status Messages */}
                        {trade.status === 'ACCEPTED' && (
                          <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Trade accepted! Contact the seller to arrange the exchange.
                          </div>
                        )}

                        {trade.status === 'DECLINED' && (
                          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Trade declined by seller.
                          </div>
                        )}

                        {trade.status === 'PENDING' && trade.viewedAt && (
                          <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            Viewed by seller - awaiting response
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {trade.status === 'PENDING' && (
                    <div className="px-6 py-4 bg-[#1f2937] border-t border-gray-800 flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(trade)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Offer
                      </button>
                      <button
                        onClick={() => handleCancel(trade.id)}
                        disabled={cancellingId === trade.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {cancellingId === trade.id ? 'Cancelling...' : 'Cancel Offer'}
                      </button>
                    </div>
                  )}

                  {trade.status === 'ACCEPTED' && (
                    <div className="px-6 py-4 bg-green-500/5 border-t border-green-500/20">
                      <Link
                        href={`/account/messages?storeId=${trade.store.id}`}
                        className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message Seller to Arrange Exchange
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Trade Modal */}
      {editTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-gray-800 rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Edit Trade Offer</h3>
              <p className="text-sm text-gray-400">For: {editTrade.product.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Offer <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe what you're offering..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cash Component (USDC)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditTrade(null)}
                  className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editLoading || !editDescription.trim()}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
