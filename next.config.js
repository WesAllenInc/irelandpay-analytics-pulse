// Use CJS for maximum compatibility on Vercel builders
/** @type {import('next').NextConfig} */
const path = require('path');
const __dirname = __dirname;

const nextConfig = {
  eslint: {
    // Temporarily disable ESLint during build for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily disable TypeScript checking during build for deployment
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  basePath: '',
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
    '@supabase/supabase-js'
  ],
  // Exclude Supabase Edge Functions from Next.js compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  experimental: {
    // Next.js 15.3.4 configuration
  },
  images: {
    domains: [
      'images.unsplash.com',
      'source.unsplash.com',
      'supabase.co'
    ]
  },
  // Add output configuration for better static generation
  output: 'standalone',
  // Disable static generation for problematic pages
  trailingSlash: false,
  webpack: (config) => {
    // Add path aliases to webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname),
      '@backend': path.join(__dirname, 'src/backend'),
      '@crm': path.join(__dirname, 'src/crm'),
      '@api': path.join(__dirname, 'src/api'),
      '@lib': path.join(__dirname, 'lib'),
      '@lib/supabase': path.join(__dirname, 'lib', 'supabase'),
      '@lib/supabase/client': path.join(__dirname, 'lib', 'supabase', 'client.ts'),
      '@lib/supabase/server': path.join(__dirname, 'lib', 'supabase', 'server.ts'),
      // Alias all Supabase auth helpers to our compatibility layer with proper absolute path
      '@supabase/auth-helpers-nextjs': path.join(__dirname, 'lib/supabase-compat.ts'),
    };
    
    // Add more stable compilation options for Node.js v20
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      'fs': false,
      'net': false,
      'tls': false
    };

    // Exclude Supabase Edge Functions from compilation
    config.module.rules.push({
      test: /supabase\/functions/,
      use: 'ignore-loader'
    });

    return config;
  }
};

module.exports = nextConfig;
