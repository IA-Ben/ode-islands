import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }]
  },
  turbo: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  typescript: {
    ignoreBuildErrors: false
  },
  trailingSlash: false,
  experimental: {
    allowedDevOrigins: ['*.replit.dev', '*.repl.co', '*.worf.replit.dev']
  }
}

export default nextConfig
