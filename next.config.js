/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose /md folder as static files
  async rewrites() {
    return [
      {
        source: '/md/:path*',
        destination: '/api/static/:path*',
      },
    ];
  },
  // Allow markdown images
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  // Webpack config for better-sqlite3
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
