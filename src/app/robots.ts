import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/public-launch",
          "/pricing",
          "/demo",
          "/trust",
          "/legal",
          "/seo-readiness",
        ],
        disallow: [
          "/admin",
          "/dashboard",
          "/report",
          "/api",
          "/manual-billing",
          "/scheduled-scans",
          "/repo-security",
          "/cloud-config-audit",
        ],
      },
    ],
    sitemap: `${publicSiteUrl}/sitemap.xml`,
    host: publicSiteUrl,
  };
}
