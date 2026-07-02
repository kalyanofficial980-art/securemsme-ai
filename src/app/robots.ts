import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo-launch-analytics-engine";

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
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrl.replace(/\/$/, ""),
  };
}
