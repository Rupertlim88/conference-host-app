import createNextIntlPlugin from "next-intl/plugin";

/** Sent with every response: no MIME sniffing, no full referrers to other sites, no framing, HTTPS only. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The backend and store are raw TypeScript workspace packages.
  transpilePackages: ["@repo/host-backend", "@repo/host-store", "@repo/host-contracts", "@repo/contracts"],
  serverExternalPackages: ["postgres"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default createNextIntlPlugin()(nextConfig);
