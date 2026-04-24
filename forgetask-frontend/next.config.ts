import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
