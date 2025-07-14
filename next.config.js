/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  basePath: '',
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
    '@supabase/auth-helpers-react',
    '@supabase/supabase-js'
  ],
  // Exclude Supabase Edge Functions from Next.js compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  experimental: {
    // Exclude directories from compilation
    excludeDefaultMomentLocales: false,
  },
  images: {
    domains: [
      'images.unsplash.com',
      'source.unsplash.com',
      'supabase.co'
    ]
  },
  webpack: (config, { isServer }) => {
    // Alias all Supabase auth helpers to our compatibility layer with proper absolute path
    config.resolve.alias['@supabase/auth-helpers-nextjs'] = path.join(__dirname, 'lib/supabase-compat.ts');
    
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
  },
  // Next.js 15.3.4 no longer supports serverExternalPackages
  experimental: {}
};

export default nextConfig;
