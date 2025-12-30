// app/(merchant)/merchant/auctions/new/page.tsx
// Create new Dutch auction

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Gavel,
  Upload,
  X,
  Plus,
  Flame,
  Snowflake,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  slug: string;
}

type DecayType = 'LINEAR' | 'STEPPED' | 'CUSTOM';

export default function NewAuctionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [storeId, setStoreId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [startPriceUsdc, setStartPriceUsdc] = useState('');
  const [floorPriceUsdc, setFloorPriceUsdc] = useState('');
  const [decayType, setDecayType] = useState<DecayType>('LINEAR');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startsAt, setStartsAt] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set default start time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    setStartsAt(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) return;

    async function fetchStores() {
      try {
        const res = await fetch('/api/merchant/stores', {
          headers: {
            'x-wallet-address': publicKey!.toBase58(),
          },
        });
        const data = await res.json();

        if (data.success && data.stores) {
          setStores(data.stores);
          if (data.stores.length > 0) {
            setStoreId(data.stores[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, [connected, publicKey]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !publicKey) return;

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'auctionImage');

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-wallet-address': publicKey.toBase58(),
          },
          body: formData,
        });

        const data = await res.json();

        if (data.success && data.url) {
          setImages((prev) => [...prev, data.url]);
        } else {
          setError(data.error || 'Failed to upload image');
        }
      }
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setError('');

    // Validation
    if (!storeId) {
      setError('Please select a store');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!startPriceUsdc || parseFloat(startPriceUsdc) <= 0) {
      setError('Start price is required');
      return;
    }
    if (!floorPriceUsdc || parseFloat(floorPriceUsdc) <= 0) {
      setError('Floor price is required');
      return;
    }
    if (parseFloat(floorPriceUsdc) >= parseFloat(startPriceUsdc)) {
      setError('Floor price must be less than start price');
      return;
    }
    if (!durationMinutes || parseInt(durationMinutes) <= 0) {
      setError('Duration is required');
      return;
    }
    if (images.length === 0) {
      setError('At least one image is required');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          storeId,
          title: title.trim(),
          description: description.trim() || null,
          images,
          videoUrl: videoUrl.trim() || null,
          startPriceUsdc: parseFloat(startPriceUsdc),
          floorPriceUsdc: parseFloat(floorPriceUsdc),
          decayType,
          durationMinutes: parseInt(durationMinutes),
          startsAt: new Date(startsAt).toISOString(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/auction/${data.auction.slug}`);
      } else {
        setError(data.error || 'Failed to create auction');
      }
    } catch (err) {
      setError('Failed to create auction');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview temperature based on current inputs
  const previewTemperature = () => {
    const start = parseFloat(startPriceUsdc) || 100;
    const floor = parseFloat(floorPriceUsdc) || 10;
    // Simulating 30% through auction
    const current = start - (start - floor) * 0.3;
    const temp = ((current - floor) / (start - floor)) * 100;
    return Math.max(0, Math.min(100, temp));
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-center py-16">
        <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to create auctions</p>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
        <h2 className="text-xl font-semibold text-white mb-2">No Approved Store</h2>
        <p className="text-gray-400 mb-6">
          You need an approved store to create auctions
        </p>
        <Link
          href="/become-a-seller"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Apply for a Store
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/merchant/auctions"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to auctions
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Gavel className="w-7 h-7 text-orange-400" />
          Create Dutch Auction
        </h1>
        <p className="text-gray-400 mt-1">
          Set a high starting price that drops over time until someone buys
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Store Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Store
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you auctioning?"
            className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item..."
            rows={4}
            className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Images */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Images <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-800"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 cursor-pointer flex flex-col items-center justify-center transition-colors">
              {uploading ? (
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-500" />
                  <span className="text-xs text-gray-500 mt-1">Add</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Pricing
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Price (USDC) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={startPriceUsdc}
                onChange={(e) => setStartPriceUsdc(e.target.value)}
                placeholder="100.00"
                className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Highest price</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Floor Price (USDC) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={floorPriceUsdc}
                onChange={(e) => setFloorPriceUsdc(e.target.value)}
                placeholder="10.00"
                className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Lowest price</p>
            </div>
          </div>

          {/* Temperature Preview */}
          {startPriceUsdc && floorPriceUsdc && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Preview (30% through auction):</p>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 transition-all"
                  style={{ width: `${previewTemperature()}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3" /> Cold (Floor)
                </span>
                <span className="flex items-center gap-1">
                  Hot (Start) <Flame className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Decay Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Decay Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['LINEAR', 'STEPPED', 'CUSTOM'] as DecayType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDecayType(type)}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  decayType === type
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-[#1f2937] border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="font-medium mb-1">{type}</div>
                <div className="text-xs">
                  {type === 'LINEAR' && 'Smooth drop'}
                  {type === 'STEPPED' && 'Fixed intervals'}
                  {type === 'CUSTOM' && 'Your own curve'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration & Start */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (minutes) <span className="text-red-400">*</span>
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
              <option value="720">12 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Auction...
            </>
          ) : (
            <>
              <Gavel className="w-5 h-5" />
              Create Auction
            </>
          )}
        </button>
      </form>
    </div>
  );
}
