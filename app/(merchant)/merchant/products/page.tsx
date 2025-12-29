// app/(merchant)/merchant/products/page.tsx
// Merchant products management page with real data

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Loader2,
  DollarSign,
  Save,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  images: string[];
  priceSol: number;
  quantity: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  totalSold: number;
  bondingEnabled: boolean;
  bondingGoal: number;
  bondingCurrent: number;
  rejectionReason?: string;
  store: {
    name: string;
    slug: string;
  };
}

const statusConfig = {
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-400',
  },
  PENDING: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-400',
  },
  REJECTED: {
    label: 'Rejected',
    icon: X,
    className: 'bg-red-500/10 text-red-400',
  },
  DRAFT: {
    label: 'Draft',
    icon: Edit,
    className: 'bg-gray-500/10 text-gray-400',
  },
};

export default function MerchantProducts() {
  const { publicKey } = useWallet();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkPriceEdit, setBulkPriceEdit] = useState(false);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  // Fetch products
  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/merchant/products', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [publicKey]);

  // Filter products
  const filteredProducts = products.filter((product) => {
    if (selectedTab !== 'all' && product.status !== selectedTab.toUpperCase()) return false;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Products', count: products.length },
    { id: 'approved', label: 'Approved', count: products.filter((p) => p.status === 'APPROVED').length },
    { id: 'pending', label: 'Pending', count: products.filter((p) => p.status === 'PENDING').length },
    { id: 'draft', label: 'Drafts', count: products.filter((p) => p.status === 'DRAFT').length },
    { id: 'rejected', label: 'Rejected', count: products.filter((p) => p.status === 'REJECTED').length },
  ];

  // Open bulk price edit
  const openBulkPriceEdit = () => {
    const initialPrices: Record<string, string> = {};
    products.forEach(p => {
      initialPrices[p.id] = (p.priceSol * 200).toFixed(2);
    });
    setPriceUpdates(initialPrices);
    setBulkPriceEdit(true);
  };

  // Save all price updates
  const saveBulkPrices = async () => {
    if (!publicKey) return;
    setSavingPrices(true);
    setError(null);

    try {
      const updates = Object.entries(priceUpdates).map(([productId, usdPrice]) => ({
        productId,
        priceSol: parseFloat(usdPrice) / 200, // Convert USD to SOL
        priceUsdc: parseFloat(usdPrice),
      }));

      const response = await fetch('/api/merchant/products/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update prices');
      }

      // Refresh products
      const fetchRes = await fetch('/api/merchant/products', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await fetchRes.json();
      setProducts(data.products || []);
      setBulkPriceEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prices');
    } finally {
      setSavingPrices(false);
    }
  };

  // Delete product
  const handleDelete = async (productId: string) => {
    if (!publicKey) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/merchant/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts(products.filter((p) => p.id !== productId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-1">Manage your store's products</p>
        </div>
        <div className="flex items-center gap-3">
          {bulkPriceEdit ? (
            <>
              <button
                onClick={() => setBulkPriceEdit(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveBulkPrices}
                disabled={savingPrices}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                {savingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All Prices
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openBulkPriceEdit}
                className="px-4 py-2 bg-[#1f2937] text-gray-300 rounded-lg hover:bg-[#374151] transition-colors text-sm font-medium flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Bulk Edit Prices
              </button>
              <Link
                href="/merchant/products/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
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
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  selectedTab === tab.id ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredProducts.map((product) => {
                  const status = statusConfig[product.status];
                  const lowStock = product.quantity > 0 && product.quantity <= 5;
                  
                  return (
                    <tr key={product.id} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#1f2937] rounded-lg overflow-hidden flex-shrink-0">
                            {product.images && product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-white font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">ID: {product.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        {product.status === 'REJECTED' && product.rejectionReason && (
                          <div className="text-xs text-red-400 mt-1">{product.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {bulkPriceEdit ? (
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceUpdates[product.id] || ''}
                              onChange={(e) => setPriceUpdates(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-full pl-6 pr-2 py-1.5 bg-[#1f2937] border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="text-white font-medium">${(product.priceSol * 200).toFixed(2)}</span>
                            <span className="block text-xs text-gray-500">{product.priceSol} SOL</span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`${lowStock ? 'text-red-400' : product.quantity === 0 ? 'text-gray-500' : 'text-white'}`}>
                            {product.quantity}
                          </span>
                          {lowStock && <AlertCircle className="w-4 h-4 text-red-400" />}
                          {product.quantity === 0 && <span className="text-xs text-red-400">(Out of stock)</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{product.totalSold}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/product/${product.slug}?preview=true`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                            title="Preview product"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/merchant/products/${product.id}/edit`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(product.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first product'}
            </p>
            <Link
              href="/merchant/products/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Product?</h3>
            <p className="text-gray-400 mb-6">
              This action cannot be undone. The product will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
