// app/(store)/account/profile/page.tsx
// User profile settings page

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  User,
  Mail,
  AtSign,
  Check,
  X,
  Loader2,
  Save,
  AlertCircle,
  Wallet,
  ShoppingBag,
  Store,
  Star,
  Camera,
} from 'lucide-react';
import { useRef } from 'react';

interface UserProfile {
  id: string;
  walletAddress: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  _count: {
    orders: number;
    stores: number;
    reviews: number;
  };
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Username availability
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!publicKey) return;

    try {
      const res = await fetch('/api/account/profile', {
        headers: { 'x-wallet-address': publicKey.toBase58() },
      });
      const data = await res.json();

      if (data.success && data.user) {
        setProfile(data.user);
        setUsername(data.user.username || '');
        setEmail(data.user.email || '');
        setAvatarUrl(data.user.avatarUrl || '');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, fetchProfile]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch('/api/account/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': publicKey?.toBase58() || '',
          },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        setUsernameAvailable(data.available);
        setUsernameError(data.error || '');
      } catch (err) {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, profile?.username, publicKey]);

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!publicKey) return;

    setUploadingAvatar(true);
    setError('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');
      formData.append('walletAddress', publicKey.toBase58());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setAvatarUrl(data.url);
      setSuccess('Avatar uploaded! Click Save to keep changes.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!publicKey) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({ username, email, avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setProfile(data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    username !== (profile?.username || '') ||
    email !== (profile?.email || '') ||
    avatarUrl !== (profile?.avatarUrl || '');

  // Check if this is a new user who needs to set username
  const needsUsername = profile && !profile.username;

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Your Profile</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to view and edit your profile.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Username Required Modal for New Users */}
      {needsUsername && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AtSign className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to flaunt.lol!</h2>
              <p className="text-gray-400">Please choose a username to get started. This is how you'll be identified on the platform.</p>
            </div>

            {/* Username Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Choose your username
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  maxLength={20}
                  autoFocus
                  className={`w-full pl-10 pr-10 py-3 bg-[#1f2937] border rounded-xl text-white placeholder-gray-500 focus:outline-none ${
                    usernameError
                      ? 'border-red-500 focus:border-red-500'
                      : usernameAvailable
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-700 focus:border-blue-500'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {usernameError ? (
                <p className="text-xs text-red-400 mt-2">{usernameError}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-2">
                  3-20 characters, letters, numbers, and underscores only.
                </p>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSave}
              disabled={saving || !username || username.length < 3 || usernameAvailable === false || checkingUsername}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Continue
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/account/profile" className="text-white font-medium">Profile</Link>
            <Link href="/account/orders" className="text-gray-400 hover:text-white">Orders</Link>
            <Link href="/account/wishlist" className="text-gray-400 hover:text-white">Wishlist</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Profile Settings</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 cursor-pointer group overflow-hidden"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{username?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-xs text-blue-400 hover:text-blue-300 mb-2"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                  </button>
                  <h2 className="text-xl font-semibold text-white">
                    {username ? `@${username}` : 'Set your username'}
                  </h2>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-sm">Orders</span>
                    </div>
                    <span className="text-white font-medium">{profile?._count?.orders || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Store className="w-4 h-4" />
                      <span className="text-sm">Stores</span>
                    </div>
                    <span className="text-white font-medium">{profile?._count?.stores || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">Reviews</span>
                    </div>
                    <span className="text-white font-medium">{profile?._count?.reviews || 0}</span>
                  </div>
                </div>

                {/* Wallet */}
                <div className="mt-6 p-3 bg-[#1f2937] rounded-lg">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Wallet className="w-3 h-3" />
                    <span>Connected Wallet</span>
                  </div>
                  <p className="text-white font-mono text-sm truncate">
                    {publicKey?.toBase58()}
                  </p>
                </div>

                {/* Member since */}
                <p className="text-gray-500 text-xs text-center mt-4">
                  Member since {profile ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '...'}
                </p>
              </div>
            </div>

            {/* Edit Form */}
            <div className="lg:col-span-2">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Edit Profile</h3>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

                <div className="space-y-5">
                  {/* Username - Primary identifier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                      <span className="text-blue-400 font-normal ml-1">(required)</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="choose_a_username"
                        maxLength={20}
                        className={`w-full pl-10 pr-10 py-3 bg-[#1f2937] border rounded-xl text-white placeholder-gray-500 focus:outline-none ${
                          usernameError
                            ? 'border-red-500 focus:border-red-500'
                            : usernameAvailable
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-gray-700 focus:border-blue-500'
                        }`}
                      />
                      {/* Status indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        )}
                        {!checkingUsername && usernameAvailable === true && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    {usernameError ? (
                      <p className="text-xs text-red-400 mt-1">{usernameError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        This is how you'll appear on the platform. 3-20 characters, letters, numbers, and underscores only.
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                      <span className="text-gray-500 font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used for order notifications and updates
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex items-center justify-end gap-4">
                  {hasChanges && (
                    <span className="text-sm text-gray-400">You have unsaved changes</span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges || (usernameAvailable === false)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
