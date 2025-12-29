// app/(admin)/admin/stores/[id]/page.tsx
// Admin store edit page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  Store,
  Globe,
  Twitter,
  MessageCircle,
  Mail,
  Wallet,
  CheckCircle,
  XCircle,
  Shield,
  ImageIcon,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  payoutWallet: string | null;
  contactEmail: string | null;
  status: string;
  isVerified: boolean;
  totalSales: string;
  totalOrders: number;
  createdAt: string;
  owner: {
    id: string;
    email: string | null;
    walletAddress: string | null;
  };
  products: {
    id: string;
    name: string;
    slug: string;
    priceSol: string;
    status: string;
    images: string[];
    quantity: number;
  }[];
  _count: {
    products: number;
    orders: number;
  };
}

export default function AdminStoreEditPage({ params }: { params: { id: string } }) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [payoutWallet, setPayoutWallet] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchStore();
    }
  }, [publicKey, params.id]);

  const fetchStore = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/stores/${params.id}`, {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();

      if (data.success && data.store) {
        setStore(data.store);
        setName(data.store.name || '');
        setDescription(data.store.description || '');
        setLogoUrl(data.store.logoUrl || '');
        setBannerUrl(data.store.bannerUrl || '');
        setWebsiteUrl(data.store.websiteUrl || '');
        setTwitterUrl(data.store.twitterUrl || '');
        setDiscordUrl(data.store.discordUrl || '');
        setPayoutWallet(data.store.payoutWallet || '');
        setContactEmail(data.store.contactEmail || '');
        setStatus(data.store.status || '');
        setIsVerified(data.store.isVerified || false);
      } else {
        setError(data.error || 'Store not found');
      }
    } catch (err) {
      setError('Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!publicKey) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/stores/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          name,
          description,
          logoUrl,
          bannerUrl,
          websiteUrl,
          twitterUrl,
          discordUrl,
          payoutWallet,
          contactEmail,
          status,
          isVerified,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Store updated successfully!');
        setStore(data.store);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update store');
      }
    } catch (err) {
      setError('Failed to update store');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!publicKey) return;
    if (!confirm('Delete this store and all its products/orders? This cannot be undone!')) return;

    try {
      const res = await fetch(`/api/admin/stores/${params.id}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/stores');
      } else {
        setError(data.error || 'Failed to delete store');
      }
    } catch (err) {
      setError('Failed to delete store');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="space-y-6">
        <Link href="/admin/stores" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Stores
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Store Not Found</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/stores" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Store</h1>
            <p className="text-gray-400">{store?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/store/${store?.slug}`} target="_blank" className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg">
            <ExternalLink className="w-4 h-4" />
            View
          </a>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Store Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Payout Wallet</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={payoutWallet} onChange={(e) => setPayoutWallet(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Images
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Logo URL</label>
                <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 w-20 h-20 rounded-lg object-cover" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Banner URL</label>
                <input type="text" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                {bannerUrl && <img src={bannerUrl} alt="Banner" className="mt-2 w-full h-32 rounded-lg object-cover" />}
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Social Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Twitter</label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Discord</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={discordUrl} onChange={(e) => setDiscordUrl(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Status
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Store Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1f2937] rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className={`w-5 h-5 ${isVerified ? 'text-blue-400' : 'text-gray-600'}`} />
                  <div>
                    <div className="text-white font-medium">Verified</div>
                    <div className="text-xs text-gray-500">Show badge</div>
                  </div>
                </div>
                <button onClick={() => setIsVerified(!isVerified)} className={`w-12 h-6 rounded-full transition-colors ${isVerified ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isVerified ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Products</span>
                <span className="text-white">{store?._count?.products || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Orders</span>
                <span className="text-white">{store?._count?.orders || 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Sales</span>
                <span className="text-green-400">{Number(store?.totalSales || 0).toFixed(2)} SOL</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Owner</h2>
            <div className="space-y-2">
              {store?.owner.email && <div className="text-gray-300 text-sm">{store.owner.email}</div>}
              {store?.owner.walletAddress && <div className="text-gray-500 font-mono text-xs break-all">{store.owner.walletAddress}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
