// app/slabs/page.tsx
// SLAB - Immortalize Your Assets - styled in flaunt.lol theme

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

// Product data
const products = [
  {
    id: 'slab-plus',
    name: 'Slab+',
    price: 20.00,
    description: 'Premium custody slab with your NFT securely stored. Your asset is held in our secure vault.',
    features: ['Custody of your NFT', 'Premium graded case', 'Certificate of authenticity', 'Priority processing'],
    badge: 'CUSTODY',
    badgeColor: 'bg-purple-500',
  },
  {
    id: 'slab',
    name: 'Slab',
    price: 13.40,
    description: 'High-quality replica slab featuring your NFT artwork. Keep your original asset in your wallet.',
    features: ['Keep your NFT', 'Premium replica case', 'High-quality print', 'Standard processing'],
    badge: 'REPLICA',
    badgeColor: 'bg-blue-500',
  },
  {
    id: 'keychain-plus',
    name: 'Keychain+',
    price: 19.80,
    description: 'Portable custody keychain with your NFT stored. Carry your authenticated asset everywhere.',
    features: ['Custody of your NFT', 'Durable keychain design', 'Certificate of authenticity', 'Priority processing'],
    badge: 'CUSTODY',
    badgeColor: 'bg-purple-500',
  },
  {
    id: 'keychain',
    name: 'Keychain',
    price: 13.80,
    description: 'Stylish replica keychain featuring your NFT artwork. Perfect for everyday carry.',
    features: ['Keep your NFT', 'Durable keychain design', 'High-quality print', 'Standard processing'],
    badge: 'REPLICA',
    badgeColor: 'bg-blue-500',
  },
];

// Supported chains
const chains = [
  { name: 'Solana', icon: '◎', color: 'text-purple-400', wallets: ['Phantom', 'Backpack', 'Solflare'] },
  { name: 'Ethereum', icon: 'Ξ', color: 'text-blue-400', wallets: ['MetaMask'] },
  { name: 'Bitcoin', icon: '₿', color: 'text-orange-400', wallets: ['Magic Eden', 'Xverse', 'Leather', 'UniSat', 'OKX'] },
];

// Features list
const features = [
  {
    title: 'Multi-Chain Support',
    description: 'Connect wallets from Solana, Ethereum, and Bitcoin to slab any NFT.',
    icon: '🔗',
  },
  {
    title: 'Instant Wallet Scan',
    description: 'Automatically detect and display all your NFTs with one click.',
    icon: '📡',
  },
  {
    title: 'Professional Grading',
    description: 'Each slab features authentication and grading details.',
    icon: '🏆',
  },
  {
    title: 'Order Tracking',
    description: 'Track your order from production to delivery with real-time updates.',
    icon: '📦',
  },
  {
    title: 'Secure Custody',
    description: 'Custody options store your NFT securely while you display the physical slab.',
    icon: '🔒',
  },
  {
    title: 'Global Shipping',
    description: 'We ship worldwide with tracking and insurance included.',
    icon: '🌍',
  },
];

// Holographic Slab Preview Component
function SlabPreview({ image }: { image: string }) {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const slabRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!slabRef.current) return;
    const rect = slabRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 15;
    const rotateX = ((centerY - e.clientY) / (rect.height / 2)) * 15;
    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div
      ref={slabRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer transition-all duration-150 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative w-[200px] h-[280px] rounded-xl mx-auto"
        style={{
          background: 'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        <div
          className="absolute inset-[3px] rounded-lg"
          style={{
            background: 'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* Label */}
          <div
            className="mx-2 mt-2 h-[40px] rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p className="text-white font-bold text-xs tracking-wider">SLAB AUTHENTICATED</p>
          </div>
          {/* Card window */}
          <div
            className="mx-2 mt-2 rounded-lg overflow-hidden"
            style={{ height: 'calc(100% - 56px)' }}
          >
            <img src={image} alt="NFT Slab" className="w-full h-full object-cover" />
          </div>
        </div>
        {/* Edge highlight */}
        <div
          className="absolute top-0 left-4 right-4 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
        />
      </div>
    </div>
  );
}

export default function SlabsPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="border-b border-[#374151] bg-[#111827]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
              S
            </div>
            <span className="font-bold text-xl">SLAB</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#chains" className="hover:text-white transition-colors">Chains</a>
          </nav>
          <a
            href="https://slabs.lol"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Launch App
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[100px]" />

        <div className="max-w-7xl mx-auto px-4 py-24 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm mb-4">
                Multi-Chain NFT Authentication
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Immortalize<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                  Your Assets
                </span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-lg">
                Transform your digital NFTs into premium physical collectibles. Professional grading,
                authentication, and worldwide shipping.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://slabs.lol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity"
                >
                  Connect Wallet
                </a>
                <a
                  href="#products"
                  className="px-6 py-3 rounded-lg border border-[#374151] text-gray-300 hover:bg-[#1f2937] transition-colors"
                >
                  View Products
                </a>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <div className="transform -rotate-6">
                <SlabPreview image="/slab1.png" />
              </div>
              <div className="transform rotate-6 translate-y-8 hidden lg:block">
                <SlabPreview image="/slab2.png" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-[#374151] bg-[#111827]/50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">3+</div>
              <div className="text-gray-400 text-sm mt-1">Blockchains Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">10+</div>
              <div className="text-gray-400 text-sm mt-1">Wallet Integrations</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">100%</div>
              <div className="text-gray-400 text-sm mt-1">Authenticated</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Worldwide</div>
              <div className="text-gray-400 text-sm mt-1">Shipping Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Slab</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From premium custody slabs to replica keychains, we have the perfect option for every collector.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className={`relative bg-[#1f2937] rounded-xl p-6 border transition-all cursor-pointer ${
                  selectedProduct === product.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-[#374151] hover:border-[#4b5563]'
                }`}
                onClick={() => setSelectedProduct(product.id)}
              >
                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold ${product.badgeColor}`}>
                  {product.badge}
                </div>
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                <div className="text-3xl font-bold text-purple-400 mb-4">
                  ${product.price.toFixed(2)}
                  <span className="text-sm text-gray-500 font-normal ml-1">USD</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{product.description}</p>
                <ul className="space-y-2 mb-6">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-green-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://slabs.lol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity"
                >
                  Select & Slab
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#111827]/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SLAB?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Industry-leading NFT authentication with seamless wallet integration and global shipping.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-[#1f2937] rounded-xl p-6 border border-[#374151] hover:border-[#4b5563] transition-colors"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chains Section */}
      <section id="chains" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Multi-Chain Support</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect your favorite wallet from any supported blockchain.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {chains.map((chain, i) => (
              <div
                key={i}
                className="bg-[#1f2937] rounded-xl p-8 border border-[#374151] text-center"
              >
                <div className={`text-5xl mb-4 ${chain.color}`}>{chain.icon}</div>
                <h3 className="text-xl font-bold mb-4">{chain.name}</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {chain.wallets.map((wallet, j) => (
                    <span
                      key={j}
                      className="px-3 py-1 rounded-full bg-[#374151] text-sm text-gray-300"
                    >
                      {wallet}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#111827] to-[#0a0e1a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Immortalize Your NFTs?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Connect your wallet, select your NFTs, and order your premium slabs today.
          </p>
          <a
            href="https://slabs.lol"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Launch SLAB App
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#374151] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                S
              </div>
              <span className="font-bold">SLAB</span>
              <span className="text-gray-500 text-sm">by flaunt.lol</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="https://slabs.lol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Visit slabs.lol
              </a>
              <Link href="/" className="hover:text-white transition-colors">
                Back to Flaunt
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
