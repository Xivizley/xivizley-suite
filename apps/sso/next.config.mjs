/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@xivizley/aurora-ui",
    "@xivizley/db",
    "@xivizley/types",
    "@xivizley/xivizley-id",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
