import type { NextConfig } from "next";

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SAMEORIGIN : l'éditeur affiche la boutique dans un iframe du même site ; aucun autre site ne peut l'encadrer.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const config: NextConfig = {
  poweredByHeader: false,
  // Images envoyées depuis l'admin (10 Mo maximum, vérifiées côté serveur).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  async headers() {
    return [{ source: "/:path*", headers: security }];
  },
};

export default config;
