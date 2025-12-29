// app/(admin)/admin/products/page.tsx
// Admin products management page with bulk actions

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import {
  Search,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';
import BulkActions from '@/components/ui/BulkActions';

interface Product {
  id: string;
  name: string;
  slug: string;
  priceSol: number;
  priceUsdc: number | null;
  images: string[];
  status: string;
  quantity: number;
  createdAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500/10 text-gray-400', icon: Clock },
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-400', icon: XCircle },
};

export default function AdminProductsPage() {
  const { publicKey } = useWallet();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (publicKey) {
      fetchProducts();
    }
  }, [statusFilter, publicKey]);

  const fetchProducts = async () => {
    if (!publicKey) return;

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/products?${params}`, {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
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
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkAction = async (actionId: string, overrideIds?: string[]) => {
    if (!publicKey) return;

    const ids = overrideIds || Array.from(selectedIds);

    if (ids.length === 0) {
      alert('Please select at least one item');
      return;
    }

    let reason = '';
    if (actionId === 'reject_products') {
      reason = prompt('Enter rejection reason:') || 'Does not meet platform guidelines';
    }

    const res = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': publicKey.toBase58(),
      },
      credentials: 'include',
      body: JSON.stringify({ action: actionId, ids, reason }),
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setSelectedIds(new Set());
      fetchProducts();
    } else {
      alert(data.error || 'Action failed');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.store.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bulkActions = statusFilter === 'PENDING' ? [
    { id: 'approve_products', label: 'Approve', variant: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'reject_products', label: 'Reject', variant: 'danger' as const, icon: <XCircle className="w-4 h-4" /> },
  ] : [
    { id: 'delete_products', label: 'Delete', variant: 'danger' as const, icon: <Trash2 className="w-4 h-4" />, confirmMessage: 'Are you sure you want to delete these products?' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <p className="text-gray-400 mt-1">Review and manage all products on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-[#1f2937] rounded-lg p-1">
          {['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].map(status => (
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
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">No products found</p>
                  <p className="text-gray-400">
                    {statusFilter === 'PENDING' ? 'No products pending review' : `No ${statusFilter.toLowerCase()} products`}
                  </p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const status = statusConfig[product.status] || statusConfig.DRAFT;
                const StatusIcon = status.icon;

                return (
                  <tr key={product.id} className={`hover:bg-[#1f2937]/50 ${selectedIds.has(product.id) ? 'bg-purple-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0] || '/placeholder.png'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <div className="text-white font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{product.store.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">{product.category?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-white">${(product.priceUsdc || product.priceSol * 200).toFixed(2)}</span>
                        <span className="block text-xs text-gray-400">{product.priceSol} SOL</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={product.quantity === 0 ? 'text-red-400' : 'text-gray-300'}>
                        {product.quantity === 0 ? 'Sold Out' : product.quantity}
                      </span>
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
                          href={`/product/${product.slug}?preview=true`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg inline-block"
                          title="Preview product"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {product.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleBulkAction('approve_products', [product.id])}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
                              title="Approve product"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleBulkAction('reject_products', [product.id])}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                              title="Reject product"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Bulk Actions Toolbar */}
      <BulkActions
        selectedCount={selectedIds.size}
        actions={bulkActions}
        onAction={handleBulkAction}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
