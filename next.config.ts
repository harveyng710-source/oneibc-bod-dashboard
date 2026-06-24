import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 *
 * A strict Content-Security-Policy is intentionally left out for now because
 * it needs per-deploy tuning (Next injects inline styles/scripts); track it as
 * a follow-up. The headers below are safe defaults that don't risk breaking the
 * app and cover clickjacking, MIME sniffing, referrer leakage and HSTS.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
