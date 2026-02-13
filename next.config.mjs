/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["canvas", "pdfjs-dist", "@napi-rs/canvas", "@thednp/dommatrix"],
}

export default nextConfig
