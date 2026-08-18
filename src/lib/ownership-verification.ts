import crypto from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { validatePublicHttpUrl } from "@/lib/security/ssrf";

export type VerificationMethod = "dns_txt" | "html_file" | "meta_tag";

export type VerificationCheckResult = {
  verified: boolean;
  method: VerificationMethod;
  evidence: string;
  checkedAt: string;
  expected: string;
};

const FETCH_TIMEOUT_MS = 10_000;

export function buildVerificationToken() {
  return `securemsme_${crypto.randomBytes(18).toString("hex")}`;
}

export function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(withProtocol);
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function getHostname(websiteUrl: string) {
  return new URL(normalizeWebsiteUrl(websiteUrl)).hostname;
}

export function getVerificationInstructions(websiteUrl: string, token: string) {
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  const url = new URL(normalizedUrl);
  const hostname = url.hostname;
  const origin = url.origin;

  return {
    hostname,
    dns: {
      type: "TXT",
      name: `_securemsme.${hostname}`,
      value: `securemsme-verify=${token}`,
    },
    htmlFile: {
      path: "/.well-known/securemsme-verify.txt",
      url: `${origin}/.well-known/securemsme-verify.txt`,
      content: token,
    },
    metaTag: {
      homepage: origin,
      tag: `<meta name="securemsme-verification" content="${token}">`,
    },
  };
}

async function safeFetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    await validatePublicHttpUrl(url);
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSME-AI-Ownership-Verification/1.0",
        Accept: "text/html,text/plain,*/*;q=0.8",
      },
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      text: text.slice(0, 250_000),
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: "",
      finalUrl: url,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyDnsTxt(
  websiteUrl: string,
  token: string,
): Promise<VerificationCheckResult> {
  const instructions = getVerificationInstructions(websiteUrl, token);
  const expected = instructions.dns.value;

  try {
    const records = await resolveTxt(instructions.dns.name);
    const flattened = records.map((record) => record.join(""));

    const verified = flattened.some((record) => record.trim() === expected);

    return {
      verified,
      method: "dns_txt",
      evidence: verified
        ? `DNS TXT record found at ${instructions.dns.name}`
        : `DNS TXT record not found. Found: ${flattened.join(" | ") || "no TXT records"}`,
      checkedAt: new Date().toISOString(),
      expected,
    };
  } catch (error) {
    return {
      verified: false,
      method: "dns_txt",
      evidence:
        error instanceof Error
          ? `DNS check failed: ${error.message}`
          : "DNS check failed.",
      checkedAt: new Date().toISOString(),
      expected,
    };
  }
}

async function verifyHtmlFile(
  websiteUrl: string,
  token: string,
): Promise<VerificationCheckResult> {
  const instructions = getVerificationInstructions(websiteUrl, token);
  const response = await safeFetchText(instructions.htmlFile.url);
  const verified = response.ok && response.text.includes(token);

  return {
    verified,
    method: "html_file",
    evidence: verified
      ? `Verification file found at ${instructions.htmlFile.url}`
      : `Verification file not found or token missing. HTTP ${response.status}`,
    checkedAt: new Date().toISOString(),
    expected: `File ${instructions.htmlFile.url} contains ${token}`,
  };
}

async function verifyMetaTag(
  websiteUrl: string,
  token: string,
): Promise<VerificationCheckResult> {
  const instructions = getVerificationInstructions(websiteUrl, token);
  const response = await safeFetchText(instructions.metaTag.homepage);

  const expectedTag = instructions.metaTag.tag;
  const verified =
    response.ok &&
    response.text.includes('name="securemsme-verification"') &&
    response.text.includes(`content="${token}"`);

  return {
    verified,
    method: "meta_tag",
    evidence: verified
      ? `Meta tag found on ${instructions.metaTag.homepage}`
      : `Meta tag not found or token missing. HTTP ${response.status}`,
    checkedAt: new Date().toISOString(),
    expected: expectedTag,
  };
}

export async function verifyWebsiteOwnership(input: {
  websiteUrl: string;
  token: string;
  method: VerificationMethod;
}) {
  if (input.method === "dns_txt") {
    return verifyDnsTxt(input.websiteUrl, input.token);
  }

  if (input.method === "html_file") {
    return verifyHtmlFile(input.websiteUrl, input.token);
  }

  return verifyMetaTag(input.websiteUrl, input.token);
}
