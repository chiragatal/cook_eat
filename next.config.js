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
  }
}

module.exports = nextConfig
