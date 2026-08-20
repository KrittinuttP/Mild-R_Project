import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices to load /_next/* assets during `next dev`
  allowedDevOrigins: [
    "192.168.100.103",
    "192.168.100.112",
    "192.168.100.110",
    "localhost",
  ],
};

export default nextConfig;
