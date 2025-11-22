import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Externalize server-only packages for better performance
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/, /_middleware\.js$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
})(nextConfig);
