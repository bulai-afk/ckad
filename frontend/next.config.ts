import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** Меньше «бочковых» импортов в бандл — меньше парсинга на главном потоке (Lighthouse / TBT). */
  experimental: {
    optimizePackageImports: ["@heroicons/react", "react-icons"],
  },
};

export default withBundleAnalyzer(nextConfig);
