import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const routes = [
    "",
    "/pricing",
    "/trust",
    "/security",
    "/legal",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund",
    "/legal/responsible-disclosure",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
