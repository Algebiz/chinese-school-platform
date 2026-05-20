import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.webflow.com',
      },
      {
        protocol: 'https',
        hostname: '**.wf-files.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + Stripe.js + PayPal SDK
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com",
              // Styles: self + inline (needed by Stripe Elements and PayPal)
              "style-src 'self' 'unsafe-inline'",
              // Frames: Stripe and PayPal embed iframes
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
              // Connect: API calls to Stripe, PayPal, Webflow, Resend
              "connect-src 'self' https://api.stripe.com https://www.paypal.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://api.webflow.com https://api.resend.com",
              // Images: self + Stripe + Webflow CDN
              "img-src 'self' data: https://*.stripe.com https://*.webflow.com https://*.wf-files.com",
              "font-src 'self' data:",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
