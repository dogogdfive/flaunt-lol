// app/(merchant)/merchant/payouts/page.tsx
// Merchant payouts page with real data

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  ExternalLink,
  Copy,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Package,
} from 'lucide-react';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  orderCount: number;
  txSignature: string | null;
  walletAddress: string;
  periodStart: string | null;
  periodEnd: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface EligibleOrder {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface PayoutSummary {
  pendingAmount: number;
  eligibleOrderCount: number;
  ordersWithoutTracking: number;
  totalPaidOut: number;
  payoutWallet: string | null;
  currency: string;
  platformFeePercent: number;
}

export default function MerchantPayouts() {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [payoutWallet, setPayoutWallet] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchPayouts();
    }
  }, [publicKey]);

  const fetchPayouts = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/merchant/payouts', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts);
        setEligibleOrders(data.eligibleOrders);
        setSummary(data.summary);
        setPayoutWallet(data.summary.payoutWallet || '');
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWallet = async () => {
    if (!publicKey || !payoutWallet.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/merchant/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ payoutWallet: payoutWallet.trim() }),
      });
      if (res.ok) {
        setSummary(prev => prev ? { ...prev, payoutWallet: payoutWallet.trim() } : null);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Failed to save wallet:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const currency = summary?.currency || 'SOL';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400 mt-1">Track your earnings and payouts</p>
        </div>
        <button
          onClick={() => setShowWalletModal(true)}
          className="px-4 py-2 bg-[#1f2937] text-gray-300 rounded-lg hover:bg-[#374151] transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Payout Settings
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-green-400 text-sm font-medium">Available</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {summary?.pendingAmount.toFixed(4) || '0'} {currency}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {summary?.eligibleOrderCount || 0} orders ready for payout
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-yellow-400 text-sm font-medium">Pending Tracking</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {summary?.ordersWithoutTracking || 0}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Orders need tracking for payout
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-purple-500/10 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {summary?.totalPaidOut.toFixed(4) || '0'} {currency}
          </div>
          <div className="text-sm text-gray-400 mt-1">Lifetime payouts</div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white">{payouts.length}</div>
          <div className="text-sm text-gray-400 mt-1">Total payouts received</div>
        </div>
      </div>

      {/* Warning if no payout wallet */}
      {!summary?.payoutWallet && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-orange-400">No payout wallet configured</div>
            <div className="text-sm text-orange-300/80 mt-1">
              Set up your payout wallet to receive earnings. Click "Payout Settings" above.
            </div>
          </div>
        </div>
      )}

      {/* Warning about tracking requirement */}
      {summary && summary.ordersWithoutTracking > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <Package className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-yellow-400">Tracking required for payouts</div>
            <div className="text-sm text-yellow-300/80 mt-1">
              You have {summary.ordersWithoutTracking} orders without tracking numbers. Add tracking info to make them eligible for payout.
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-blue-400">How payouts work</div>
          <div className="text-sm text-blue-300/80 mt-1">
            Orders must have tracking numbers to be eligible for payout. Funds become available after buyer confirms receipt or 14 days after shipping. Platform fee of {summary?.platformFeePercent ?? 3.5}% is deducted from each order. Contact admin to request payout.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout History */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Payout History</h2>
          </div>
          {payouts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No payouts yet
            </div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
              {payouts.map((payout) => (
                <div key={payout.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {payout.amount.toFixed(4)} {payout.currency}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          payout.status === 'COMPLETED'
                            ? 'bg-green-500/10 text-green-400'
                            : payout.status === 'PENDING'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {payout.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {payout.orderCount} orders • {new Date(payout.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {payout.txSignature && (
                      <a
                        href={`https://solscan.io/tx/${payout.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        {payout.txSignature.slice(0, 8)}...
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eligible Orders */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Eligible for Payout</h2>
            <p className="text-sm text-gray-400 mt-1">Orders with tracking, ready for payout</p>
          </div>
          {eligibleOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No orders eligible yet
            </div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
              {eligibleOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-[#1f2937]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{order.orderNumber}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {order.amount.toFixed(4)} {currency}
                      </div>
                      <div className="text-xs text-green-400">{order.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wallet Settings Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Payout Settings</h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Wallet Address *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Your Solana wallet address"
                    value={payoutWallet}
                    onChange={(e) => setPayoutWallet(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                  <button
                    onClick={() => publicKey && setPayoutWallet(publicKey.toBase58())}
                    className="px-3 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors text-xs"
                  >
                    Use Connected
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This is where your payouts will be sent. Make sure it's a valid Solana wallet.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowWalletModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWallet}
                disabled={saving || !payoutWallet.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
