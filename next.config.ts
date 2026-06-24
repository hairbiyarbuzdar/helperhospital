import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile lives in the
  // home directory, which otherwise confuses root inference).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
