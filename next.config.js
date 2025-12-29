/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'flaunt.lol'],
    },
    // Fix for stack overflow during build traces with Solana packages
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@solana/**',
        'node_modules/@coral-xyz/**',
        'node_modules/@keystonehq/**',
        'node_modules/@reown/**',
        'node_modules/@trezor/**',
        'node_modules/@walletconnect/**',
      ],
    },
    // Allow useSearchParams without Suspense boundary (legacy behavior)
    missingSuspenseWithCSRBailout: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://auth.privy.io",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
