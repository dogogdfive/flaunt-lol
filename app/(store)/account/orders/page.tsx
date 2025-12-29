// app/(store)/account/orders/page.tsx
// Customer order history page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  MessageSquare,
  Calendar,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantName: string | null;
  quantity: number;
  price: number;
  currency: string;
  product: {
    id: string;
    slug: string;
    images: string[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  currency: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  estimatedDelivery: string | null;
  buyerConfirmedAt: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
  };
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-gray-400' },
  PAID: { label: 'Paid', icon: CheckCircle, color: 'text-green-400' },
  PROCESSING: { label: 'Processing', icon: Package, color: 'text-blue-400' },
  SHIPPED: { label: 'Shipped', icon: Truck, color: 'text-yellow-400' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle, color: 'text-green-400' },
  CONFIRMED: { label: 'Confirmed', icon: ThumbsUp, color: 'text-green-400' },
  CANCELLED: { label: 'Cancelled', icon: Clock, color: 'text-red-400' },
  DISPUTED: { label: 'Disputed', icon: AlertTriangle, color: 'text-orange-400' },
};

export default function CustomerOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;

  useEffect(() => {
    if (connected && publicKey) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchOrders = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/account/orders', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    if (!publicKey) return;
    setConfirmingOrder(orderId);
    setActionError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchOrders(); // Refresh orders
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setConfirmingOrder(null);
    }
  };

  const handleOpenDispute = async () => {
    if (!publicKey || !disputeOrder || !disputeReason.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orders/${disputeOrder.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDisputeOrder(null);
      setDisputeReason('');
      fetchOrders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to open dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">View Your Orders</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to view your order history.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            ← Back to store
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
            <Link href="/account/orders" className="text-white font-medium">Orders</Link>
            <Link href="/account/wishlist" className="text-gray-400 hover:text-white">Wishlist</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Orders</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No orders yet</h2>
            <p className="text-gray-400 mb-6">Start shopping to see your orders here!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <div
                  key={order.id}
                  className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Order #{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                      <span className="text-white font-semibold">
                        {order.subtotal.toFixed(4)} {order.currency}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">From:</span>
                        <Link href={`/store/${order.store.slug}`} className="text-white font-medium hover:text-blue-400">
                          {order.store.name}
                        </Link>
                      </div>
                      <Link
                        href={`/account/messages?storeId=${order.store.id}`}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Contact Seller
                      </Link>
                      {order.estimatedDelivery && !order.deliveredAt && (
                        <div className="flex items-center gap-1.5 text-sm text-green-400">
                          <Calendar className="w-3.5 h-3.5" />
                          ETA: {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <img
                            src={item.productImage || item.product.images[0] || '/placeholder.png'}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.productName}</p>
                            {item.variantName && (
                              <p className="text-sm text-gray-400">{item.variantName}</p>
                            )}
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-white">{item.price.toFixed(4)} {item.currency}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.trackingNumber && (
                    <div className="px-6 py-4 bg-[#1f2937] border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Tracking Number</p>
                          <p className="text-white font-mono">{order.trackingNumber}</p>
                          {order.carrier && (
                            <p className="text-sm text-gray-500">{order.carrier}</p>
                          )}
                        </div>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Track Package
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Timeline */}
                  <div className="px-6 py-4 border-t border-gray-800">
                    <div className="flex items-center gap-4 text-xs text-gray-500 overflow-x-auto">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Ordered</span>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      <div className={`flex items-center gap-1 ${order.paidAt ? '' : 'opacity-40'}`}>
                        <span className={`w-2 h-2 rounded-full ${order.paidAt ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        <span>Paid</span>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      <div className={`flex items-center gap-1 ${order.shippedAt ? '' : 'opacity-40'}`}>
                        <span className={`w-2 h-2 rounded-full ${order.shippedAt ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        <span>Shipped</span>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      <div className={`flex items-center gap-1 ${order.buyerConfirmedAt ? '' : 'opacity-40'}`}>
                        <span className={`w-2 h-2 rounded-full ${order.buyerConfirmedAt ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        <span>Confirmed</span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm/Dispute Actions - Show for SHIPPED or DELIVERED orders that aren't confirmed */}
                  {['SHIPPED', 'DELIVERED'].includes(order.status) && !order.buyerConfirmedAt && (
                    <div className="px-6 py-4 bg-blue-500/5 border-t border-blue-500/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-white font-medium">Received your order?</p>
                          <p className="text-xs text-gray-400">Confirm receipt to release payment to the seller</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDisputeOrder(order)}
                            className="px-4 py-2 text-sm bg-[#1f2937] hover:bg-[#374151] text-gray-300 rounded-lg transition-colors"
                          >
                            Open Dispute
                          </button>
                          <button
                            onClick={() => handleConfirmReceipt(order.id)}
                            disabled={confirmingOrder === order.id}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            {confirmingOrder === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-4 h-4" />
                            )}
                            Confirm Receipt
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Badge */}
                  {order.status === 'CONFIRMED' && (
                    <div className="px-6 py-3 bg-green-500/10 border-t border-green-500/20">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Receipt confirmed - Payment released to seller</span>
                      </div>
                    </div>
                  )}

                  {/* Disputed Badge */}
                  {order.status === 'DISPUTED' && (
                    <div className="px-6 py-3 bg-orange-500/10 border-t border-orange-500/20">
                      <div className="flex items-center gap-2 text-orange-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Dispute opened - Our team will contact you</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Dispute Modal */}
        {disputeOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#111827] border border-gray-800 rounded-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Open Dispute</h3>
                <p className="text-sm text-gray-400">Order #{disputeOrder.orderNumber}</p>
              </div>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {actionError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for dispute <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Please describe the issue in detail..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDisputeOrder(null);
                      setDisputeReason('');
                      setActionError('');
                    }}
                    className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOpenDispute}
                    disabled={actionLoading || disputeReason.trim().length < 10}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Dispute
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
