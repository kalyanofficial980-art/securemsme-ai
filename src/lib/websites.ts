export function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required");
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are allowed");
  }

  url.hash = "";

  return url.toString();
}

export function getWebsiteNameFromUrl(input: string) {
  try {
    const url = new URL(normalizeWebsiteUrl(input));
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}
