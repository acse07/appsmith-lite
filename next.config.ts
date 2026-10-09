import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  async headers() {
    const dev = process.env.NODE_ENV !== 'production';
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${dev ? 'ws:' : ''}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
          ...(!dev
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};
export default config;
