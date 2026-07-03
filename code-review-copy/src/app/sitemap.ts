import type { MetadataRoute } from "next";
import { absoluteUrl, publicSeoPages } from "@/lib/seo-launch-analytics-engine";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSeoPages
    .filter((page) => page.indexable)
    .map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }));
}
