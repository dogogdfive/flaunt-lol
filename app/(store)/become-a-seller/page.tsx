'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

const categories = [
  'Apparel & Clothing',
  'Art & Collectibles',
  'Accessories',
  'Home & Living',
  'Digital Products',
  'NFT Merchandise',
  'Gaming',
  'Music & Entertainment',
  'Sports',
  'Other',
];

export default function BecomeSellerPage() {
  const [mounted, setMounted] = useState(false);
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnected = mounted ? connected : false;
  const isConnecting = mounted ? connecting : false;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState(3.5);

  // Fetch platform fee on mount
  useEffect(() => {
    fetch('/api/platform-info')
      .then(res => res.json())
      .then(data => {
        if (data.platformFeePercent !== undefined) {
          setPlatformFeePercent(data.platformFeePercent);
        }
      })
      .catch(() => {});
  }, []);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingProduct, setUploadingProduct] = useState(false);

  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    category: '',
    contactEmail: '',
    websiteUrl: '',
    twitterUrl: '',
    discordUrl: '',
    businessType: 'individual',
    country: '',
    payoutWallet: '',
    agreeToTerms: false,
    logoUrl: '',
    bannerUrl: '',
    productImages: [] as string[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner' | 'product') => {
    console.log('[Upload] Starting upload:', { type, fileName: file?.name, fileSize: file?.size, publicKey: publicKey?.toBase58() });

    if (!publicKey) {
      console.log('[Upload] No publicKey available');
      setError('Please connect your wallet first');
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : type === 'banner' ? setUploadingBanner : setUploadingProduct;
    setUploading(true);
    setError('');

    try {
      if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed');
      if (file.size > 5 * 1024 * 1024) throw new Error('Image must be less than 5MB');

      const uploadType = type === 'logo' ? 'storeLogo' : type === 'banner' ? 'storeBanner' : 'productImage';
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', uploadType);
      formDataUpload.append('walletAddress', publicKey.toBase58());

      console.log('[Upload] Sending request to /api/upload');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });
      console.log('[Upload] Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.log('[Upload] Error response:', data);
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      console.log('[Upload] Success:', data);
      if (type === 'logo') setFormData(prev => ({ ...prev, logoUrl: data.url }));
      else if (type === 'banner') setFormData(prev => ({ ...prev, bannerUrl: data.url }));
      else setFormData(prev => ({ ...prev, productImages: [...prev.productImages, data.url] }));
    } catch (err) {
      console.error('[Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeProductImage = (index: number) => {
    setFormData(prev => ({ ...prev, productImages: prev.productImages.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stores/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      const data = await res.json();
      console.log('Store application response:', data); // Debug logging
      if (!res.ok) throw new Error(data.error || 'Failed to submit application');
      setSubmitted(true);
    } catch (err) {
      console.error('Store application error:', err); // Debug logging
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while wallet is reconnecting
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <img src="/logo.png" alt="flaunt.lol" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Connecting...</h1>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <img src="/logo.png" alt="flaunt.lol" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Become a Seller</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to start your application</p>
          <button onClick={() => setVisible(true)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">Connect Wallet to Continue</button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">Back to store</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-400 mb-8">We will review your application within 24-48 hours.</p>
          <Link href={redirectUrl} className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
            {redirectUrl.includes('merchant') ? 'Go to Merchant Dashboard' : 'Back to Homepage'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Step {step} of 4</span>
            <button onClick={() => disconnect()} className="text-sm text-gray-400 hover:text-white">Disconnect</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-700'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Tell us about your store</h1>
                <p className="text-gray-400">Basic information about your brand</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Name *</label>
                <input type="text" name="storeName" value={formData.storeName} onChange={handleChange} required placeholder="e.g., Crypto Merch Co" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} placeholder="Tell us about your store..." className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} required className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select a category</option>
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <button type="button" onClick={() => setStep(2)} disabled={!formData.storeName || !formData.description || !formData.category} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Upload Store Images</h1>
                <p className="text-gray-400">Your store logo, banner, and sample product images</p>
              </div>
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Logo *</label>
                <div className="flex items-center gap-4">
                  <div onClick={() => logoInputRef.current?.click()} className="relative w-24 h-24 bg-[#1f2937] rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-700 hover:border-gray-600">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {uploadingLogo ? <Loader2 className="w-6 h-6 text-gray-500 animate-spin" /> : <Upload className="w-6 h-6 text-gray-500" />}
                      </div>
                    )}
                  </div>
                  {formData.logoUrl && <button type="button" onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))} className="text-red-400 hover:text-red-300 text-sm">Remove</button>}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} className="hidden" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Banner *</label>
                <div onClick={() => bannerInputRef.current?.click()} className="relative h-40 bg-[#1f2937] rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-700 hover:border-gray-600">
                  {formData.bannerUrl ? (
                    <>
                      <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, bannerUrl: '' })); }} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {uploadingBanner ? <Loader2 className="w-8 h-8 text-gray-500 animate-spin" /> : (
                        <>
                          <Upload className="w-8 h-8 text-gray-500 mb-2" />
                          <span className="text-gray-500 text-sm">Upload banner</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')} className="hidden" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sample Product Images *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {formData.productImages.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-[#1f2937] rounded-lg overflow-hidden group">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeProductImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {formData.productImages.length < 5 && (
                    <button type="button" onClick={() => productInputRef.current?.click()} disabled={uploadingProduct} className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-600">
                      {uploadingProduct ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          <ImageIcon className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input ref={productInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'product')} className="hidden" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white font-semibold rounded-xl">Back</button>
                <button type="button" onClick={() => setStep(3)} disabled={!formData.logoUrl || !formData.bannerUrl || formData.productImages.length === 0} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Social Links</h1>
                <p className="text-gray-400">Optional but recommended</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Website URL</label>
                <input type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://yourwebsite.com" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Twitter / X</label>
                <input type="text" name="twitterUrl" value={formData.twitterUrl} onChange={handleChange} placeholder="https://twitter.com/yourhandle" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Discord</label>
                <input type="text" name="discordUrl" value={formData.discordUrl} onChange={handleChange} placeholder="https://discord.gg/yourinvite" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white font-semibold rounded-xl">Back</button>
                <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Business Details</h1>
                <p className="text-gray-400">Final details for your seller account</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, businessType: 'individual' }))} className={`p-4 rounded-xl border text-left ${formData.businessType === 'individual' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'}`}>
                    <div className="font-medium text-white">Individual</div>
                    <div className="text-sm text-gray-400">Selling as yourself</div>
                  </button>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, businessType: 'business' }))} className={`p-4 rounded-xl border text-left ${formData.businessType === 'business' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'}`}>
                    <div className="font-medium text-white">Business</div>
                    <div className="text-sm text-gray-400">Registered company</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email <span className="text-red-400">*</span></label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required placeholder="your@email.com" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Buyers will use this email to contact you about orders and inquiries</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country <span className="text-red-400">*</span></label>
                <input type="text" name="country" value={formData.country} onChange={handleChange} required placeholder="e.g., United States" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payout Wallet Address <span className="text-red-400">*</span></label>
                <input type="text" name="payoutWallet" value={formData.payoutWallet} onChange={handleChange} required placeholder="Your Solana wallet address" className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm" />
              </div>
              <div className="bg-[#1f2937] rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} required className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-gray-700 text-blue-600" />
                  <span className="text-sm text-gray-300">I agree to the Terms of Service and Seller Agreement. I understand that flaunt.lol takes a {platformFeePercent}% platform fee on all sales.</span>
                </label>
              </div>
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white font-semibold rounded-xl">Back</button>
                <button type="submit" disabled={loading || !formData.contactEmail || !formData.country || !formData.payoutWallet || !formData.agreeToTerms} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
