// app/(merchant)/merchant/orders/page.tsx
// Merchant orders management page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Search,
  Filter,
  ChevronDown,
  Package,
  Truck,
  CheckCircle,
  Clock,
  X,
  ExternalLink,
  Copy,
  Eye,
  AlertCircle,
  Mail,
  FileText,
  Printer,
  Tag,
  StickyNote,
  DollarSign,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    walletAddress: string;
    email: string | null;
  };
  items: {
    name: string;
    quantity: number;
    price: string;
    image?: string;
  }[];
  total: string;
  subtotal: number;
  merchantAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  merchantNotes: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-gray-500/10 text-gray-400',
  },
  PAID: {
    label: 'Paid',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-400',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Package,
    className: 'bg-blue-500/10 text-blue-400',
  },
  SHIPPED: {
    label: 'Shipped',
    icon: Truck,
    className: 'bg-yellow-500/10 text-yellow-400',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: X,
    className: 'bg-red-500/10 text-red-400',
  },
  DISPUTED: {
    label: 'Disputed',
    icon: AlertCircle,
    className: 'bg-orange-500/10 text-orange-400',
  },
};

const carriers = [
  { id: 'ups', name: 'UPS', urlTemplate: 'https://www.ups.com/track?tracknum=' },
  { id: 'fedex', name: 'FedEx', urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { id: 'usps', name: 'USPS', urlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { id: 'dhl', name: 'DHL', urlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB=' },
  { id: 'other', name: 'Other', urlTemplate: '' },
];

export default function MerchantOrders() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [fulfillLoading, setFulfillLoading] = useState(false);
  const [fulfillError, setFulfillError] = useState('');

  // Fulfillment form state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('ups');
  const [customTrackingUrl, setCustomTrackingUrl] = useState('');

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  // Shipping label state
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchOrders();
    }
  }, [publicKey]);

  const fetchOrders = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/merchant/orders', {
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

  const handleSaveNotes = async () => {
    if (!selectedOrder || !publicKey) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/merchant/orders/${selectedOrder.id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setOrders(prev =>
          prev.map(o => o.id === selectedOrder.id ? { ...o, merchantNotes: notes } : o)
        );
        setShowNotesModal(false);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const fetchShippingRates = async () => {
    if (!selectedOrder || !publicKey) return;
    setRatesLoading(true);
    setShippingRates([]);
    try {
      const res = await fetch(`/api/merchant/orders/${selectedOrder.id}/shipping`, {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success && data.rates) {
        setShippingRates(data.rates);
      } else {
        setFulfillError(data.error || 'Failed to get rates');
      }
    } catch (error) {
      console.error('Failed to get shipping rates:', error);
      setFulfillError('Failed to connect to shipping service');
    } finally {
      setRatesLoading(false);
    }
  };

  const purchaseShippingLabel = async () => {
    if (!selectedOrder || !selectedRate || !publicKey) return;
    setLabelLoading(true);
    try {
      const rate = shippingRates.find(r => r.id === selectedRate);
      const res = await fetch(`/api/merchant/orders/${selectedOrder.id}/shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          rateId: selectedRate,
          provider: rate?.provider,
          price: rate?.price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update order with label info
        setOrders(prev =>
          prev.map(o => o.id === selectedOrder.id ? {
            ...o,
            trackingNumber: data.label.trackingNumber,
            trackingUrl: data.label.trackingUrl,
            labelUrl: data.label.labelUrl,
            status: 'SHIPPED',
            shippedAt: new Date().toISOString(),
          } : o)
        );
        setShowLabelModal(false);
        setSelectedRate(null);
        setShippingRates([]);
      } else {
        setFulfillError(data.error || 'Failed to purchase label');
      }
    } catch (error) {
      console.error('Failed to purchase label:', error);
      setFulfillError('Failed to purchase shipping label');
    } finally {
      setLabelLoading(false);
    }
  };

  const handleFulfillOrder = async () => {
    if (!selectedOrder || !trackingNumber.trim()) {
      setFulfillError('Tracking number is required');
      return;
    }

    setFulfillLoading(true);
    setFulfillError('');

    try {
      const carrier = carriers.find(c => c.id === selectedCarrier);
      const trackingUrl = selectedCarrier === 'other' 
        ? customTrackingUrl 
        : carrier?.urlTemplate + trackingNumber;

      const res = await fetch(`/api/merchant/orders/${selectedOrder.id}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          carrier: carrier?.name,
          trackingUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add tracking');
      }

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === selectedOrder.id ? {
          ...o,
          trackingNumber,
          carrier: carrier?.name || null,
          trackingUrl,
          status: 'SHIPPED',
          shippedAt: new Date().toISOString(),
        } : o)
      );

      // Reset and close modal
      setShowFulfillModal(false);
      setSelectedOrder(null);
      setTrackingNumber('');
      setSelectedCarrier('ups');
      setCustomTrackingUrl('');

    } catch (error) {
      setFulfillError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setFulfillLoading(false);
    }
  };

  // Archive/dismiss a cancelled order (remove from view) - persisted to localStorage
  const [archivedOrders, setArchivedOrders] = useState<Set<string>>(new Set());

  // Load archived orders from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('merchant_archived_orders');
    if (saved) {
      try {
        setArchivedOrders(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load archived orders:', e);
      }
    }
  }, []);

  const archiveOrder = (orderId: string) => {
    setArchivedOrders(prev => {
      const newSet = new Set([...prev, orderId]);
      localStorage.setItem('merchant_archived_orders', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Check if order needs fulfillment (paid but not shipped)
  const needsFulfillment = (order: Order) => {
    return order.paymentStatus === 'COMPLETED' &&
           !['SHIPPED', 'DELIVERED', 'CONFIRMED', 'CANCELLED'].includes(order.status);
  };

  const filteredOrders = orders.filter((order) => {
    // Hide archived orders
    if (archivedOrders.has(order.id)) return false;

    if (selectedTab !== 'all') {
      if (selectedTab === 'to-fulfill' && !needsFulfillment(order)) return false;
      if (selectedTab === 'shipped' && order.status !== 'SHIPPED') return false;
      if (selectedTab === 'delivered' && order.status !== 'DELIVERED') return false;
    }
    if (searchQuery &&
        !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.customer.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const visibleOrders = orders.filter(o => !archivedOrders.has(o.id));

  const tabs = [
    { id: 'all', label: 'All Orders', count: visibleOrders.length },
    { id: 'to-fulfill', label: 'To Fulfill', count: visibleOrders.filter(needsFulfillment).length },
    { id: 'shipped', label: 'Shipped', count: visibleOrders.filter((o) => o.status === 'SHIPPED').length },
    { id: 'delivered', label: 'Delivered', count: visibleOrders.filter((o) => o.status === 'DELIVERED').length },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-gray-400 mt-1">Manage and fulfill customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{orders.filter(needsFulfillment).length}</div>
          <div className="text-sm text-gray-400">To Fulfill</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{orders.filter((o) => o.status === 'SHIPPED').length}</div>
          <div className="text-sm text-gray-400">In Transit</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{orders.filter((o) => o.status === 'DELIVERED').length}</div>
          <div className="text-sm text-gray-400">Delivered</div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{orders.length}</div>
          <div className="text-sm text-gray-400">Total Orders</div>
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
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2937]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    selectedTab === tab.id ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
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
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                  return (
                    <tr key={order.id} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{order.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white">{order.customer.name || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {order.customer.walletAddress?.slice(0, 4)}...{order.customer.walletAddress?.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {order.items.map((item, i) => (
                            <div key={i}>{item.name} × {item.quantity}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{order.total}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        {order.trackingNumber && (
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {order.trackingNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                            title="View Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(order.paymentStatus === 'COMPLETED' && !['SHIPPED', 'DELIVERED', 'CONFIRMED', 'CANCELLED'].includes(order.status)) && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowFulfillModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Fulfill
                            </button>
                          )}
                          {order.status === 'CANCELLED' && (
                            <button
                              onClick={() => archiveOrder(order.id)}
                              className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                              title="Remove from list"
                            >
                              Dismiss
                            </button>
                          )}
                          {order.trackingUrl && (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                              title="Track Package"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {order.labelUrl && (
                            <a
                              href={order.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                              title="Print Shipping Label"
                            >
                              <Printer className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setNotes(order.merchantNotes || '');
                              setShowNotesModal(true);
                            }}
                            className={`p-2 hover:bg-[#1f2937] rounded-lg transition-colors ${order.merchantNotes ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
                            title={order.merchantNotes ? 'View/Edit Notes' : 'Add Notes'}
                          >
                            <StickyNote className="w-4 h-4" />
                          </button>
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

      {/* Fulfill Order Modal */}
      {showFulfillModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Fulfill Order {selectedOrder.orderNumber}</h2>
              <button
                onClick={() => {
                  setShowFulfillModal(false);
                  setFulfillError('');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {fulfillError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fulfillError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tracking Number *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="1Z999AA10123456784"
                  className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Carrier</label>
                <select 
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {carriers.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedCarrier === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tracking URL</label>
                  <input
                    type="url"
                    value={customTrackingUrl}
                    onChange={(e) => setCustomTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              
              <div className="bg-[#1f2937] rounded-lg p-4">
                <div className="text-sm font-medium text-gray-300 mb-2">Ship to:</div>
                <div className="text-sm text-gray-400">
                  {selectedOrder.shippingAddress?.name}<br />
                  {selectedOrder.shippingAddress?.line1}<br />
                  {selectedOrder.shippingAddress?.line2 && <>{selectedOrder.shippingAddress.line2}<br /></>}
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}<br />
                  {selectedOrder.shippingAddress?.country}
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  ✓ Customer will be notified automatically when you add tracking
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowFulfillModal(false);
                  setFulfillError('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleFulfillOrder}
                disabled={fulfillLoading || !trackingNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                {fulfillLoading ? 'Saving...' : 'Mark as Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-[#111827]">
              <h2 className="text-lg font-semibold text-white">Order {selectedOrder.orderNumber}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Order Status & Payout Info */}
              <div className="flex items-center justify-between">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.className || 'bg-gray-500/10 text-gray-400'}`}>
                    {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
                  </span>
                </div>
                {selectedOrder.trackingNumber ? (
                  <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
                    ✓ Eligible for Payout
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-full text-sm font-medium">
                    ⚠ Add tracking for payout
                  </span>
                )}
              </div>

              {/* Customer Information */}
              <div className="bg-[#1f2937] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  👤 Customer Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">{selectedOrder.shippingAddress?.name || selectedOrder.customer.name || 'Not provided'}</span>
                  </div>
                  {selectedOrder.customer.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <a href={`mailto:${selectedOrder.customer.email}`} className="text-blue-400 hover:text-blue-300">
                        {selectedOrder.customer.email}
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet:</span>
                    <span className="text-gray-300 font-mono text-xs">
                      {selectedOrder.customer.walletAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-[#1f2937] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  📦 Shipping Address
                </h3>
                <div className="text-sm text-gray-300">
                  <p className="font-medium text-white">{selectedOrder.shippingAddress?.name}</p>
                  <p>{selectedOrder.shippingAddress?.line1}</p>
                  {selectedOrder.shippingAddress?.line2 && <p>{selectedOrder.shippingAddress.line2}</p>}
                  <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}</p>
                  <p>{selectedOrder.shippingAddress?.country}</p>
                </div>
                <button
                  onClick={() => {
                    const addr = selectedOrder.shippingAddress;
                    if (addr) {
                      const text = `${addr.name}\n${addr.line1}${addr.line2 ? '\n' + addr.line2 : ''}\n${addr.city}, ${addr.state} ${addr.postalCode}\n${addr.country}`;
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#111827] text-gray-300 rounded-lg text-xs hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy Address
                </button>
              </div>

              {/* Tracking Information */}
              {selectedOrder.trackingNumber && (
                <div className="bg-[#1f2937] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    🚚 Tracking Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carrier:</span>
                      <span className="text-white">{selectedOrder.carrier || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tracking #:</span>
                      <span className="text-white font-mono">{selectedOrder.trackingNumber}</span>
                    </div>
                    {selectedOrder.shippedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shipped:</span>
                        <span className="text-white">{new Date(selectedOrder.shippedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedOrder.trackingUrl && (
                      <a
                        href={selectedOrder.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm mt-3 hover:bg-blue-700 transition-colors w-fit"
                      >
                        <ExternalLink className="w-4 h-4" /> Track Package
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-[#1f2937] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  🛒 Order Items
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                      <div>
                        <span className="text-white">{item.name}</span>
                        <span className="text-gray-400 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="text-white font-medium">{item.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-blue-400">{selectedOrder.total}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Order placed: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                {selectedOrder.shippedAt && <p>Shipped: {new Date(selectedOrder.shippedAt).toLocaleString()}</p>}
                {selectedOrder.deliveredAt && <p>Delivered: {new Date(selectedOrder.deliveredAt).toLocaleString()}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 sticky bottom-0 bg-[#111827]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setNotes(selectedOrder.merchantNotes || '');
                    setShowNotesModal(true);
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors flex items-center gap-2"
                >
                  <StickyNote className="w-4 h-4" />
                  Notes
                </button>
              </div>
              <div className="flex items-center gap-2">
                {needsFulfillment(selectedOrder) && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowLabelModal(true);
                        fetchShippingRates();
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Buy Label
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowFulfillModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Tracking & Ship
                    </button>
                  </>
                )}
                {selectedOrder.labelUrl && (
                  <a
                    href={selectedOrder.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Label
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                Private Notes - {selectedOrder.orderNumber}
              </h2>
              <button
                onClick={() => setShowNotesModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">
                Add private notes for this order. These notes are only visible to you and platform admins.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this order..."
                rows={5}
                className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 transition-colors flex items-center gap-2"
              >
                {notesLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label Modal */}
      {showLabelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-[#111827]">
              <h2 className="text-lg font-semibold text-white">
                Buy Shipping Label - {selectedOrder.orderNumber}
              </h2>
              <button
                onClick={() => {
                  setShowLabelModal(false);
                  setShippingRates([]);
                  setSelectedRate(null);
                  setFulfillError('');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {fulfillError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fulfillError}
                </div>
              )}

              {/* Ship To Address */}
              <div className="bg-[#1f2937] rounded-lg p-4">
                <div className="text-sm font-medium text-gray-300 mb-2">Ship to:</div>
                <div className="text-sm text-gray-400">
                  {selectedOrder.shippingAddress?.name}<br />
                  {selectedOrder.shippingAddress?.line1}<br />
                  {selectedOrder.shippingAddress?.line2 && <>{selectedOrder.shippingAddress.line2}<br /></>}
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}<br />
                  {selectedOrder.shippingAddress?.country}
                </div>
              </div>

              {/* Shipping Rates */}
              {ratesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span className="ml-3 text-gray-400">Getting shipping rates...</span>
                </div>
              ) : shippingRates.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select a shipping rate:
                  </label>
                  {shippingRates.map((rate) => (
                    <button
                      key={rate.id}
                      onClick={() => setSelectedRate(rate.id)}
                      className={`w-full p-4 rounded-lg border transition-colors text-left ${
                        selectedRate === rate.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-[#1f2937] border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{rate.provider}</div>
                          <div className="text-sm text-gray-400">
                            {rate.servicelevel?.name || rate.service || 'Standard'}
                          </div>
                          {rate.estimated_days && (
                            <div className="text-xs text-gray-500 mt-1">
                              Est. {rate.estimated_days} day{rate.estimated_days > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-lg font-bold">
                          ${rate.price || rate.amount}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No shipping rates available.</p>
                  <p className="text-sm mt-2">Make sure your store has a valid return address configured.</p>
                  <button
                    onClick={fetchShippingRates}
                    className="mt-4 px-4 py-2 bg-[#1f2937] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  Purchasing a label will automatically add tracking and mark this order as shipped.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 sticky bottom-0 bg-[#111827]">
              <button
                onClick={() => {
                  setShowLabelModal(false);
                  setShippingRates([]);
                  setSelectedRate(null);
                  setFulfillError('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={purchaseShippingLabel}
                disabled={labelLoading || !selectedRate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {labelLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Purchase Label
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
