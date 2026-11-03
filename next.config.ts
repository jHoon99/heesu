import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Cloudflare Pages에 정적 파일로 배포
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
