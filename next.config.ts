import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ws package must run on Node, not be bundled by webpack
  serverExternalPackages: ['ws'],

  // Bundle size optimization - tree-shake heavy packages
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-character-count',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-text-align',
      '@tiptap/extension-underline',
      'motion',
    ],
  },

  // Image optimization - serve modern formats automatically
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'gen.pollinations.ai' },
      { protocol: 'https', hostname: 'media.pollinations.ai' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  // Enable gzip compression
  compress: true,
};

export default nextConfig;
