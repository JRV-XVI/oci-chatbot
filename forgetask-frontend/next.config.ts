import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",

  poweredByHeader: false,

  allowedDevOrigins: ["host.docker.internal"],

  turbopack: {
    root: __dirname,
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://forgetask-service:8080';
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
