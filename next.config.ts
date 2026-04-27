import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

/** Paksa root Turbopack = repo ini bila ada beberapa package-lock (mis. di home ~/). */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
