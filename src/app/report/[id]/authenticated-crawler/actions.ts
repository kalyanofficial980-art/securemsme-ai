"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import type { AuthExecutionMode } from "@/lib/authenticated-session-crawler";
import { runAuthenticatedSessionCrawler } from "@/lib/authenticated-session-crawler";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

function normalizeMode(value: FormDataEntryValue | null): AuthExecutionMode {
  if (value === "short-lived-cookie-in-memory") return value;
  if (value === "short-lived-authorization-in-memory") return value;
  return "metadata-only";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  return [];
}

export async function runAuthenticatedCrawler(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const executionMode = normalizeMode(formData.get("executionMode"));
  const sessionHeaderValue = String(
    formData.get("sessionHeaderValue") || "",
  ).trim();
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run authenticated crawler");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/authenticated-crawler?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running authenticated crawler.",
      )}`,
    );
  }

  if (executionMode !== "metadata-only" && !sessionHeaderValue) {
    redirect(
      `/report/${scanId}/authenticated-crawler?message=${encodeURIComponent(
        "Short-lived cookie/authorization mode requires a temporary test-account session header. It is used in memory only and never saved.",
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
      `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
        "Save this website first before running authenticated crawler.",
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
      `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
        "Website verification and permission attestation are required before authenticated crawler.",
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
      `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
        "Approved authenticated scan request is required. Create/approve it first from Authenticated Scan Request page.",
      )}`,
    );
  }

  const targetUrl = website?.url || scan.website_url;
  const report = await runAuthenticatedSessionCrawler({
    targetUrl,
    intensity,
    verifiedScope,
    approvedRequest,
    allowedPaths: asStringArray(request?.allowed_paths),
    blockedPaths: asStringArray(request?.blocked_paths),
    executionMode,
    sessionHeaderValue,
  });

  const { data: job, error: jobError } = await supabase
    .from("international_scan_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      job_type: "authenticated-engine",
      status: report.runStatus === "completed" ? "completed" : report.runStatus,
      intensity,
      verified_scope: verifiedScope,
      app_classification: {
        siteType: "saas-app",
        detectedSignals: [
          report.summary.authenticatedRouteCount
            ? "authenticated route inventory"
            : "",
          report.summary.formCount ? "authenticated form surface" : "",
          report.summary.authSignalCount ? "auth boundary signal" : "",
          report.summary.sensitiveRouteCount ? "sensitive route signal" : "",
        ].filter(Boolean),
        confidence: report.summary.authenticatedRouteCount ? "Medium" : "Low",
        coverageNeeds: [
          "broken access control signal engine",
          "role boundary review",
          "private evidence protection",
        ],
      },
      selected_modules: [
        {
          moduleId: "authenticated-session-safe-crawler",
          moduleName: "Authenticated Session-Safe Crawler Execution",
          category: "Authenticated Security",
          stage: "validation",
          requiredScope: "authenticated-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        authenticatedRoutes: report.summary.authenticatedRouteCount,
        blockedRoutes: report.summary.blockedRouteCount,
        forms: report.summary.formCount,
        inputs: report.summary.inputCount,
        authSignals: report.summary.authSignalCount,
        sensitiveRoutes: report.summary.sensitiveRouteCount,
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "authenticated-crawler-execution",
      },
      standards_summary: {
        owaspWstg: [
          "WSTG-ATHN-01",
          "WSTG-ATHZ-01",
          "WSTG-SESS-01",
          "WSTG-SESS-05",
          "WSTG-INPV-01",
        ],
        owaspAsvs: ["V3.1", "V3.5", "V4.1", "V5.1"],
        owaspApiTop10: ["API1", "API2", "API5"],
        nistSsdf: ["PW.8", "RV.1", "RV.2"],
      },
      safety_policy: {
        crawlerPolicy: report.crawlerPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        sessionHeaderStored: false,
        nextRequiredLayer:
          "Broken access control signal engine and role boundary review",
      },
      coverage_score: Math.min(
        100,
        40 +
          report.summary.authenticatedRouteCount * 5 +
          report.summary.formCount * 3,
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
      `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
        `Could not save authenticated crawler job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "authenticated-session-safe-crawler",
        moduleName: "Authenticated Session-Safe Crawler Execution",
        category: "Authenticated Security",
        stage: "validation",
        requiredScope: "authenticated-scope",
        supportedSiteTypes: ["cms", "spa", "api", "ecommerce", "unknown"],
        safeMethods: ["GET"],
        rateLimit: { requestsPerMinute: 25, maxRuntimeSeconds: 180 },
        timeoutSeconds: 30,
        dependencies: ["authenticated-scan-foundation"],
        outputSchema: {
          authenticatedRouteInventory: "AuthenticatedRouteInventory",
        },
        standards: {
          owaspWstg: [
            "WSTG-ATHN-01",
            "WSTG-ATHZ-01",
            "WSTG-SESS-01",
            "WSTG-SESS-05",
          ],
          owaspAsvs: ["V3.1", "V3.5", "V4.1", "V5.1"],
          owaspApiTop10: ["API1", "API2", "API5"],
          nistSsdf: ["PW.8", "RV.1", "RV.2"],
        },
        canClaim:
          "Can claim approved authenticated routes were inventoried safely with metadata-only evidence.",
        cannotClaim:
          "Cannot claim broken access control, private data exposure, CSRF or business logic vulnerability without safe validation.",
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
    .from("authenticated_crawler_runs")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      authenticated_scan_request_id: request?.id || null,
      target_url: report.targetUrl,
      run_status: report.runStatus,
      execution_mode: report.executionMode,
      crawler_policy: report.crawlerPolicy,
      summary: report.summary,
      authenticated_route_count: report.summary.authenticatedRouteCount,
      blocked_route_count: report.summary.blockedRouteCount,
      form_count: report.summary.formCount,
      input_count: report.summary.inputCount,
      auth_signal_count: report.summary.authSignalCount,
      sensitive_route_count: report.summary.sensitiveRouteCount,
      private_evidence_block_count: report.summary.privateEvidenceBlockCount,
      high_risk_count: report.summary.highRiskCount,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    redirect(
      `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
        `Could not save authenticated crawler run: ${runError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.observations.length) {
    await supabase.from("authenticated_route_observations").insert(
      report.observations.slice(0, 500).map((observation) => ({
        run_id: run.id,
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        url: observation.url,
        path: observation.path,
        method: observation.method,
        status_code: observation.statusCode,
        content_type: observation.contentType,
        title: observation.title,
        route_type: observation.routeType,
        auth_signal: observation.authSignal || null,
        sensitivity: observation.sensitivity,
        forms_metadata: observation.formsMetadata,
        links_discovered: observation.linksDiscovered,
        blocked_reason: observation.blockedReason || null,
        private_body_stored: false,
        evidence_metadata: observation.evidenceMetadata,
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
      title: "Authenticated Session-Safe Crawler completed",
      details: report.summary.customerSummary,
      metadata: {
        ...report.summary,
        sessionHeaderStored: false,
      },
    },
  ]);

  revalidatePath(`/report/${scan.id}/authenticated-crawler`);
  redirect(
    `/report/${scan.id}/authenticated-crawler?message=${encodeURIComponent(
      "Authenticated session-safe crawler completed. Route inventory and evidence saved without storing session/private body data.",
    )}`,
  );
}
