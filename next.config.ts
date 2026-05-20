import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "r2.thesportsdb.com" },
      { protocol: "https", hostname: "www.thesportsdb.com" },
      { protocol: "https", hostname: "media.api-sports.io" },
    ],
  },
};

export default nextConfig;