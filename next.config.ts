import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type checking is done separately via `npm run typecheck`.
    // Skipping here prevents OOM from googleapis' massive type definitions.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['firebase-admin', 'googleapis', 'google-auth-library'],
  transpilePackages: ['motion'],
};

export default nextConfig;
