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
      "127.0.0.1",
      ...envOrigins,
    ])
  ),
  async redirects() {
    return [
      { source: "/hbd", destination: "/HBD/2026", permanent: true },
      { source: "/hbd/upload", destination: "/HBD/2026/upload", permanent: true },
      { source: "/HBD", destination: "/HBD/2026", permanent: false },
    ];
  },
};

export default nextConfig;
