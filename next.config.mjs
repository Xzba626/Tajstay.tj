/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tajstay.site", pathname: "/**" },
      { protocol: "https", hostname: "www.tajstay.site", pathname: "/**" },
      { protocol: "https", hostname: "public.blob.vercel-storage.com", pathname: "/**" }
    ]
  },
  /** Долгий кэш хэшированных чанков (повторные визиты); HTML/RSC по-прежнему без жёсткого вечного кэша. */
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
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
