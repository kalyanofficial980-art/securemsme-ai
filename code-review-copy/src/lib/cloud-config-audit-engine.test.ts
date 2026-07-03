import { describe, expect, it } from "vitest";
import {
  analyzeCloudConfig,
  analyzeDnsRecords,
} from "@/lib/cloud-config-audit-engine";

describe("cloud config audit engine", () => {
  it("detects missing controls as risk", () => {
    const result = analyzeCloudConfig({
      productionDomain: "https://example.com",
      supabaseSiteUrlSet: false,
      supabaseRedirectUrlsRestricted: false,
      supabaseRlsEnabled: false,
      supabaseStoragePrivateByDefault: false,
      supabaseServiceRoleNotClientExposed: false,
      vercelEnvProductionSet: false,
      vercelPreviewSecretsSeparated: false,
      vercelBuildLogsNoSecrets: false,
      dnsText: "",
      supportEmailReady: false,
      incidentProcessReady: false,
    });

    expect(result.riskScore).toBeGreaterThan(50);
    expect(result.failedCount).toBeGreaterThan(0);
  });

  it("parses DNS text for SPF, DKIM, DMARC", () => {
    const records = analyzeDnsRecords(`
TXT @ v=spf1 include:_spf.google.com -all
TXT _dmarc v=DMARC1; p=reject
TXT selector._domainkey v=DKIM1; k=rsa; p=abc
MX @ mail.example.com
CAA @ 0 issue "letsencrypt.org"
`);

    expect(
      records.filter((record) => record.recordStatus === "present").length,
    ).toBeGreaterThan(3);
  });

  it("builds mostly passing audit", () => {
    const result = analyzeCloudConfig({
      productionDomain: "https://example.com",
      supabaseSiteUrlSet: true,
      supabaseRedirectUrlsRestricted: true,
      supabaseRlsEnabled: true,
      supabaseStoragePrivateByDefault: true,
      supabaseServiceRoleNotClientExposed: true,
      vercelEnvProductionSet: true,
      vercelPreviewSecretsSeparated: true,
      vercelBuildLogsNoSecrets: true,
      dnsText:
        "v=spf1 include:_spf.google.com -all\nv=DMARC1; p=reject\nv=DKIM1;",
      supportEmailReady: true,
      incidentProcessReady: true,
    });

    expect(result.failedCount).toBe(0);
    expect(result.riskScore).toBeLessThan(40);
  });
});
