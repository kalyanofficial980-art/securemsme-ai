import type {
  AdvancedSecurityAudit,
  AuditControl,
  EvidenceRecord,
} from "@/lib/advanced-security-audit";

type CanonicalFinding = {
  name?: string;
  status?: string;
  severity?: string;
};

function findingMap(findings: CanonicalFinding[]) {
  return new Map(
    findings.map((finding, index) => [
      `F-${String(index + 1).padStart(3, "0")}`,
      finding,
    ]),
  );
}

function mappedFindings(
  control: AuditControl,
  byId: Map<string, CanonicalFinding>,
) {
  return control.mappedFindings
    .map((id) => byId.get(id))
    .filter(Boolean) as CanonicalFinding[];
}

function hasActionableMappedFinding(
  control: AuditControl,
  byId: Map<string, CanonicalFinding>,
) {
  return mappedFindings(control, byId).some((finding) => {
    const status = String(finding.status || "").toLowerCase();
    return status === "fail" || status === "warning";
  });
}

function notAssessed(
  control: AuditControl,
  reason: string,
  testingDepth: AuditControl["testingDepth"] = "Manual review needed",
): AuditControl {
  return {
    ...control,
    status: "info",
    score: 55,
    severity: "Info",
    mappedFindings: [],
    evidence: [reason],
    testingDepth,
  };
}

function normalizeOwaspControl(
  control: AuditControl,
  byId: Map<string, CanonicalFinding>,
): AuditControl {
  if (control.id === "A01" && !hasActionableMappedFinding(control, byId)) {
    return notAssessed(
      control,
      "No public exposure signal was found, but passive checks cannot verify application authorization rules.",
      "Authenticated audit needed",
    );
  }

  if (control.id === "A04") {
    return notAssessed(
      control,
      "Privacy, terms, contact, robots.txt, sitemap.xml, and security.txt are trust/readiness signals and are not sufficient evidence to score OWASP Insecure Design.",
      "Manual review needed",
    );
  }

  if (control.id === "A06") {
    const mapped = mappedFindings(control, byId);
    const hasVersionOrVulnerabilityEvidence = mapped.some((finding) => {
      const name = String(finding.name || "").toLowerCase();
      return (
        name.includes("vulnerable") ||
        name.includes("outdated") ||
        name.includes("cve") ||
        name.includes("version")
      );
    });

    if (!hasVersionOrVulnerabilityEvidence) {
      return notAssessed(
        control,
        "Technology fingerprinting alone does not prove a vulnerable or outdated component. Version/CVE evidence was not established by this passive scan.",
        "Manual review needed",
      );
    }
  }

  if (control.id === "A07" && !hasActionableMappedFinding(control, byId)) {
    return notAssessed(
      control,
      "Homepage cookie observations do not verify login, authentication, session rotation, logout, or account recovery controls.",
      "Authenticated audit needed",
    );
  }

  if (control.id === "A09") {
    const mapped = mappedFindings(control, byId);
    const hasMonitoringEvidence = mapped.some((finding) => {
      const name = String(finding.name || "").toLowerCase();
      return name.includes("logging") || name.includes("monitoring");
    });

    if (!hasMonitoringEvidence) {
      return notAssessed(
        control,
        "security.txt and contact pages do not prove security logging, alerting, detection, or incident monitoring controls.",
        "Manual review needed",
      );
    }
  }

  return control;
}

function normalizeEvidenceRecord(record: EvidenceRecord): EvidenceRecord {
  if (record.observedStatus !== "pass") return record;

  return {
    ...record,
    recommendedAction:
      "No immediate remediation is required for this observed public check. Continue monitoring it during future scans.",
  };
}

export function normalizeAdvancedSecurityAudit(
  audit: AdvancedSecurityAudit,
  findings: CanonicalFinding[],
): AdvancedSecurityAudit {
  const byId = findingMap(findings);
  const owaspTop10 = audit.owaspTop10.map((control) =>
    normalizeOwaspControl(control, byId),
  );

  const failed = owaspTop10.filter((control) => control.status === "fail");
  const warnings = owaspTop10.filter(
    (control) => control.status === "warning",
  );

  return {
    ...audit,
    owaspTop10,
    evidenceRecords: audit.evidenceRecords.map(normalizeEvidenceRecord),
    riskNarrative:
      failed.length > 0
        ? `${failed.length} OWASP control mapping(s) have actionable passive evidence. Controls marked Info require authenticated or manual validation and must not be treated as passed.`
        : warnings.length > 0
          ? `${warnings.length} OWASP control mapping(s) have warning-level passive evidence. Controls marked Info were not fully assessed by this safe public scan.`
          : "No high-confidence OWASP failure was established by passive public evidence. Controls marked Info remain unassessed until authenticated or manual validation is performed.",
  };
}
