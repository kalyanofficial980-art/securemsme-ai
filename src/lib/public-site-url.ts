const PRODUCTION_SITE_URL = "https://securemsme-ai-live.vercel.app";

export function resolvePublicSiteUrl(configuredUrl?: string) {
  const value = configuredUrl?.trim();
  if (!value) return PRODUCTION_SITE_URL;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:") return PRODUCTION_SITE_URL;

    if (
      hostname.endsWith(".vercel.app") &&
      hostname !== "securemsme-ai-live.vercel.app"
    ) {
      return PRODUCTION_SITE_URL;
    }

    return url.origin;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export const publicSiteUrl = resolvePublicSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
);
