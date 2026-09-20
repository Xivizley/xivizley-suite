/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@xivizley/aurora-ui",
    "@xivizley/db",
    "@xivizley/types",
    "@xivizley/xivizley-id",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".d.ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
