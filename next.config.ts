
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  trailingSlash: false,
  // Ensure the app binds to 0.0.0.0 for external access in Replit
  serverExternalPackages: []
}

export default nextConfig
