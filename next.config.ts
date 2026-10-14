import type { NextConfig } from "next";

const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Datos en caché con 'use cache' y prerenderizado parcial: lo estático sale al momento y lo de la sesión, después.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  headers: async () => [{ source: "/:ruta*", headers: cabeceras }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
