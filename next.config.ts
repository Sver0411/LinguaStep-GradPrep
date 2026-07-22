import type { NextConfig } from "next";

const configuredBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/\/+$/, "");

if (configuredBasePath && !configuredBasePath.startsWith("/")) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must start with '/'.");
}

const nextConfig: NextConfig = {
  basePath: configuredBasePath || undefined,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
