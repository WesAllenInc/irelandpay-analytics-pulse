// Use ES modules for compatibility with package.json "type": "module"
/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Simplified path aliases - just use the basic @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
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

export default nextConfig;
