import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // بناء مستقل يحتوي كل ما يلزم للتشغيل على الاستضافة (Namecheap / cPanel)
  output: "standalone",
  serverExternalPackages: ["sharp", "@prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
