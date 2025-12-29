// app/(admin)/admin/payouts/page.tsx
// Admin payouts management - view pending and completed payouts

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Store,
  AlertTriangle,
  Wallet,
  Send,
  X,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

interface Payout {
  id: string;
  store: {
    id: string;
    name: string;
    slug: string;
    payoutWallet: string | null;
  };
  amount: number;
  currency: string;
  status: string;
  txSignature: string | null;
  orderCount: number;
  createdAt: string;
  processedAt: string | null;
}

interface PendingPayout {
  storeId: string;
  storeName: string;
  storeSlug: string;
  payoutWallet: string | null;
  pendingAmount: number;
  orderCount: number;
  oldestOrderDate: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  PENDING: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/10 text-yellow-400' },
  PROCESSING: { label: 'Processing', icon: Clock, className: 'bg-blue-500/10 text-blue-400' },
  COMPLETED: { label: 'Completed', icon: CheckCircle, className: 'bg-green-500/10 text-green-400' },
  FAILED: { label: 'Failed', icon: XCircle, className: 'bg-red-500/10 text-red-400' },
};

export default function AdminPayoutsPage() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState(3.5);

  // Payout modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PendingPayout | null>(null);
  const [txSignature, setTxSignature] = useState('');
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      fetchPayouts();
    }
  }, [publicKey]);

  const fetchPayouts = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/admin/payouts', {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts || []);
        setPendingPayouts(data.pendingPayouts || []);
        if (data.platformFeePercent !== undefined) {
          setPlatformFeePercent(data.platformFeePercent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPayoutModal = (payout: PendingPayout) => {
    setSelectedPayout(payout);
    setTxSignature('');
    setShowPayoutModal(true);
  };

  const copyWallet = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  // Send SOL transaction via wallet
  const sendPayoutTransaction = async () => {
    if (!selectedPayout || !publicKey || !selectedPayout.payoutWallet || !sendTransaction) {
      setTxError('Wallet not connected or payout wallet not set');
      return;
    }

    setSending(true);
    setTxError(null);

    try {
      const recipientPubkey = new PublicKey(selectedPayout.payoutWallet);
      const lamports = Math.floor(selectedPayout.pendingAmount * LAMPORTS_PER_SOL);

      // Create transfer instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction via wallet adapter (triggers wallet popup)
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Set the signature and auto-process the payout
      setTxSignature(signature);

      // Automatically process the payout with the signature
      setProcessing(true);
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          storeId: selectedPayout.storeId,
          txSignature: signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payout');
      }

      // Refresh and close modal
      await fetchPayouts();
      setShowPayoutModal(false);
      setSelectedPayout(null);
      setTxSignature('');
    } catch (error: any) {
      console.error('Payout transaction error:', error);
      if (error.message?.includes('User rejected')) {
        setTxError('Transaction cancelled');
      } else {
        setTxError(error.message || 'Transaction failed');
      }
    } finally {
      setSending(false);
      setProcessing(false);
    }
  };

  const processPayout = async () => {
    if (!selectedPayout || !txSignature.trim() || !publicKey) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          storeId: selectedPayout.storeId,
          txSignature: txSignature.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payout');
      }

      // Refresh payouts list
      await fetchPayouts();
      setShowPayoutModal(false);
      setSelectedPayout(null);
      setTxSignature('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayouts = payouts.filter((payout) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payout.store.name.toLowerCase().includes(query) ||
        payout.store.slug.toLowerCase().includes(query) ||
        payout.txSignature?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredPendingPayouts = pendingPayouts.filter((payout) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payout.storeName.toLowerCase().includes(query) ||
        payout.storeSlug.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.pendingAmount, 0);
  const totalPaid = payouts
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payouts</h1>
        <p className="text-gray-400 mt-1">Manage merchant payouts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{totalPending.toFixed(4)}</div>
          <div className="text-sm text-gray-400">Pending Payouts</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{totalPaid.toFixed(4)}</div>
          <div className="text-sm text-gray-400">Total Paid Out</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{pendingPayouts.length}</div>
          <div className="text-sm text-gray-400">Stores Awaiting Payout</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{payouts.length}</div>
          <div className="text-sm text-gray-400">Total Payouts Made</div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-800">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'pending'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
            }`}
          >
            Pending
            {pendingPayouts.length > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                selectedTab === 'pending' ? 'bg-purple-500' : 'bg-gray-700'
              }`}>
                {pendingPayouts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
            }`}
          >
            History
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              selectedTab === 'history' ? 'bg-purple-500' : 'bg-gray-700'
            }`}>
              {payouts.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by store name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Pending Payouts Table */}
        {selectedTab === 'pending' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout Wallet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oldest Order</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading payouts...
                    </td>
                  </tr>
                ) : filteredPendingPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">No pending payouts</p>
                      <p className="text-gray-400">All merchants are paid up!</p>
                    </td>
                  </tr>
                ) : (
                  filteredPendingPayouts.map((payout) => (
                    <tr key={payout.storeId} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-white font-medium">{payout.storeName}</div>
                            <div className="text-xs text-gray-500">/{payout.storeSlug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {payout.payoutWallet ? (
                          <code className="text-xs text-gray-400 font-mono">
                            {payout.payoutWallet.slice(0, 6)}...{payout.payoutWallet.slice(-4)}
                          </code>
                        ) : (
                          <span className="text-red-400 text-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Not set
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">{payout.orderCount} orders</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-medium">{payout.pendingAmount.toFixed(4)} SOL</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-sm">
                          {new Date(payout.oldestOrderDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {payout.payoutWallet && (
                            <button
                              onClick={() => openPayoutModal(payout)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                              title="Process payout"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Pay
                            </button>
                          )}
                          <a
                            href={`/store/${payout.storeSlug}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                            title="View store"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payout History Table */}
        {selectedTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading payouts...
                    </td>
                  </tr>
                ) : filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">No payout history</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => {
                    const status = statusConfig[payout.status] || statusConfig.PENDING;
                    const StatusIcon = status.icon;
                    return (
                      <tr key={payout.id} className="hover:bg-[#1f2937]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-gray-500" />
                            <span className="text-white">{payout.store.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-400 font-medium">
                            {payout.amount.toFixed(4)} {payout.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300">{payout.orderCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {payout.txSignature ? (
                            <a
                              href={`https://solscan.io/tx/${payout.txSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                            >
                              {payout.txSignature.slice(0, 8)}...
                            </a>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-400 text-sm">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-blue-400 font-medium mb-2">Payout Eligibility Requirements</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• <span className="text-yellow-400">Tracking number is required</span> - Orders without tracking are not eligible</li>
          <li>• Payouts process after buyer confirms receipt OR 14 days after shipping</li>
          <li>• Platform fee ({platformFeePercent}%) is deducted before payout</li>
          <li>• Disputed orders are held until resolution</li>
          <li>• Merchant must have a payout wallet configured</li>
        </ul>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Process Payout</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Store Info */}
              <div className="bg-[#1f2937] rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Store</div>
                <div className="text-white font-medium">{selectedPayout.storeName}</div>
              </div>

              {/* Payout Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1f2937] rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Amount</div>
                  <div className="text-green-400 font-bold text-lg">
                    {selectedPayout.pendingAmount.toFixed(4)} SOL
                  </div>
                </div>
                <div className="bg-[#1f2937] rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Orders</div>
                  <div className="text-white font-medium text-lg">
                    {selectedPayout.orderCount}
                  </div>
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Wallet
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-gray-300 font-mono text-sm overflow-hidden text-ellipsis">
                    {selectedPayout.payoutWallet}
                  </code>
                  <button
                    onClick={() => copyWallet(selectedPayout.payoutWallet!)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                    title="Copy wallet address"
                  >
                    {copiedWallet ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* One-Click Payout Button */}
              <div className="pt-2">
                <button
                  onClick={sendPayoutTransaction}
                  disabled={sending || processing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Transaction...
                    </>
                  ) : processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Recording Payout...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send {selectedPayout.pendingAmount.toFixed(4)} SOL
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click to open your wallet and confirm the transaction
                </p>
              </div>

              {/* Error Message */}
              {txError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{txError}</p>
                </div>
              )}

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-[#111827] text-gray-500">or enter manually</span>
                </div>
              </div>

              {/* Manual Transaction Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transaction Signature (manual)
                </label>
                <input
                  type="text"
                  value={txSignature}
                  onChange={(e) => setTxSignature(e.target.value)}
                  placeholder="Paste signature if sent separately"
                  className="w-full px-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              {/* Manual Confirm Button */}
              {txSignature.trim() && (
                <button
                  onClick={processPayout}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Manual Payout
                    </>
                  )}
                </button>
              )}

              {/* Cancel */}
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setTxError(null);
                }}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
