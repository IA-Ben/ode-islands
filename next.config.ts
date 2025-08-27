
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  trailingSlash: false
}

export default nextConfig
