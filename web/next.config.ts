import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";


initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true, // Keep this until you set up Cloudflare Images binding
  },
  transpilePackages: ["@libsql/client"],
};

export default nextConfig;
