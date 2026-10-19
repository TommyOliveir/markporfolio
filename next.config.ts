import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets `next dev` be opened from other devices on the network (e.g. a phone),
  // not just localhost. Hostnames only — no scheme or port.
  allowedDevOrigins: ["10.17.106.215"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
