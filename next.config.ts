import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Ensure we don't accidentally cache API routes that would prevent streaming/chat
  cacheStartUrl: false,
  dynamicStartUrl: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Silence turbopack/webpack compatibility error since next-pwa injects a webpack plugin
  turbopack: {},
};

export default withPWA(nextConfig);
