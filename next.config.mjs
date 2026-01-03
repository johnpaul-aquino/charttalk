import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    instrumentationHook: true, // Enable instrumentation for Sentry
  },
};

// Sentry Webpack plugin options for source map upload
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // Suppress upload logs
  hideSourceMaps: true, // Hide source maps from browser devtools
  sourcemaps: {
    deleteSourcemapsAfterUpload: true, // Clean up after upload
  },
};

// Only wrap with Sentry in production when DSN is configured
const config =
  process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN
    ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
    : nextConfig;

export default config;
