import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Externalize server-only packages for better performance
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Disable static optimization for client-side only pages
  experimental: {},
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Exclude dynamic pages from service worker precaching
  dynamicStartUrl: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  buildExcludes: [/middleware-manifest\.json$/, /_middleware\.js$/, /app-build-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  // Don't include dynamic pages in precache
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})(nextConfig);
