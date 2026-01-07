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
    // Exclude browser-only packages from server-side bundling
    serverComponentsExternalPackages: [
      '@imgly/background-removal',
      'onnxruntime-web',
    ],
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
        'node_modules/@imgly/**',
        'node_modules/onnxruntime-web/**',
      ],
    },
    // Allow useSearchParams without Suspense boundary (legacy behavior)
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude ONNX runtime .mjs files from being processed by Terser
    if (!isServer) {
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules\/(onnxruntime-web|@imgly)/,
        type: 'javascript/auto',
      });
    }

    // Don't try to bundle onnxruntime-web on the server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@imgly/background-removal', 'onnxruntime-web');
    }

    return config;
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
            value: "frame-ancestors 'self'",
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
