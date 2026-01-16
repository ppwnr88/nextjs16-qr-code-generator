import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Serverless-first defaults. This project uses App Router + Route Handlers.
   * Keep config minimal and production-safe for Vercel.
   */
  reactStrictMode: true,
};

export default nextConfig;