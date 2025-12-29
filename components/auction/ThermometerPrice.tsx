'use client';

import { useMemo } from 'react';

interface ThermometerPriceProps {
  temperature: number; // 0-100 (100 = hot/start price, 0 = cold/floor price)
  currentPrice: number;
  startPrice: number;
  floorPrice: number;
  currency?: 'SOL' | 'USDC';
  size?: 'sm' | 'md' | 'lg';
}

export default function ThermometerPrice({
  temperature,
  currentPrice,
  startPrice,
  floorPrice,
  currency = 'SOL',
  size = 'md',
}: ThermometerPriceProps) {
  // Temperature to color gradient (hot = red/orange, cold = blue)
  const gradientColors = useMemo(() => {
    if (temperature > 80) return { from: '#ef4444', to: '#f97316', label: 'HOT', labelBg: 'bg-red-500/20', labelText: 'text-red-400' };
    if (temperature > 60) return { from: '#f97316', to: '#eab308', label: 'WARM', labelBg: 'bg-orange-500/20', labelText: 'text-orange-400' };
    if (temperature > 40) return { from: '#eab308', to: '#22c55e', label: 'MILD', labelBg: 'bg-yellow-500/20', labelText: 'text-yellow-400' };
    if (temperature > 20) return { from: '#22c55e', to: '#06b6d4', label: 'COOL', labelBg: 'bg-green-500/20', labelText: 'text-green-400' };
    return { from: '#06b6d4', to: '#3b82f6', label: 'COLD', labelBg: 'bg-blue-500/20', labelText: 'text-blue-400' };
  }, [temperature]);

  const sizeClasses = {
    sm: { container: 'p-3', thermometer: 'h-24 w-6', price: 'text-lg', label: 'text-xs' },
    md: { container: 'p-4', thermometer: 'h-36 w-8', price: 'text-2xl', label: 'text-sm' },
    lg: { container: 'p-6', thermometer: 'h-48 w-10', price: 'text-3xl', label: 'text-base' },
  };

  const classes = sizeClasses[size];

  const formatPrice = (price: number) => {
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div className={`bg-[#1f2937] rounded-xl border border-gray-800 ${classes.container}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`${classes.label} text-gray-400`}>Current Price</span>
        <span className={`${classes.label} font-bold px-2 py-0.5 rounded ${gradientColors.labelBg} ${gradientColors.labelText}`}>
          {gradientColors.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Thermometer Visual */}
        <div className={`relative ${classes.thermometer} flex-shrink-0`}>
          {/* Background track */}
          <div className="absolute inset-0 bg-gray-800 rounded-full overflow-hidden">
            {/* Fill level with gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-700 ease-out"
              style={{
                height: `${Math.max(5, temperature)}%`,
                background: `linear-gradient(to top, ${gradientColors.to}, ${gradientColors.from})`,
              }}
            />
          </div>

          {/* Bulb at bottom */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${gradientColors.from}, ${gradientColors.to})`,
              boxShadow: `0 0 20px ${gradientColors.from}40`,
            }}
          />

          {/* Tick marks */}
          <div className="absolute right-full mr-1 top-0 text-[10px] text-gray-500">
            {formatPrice(startPrice)}
          </div>
          <div className="absolute right-full mr-1 bottom-0 text-[10px] text-gray-500">
            {formatPrice(floorPrice)}
          </div>
        </div>

        {/* Price Display */}
        <div className="flex-1">
          <div className={`${classes.price} font-bold text-white mb-1`}>
            {formatPrice(currentPrice)} {currency}
          </div>
          <div className="text-xs text-gray-500">
            Started at {formatPrice(startPrice)} {currency}
          </div>
          <div className="text-xs text-gray-500">
            Floor: {formatPrice(floorPrice)} {currency}
          </div>

          {/* Progress bar alternative */}
          <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${temperature}%`,
                background: `linear-gradient(to right, ${gradientColors.to}, ${gradientColors.from})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-600">
            <span>Floor</span>
            <span>Start</span>
          </div>
        </div>
      </div>
    </div>
  );
}
