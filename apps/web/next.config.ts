import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Externalize server-only packages
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Polyfill Node.js modules for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        assert: require.resolve("assert/"),
        buffer: require.resolve("buffer/"),
        stream: require.resolve("stream-browserify"),
        util: require.resolve("util/"),
        "node:assert": require.resolve("assert/"),
        "node:buffer": require.resolve("buffer/"),
        "node:stream": require.resolve("stream-browserify"),
        "node:util": require.resolve("util/"),
      };
    }
    
    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
