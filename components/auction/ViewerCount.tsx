'use client';

import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface ViewerCountProps {
  count: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function ViewerCount({
  count,
  showLabel = true,
  size = 'md',
  animated = true,
}: ViewerCountProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count !== displayCount) {
      setIsAnimating(true);
      // Smooth count transition
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setTimeout(() => setIsAnimating(false), 300);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [count, displayCount]);

  const sizeClasses = {
    sm: { container: 'px-2 py-1 text-xs gap-1', icon: 'w-3 h-3' },
    md: { container: 'px-3 py-1.5 text-sm gap-1.5', icon: 'w-4 h-4' },
    lg: { container: 'px-4 py-2 text-base gap-2', icon: 'w-5 h-5' },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-full bg-[#1f2937] border border-gray-700
        ${classes.container}
        ${isAnimating && animated ? 'animate-pulse' : ''}
        transition-all duration-300
      `}
    >
      <Eye
        className={`
          ${classes.icon}
          ${displayCount > 0 ? 'text-green-400' : 'text-gray-500'}
          transition-colors duration-300
        `}
      />
      <span
        className={`
          font-medium tabular-nums
          ${displayCount > 0 ? 'text-white' : 'text-gray-500'}
          ${isAnimating && animated ? 'scale-110' : 'scale-100'}
          transition-all duration-300
        `}
      >
        {displayCount.toLocaleString()}
      </span>
      {showLabel && (
        <span className="text-gray-400">
          {displayCount === 1 ? 'watching' : 'watching'}
        </span>
      )}
    </div>
  );
}
