// app/(store)/store/[slug]/StoreHeader.tsx
// Client component for store header with hamburger menu

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Globe, MessageCircle } from 'lucide-react';

// Custom X (Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Custom Telegram icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface StoreHeaderProps {
  twitterUrl?: string | null;
  telegramUrl?: string | null;
  discordUrl?: string | null;
  websiteUrl?: string | null;
}

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

export default function StoreHeader({ twitterUrl, telegramUrl, discordUrl, websiteUrl }: StoreHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hasSocialLinks = twitterUrl || telegramUrl || discordUrl || websiteUrl;

  if (!hasSocialLinks) {
    return (
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
          <span className="text-lg font-bold text-white">flaunt.lol</span>
        </Link>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="border-t border-gray-800 bg-[#111827]">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Follow the Store</div>
            <div className="flex flex-col gap-2">
              {twitterUrl && (
                <a
                  href={ensureHttps(twitterUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-lg text-white transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                  <span>X (Twitter)</span>
                </a>
              )}
              {telegramUrl && (
                <a
                  href={ensureHttps(telegramUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-lg text-white transition-colors"
                >
                  <TelegramIcon className="w-5 h-5" />
                  <span>Telegram</span>
                </a>
              )}
              {discordUrl && (
                <a
                  href={ensureHttps(discordUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-lg text-white transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Discord</span>
                </a>
              )}
              {websiteUrl && (
                <a
                  href={ensureHttps(websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] hover:bg-[#252a3a] rounded-lg text-white transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
