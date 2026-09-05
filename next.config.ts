import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Stops advertising the framework and its version to anyone scanning.
  poweredByHeader: false,

  images: {
    // Without this, next/image refuses any host it was not told about and the
    // optimiser answers 400 "url parameter is not allowed" — which is exactly
    // what happened to every avatar belonging to a Google sign-in, since those
    // live on Google's CDN rather than in /uploads. The list is deliberately
    // narrow: an open remote pattern turns the optimiser into a free image
    // proxy for anyone who can guess the URL format.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        // Uploaded files are user content served from this site's own origin.
        // The upload route already refuses anything that is not really an
        // image; nosniff makes sure the browser does not second-guess that, and
        // the CSP confines the file to itself. No sandbox directive — it buys
        // nothing for an image and makes a photo opened in a new tab opaque.
        source: '/uploads/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
