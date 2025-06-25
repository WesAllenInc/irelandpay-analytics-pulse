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
  webpack: (config, { isServer }) => {
    // Alias all Supabase auth helpers to our compatibility layer with proper absolute path
    const path = require('path');
    config.resolve.alias['@supabase/auth-helpers-nextjs'] = path.join(__dirname, 'lib/supabase-compat.ts');
    
    // Add more stable compilation options for Node.js v20
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      'fs': false,
      'net': false,
      'tls': false
    };

    return config;
  },
  // Next.js 15.3.4 no longer supports serverExternalPackages
  experimental: {}
};

module.exports = nextConfig;
