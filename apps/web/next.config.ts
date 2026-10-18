import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // geolocation=(self): checkout "use my location" and the rider page need it on our own origin.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // proxy.ts buffers request bodies; ID verification can send two 8 MB files.
    proxyClientMaxBodySize: "20mb",
  },
  // The browser talks to the API through /api/* so session cookies stay first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
