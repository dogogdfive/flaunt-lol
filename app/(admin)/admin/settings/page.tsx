// app/(admin)/admin/settings/page.tsx
// Admin platform settings page

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Settings,
  Save,
  Loader2,
  Wallet,
  Percent,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface PlatformSettings {
  platform_wallet: string;
  platform_fee_percent: number;
  min_payout_sol: number;
  min_payout_usdc: number;
  payout_hold_days: number;
}

export default function AdminSettingsPage() {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_wallet: '',
    platform_fee_percent: 3.5,
    min_payout_sol: 0.5,
    min_payout_usdc: 10,
    payout_hold_days: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (publicKey) {
      fetchSettings();
    }
  }, [publicKey]);

  const fetchSettings = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          platform_wallet: data.settings.platform_wallet || '',
          platform_fee_percent: data.settings.platform_fee_percent || 3.5,
          min_payout_sol: data.settings.min_payout_sol || 0.5,
          min_payout_usdc: data.settings.min_payout_usdc || 10,
          payout_hold_days: data.settings.payout_hold_days || 7,
        });
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-gray-400 mt-1">Configure platform-wide settings</p>
      </div>

      {/* Settings Form */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Platform Wallet */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Wallet className="w-4 h-4" />
              Platform Wallet (Escrow)
            </label>
            <input
              type="text"
              value={settings.platform_wallet}
              onChange={(e) => setSettings({ ...settings, platform_wallet: e.target.value })}
              placeholder="Solana wallet address"
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              All customer payments are sent to this wallet for escrow
            </p>
          </div>

          {/* Platform Fee */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Percent className="w-4 h-4" />
              Platform Fee (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={settings.platform_fee_percent}
              onChange={(e) => setSettings({ ...settings, platform_fee_percent: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage deducted from each sale before merchant payout
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Min Payout SOL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="w-4 h-4" />
                Minimum Payout (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.min_payout_sol}
                onChange={(e) => setSettings({ ...settings, min_payout_sol: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Min Payout USDC */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="w-4 h-4" />
                Minimum Payout (USDC)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={settings.min_payout_usdc}
                onChange={(e) => setSettings({ ...settings, min_payout_usdc: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Payout Hold Days */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" />
              Auto-Confirm Days
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="30"
              value={settings.payout_hold_days}
              onChange={(e) => setSettings({ ...settings, payout_hold_days: parseInt(e.target.value) || 7 })}
              className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Days after shipping before order is auto-confirmed (currently using 14 days)
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              Settings saved successfully!
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <h3 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Important Notes
        </h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Changing the platform wallet affects where future payments are sent</li>
          <li>• Fee changes apply to new orders only, not existing ones</li>
          <li>• Make sure the platform wallet is a valid Solana address you control</li>
        </ul>
      </div>
    </div>
  );
}
