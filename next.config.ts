import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // h3-js is loaded by Node at runtime rather than bundled (Turbopack stalls on some emscripten/wasm packages).
  serverExternalPackages: ["h3-js"],
  partialPrefetching: true,
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
