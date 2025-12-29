'use client';

import { useState, useEffect, useRef } from 'react';

interface BunnyMascotProps {
  size?: number;
  className?: string;
}

export default function BunnyMascot({ size = 56, className = '' }: BunnyMascotProps) {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const bunnyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!bunnyRef.current) return;

      const rect = bunnyRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate angle and distance from center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Limit movement to a small range (max 3px)
      const maxMove = 3;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const normalizedDistance = Math.min(distance / 200, 1);

      const moveX = (deltaX / (distance || 1)) * maxMove * normalizedDistance;
      const moveY = (deltaY / (distance || 1)) * maxMove * normalizedDistance;

      setEyePosition({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={bunnyRef}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Ears */}
        <ellipse cx="30" cy="20" rx="12" ry="22" fill="#f8b4d9" stroke="#ec4899" strokeWidth="2" />
        <ellipse cx="70" cy="20" rx="12" ry="22" fill="#f8b4d9" stroke="#ec4899" strokeWidth="2" />
        <ellipse cx="30" cy="18" rx="6" ry="14" fill="#fce7f3" />
        <ellipse cx="70" cy="18" rx="6" ry="14" fill="#fce7f3" />

        {/* Head */}
        <circle cx="50" cy="55" r="35" fill="#f8b4d9" stroke="#ec4899" strokeWidth="2" />

        {/* Cheeks */}
        <circle cx="25" cy="60" r="8" fill="#fda4af" opacity="0.6" />
        <circle cx="75" cy="60" r="8" fill="#fda4af" opacity="0.6" />

        {/* Eyes - X X style that follow cursor */}
        <g transform={`translate(${eyePosition.x}, ${eyePosition.y})`}>
          {/* Left X eye */}
          <line x1="32" y1="45" x2="42" y2="55" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="45" x2="32" y2="55" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />

          {/* Right X eye */}
          <line x1="58" y1="45" x2="68" y2="55" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          <line x1="68" y1="45" x2="58" y2="55" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Nose */}
        <ellipse cx="50" cy="65" rx="4" ry="3" fill="#ec4899" />

        {/* Mouth */}
        <path d="M 45 72 Q 50 78 55 72" stroke="#ec4899" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Whiskers */}
        <line x1="20" y1="62" x2="35" y2="65" stroke="#d1d5db" strokeWidth="1.5" />
        <line x1="20" y1="68" x2="35" y2="68" stroke="#d1d5db" strokeWidth="1.5" />
        <line x1="65" y1="65" x2="80" y2="62" stroke="#d1d5db" strokeWidth="1.5" />
        <line x1="65" y1="68" x2="80" y2="68" stroke="#d1d5db" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
