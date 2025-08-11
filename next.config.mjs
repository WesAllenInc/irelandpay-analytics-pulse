/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  basePath: '',
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
    '@supabase/supabase-js',
  ],
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    domains: ['images.unsplash.com', 'source.unsplash.com', 'supabase.co'],
  },
  output: 'standalone',
  trailingSlash: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname),
      '@backend': path.join(__dirname, 'src/backend'),
      '@crm': path.join(__dirname, 'src/crm'),
      '@api': path.join(__dirname, 'src/api'),
      '@lib': path.join(__dirname, 'lib'),
      '@lib/supabase': path.join(__dirname, 'lib', 'supabase'),
      '@supabase/auth-helpers-nextjs': path.join(
        __dirname,
        'lib/supabase-compat.ts'
      ),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.module.rules.push({
      test: /supabase\/functions/,
      use: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;


