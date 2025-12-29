// app/(merchant)/merchant/collections/page.tsx
// Merchant collections management page

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  X,
  Check,
  Package,
} from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
  products: {
    id: string;
    name: string;
    image: string;
    status: string;
  }[];
  createdAt: string;
}

export default function MerchantCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/merchant/collections');
      const data = await res.json();
      if (data.success) {
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/merchant/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchCollections();
        setShowModal(false);
        setFormData({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Failed to save collection:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await fetch(`/api/merchant/collections/${id}`, { method: 'DELETE' });
      fetchCollections();
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Collections</h1>
          <p className="text-gray-400 mt-1">Organize your products into collections</p>
        </div>
        <button
          onClick={() => {
            setEditingCollection(null);
            setFormData({ name: '', description: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Collection
        </button>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading collections...</div>
      ) : collections.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No collections yet</h2>
          <p className="text-gray-400 mb-6">
            Create your first collection to organize your products
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Collection Image */}
              <div className="aspect-video bg-[#1f2937] relative">
                {collection.imageUrl ? (
                  <img
                    src={collection.imageUrl}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                {!collection.isActive && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded">
                    Inactive
                  </div>
                )}
              </div>

              {/* Collection Info */}
              <div className="p-4">
                <h3 className="text-white font-semibold">{collection.name}</h3>
                {collection.description && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{collection.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <Package className="w-4 h-4" />
                  {collection.productCount} products
                </div>

                {/* Product Thumbnails */}
                {collection.products.length > 0 && (
                  <div className="flex gap-1 mt-3">
                    {collection.products.slice(0, 4).map((product) => (
                      <img
                        key={product.id}
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ))}
                    {collection.products.length > 4 && (
                      <div className="w-10 h-10 bg-[#1f2937] rounded flex items-center justify-center text-xs text-gray-400">
                        +{collection.products.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setEditingCollection(collection);
                      setFormData({
                        name: collection.name,
                        description: collection.description || '',
                      });
                      setShowModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-300 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(collection.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingCollection ? 'Edit Collection' : 'New Collection'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Collection"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
