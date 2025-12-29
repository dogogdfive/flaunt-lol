// components/ui/OptimizedImage.tsx
// Lazy-loaded image component with blur placeholder

'use client';

import { useState } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  priority = false,
  sizes,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fallback for missing images
  const imageSrc = error || !src ? '/placeholder.png' : src;

  // Check if it's an external URL (R2, etc)
  const isExternal = src?.startsWith('http');

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes || '100vw'}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className={`
            object-${objectFit} transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
          `}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
          unoptimized={isExternal}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-800 animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width || 400}
        height={height || 400}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        className={`
          object-${objectFit} transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        unoptimized={isExternal}
      />
    </div>
  );
}
