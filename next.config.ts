
import type { NextConfig } from 'next'
import { getConfig } from "./src/lib/config";

// Get config at build time
const config = getConfig();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: config.storage.hostname }]
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  trailingSlash: false,
  // Ensure the app binds to 0.0.0.0 for external access in Replit
  serverExternalPackages: [],
  // Removed experimental features that could cause build timeouts
}

export default nextConfig
