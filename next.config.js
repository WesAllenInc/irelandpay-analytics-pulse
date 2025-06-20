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
  // Ensure proper transpilation of dependencies
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
    '@supabase/supabase-js'
  ],
  // Improve module resolution
  webpack: (config) => {
    // Ensure proper resolution of ESM modules
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

module.exports = nextConfig;
