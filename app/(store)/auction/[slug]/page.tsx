// app/(store)/auction/[slug]/page.tsx
// Individual auction detail page with live features

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  ArrowLeft,
  Gavel,
  Clock,
  Store,
  Play,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ThermometerPrice from '@/components/auction/ThermometerPrice';
import ViewerCount from '@/components/auction/ViewerCount';
import AuctionChat from '@/components/auction/AuctionChat';

interface Auction {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  images: string[];
  videoUrl: string | null;
  status: string;
  currentPriceSol: number;
  startPriceSol: number;
  floorPriceSol: number;
  temperature: number;
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    expired: boolean;
  };
  viewerCount: number;
  startsAt: string;
  endsAt: string;
  quantity: number;
  quantitySold: number;
  winnerId: string | null;
  winningPriceSol: number | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
    description: string | null;
  };
  merchant: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  winner?: {
    id: string;
    name: string | null;
    walletAddress: string | null;
  } | null;
}

export default function AuctionDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const publicKey = mounted ? wallet.publicKey : null;
  const connected = mounted ? wallet.connected : false;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  // Live data from SSE
  const [liveData, setLiveData] = useState<{
    currentPriceSol: number;
    temperature: number;
    timeRemaining: any;
    viewerCount: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch initial auction data
  useEffect(() => {
    if (!slug) return;

    async function fetchAuction() {
      try {
        const res = await fetch(`/api/auctions/${slug}`);
        const data = await res.json();

        if (data.success) {
          setAuction(data.auction);
        } else {
          setError(data.error || 'Auction not found');
        }
      } catch (err) {
        setError('Failed to load auction');
      } finally {
        setLoading(false);
      }
    }

    fetchAuction();
  }, [slug]);

  // Subscribe to live updates
  useEffect(() => {
    if (!auction || !['LIVE', 'SCHEDULED'].includes(auction.status)) return;

    const walletParam = publicKey ? `?wallet=${publicKey.toBase58()}` : '';
    const eventSource = new EventSource(`/api/auctions/${auction.id}/stream${walletParam}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.ended) {
          setAuction((prev) => prev ? { ...prev, status: data.status } : null);
          eventSource.close();
        } else if (!data.error) {
          setLiveData(data);
        }
      } catch (err) {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [auction?.id, auction?.status, publicKey]);

  const handleBuy = async () => {
    if (!connected || !auction) {
      setVisible(true);
      return;
    }

    setBuyError('');
    setBuying(true);

    try {
      // Get payment details
      const res = await fetch(`/api/auctions/${auction.id}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey!.toBase58(),
        },
        body: JSON.stringify({
          currency: 'SOL',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setBuyError(data.error || 'Failed to initiate purchase');
        return;
      }

      // TODO: Implement actual Solana payment flow
      // For now, show payment details
      alert(`Payment Details:\nPrice: ${data.paymentDetails.price} SOL\nMerchant Wallet: ${data.paymentDetails.merchantWallet}\n\nPayment flow coming soon!`);
    } catch (err) {
      setBuyError('Failed to process purchase');
    } finally {
      setBuying(false);
    }
  };

  const nextImage = () => {
    if (!auction) return;
    setCurrentImageIndex((prev) => (prev + 1) % auction.images.length);
  };

  const prevImage = () => {
    if (!auction) return;
    setCurrentImageIndex((prev) => (prev - 1 + auction.images.length) % auction.images.length);
  };

  // Use live data if available, otherwise use initial auction data
  const currentPrice = liveData?.currentPriceSol ?? auction?.currentPriceSol ?? 0;
  const temperature = liveData?.temperature ?? auction?.temperature ?? 50;
  const timeRemaining = liveData?.timeRemaining ?? auction?.timeRemaining;
  const viewerCount = liveData?.viewerCount ?? auction?.viewerCount ?? 0;
  const status = liveData?.status ?? auction?.status ?? '';

  const formatTime = () => {
    if (!timeRemaining || timeRemaining.expired) return '00:00:00';
    const h = String(timeRemaining.hours).padStart(2, '0');
    const m = String(timeRemaining.minutes).padStart(2, '0');
    const s = String(timeRemaining.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center">
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Auction Not Found</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link
          href="/auctions"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Browse Auctions
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
          <ViewerCount count={viewerCount} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Media */}
          <div>
            {/* Main Image/Video */}
            <div className="relative aspect-square bg-[#111827] rounded-xl overflow-hidden mb-4">
              {auction.videoUrl && currentImageIndex === 0 ? (
                <video
                  src={auction.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  muted
                  loop
                />
              ) : auction.images[currentImageIndex] ? (
                <img
                  src={auction.images[currentImageIndex]}
                  alt={auction.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Gavel className="w-16 h-16" />
                </div>
              )}

              {/* Navigation */}
              {auction.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                {status === 'LIVE' && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
                {status === 'SCHEDULED' && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full flex items-center gap-1.5">
                    <Play className="w-4 h-4" />
                    Starting Soon
                  </span>
                )}
                {status === 'SOLD' && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    SOLD
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {auction.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {auction.videoUrl && (
                  <button
                    onClick={() => setCurrentImageIndex(0)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      currentImageIndex === 0 ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Play className="w-6 h-6 text-gray-400" />
                    </div>
                  </button>
                )}
                {auction.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(auction.videoUrl ? idx : idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      currentImageIndex === idx ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Chat */}
            <div className="mt-6">
              <AuctionChat
                auctionId={auction.id}
                auctionStatus={status}
                isLoggedIn={connected}
                walletAddress={publicKey?.toBase58()}
              />
            </div>
          </div>

          {/* Right: Info & Purchase */}
          <div>
            {/* Store Info */}
            <Link
              href={`/store/${auction.store.slug}`}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
            >
              {auction.store.logoUrl ? (
                <img
                  src={auction.store.logoUrl}
                  alt={auction.store.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <Store className="w-6 h-6" />
              )}
              <span>{auction.store.name}</span>
              {auction.store.isVerified && (
                <svg className="w-4 h-4 text-pink-500" viewBox="0 0 22 22" fill="currentColor">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              )}
            </Link>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-4">{auction.title}</h1>

            {/* Description */}
            {auction.description && (
              <p className="text-gray-400 mb-6">{auction.description}</p>
            )}

            {/* Thermometer Price */}
            <div className="mb-6">
              <ThermometerPrice
                temperature={temperature}
                currentPrice={currentPrice}
                startPrice={auction.startPriceSol}
                floorPrice={auction.floorPriceSol}
                size="lg"
              />
            </div>

            {/* Timer */}
            {status === 'LIVE' && (
              <div className="bg-[#1f2937] rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span>Time Remaining</span>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${
                    timeRemaining?.expired ? 'text-red-400' : 'text-white'
                  }`}>
                    {formatTime()}
                  </div>
                </div>
              </div>
            )}

            {/* Sold Info */}
            {status === 'SOLD' && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Auction Sold!</span>
                </div>
                <p className="text-gray-400">
                  Final price: <span className="text-white font-bold">{auction.winningPriceSol?.toFixed(4)} SOL</span>
                </p>
              </div>
            )}

            {/* Buy Button */}
            {status === 'LIVE' && (
              <div className="space-y-4">
                {buyError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {buyError}
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {buying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : connected ? (
                    <>
                      <Gavel className="w-5 h-5" />
                      Buy Now for {currentPrice.toFixed(4)} SOL
                    </>
                  ) : (
                    <>
                      Connect Wallet to Buy
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Price updates in real-time. Click buy to lock in the current price.
                </p>
              </div>
            )}

            {status === 'SCHEDULED' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Auction Starting Soon</span>
                </div>
                <p className="text-gray-400">
                  Starts on {new Date(auction.startsAt).toLocaleDateString()} at{' '}
                  {new Date(auction.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
