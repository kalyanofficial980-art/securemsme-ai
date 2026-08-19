import type { MetadataRoute } from "next";
import { publicSeoPages } from "@/lib/seo-launch-analytics-engine";
import { publicSiteUrl } from "@/lib/public-site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSeoPages
    .filter((page) => page.indexable)
    .map((page) => ({
      url: `${publicSiteUrl}${page.path.startsWith("/") ? page.path : `/${page.path}`}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }));
}
