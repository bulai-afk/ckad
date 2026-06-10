import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { getLegacyRedirects } from "./src/lib/legacyRedirects";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** Меньше «бочковых» импортов в бандл — меньше парсинга на главном потоке (Lighthouse / TBT). */
  experimental: {
    optimizePackageImports: ["@heroicons/react", "react-icons"],
  },
  async redirects() {
    return getLegacyRedirects();
  },
};

export default withBundleAnalyzer(nextConfig);
