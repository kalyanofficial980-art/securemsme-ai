"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import type { AccessControlComparisonMode } from "@/lib/broken-access-control-engine";
import { runBrokenAccessControlSignalEngine } from "@/lib/broken-access-control-engine";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

function normalizeComparisonMode(
  value: FormDataEntryValue | null,
): AccessControlComparisonMode {
  if (value === "dual-role-metadata") return "dual-role-metadata";
  return "low-privilege-metadata";
}

function normalizeSessionMode(
  value: FormDataEntryValue | null,
): "none" | "cookie" | "authorization" {
  if (value === "cookie") return "cookie";
  if (value === "authorization") return "authorization";
  return "none";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  return [];
}

function textAreaPaths(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
}

export async function runAccessControlReview(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const comparisonMode = normalizeComparisonMode(
    formData.get("comparisonMode"),
  );
  const lowRoleSessionMode = normalizeSessionMode(
    formData.get("lowRoleSessionMode"),
  );
  const highRoleSessionMode = normalizeSessionMode(
    formData.get("highRoleSessionMode"),
  );
  const lowRoleSessionValue = String(
    formData.get("lowRoleSessionValue") || "",
  ).trim();
  const highRoleSessionValue = String(
    formData.get("highRoleSessionValue") || "",
  ).trim();
  const expectedPrivilegedPaths = textAreaPaths(
    formData.get("expectedPrivilegedPaths"),
  );
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run access control review");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/access-control?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running access control review.",
      )}`,
    );
  }

  if (lowRoleSessionMode !== "none" && !lowRoleSessionValue) {
    redirect(
      `/report/${scanId}/access-control?message=${encodeURIComponent(
        "Low-role cookie/authorization mode requires a temporary low-privilege test session value. It is used in memory only and never saved.",
      )}`,
    );
  }

  if (
    comparisonMode === "dual-role-metadata" &&
    highRoleSessionMode !== "none" &&
    !highRoleSessionValue
  ) {
    redirect(
      `/report/${scanId}/access-control?message=${encodeURIComponent(
        "Dual-role high-role mode requires a temporary high-role test session value. It is used in memory only and never saved.",
      )}`,
    );
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  if (!scan.website_id) {
    redirect(
      `/report/${scan.id}/access-control?message=${encodeURIComponent(
        "Save this website first before running access-control review.",
      )}`,
    );
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, user_id, url, verification_status, deep_scan_enabled, permission_attested_at",
    )
    .eq("id", scan.website_id)
    .eq("user_id", user.id)
    .single();

  const verifiedScope = Boolean(
    website?.verification_status === "verified" &&
    website?.deep_scan_enabled &&
    website?.permission_attested_at,
  );

  if (!verifiedScope) {
    redirect(
      `/report/${scan.id}/access-control?message=${encodeURIComponent(
        "Website verification and permission attestation are required before access-control review.",
      )}`,
    );
  }

  const { data: request } = await supabase
    .from("authenticated_scan_requests")
    .select(
      "id, admin_review_status, status, allowed_paths, blocked_paths, expires_at",
    )
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .eq("source_scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const approvedRequest = Boolean(
    request &&
    (request.admin_review_status === "approved" ||
      request.status === "approved") &&
    (!request.expires_at ||
      new Date(request.expires_at).getTime() > Date.now()),
  );

  if (!approvedRequest) {
    redirect(
      `/report/${scan.id}/access-control?message=${encodeURIComponent(
        "Approved authenticated scan request is required before access-control review.",
      )}`,
    );
  }

  const { data: routeObservations } = await supabase
    .from("authenticated_route_observations")
    .select("url, route_type")
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const routeHints = (routeObservations || [])
    .map((item) => item.url)
    .filter(Boolean);
  const targetUrl = website?.url || scan.website_url;

  const report = await runBrokenAccessControlSignalEngine({
    targetUrl,
    intensity,
    verifiedScope,
    approvedRequest,
    allowedPaths: asStringArray(request?.allowed_paths),
    blockedPaths: asStringArray(request?.blocked_paths),
    expectedPrivilegedPaths,
    routeHints,
    comparisonMode,
    lowRoleSessionMode,
    highRoleSessionMode,
    lowRoleSessionValue,
    highRoleSessionValue,
  });

  const { data: job, error: jobError } = await supabase
    .from("international_scan_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      job_type: "authenticated-engine",
      status:
        report.reviewStatus === "completed" ? "completed" : report.reviewStatus,
      intensity,
      verified_scope: verifiedScope,
      app_classification: {
        siteType: "saas-app",
        detectedSignals: [
          report.summary.routeReviewCount ? "access-control route review" : "",
          report.summary.objectIdSignalCount
            ? "object identifier authorization signals"
            : "",
          report.summary.unexpectedAccessSignalCount
            ? "potential access-control signal"
            : "",
          report.summary.adminRouteSignalCount ? "admin boundary signal" : "",
        ].filter(Boolean),
        confidence: report.summary.unexpectedAccessSignalCount
          ? "Medium"
          : "Low",
        coverageNeeds: [
          "role boundary validation",
          "object ownership checks",
          "server-side authorization review",
        ],
      },
      selected_modules: [
        {
          moduleId: "broken-access-control-signal-engine",
          moduleName: "Broken Access Control Signal Engine",
          category: "Access Control",
          stage: "validation",
          requiredScope: "authenticated-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        routesReviewed: report.summary.routeReviewCount,
        comparisons: report.summary.comparisonCount,
        sensitiveRoutes: report.summary.sensitiveRouteSignalCount,
        adminRoutes: report.summary.adminRouteSignalCount,
        objectIdSignals: report.summary.objectIdSignalCount,
        unexpectedAccessSignals: report.summary.unexpectedAccessSignalCount,
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "access-control-signal-execution",
      },
      standards_summary: {
        owaspWstg: ["WSTG-ATHZ-01", "WSTG-ATHZ-02"],
        owaspAsvs: ["V4.1", "V4.2", "V13.1"],
        owaspApiTop10: ["API1", "API5"],
        nistSsdf: ["RV.1", "RV.2"],
      },
      safety_policy: {
        reviewPolicy: report.reviewPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        lowRoleSessionStored: false,
        highRoleSessionStored: false,
        privateBodyStored: false,
        nextRequiredLayer:
          "Role/permission boundary review and object ownership validation workflow",
      },
      coverage_score: Math.min(
        100,
        45 +
          report.summary.routeReviewCount * 3 +
          report.summary.objectIdSignalCount * 2,
      ),
      evidence_count: report.normalizedEvidenceSeeds.length,
      vulnerability_count: report.vulnerabilitySeeds.length,
      high_priority_count: report.vulnerabilitySeeds.filter((item) =>
        ["Critical", "High"].includes(item.severity),
      ).length,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job?.id) {
    redirect(
      `/report/${scan.id}/access-control?message=${encodeURIComponent(
        `Could not save access-control job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "broken-access-control-signal-engine",
        moduleName: "Broken Access Control Signal Engine",
        category: "Access Control",
        stage: "validation",
        requiredScope: "authenticated-scope",
        supportedSiteTypes: ["cms", "spa", "api", "ecommerce", "unknown"],
        safeMethods: ["GET"],
        rateLimit: { requestsPerMinute: 20, maxRuntimeSeconds: 180 },
        timeoutSeconds: 30,
        dependencies: ["authenticated-session-safe-crawler"],
        outputSchema: { accessControlReview: "AccessControlReviewRun" },
        standards: {
          owaspWstg: ["WSTG-ATHZ-01", "WSTG-ATHZ-02"],
          owaspAsvs: ["V4.1", "V4.2", "V13.1"],
          owaspApiTop10: ["API1", "API5"],
          nistSsdf: ["RV.1", "RV.2"],
        },
        canClaim:
          "Can claim broken access control signals were reviewed with metadata-only evidence.",
        cannotClaim:
          "Cannot claim confirmed broken access control, IDOR/BOLA or private data exposure without safe proof.",
      },
    ],
  });

  const { data: moduleInsert } = await supabase
    .from("international_scan_job_modules")
    .insert(moduleRows)
    .select("id")
    .single();

  const moduleId = moduleInsert?.id || null;

  const { data: run, error: runError } = await supabase
    .from("access_control_review_runs")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      authenticated_scan_request_id: request?.id || null,
      target_url: report.targetUrl,
      review_status: report.reviewStatus,
      comparison_mode: report.comparisonMode,
      review_policy: report.reviewPolicy,
      summary: report.summary,
      route_review_count: report.summary.routeReviewCount,
      comparison_count: report.summary.comparisonCount,
      sensitive_route_signal_count: report.summary.sensitiveRouteSignalCount,
      admin_route_signal_count: report.summary.adminRouteSignalCount,
      object_id_signal_count: report.summary.objectIdSignalCount,
      unexpected_access_signal_count:
        report.summary.unexpectedAccessSignalCount,
      blocked_route_count: report.summary.blockedRouteCount,
      private_evidence_block_count: report.summary.privateEvidenceBlockCount,
      high_risk_count: report.summary.highRiskCount,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/access-control?message=${encodeURIComponent(
        `Could not save access-control run: ${runError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.comparisons.length) {
    await supabase.from("access_control_route_comparisons").insert(
      report.comparisons.slice(0, 500).map((item) => ({
        run_id: run.id,
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        url: item.url,
        path: item.path,
        expected_access: item.expectedAccess,
        low_role_status: item.lowRoleStatus,
        high_role_status: item.highRoleStatus,
        comparison_result: item.comparisonResult,
        risk_level: item.riskLevel,
        risk_signals: item.riskSignals,
        object_id_signals: item.objectIdSignals,
        route_sensitivity: item.routeSensitivity,
        evidence_metadata: item.evidenceMetadata,
        private_body_stored: false,
      })),
    );
  }

  if (report.findings.length) {
    await supabase.from("access_control_findings").insert(
      report.findings.slice(0, 250).map((finding) => ({
        run_id: run.id,
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        category: finding.category,
        title: finding.title,
        severity: finding.severity,
        confidence: finding.confidence,
        affected_url: finding.affectedUrl,
        observed_value: finding.observedValue,
        expected_value: finding.expectedValue,
        risk_signals: finding.riskSignals,
        evidence_summary: finding.evidenceSummary,
        business_impact: finding.businessImpact,
        developer_fix: finding.developerFix,
        safe_claim: finding.safeClaim,
        blocked_claim: finding.blockedClaim,
        standards: finding.standards,
        evidence_metadata: finding.evidenceMetadata,
      })),
    );
  }

  if (report.normalizedEvidenceSeeds.length) {
    await supabase.from("normalized_security_evidence").insert(
      report.normalizedEvidenceSeeds.map((evidence) => ({
        job_id: job.id,
        module_id: moduleId,
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        evidence_key: evidence.evidenceKey,
        source_module: evidence.sourceModule,
        affected_asset: evidence.affectedAsset,
        asset_type: evidence.assetType,
        proof_type: evidence.proofType,
        severity: evidence.severity,
        confidence: evidence.confidence,
        false_positive_risk: evidence.falsePositiveRisk,
        title: evidence.title,
        observed_value: evidence.observedValue,
        expected_value: evidence.expectedValue,
        evidence_summary: evidence.evidenceSummary,
        business_impact: evidence.businessImpact,
        developer_fix: evidence.developerFix,
        safe_claim: evidence.safeClaim,
        blocked_claim: evidence.blockedClaim,
        standards: evidence.standards,
        raw_metadata: evidence.rawMetadata,
      })),
    );
  }

  if (report.vulnerabilitySeeds.length) {
    await supabase.from("vulnerability_instances").insert(
      report.vulnerabilitySeeds.map((vulnerability) => ({
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        source_scan_id: scan.id,
        vulnerability_key: vulnerability.vulnerabilityKey,
        title: vulnerability.title,
        category: vulnerability.category,
        severity: vulnerability.severity,
        confidence: vulnerability.confidence,
        exploitability_score: vulnerability.exploitabilityScore,
        business_impact_score: vulnerability.businessImpactScore,
        priority_score: vulnerability.priorityScore,
        lifecycle_status: "detected",
        affected_assets: vulnerability.affectedAssets,
        evidence_ids: [],
        standards: vulnerability.standards,
        business_impact: vulnerability.businessImpact,
        developer_fix: vulnerability.developerFix,
        verification_guidance: vulnerability.verificationGuidance,
        safe_claim: vulnerability.safeClaim,
        blocked_claim: vulnerability.blockedClaim,
      })),
    );
  }

  await supabase.from("international_scan_job_events").insert([
    {
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      event_type: "completed",
      title: "Broken Access Control Signal Engine completed",
      details: report.summary.customerSummary,
      metadata: {
        ...report.summary,
        lowRoleSessionStored: false,
        highRoleSessionStored: false,
        privateBodyStored: false,
      },
    },
  ]);

  revalidatePath(`/report/${scan.id}/access-control`);
  redirect(
    `/report/${scan.id}/access-control?message=${encodeURIComponent(
      "Broken access control signal review completed. Metadata-only evidence saved without storing sessions or private bodies.",
    )}`,
  );
}
