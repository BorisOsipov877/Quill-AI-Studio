import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Product photos are downscaled client-side to ~a few hundred KB before
      // upload, but raise the 1MB default so the base64 payload has headroom.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
