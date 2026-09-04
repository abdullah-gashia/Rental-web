import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Stops advertising the framework and its version to anyone scanning.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Uploaded files are user content served from this site's own origin.
        // The upload route already refuses anything that is not really an
        // image; nosniff makes sure the browser does not second-guess that, and
        // the sandbox neutralises anything that slips through anyway.
        source: '/uploads/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
