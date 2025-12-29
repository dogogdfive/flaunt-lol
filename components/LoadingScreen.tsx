// components/LoadingScreen.tsx
// Global loading screen with pulsating logo and spinning circle

'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex items-center justify-center z-[9999]">
      <div className="relative flex flex-col items-center">
        {/* Container for spinner and logo */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Spinning circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-500/50 animate-spin" />
          </div>

          {/* Pulsating logo - centered inside spinner */}
          <img
            src="/logo.png"
            alt="Loading..."
            className="w-28 h-28 rounded-2xl object-cover"
            style={{
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>

        {/* Loading text */}
        <p className="text-center text-gray-400 mt-6 text-sm animate-pulse">
          Loading...
        </p>

        {/* Footer */}
        <p className="text-center text-gray-600 mt-8 text-xs">
          2025 flaunt.lol
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}
