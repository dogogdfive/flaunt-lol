'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Eye, Flame, Snowflake, Play } from 'lucide-react';

interface AuctionCardProps {
  auction: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    images: string[];
    status: string;
    currentPriceSol: number;
    startPriceSol: number;
    floorPriceSol: number;
    temperature: number;
    timeRemaining: {
      hours: number;
      minutes: number;
      seconds: number;
      expired: boolean;
    };
    viewerCount: number;
    startsAt: string;
    store?: {
      name: string;
      slug: string;
      isVerified?: boolean;
    };
  };
  showStore?: boolean;
}

export default function AuctionCard({ auction, showStore = true }: AuctionCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(auction.timeRemaining);

  // Update countdown every second
  useEffect(() => {
    if (auction.status !== 'LIVE') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev.expired) return prev;

        let totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;

        if (totalSeconds <= 0) {
          return { hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
          expired: false,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [auction.status]);

  const formatTime = () => {
    if (timeRemaining.expired) return 'Ended';
    const parts = [];
    if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours}h`);
    if (timeRemaining.minutes > 0 || timeRemaining.hours > 0) parts.push(`${timeRemaining.minutes}m`);
    parts.push(`${timeRemaining.seconds}s`);
    return parts.join(' ');
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  const getStatusBadge = () => {
    switch (auction.status) {
      case 'LIVE':
        return (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
            <Play className="w-3 h-3" />
            Starting Soon
          </span>
        );
      case 'SOLD':
        return (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
            SOLD
          </span>
        );
      case 'ENDED_UNSOLD':
        return (
          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            ENDED
          </span>
        );
      default:
        return null;
    }
  };

  const getTempIcon = () => {
    if (auction.temperature > 50) {
      return <Flame className="w-4 h-4 text-orange-400" />;
    }
    return <Snowflake className="w-4 h-4 text-blue-400" />;
  };

  const getTempColor = () => {
    if (auction.temperature > 80) return 'from-red-500 to-orange-500';
    if (auction.temperature > 60) return 'from-orange-500 to-yellow-500';
    if (auction.temperature > 40) return 'from-yellow-500 to-green-500';
    if (auction.temperature > 20) return 'from-green-500 to-cyan-500';
    return 'from-cyan-500 to-blue-500';
  };

  return (
    <Link
      href={`/auction/${auction.slug}`}
      className="block bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-900">
        {auction.images[0] ? (
          <img
            src={auction.images[0]}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No Image
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {getStatusBadge()}
        </div>

        {/* Viewer Count */}
        {auction.status === 'LIVE' && auction.viewerCount > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1 text-xs text-white">
            <Eye className="w-3 h-3" />
            {auction.viewerCount}
          </div>
        )}

        {/* Temperature Bar */}
        {auction.status === 'LIVE' && (
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <div
              className={`h-full bg-gradient-to-r ${getTempColor()} transition-all duration-500`}
              style={{ width: `${auction.temperature}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Store */}
        {showStore && auction.store && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs text-gray-500">{auction.store.name}</span>
            {auction.store.isVerified && (
              <svg className="w-3 h-3 text-pink-500" viewBox="0 0 22 22" fill="currentColor">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
              </svg>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition-colors">
          {auction.title}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Current Price</div>
            <div className="flex items-center gap-1.5">
              {getTempIcon()}
              <span className="text-lg font-bold text-white">
                {formatPrice(auction.currentPriceSol)} SOL
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">Floor</div>
            <span className="text-sm text-gray-400">
              {formatPrice(auction.floorPriceSol)} SOL
            </span>
          </div>
        </div>

        {/* Timer */}
        {auction.status === 'LIVE' && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className={`w-4 h-4 ${timeRemaining.expired ? 'text-red-400' : 'text-gray-400'}`} />
              <span className={`font-mono ${timeRemaining.expired ? 'text-red-400' : 'text-white'}`}>
                {formatTime()}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Time remaining
            </span>
          </div>
        )}

        {auction.status === 'SCHEDULED' && (
          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-800 text-sm text-blue-400">
            <Clock className="w-4 h-4" />
            Starts {new Date(auction.startsAt).toLocaleDateString()} at {new Date(auction.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </Link>
  );
}
