/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@xenova/transformers", "pdf-parse"],
  },
};

module.exports = nextConfig;
