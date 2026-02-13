/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
}

export default nextConfig
