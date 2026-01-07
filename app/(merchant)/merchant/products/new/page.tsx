// app/(merchant)/merchant/products/new/page.tsx
// Full product creation page with image upload

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { removeBackground, blobToFile } from '@/lib/remove-background';

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { publicKey } = useWallet();
  
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
  const [allowsShipping, setAllowsShipping] = useState(true);
  const [allowsLocalPickup, setAllowsLocalPickup] = useState(false);

  // Categories from API
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  // Live SOL price
  const [solPrice, setSolPrice] = useState<number>(200); // Default fallback
  const [priceLoading, setPriceLoading] = useState(true);

  // Fetch live SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch('/api/price');
        const data = await res.json();
        if (data.success && data.price) {
          setSolPrice(data.price);
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
      } finally {
        setPriceLoading(false);
      }
    }
    fetchSolPrice();
    // Refresh price every 60 seconds
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }
    fetchCategories();
  }, []);

  const estimatedSolPrice = priceUsdc ? (parseFloat(priceUsdc) / solPrice).toFixed(4) : '0';
  
  // Image state
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingBg, setProcessingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);

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

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed');
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image must be less than 5MB');
          continue;
        }

        // Remove background before upload
        setProcessingBg(true);
        setBgProgress(0);

        const bgResult = await removeBackground(file, (progress) => {
          setBgProgress(Math.round(progress * 100));
        });

        setProcessingBg(false);

        let fileToUpload: File;
        if (bgResult.success && bgResult.blob) {
          // Use the processed image with transparent background
          fileToUpload = blobToFile(bgResult.blob, file.name);
        } else {
          // Fallback to original if background removal fails
          console.warn('Background removal failed, using original:', bgResult.error);
          fileToUpload = file;
        }

        // Upload to R2
        const formData = new FormData();
        formData.append('file', fileToUpload);
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
      setProcessingBg(false);
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
      // Validate required fields
      if (!name.trim()) {
        throw new Error('Product name is required');
      }
      if (!priceUsdc || parseFloat(priceUsdc) <= 0) {
        throw new Error('Valid price is required');
      }
      if (!category) {
        throw new Error('Please select a category');
      }
      if (images.length === 0) {
        throw new Error('At least one image is required');
      }
      if (!allowsShipping && !allowsLocalPickup) {
        throw new Error('At least one fulfillment option must be selected');
      }

      // First, get the merchant's store
      const storeRes = await fetch('/api/merchant/store', {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey?.toBase58() || '',
        },
      });
      if (!storeRes.ok) {
        throw new Error('Failed to get store information');
      }
      const storeData = await storeRes.json();

      if (!storeData.store) {
        throw new Error('No store found. Please create a store first.');
      }

      // Calculate SOL price from USDC using live rate
      const usdcPrice = parseFloat(priceUsdc);
      const calculatedSolPrice = usdcPrice / solPrice;

      // Create the product
      const response = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey?.toBase58() || '',
        },
        body: JSON.stringify({
          storeId: storeData.store.id,
          name: name.trim(),
          description: description.trim() || null,
          priceSol: calculatedSolPrice,
          priceUsdc: usdcPrice,
          images,
          category: category || null,
          quantity: parseInt(quantity) || 0,
          bondingEnabled,
          bondingGoal: parseInt(bondingGoal) || 100,
          allowsShipping,
          allowsLocalPickup,
          submitForReview,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess(data.message);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/merchant/products');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-white">Add New Product</h1>
          <p className="text-gray-400 mt-1">Create a new product for your store</p>
        </div>
      </div>

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
              placeholder="Describe your product... Include details about materials, sizing, and what makes it special."
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Price & Inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (USDC) <span className="text-red-400">*</span>
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
              {priceUsdc && parseFloat(priceUsdc) > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  ≈ {estimatedSolPrice} SOL {priceLoading ? '(loading...)' : `(live: $${solPrice.toFixed(2)}/SOL)`}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Price includes shipping. Set in USDC for stable pricing.</p>
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
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))
              ) : (
                <>
                  <option value="clothing">Clothing</option>
                  <option value="accessories">Accessories</option>
                  <option value="collectibles">Collectibles</option>
                  <option value="art">Art</option>
                  <option value="animals">Animals/Pets</option>
                  <option value="digital">Digital</option>
                  <option value="other">Other</option>
                </>
              )}
            </select>
          </div>

          {/* Fulfillment Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fulfillment Options
            </label>
            <div className="space-y-3 bg-[#1f2937] rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowsShipping}
                  onChange={(e) => setAllowsShipping(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-[#111827] text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-white">Ship to buyer</span>
                  <p className="text-xs text-gray-400">Ship this product via standard carriers</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowsLocalPickup}
                  onChange={(e) => setAllowsLocalPickup(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-[#111827] text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-white">Local pickup available</span>
                  <p className="text-xs text-gray-400">Buyer can pick up from your location</p>
                </div>
              </label>
              {!allowsShipping && !allowsLocalPickup && (
                <p className="text-xs text-red-400">At least one fulfillment option must be selected</p>
              )}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Images <span className="text-red-400">*</span>
            </label>
            
            {/* Image Grid */}
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
              
              {/* Upload Button */}
              {images.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || processingBg}
                  className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
                >
                  {processingBg ? (
                    <>
                      <Sparkles className="w-8 h-8 mb-2 animate-pulse text-purple-400" />
                      <span className="text-sm text-purple-400">Removing BG</span>
                      <span className="text-xs text-purple-300">{bgProgress}%</span>
                    </>
                  ) : uploadingImage ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Uploading</span>
                    </>
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
              PNG, JPG up to 5MB each. Max 10 images. First image is the main product image.
              <span className="text-purple-400"> Backgrounds are automatically removed.</span>
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
                  Product becomes ready to ship after reaching the goal. Great for pre-orders and limited editions.
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
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
