import type { NextConfig } from "next";

// Build-time injection of the deploy fingerprint so the mobile shell can
// surface the running version on /mobile. Vercel populates
// VERCEL_GIT_COMMIT_SHA on every deploy; locally we fall back to "local".
const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GIT_COMMIT_SHA?.slice(0, 7) ||
  "local";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha,
  },
};

export default nextConfig;
