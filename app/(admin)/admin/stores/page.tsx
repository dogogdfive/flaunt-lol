// app/(admin)/admin/stores/page.tsx
// Admin stores management page with bulk actions

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Search,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Eye,
  ExternalLink,
  Trash2,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import BulkActions from '@/components/ui/BulkActions';

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  totalOrders: number;
  totalSales: number;
  createdAt: string;
  owner: {
    id: string;
    email: string | null;
    walletAddress: string | null;
  };
  _count: {
    products: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  SUSPENDED: { label: 'Suspended', color: 'bg-gray-500/10 text-gray-400', icon: Ban },
};

export default function AdminStoresPage() {
  const { publicKey } = useWallet();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);

  useEffect(() => {
    if (publicKey) {
      fetchStores();
    }
  }, [statusFilter, publicKey]);

  const fetchStores = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      console.log('[Admin Stores Page] Fetching stores with status:', statusFilter);
      const res = await fetch(`/api/admin/stores?${params}`, {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      console.log('[Admin Stores Page] Response:', data);

      if (data.success) {
        setStores(data.stores);
      } else {
        console.error('[Admin Stores Page] API Error:', data.error);
      }
    } catch (error) {
      console.error('[Admin Stores Page] Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStores.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStores.map(s => s.id)));
    }
  };

  const handleBulkAction = async (actionId: string, overrideIds?: string[], reason?: string) => {
    const ids = overrideIds || Array.from(selectedIds);

    if (ids.length === 0) {
      alert('Please select at least one item');
      return;
    }

    // For rejection, open modal to get reason
    if (actionId === 'reject_stores' && !reason) {
      setRejectingIds(ids);
      setRejectReason('');
      setRejectModalOpen(true);
      return;
    }

    const res = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': publicKey?.toBase58() || '',
      },
      body: JSON.stringify({ action: actionId, ids, reason: reason || '' }),
      credentials: 'include',
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setSelectedIds(new Set());
      fetchStores();
    } else {
      alert(data.error || 'Action failed');
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    handleBulkAction('reject_stores', rejectingIds, rejectReason);
    setRejectModalOpen(false);
    setRejectReason('');
    setRejectingIds([]);
  };

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner.walletAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bulkActions = statusFilter === 'PENDING' ? [
    { id: 'approve_stores', label: 'Approve', variant: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'reject_stores', label: 'Reject', variant: 'danger' as const, icon: <XCircle className="w-4 h-4" /> },
    { id: 'delete_stores', label: 'Delete', variant: 'danger' as const, icon: <Trash2 className="w-4 h-4" />, confirmMessage: 'Are you sure? This will permanently delete stores and all their products/orders!' },
  ] : statusFilter === 'APPROVED' ? [
    { id: 'suspend_stores', label: 'Suspend', variant: 'danger' as const, icon: <Ban className="w-4 h-4" />, confirmMessage: 'Are you sure you want to suspend these stores?' },
    { id: 'delete_stores', label: 'Delete', variant: 'danger' as const, icon: <Trash2 className="w-4 h-4" />, confirmMessage: 'Are you sure? This will permanently delete stores and all their products/orders!' },
  ] : statusFilter === 'REJECTED' ? [
    { id: 'delete_stores', label: 'Delete', variant: 'danger' as const, icon: <Trash2 className="w-4 h-4" />, confirmMessage: 'Are you sure? This will permanently delete stores and all their products/orders!' },
  ] : statusFilter === 'SUSPENDED' ? [
    { id: 'approve_stores', label: 'Reinstate', variant: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'delete_stores', label: 'Delete', variant: 'danger' as const, icon: <Trash2 className="w-4 h-4" />, confirmMessage: 'Are you sure? This will permanently delete stores and all their products/orders!' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stores</h1>
        <p className="text-gray-400 mt-1">Review and manage merchant stores</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-[#1f2937] rounded-lg p-1">
          {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(status => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setSelectedIds(new Set());
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredStores.length && filteredStores.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  Loading stores...
                </td>
              </tr>
            ) : filteredStores.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">No stores found</p>
                  <p className="text-gray-400">
                    {statusFilter === 'PENDING' ? 'No stores pending review' : `No ${statusFilter.toLowerCase()} stores`}
                  </p>
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => {
                const status = statusConfig[store.status] || statusConfig.PENDING;
                const StatusIcon = status.icon;

                return (
                  <tr key={store.id} className={`hover:bg-[#1f2937]/50 ${selectedIds.has(store.id) ? 'bg-purple-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(store.id)}
                        onChange={() => toggleSelect(store.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1f2937] overflow-hidden flex-shrink-0">
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-full h-full p-2 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{store.name}</div>
                          <div className="text-xs text-gray-500">/{store.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {store.owner.email && <div className="text-gray-300">{store.owner.email}</div>}
                        {store.owner.walletAddress && (
                          <div className="text-gray-500 font-mono text-xs">
                            {store.owner.walletAddress.slice(0, 6)}...{store.owner.walletAddress.slice(-4)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{store._count.products}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{store.totalOrders}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-400">{Number(store.totalSales).toFixed(2)} SOL</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/stores/${store.id}`}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg"
                          title="Edit store"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/store/${store.slug}`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {store.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleBulkAction('approve_stores', [store.id])}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
                              title="Approve store"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleBulkAction('reject_stores', [store.id])}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                              title="Reject store"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this store and all its products/orders?')) {
                              handleBulkAction('delete_stores', [store.id]);
                            }
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                          title="Delete store"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Bulk Actions Toolbar */}
      {bulkActions.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.size}
          actions={bulkActions}
          onAction={handleBulkAction}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRejectModalOpen(false)} />
          <div className="relative bg-[#111827] border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Reject Store Application</h3>
            <p className="text-gray-400 mb-4">
              {rejectingIds.length === 1
                ? 'Please provide a reason for rejecting this store. The applicant will receive an email with this explanation.'
                : `Please provide a reason for rejecting these ${rejectingIds.length} stores. Each applicant will receive an email with this explanation.`}
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Store name violates trademark policies, Incomplete store information, Products don't meet platform guidelines..."
              rows={4}
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason('');
                  setRejectingIds([]);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
              >
                Reject & Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
