/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @vercel/blob@2.x pulls in a newer undici build that uses private-field syntax webpack's
  // default parser (Next 14.1's target) can't parse when it tries to bundle it for the client/
  // server-component graph. It's server-only code (used from Route Handlers only) - keep it as a
  // real Node `require` at runtime instead of trying to bundle it.
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob", "undici"]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tajstay.site", pathname: "/**" },
      { protocol: "https", hostname: "www.tajstay.site", pathname: "/**" },
      { protocol: "https", hostname: "public.blob.vercel-storage.com", pathname: "/**" }
    ]
  },
  /**
   * Долгий кэш хэшированных чанков (повторные визиты); HTML/RSC по-прежнему без жёсткого вечного кэша.
   * Только для production build — в `next dev` имена чанков НЕ хэшируются по содержимому, поэтому
   * immutable-кэш там навсегда "замораживает" браузер на старой версии кода после каждого изменения
   * (подтверждено воспроизведённым багом: recovery CTA не появлялся в браузере, хотя сервер отдавал
   * актуальный код — причина была в этом immutable-заголовке, применявшемся и в dev).
   */
  async headers() {
    const staticCacheControl =
      process.env.NODE_ENV === "production"
        ? "public, max-age=31536000, immutable"
        : "no-store, must-revalidate";
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: staticCacheControl }]
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }]
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }]
      }
    ];
  }
};

export default nextConfig;
