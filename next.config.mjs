/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Event covers are hosted on Unsplash. Narrow rather than a wildcard: an
    // open image host turns next/image into a free image-resizing proxy for
    // anyone who can guess the URL format.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
