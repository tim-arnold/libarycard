/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['books.google.com', 'covers.openlibrary.org'],
  },
  // Optimize for Cloudflare Pages deployment
  webpack: (config) => {
    // Reduce webpack cache size for Cloudflare Pages 25MB limit
    if (config.cache && config.cache.type === 'filesystem') {
      config.cache.maxMemoryGenerations = 1;
    }
    
    return config;
  },
  // Additional optimizations
  swcMinify: true,
  compress: true,
}

module.exports = nextConfig