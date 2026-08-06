import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // API routes require a Node server (not static export).
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
