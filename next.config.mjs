/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
