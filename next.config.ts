import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the Next.js dev indicator (the "Compiling…" / route-info badge in the
  // bottom-right corner). It overlaps the mobile bottom navigation and has no
  // value for end users previewing the app.
  devIndicators: false,
};

export default nextConfig;
