/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'public.blob.vercel-storage.com',
      'via.placeholder.com',
      'cujkkedxzrs8eyid.public.blob.vercel-storage.com'
    ],
  },
  // Force SWC compiler for font loading
  experimental: {
    forceSwcTransforms: true,
  },
  // Explicitly use SWC instead of Babel
  compiler: {
    styledComponents: true,
  }
}

module.exports = nextConfig
