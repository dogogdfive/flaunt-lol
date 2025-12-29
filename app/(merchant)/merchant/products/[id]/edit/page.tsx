// app/(merchant)/merchant/products/[id]/edit/page.tsx
// Product edit page with pre-filled form

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceSol: number;
  priceUsdc: number | null;
  quantity: number;
  category: string | null;
  images: string[];
  status: string;
  bondingEnabled: boolean;
  bondingGoal: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { publicKey } = useWallet();
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [bondingEnabled, setBondingEnabled] = useState(false);
  const [bondingGoal, setBondingGoal] = useState('100');
  const [status, setStatus] = useState('');
  
  // Image state
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!publicKey) {
        setLoading(false);
        setError('Please connect your wallet');
        return;
      }

      try {
        const response = await fetch(`/api/merchant/products/${productId}`, {
          headers: {
            'x-wallet-address': publicKey.toBase58(),
          },
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Product not found');
        }
        const data = await response.json();
        const product: Product = data.product;
        
        setName(product.name);
        setDescription(product.description || '');
        // Convert SOL to USDC for display (or use priceUsdc if available)
        const usdPrice = product.priceUsdc || (product.priceSol * 200);
        setPriceUsdc(String(usdPrice));
        setQuantity(String(product.quantity));
        setCategory(product.category || '');
        setImages(product.images || []);
        setBondingEnabled(product.bondingEnabled);
        setBondingGoal(String(product.bondingGoal));
        setStatus(product.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, publicKey]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (images.length >= 10) {
          setError('Maximum 10 images allowed');
          break;
        }

        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed');
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('Image must be less than 5MB');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'productImage');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'x-wallet-address': publicKey?.toBase58() || '',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        setImages(prev => [...prev, data.url]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForReview: boolean) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!name.trim()) {
        throw new Error('Product name is required');
      }
      if (!priceUsdc || parseFloat(priceUsdc) <= 0) {
        throw new Error('Valid price is required');
      }
      if (images.length === 0) {
        throw new Error('At least one image is required');
      }

      // Convert USDC to SOL (using approximate rate)
      const usdcPrice = parseFloat(priceUsdc);
      const solPrice = usdcPrice / 200;

      const response = await fetch(`/api/merchant/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey?.toBase58() || '',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          priceSol: solPrice,
          priceUsdc: usdcPrice,
          images,
          category: category || null,
          quantity: parseInt(quantity) || 0,
          bondingEnabled,
          bondingGoal: parseInt(bondingGoal) || 100,
          submitForReview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setSuccess(data.message || 'Product updated successfully');
      
      setTimeout(() => {
        router.push('/merchant/products');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/merchant/products"
          className="p-2 text-gray-400 hover:text-white hover:bg-[#1f2937] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Product</h1>
          <p className="text-gray-400 mt-1">Update your product details</p>
        </div>
      </div>

      {/* Status Badge */}
      {status && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
          status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
          status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
          'bg-gray-500/10 text-gray-400'
        }`}>
          {status === 'APPROVED' && <CheckCircle className="w-4 h-4" />}
          {status === 'PENDING' && <Loader2 className="w-4 h-4" />}
          {status === 'REJECTED' && <AlertCircle className="w-4 h-4" />}
          Status: {status}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        <div className="p-6 space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Limited Edition Hoodie"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Price & Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Inventory <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a category</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="collectibles">Collectibles</option>
              <option value="art">Art</option>
              <option value="digital">Digital</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Images <span className="text-red-400">*</span>
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {images.map((url, index) => (
                <div key={index} className="relative aspect-square bg-[#1f2937] rounded-lg overflow-hidden group">
                  <img
                    src={url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                      Main
                    </span>
                  )}
                </div>
              ))}
              
              {images.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <p className="text-xs text-gray-500">
              PNG, JPG up to 5MB each. Max 10 images.
            </p>
          </div>

          {/* Bonding Curve */}
          <div className="bg-[#1f2937] rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bondingEnabled}
                onChange={(e) => setBondingEnabled(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-[#111827] text-blue-500 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-white">Enable Bonding Curve</span>
                <p className="text-xs text-gray-400 mt-1">
                  Product becomes ready to ship after reaching the goal.
                </p>
              </div>
            </label>
            
            {bondingEnabled && (
              <div className="mt-4 pl-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bonding Goal (units to sell)
                </label>
                <input
                  type="number"
                  min="1"
                  value={bondingGoal}
                  onChange={(e) => setBondingGoal(e.target.value)}
                  className="w-full max-w-[200px] px-4 py-2 bg-[#111827] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-800">
          <Link
            href="/merchant/products"
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1f2937] text-gray-300 rounded-lg hover:bg-[#374151] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
            {(status === 'DRAFT' || status === 'REJECTED') && (
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
