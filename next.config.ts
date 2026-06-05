import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Désactive le middleware expérimental qui cause la boucle
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
