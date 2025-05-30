/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    domains: ['images.unsplash.com'],
    unoptimized: true,
  },
  experimental: {
    serverActions: true,
  },
  // For GitHub Pages deployment
  basePath: process.env.NODE_ENV === 'production' ? '/irelandpay-analytics-pulse' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/irelandpay-analytics-pulse/' : '',
};

module.exports = nextConfig;
