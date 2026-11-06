/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const prodCsp = [
  "default-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  output: "standalone",
  // Full lockdown headers in production. In dev, Next's HMR needs websocket
  // and eval, so only the framing/sniffing guards apply there.
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    if (!isProd) return [{ source: "/:path*", headers: base }];
    return [
      {
        source: "/:path*",
        headers: [...base, { key: "Content-Security-Policy", value: prodCsp }],
      },
    ];
  },
};

export default nextConfig;
