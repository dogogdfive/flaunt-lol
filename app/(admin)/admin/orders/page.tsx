// app/(admin)/admin/orders/page.tsx
// Admin orders management - view all orders across all stores

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  X,
  ExternalLink,
  Eye,
  Store,
  AlertTriangle,
  ThumbsUp,
  StickyNote,
  Printer,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string | null;
    walletAddress: string | null;
    email: string | null;
  };
  store: {
    id: string;
    name: string;
    slug: string;
  };
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  platformFee: number;
  merchantAmount: number;
  paymentCurrency: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  buyerConfirmedAt: string | null;
  estimatedDelivery: string | null;
  disputeReason: string | null;
  merchantNotes: string | null;
  labelUrl: string | null;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email?: string;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  PENDING: { label: 'Pending', icon: Clock, className: 'bg-gray-500/10 text-gray-400' },
  PAID: { label: 'Paid', icon: CheckCircle, className: 'bg-green-500/10 text-green-400' },
  PROCESSING: { label: 'Processing', icon: Package, className: 'bg-blue-500/10 text-blue-400' },
  SHIPPED: { label: 'Shipped', icon: Truck, className: 'bg-yellow-500/10 text-yellow-400' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle, className: 'bg-green-500/10 text-green-400' },
  CONFIRMED: { label: 'Confirmed', icon: ThumbsUp, className: 'bg-green-500/10 text-green-400' },
  CANCELLED: { label: 'Cancelled', icon: X, className: 'bg-red-500/10 text-red-400' },
  DISPUTED: { label: 'Disputed', icon: AlertTriangle, className: 'bg-orange-500/10 text-orange-400' },
};

export default function AdminOrdersPage() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [platformFeePercent, setPlatformFeePercent] = useState(3.5);
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());

  // Load dismissed orders from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_dismissed_orders');
    if (saved) {
      try {
        setDismissedOrders(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load dismissed orders:', e);
      }
    }
  }, []);

  // Save dismissed orders to localStorage whenever it changes
  const dismissOrder = (orderId: string) => {
    setDismissedOrders(prev => {
      const newSet = new Set([...prev, orderId]);
      localStorage.setItem('admin_dismissed_orders', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Restore all dismissed orders
  const restoreDismissed = () => {
    setDismissedOrders(new Set());
    localStorage.removeItem('admin_dismissed_orders');
  };

  useEffect(() => {
    if (publicKey) {
      fetchOrders();
    }
  }, [publicKey]);

  const fetchOrders = async () => {
    if (!publicKey) return;

    try {
      const res = await fetch('/api/admin/orders', {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        if (data.platformFeePercent !== undefined) {
          setPlatformFeePercent(data.platformFeePercent);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out dismissed orders first
  const visibleOrders = orders.filter(o => !dismissedOrders.has(o.id));

  const filteredOrders = visibleOrders.filter((order) => {
    if (selectedTab !== 'all') {
      if (selectedTab === 'pending' && order.status !== 'PENDING') return false;
      if (selectedTab === 'paid' && order.status !== 'PAID') return false;
      if (selectedTab === 'shipped' && order.status !== 'SHIPPED') return false;
      if (selectedTab === 'delivered' && order.status !== 'DELIVERED') return false;
      if (selectedTab === 'confirmed' && order.status !== 'CONFIRMED') return false;
      if (selectedTab === 'disputed' && order.status !== 'DISPUTED') return false;
      if (selectedTab === 'cancelled' && order.status !== 'CANCELLED') return false;
      if (selectedTab === 'with-notes' && !order.merchantNotes) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.store.name.toLowerCase().includes(query) ||
        order.customer.walletAddress?.toLowerCase().includes(query) ||
        order.customer.email?.toLowerCase().includes(query) ||
        order.merchantNotes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All', count: visibleOrders.length },
    { id: 'pending', label: 'Pending', count: visibleOrders.filter(o => o.status === 'PENDING').length },
    { id: 'paid', label: 'Paid', count: visibleOrders.filter(o => o.status === 'PAID').length },
    { id: 'shipped', label: 'Shipped', count: visibleOrders.filter(o => o.status === 'SHIPPED').length },
    { id: 'delivered', label: 'Delivered', count: visibleOrders.filter(o => o.status === 'DELIVERED').length },
    { id: 'confirmed', label: 'Confirmed', count: visibleOrders.filter(o => o.status === 'CONFIRMED').length },
    { id: 'cancelled', label: 'Cancelled', count: visibleOrders.filter(o => o.status === 'CANCELLED').length },
    { id: 'disputed', label: 'Disputed', count: visibleOrders.filter(o => o.status === 'DISPUTED').length },
    { id: 'with-notes', label: 'With Notes', count: visibleOrders.filter(o => o.merchantNotes).length },
  ];

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + o.subtotal, 0);

  const totalFees = orders
    .filter(o => o.paymentStatus === 'COMPLETED')
    .reduce((sum, o) => sum + o.platformFee, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 mt-1">View all orders across all stores</p>
        </div>
        {dismissedOrders.size > 0 && (
          <button
            onClick={restoreDismissed}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restore {dismissedOrders.size} dismissed
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{orders.length}</div>
          <div className="text-sm text-gray-400">Total Orders</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-400">Total Revenue</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-400">{totalFees.toFixed(4)}</div>
          <div className="text-sm text-gray-400">Platform Fees</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-400">{orders.filter(o => o.status === 'DISPUTED').length}</div>
          <div className="text-sm text-gray-400">Disputes</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  selectedTab === tab.id ? 'bg-purple-500' : 'bg-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by order #, store, email, wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={order.id} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{order.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{order.store.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {order.shippingAddress?.email && (
                            <div className="text-gray-300">{order.shippingAddress.email}</div>
                          )}
                          <div className="text-xs text-gray-500 font-mono">
                            {order.customer.walletAddress?.slice(0, 4)}...{order.customer.walletAddress?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{order.subtotal.toFixed(4)} {order.paymentCurrency}</div>
                        <div className="text-xs text-gray-500">Fee: {order.platformFee.toFixed(4)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                          {order.merchantNotes && (
                            <span className="p-1 bg-yellow-500/10 rounded" title="Has merchant notes">
                              <StickyNote className="w-3.5 h-3.5 text-yellow-400" />
                            </span>
                          )}
                        </div>
                        {order.disputeReason && (
                          <div className="text-xs text-orange-400 mt-1 max-w-[150px] truncate" title={order.disputeReason}>
                            {order.disputeReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {order.trackingNumber ? (
                          <div>
                            <div className="text-sm text-gray-300 font-mono">{order.trackingNumber}</div>
                            {order.carrier && <div className="text-xs text-gray-500">{order.carrier}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-400 text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        {order.paidAt && (
                          <div className="text-xs text-green-500">
                            Paid {new Date(order.paidAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                              title="Track shipment"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {(order.status === 'CANCELLED' || (order.status === 'PENDING' && order.paymentStatus !== 'COMPLETED')) && (
                            <button
                              onClick={() => dismissOrder(order.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Dismiss order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-[#111827]">
              <h2 className="text-lg font-semibold text-white">Order {selectedOrder.orderNumber}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status]?.className}`}>
                  {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                </span>
                <span className="text-gray-400">
                  {selectedOrder.paymentStatus === 'COMPLETED' ? '✓ Paid' : 'Unpaid'}
                </span>
              </div>

              {/* Dispute Info */}
              {selectedOrder.disputeReason && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="text-orange-400 font-medium mb-1">Dispute Reason:</div>
                  <div className="text-gray-300">{selectedOrder.disputeReason}</div>
                </div>
              )}

              {/* Merchant Notes */}
              {selectedOrder.merchantNotes && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                    <StickyNote className="w-4 h-4" />
                    Merchant Notes
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap">{selectedOrder.merchantNotes}</div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-[#1f2937] rounded-lg p-3">
                      <div>
                        <div className="text-white">{item.productName}</div>
                        {item.variantName && <div className="text-xs text-gray-500">{item.variantName}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-white">× {item.quantity}</div>
                        <div className="text-sm text-gray-400">{item.price.toFixed(4)} {selectedOrder.paymentCurrency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="bg-[#1f2937] rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{selectedOrder.subtotal.toFixed(4)} {selectedOrder.paymentCurrency}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Platform Fee ({platformFeePercent}%)</span>
                  <span className="text-purple-400">{selectedOrder.platformFee.toFixed(4)} {selectedOrder.paymentCurrency}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Merchant Receives</span>
                  <span className="text-green-400">{selectedOrder.merchantAmount.toFixed(4)} {selectedOrder.paymentCurrency}</span>
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.trackingNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Tracking</h3>
                  <div className="bg-[#1f2937] rounded-lg p-4">
                    <div className="font-mono text-white">{selectedOrder.trackingNumber}</div>
                    {selectedOrder.carrier && <div className="text-sm text-gray-400">{selectedOrder.carrier}</div>}
                    {selectedOrder.estimatedDelivery && (
                      <div className="text-sm text-gray-400 mt-1">
                        Est. delivery: {new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {selectedOrder.trackingUrl && (
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <ExternalLink className="w-3 h-3" /> Track Package
                        </a>
                      )}
                      {selectedOrder.labelUrl && (
                        <a
                          href={selectedOrder.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-400 hover:text-green-300 text-sm"
                        >
                          <Printer className="w-3 h-3" /> Print Label
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Shipping Address</h3>
                  <div className="bg-[#1f2937] rounded-lg p-4 text-gray-300">
                    <div className="font-medium text-white">{selectedOrder.shippingAddress.name}</div>
                    <div>{selectedOrder.shippingAddress.line1}</div>
                    {selectedOrder.shippingAddress.line2 && <div>{selectedOrder.shippingAddress.line2}</div>}
                    <div>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
                    </div>
                    <div>{selectedOrder.shippingAddress.country}</div>
                    {selectedOrder.shippingAddress.email && (
                      <div className="mt-2 text-blue-400">{selectedOrder.shippingAddress.email}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created</span>
                    <span className="text-gray-300">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedOrder.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-green-400">Paid</span>
                      <span className="text-gray-300">{new Date(selectedOrder.paidAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-yellow-400">Shipped</span>
                      <span className="text-gray-300">{new Date(selectedOrder.shippedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-green-400">Delivered</span>
                      <span className="text-gray-300">{new Date(selectedOrder.deliveredAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.buyerConfirmedAt && (
                    <div className="flex justify-between">
                      <span className="text-green-400">Buyer Confirmed</span>
                      <span className="text-gray-300">{new Date(selectedOrder.buyerConfirmedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Store */}
              <div className="flex items-center justify-between bg-[#1f2937] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-white font-medium">{selectedOrder.store.name}</div>
                    <div className="text-xs text-gray-500">/{selectedOrder.store.slug}</div>
                  </div>
                </div>
                <a
                  href={`/store/${selectedOrder.store.slug}`}
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View Store
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
