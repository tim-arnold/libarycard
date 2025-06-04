/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['books.google.com', 'covers.openlibrary.org'],
  },
  // Optimize for Cloudflare Pages deployment
  webpack: (config) => {
    // Disable filesystem cache for Cloudflare Pages to avoid large files
    if (process.env.CF_PAGES) {
      config.cache = false;
    } else if (config.cache && config.cache.type === 'filesystem') {
      // Reduce webpack cache size for other deployments
      config.cache.maxMemoryGenerations = 1;
    }
    
    return config;
  },
  // Additional optimizations
  swcMinify: true,
  compress: true,
  // Disable source maps in production to reduce file sizes
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig