/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // For GitHub Pages deployment
  basePath: process.env.NODE_ENV === 'production' ? '/irelandpay-analytics-pulse' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/irelandpay-analytics-pulse/' : '',
};

module.exports = nextConfig;
