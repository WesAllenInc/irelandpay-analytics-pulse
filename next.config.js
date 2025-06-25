/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '',
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
    '@supabase/auth-helpers-react',
    '@supabase/supabase-js'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co'
      }
    ]
  },
  webpack: (config) => {
    // Alias all Supabase auth helpers to our compatibility layer
    config.resolve.alias['@supabase/auth-helpers-nextjs'] = './lib/supabase-compat.ts';
    
    // Add more stable compilation options for Node.js v20
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      'fs': false,
      'net': false,
      'tls': false
    };

    return config;
  },
  // Experimental settings
  experimental: {
    serverExternalPackages: [],
  }
};

module.exports = nextConfig;
