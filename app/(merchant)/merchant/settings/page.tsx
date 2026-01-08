// app/(merchant)/merchant/settings/page.tsx
// Merchant store settings page

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Store,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { removeBackground, blobToFile } from '@/lib/remove-background';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  payoutWallet: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  telegramUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZip: string | null;
  businessCountry: string | null;
  showLocation: boolean;
  status: string;
}

export default function MerchantSettings() {
  const { publicKey } = useWallet();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [store, setStore] = useState<StoreData | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [payoutWallet, setPayoutWallet] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Shipping info state (required for labels)
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessZip, setBusinessZip] = useState('');
  const [businessCountry, setBusinessCountry] = useState('US');
  const [showLocation, setShowLocation] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [processingLogoBg, setProcessingLogoBg] = useState(false);
  const [logoBgProgress, setLogoBgProgress] = useState(0);

  // Fetch store data
  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    const fetchStore = async () => {
      try {
        const response = await fetch('/api/merchant/store', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        if (!response.ok) throw new Error('Failed to fetch store');

        const data = await response.json();
        if (data.store) {
          setStore(data.store);
          setName(data.store.name || '');
          setDescription(data.store.description || '');
          setPayoutWallet(data.store.payoutWallet || '');
          setWebsiteUrl(data.store.websiteUrl || '');
          setTwitterUrl(data.store.twitterUrl || '');
          setDiscordUrl(data.store.discordUrl || '');
          setTelegramUrl(data.store.telegramUrl || '');
          setLogoUrl(data.store.logoUrl);
          setBannerUrl(data.store.bannerUrl);
          // Shipping info
          setContactEmail(data.store.contactEmail || '');
          setContactPhone(data.store.contactPhone || '');
          setBusinessName(data.store.businessName || '');
          setBusinessAddress(data.store.businessAddress || '');
          setBusinessCity(data.store.businessCity || '');
          setBusinessState(data.store.businessState || '');
          setBusinessZip(data.store.businessZip || '');
          setBusinessCountry(data.store.businessCountry || 'US');
          setShowLocation(data.store.showLocation || false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [publicKey]);

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'banner'
  ) => {
    if (!publicKey) {
      setError('Please connect your wallet to upload');
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingBanner;
    const setUrl = type === 'logo' ? setLogoUrl : setBannerUrl;

    setUploading(true);
    setError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      let fileToUpload: File = file;

      // Only apply background removal for logos (not banners)
      if (type === 'logo') {
        setProcessingLogoBg(true);
        setLogoBgProgress(0);

        const bgResult = await removeBackground(file, (progress) => {
          setLogoBgProgress(Math.round(progress * 100));
        });

        setProcessingLogoBg(false);

        if (bgResult.success && bgResult.blob) {
          fileToUpload = blobToFile(bgResult.blob, file.name);
        } else {
          console.warn('Background removal failed, using original:', bgResult.error);
          fileToUpload = file;
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('type', type === 'logo' ? 'storeLogo' : 'storeBanner');
      formData.append('walletAddress', publicKey.toBase58());

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (type === 'logo') {
        setProcessingLogoBg(false);
      }
    }
  };

  const handleSave = async () => {
    if (!publicKey) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/merchant/store', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          name,
          description: description || null,
          payoutWallet: payoutWallet || null,
          websiteUrl: websiteUrl || null,
          twitterUrl: twitterUrl || null,
          discordUrl: discordUrl || null,
          telegramUrl: telegramUrl || null,
          logoUrl,
          bannerUrl,
          // Shipping info
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          businessName: businessName || null,
          businessAddress: businessAddress || null,
          businessCity: businessCity || null,
          businessState: businessState || null,
          businessZip: businessZip || null,
          businessCountry: businessCountry || 'US',
          showLocation,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update store');
      }

      const data = await response.json();
      if (data.pendingReview) {
        setSuccess('Store settings updated! Name/logo/banner changes have been sent to admins for review.');
      } else {
        setSuccess('Store settings updated successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Store Found</h3>
        <p className="text-gray-400">You need to create a store first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Store Settings</h1>
        <p className="text-gray-400 mt-1">Manage your store profile and payout settings</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="w-4 h-4 text-green-400" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Store Status */}
      <div className={`p-4 rounded-lg border ${
        store.status === 'APPROVED' 
          ? 'bg-green-500/10 border-green-500/20' 
          : store.status === 'PENDING'
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center gap-2">
          {store.status === 'APPROVED' && <CheckCircle className="w-5 h-5 text-green-400" />}
          {store.status === 'PENDING' && <Loader2 className="w-5 h-5 text-yellow-400" />}
          {store.status === 'REJECTED' && <AlertCircle className="w-5 h-5 text-red-400" />}
          <span className={`font-medium ${
            store.status === 'APPROVED' ? 'text-green-400' :
            store.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            Store Status: {store.status}
          </span>
        </div>
      </div>

      {/* Store Profile */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Store Profile</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Store Banner (1200x400 recommended)
            </label>
            <div 
              onClick={() => bannerInputRef.current?.click()}
              className="relative h-40 bg-[#1f2937] rounded-lg overflow-hidden cursor-pointer group"
            >
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingBanner ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <span className="text-white font-medium">Change Banner</span>
                )}
              </div>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
              className="hidden"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Store Logo
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => !processingLogoBg && !uploadingLogo && logoInputRef.current?.click()}
                className={`relative w-24 h-24 bg-[#1f2937] rounded-lg overflow-hidden group ${
                  processingLogoBg || uploadingLogo ? 'cursor-wait' : 'cursor-pointer'
                }`}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="w-8 h-8 text-gray-600" />
                  </div>
                )}
                <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity ${
                  processingLogoBg || uploadingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {processingLogoBg ? (
                    <>
                      <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                      <span className="text-xs text-purple-300 mt-1">{logoBgProgress}%</span>
                    </>
                  ) : uploadingLogo ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                <p>Recommended: 400x400px</p>
                <p>Max size: 5MB</p>
                <p className="text-purple-400 text-xs mt-1">Background auto-removed</p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
              className="hidden"
            />
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Store Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your store..."
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Payout Settings */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Payout Settings
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payout Wallet Address (Solana)
            </label>
            <input
              type="text"
              value={payoutWallet}
              onChange={(e) => setPayoutWallet(e.target.value)}
              placeholder="Your Solana wallet address"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is where your earnings will be sent. Double-check the address!
            </p>
          </div>
        </div>
      </div>

      {/* Shipping Info (Required for Labels) */}
      <div className="bg-[#111827] border border-purple-500/30 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 bg-purple-500/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-400" />
            Shipping Info
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-2">Required for Labels</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">This information is required to purchase shipping labels through Shippo.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contact Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contact Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555-555-5555"
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name (shown on shipping labels)"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={businessCity}
                onChange={(e) => setBusinessCity(e.target.value)}
                placeholder="City"
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={businessState}
                onChange={(e) => setBusinessState(e.target.value)}
                placeholder="CA"
                maxLength={2}
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={businessZip}
                onChange={(e) => setBusinessZip(e.target.value)}
                placeholder="90001"
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <select
                value={businessCountry}
                onChange={(e) => setBusinessCountry(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>

          {(!contactEmail || !contactPhone || !businessAddress || !businessCity || !businessState || !businessZip) && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                Complete all required fields to purchase shipping labels
              </p>
            </div>
          )}

          {/* Show Location Toggle for Local Sales */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-[#111827] text-green-500 focus:ring-green-500"
              />
              <div>
                <span className="text-sm font-medium text-white">Show my location to buyers</span>
                <p className="text-xs text-gray-400 mt-1">
                  Allow buyers to find you by city/state for local pickup. Only your city and state will be shown (not your full address).
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Social Links
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Twitter
            </label>
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://twitter.com/yourhandle"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Discord
            </label>
            <input
              type="url"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.gg/yourserver"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telegram
            </label>
            <input
              type="url"
              value={telegramUrl}
              onChange={(e) => setTelegramUrl(e.target.value)}
              placeholder="https://t.me/yourchannel"
              className="w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
