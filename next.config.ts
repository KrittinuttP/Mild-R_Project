import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices to load /_next/* assets during `next dev`
  allowedDevOrigins: [
    "192.168.100.103",
    "192.168.100.112",
    "192.168.100.110",
    "localhost",
  ],
  async redirects() {
    return [
      { source: "/hbd", destination: "/HBD/2026", permanent: true },
      { source: "/hbd/upload", destination: "/HBD/2026/upload", permanent: true },
      { source: "/HBD", destination: "/HBD/2026", permanent: false },
    ];
  },
};

export default nextConfig;
