// app/(store)/support/page.tsx
// Support page - allows users to message platform admins

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageCircle,
  Send,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export default function SupportPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch an admin user ID to send the message to
  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch('/api/users?role=ADMIN&limit=1');
        const data = await res.json();
        if (data.success && data.users?.length > 0) {
          setAdminId(data.users[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch admin:', err);
      }
    }
    fetchAdmin();
  }, []);

  const handleConnect = () => {
    setVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !adminId) return;

    setError('');
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        body: JSON.stringify({
          receiverId: adminId,
          subject: subject || 'Support Request',
          content: message,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSent(true);
        setSubject('');
        setMessage('');
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const telegramUsername = 'storedotfunintern';
  const telegramLink = `https://t.me/${telegramUsername}`;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to store
        </Link>

        {/* Support Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Contact Support</h1>
            <p className="text-gray-400">
              Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>

          {!connected ? (
            // Not connected - show connect prompt
            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Connect your wallet to send a support message.
              </p>
              <button
                onClick={handleConnect}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Wallet to Continue
              </button>

              {/* Alternative - Telegram */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-500 mb-4">Or contact us directly on Telegram:</p>
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#0088cc] hover:underline"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  @{telegramUsername}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : sent ? (
            // Message sent successfully
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Message Sent!</h2>
              <p className="text-gray-400 mb-6">
                We've received your message and will respond as soon as possible.
                You can view responses in your messages.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/account/messages"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-center"
                >
                  View Messages
                </Link>
                <button
                  onClick={() => setSent(false)}
                  className="flex-1 py-3 bg-[#1f2937] hover:bg-[#374151] text-white font-medium rounded-xl transition-colors"
                >
                  Send Another
                </button>
              </div>
            </div>
          ) : (
            // Connected - show message form
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !message.trim() || !adminId}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>

              <p className="mt-4 text-xs text-gray-500 text-center">
                Connected as {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-4)}
              </p>
            </form>
          )}

          {/* Common Topics */}
          {!sent && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-4 text-center">Common Topics:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setSubject('Order Issue')}
                  className="bg-[#1f2937] hover:bg-[#374151] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Order Issues
                </button>
                <button
                  type="button"
                  onClick={() => setSubject('Payment Help')}
                  className="bg-[#1f2937] hover:bg-[#374151] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Payment Help
                </button>
                <button
                  type="button"
                  onClick={() => setSubject('Shipping Question')}
                  className="bg-[#1f2937] hover:bg-[#374151] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Shipping
                </button>
                <button
                  type="button"
                  onClick={() => setSubject('Seller Support')}
                  className="bg-[#1f2937] hover:bg-[#374151] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Seller Support
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
