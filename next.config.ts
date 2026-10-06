import path from "node:path";
import type { NextConfig } from "next";

// Pin the project root: a stray lockfile in a parent folder would otherwise
// make Next.js guess the wrong workspace root (build warning, wrong tracing).
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
