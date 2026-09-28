import type { NextConfig } from "next";

const envOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  // Allow LAN devices to load /_next/* assets during `next dev`
  allowedDevOrigins: Array.from(
    new Set([
      "localhost",
      "localhost:3000",
      "127.0.0.1",
      "127.0.0.1:3000",
      ...envOrigins,
    ])
  ),
  async redirects() {
    return [
      { source: "/fan-art", destination: "/gallery/fanart", permanent: true },
    ];
  },
};

export default nextConfig;
