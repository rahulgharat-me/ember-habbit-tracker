import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// All configuration lives in the project-root `.env`, shared with the backend.
loadEnvConfig(path.resolve(process.cwd(), ".."));

const backendUrl =
  process.env.BACKEND_URL ?? `http://127.0.0.1:${process.env.BACKEND_PORT ?? 8000}`;

const nextConfig: NextConfig = {
  // Hoisted workspace deps live in the root node_modules.
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  // The floating dev badge would cover the header or the mobile tab bar.
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  // The browser only talks to this app; API calls (and the GitHub OAuth callback) are proxied
  // to FastAPI so session cookies stay first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
