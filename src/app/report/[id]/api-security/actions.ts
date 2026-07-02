"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import { runApiSecurityScanner } from "@/lib/api-security-scanner";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runApiSecurityScan(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run API security scanner");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/api-security?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running API security scanner.",
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
      `/report/${scan.id}/api-security?message=${encodeURIComponent(
        "Save this website first before running API security scanner.",
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
      `/report/${scan.id}/api-security?message=${encodeURIComponent(
        "Website verification and permission attestation are required before API security scanner.",
      )}`,
    );
  }

  const { data: attackSurfaceItems } = await supabase
    .from("attack_surface_items")
    .select("url, item_type")
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .in("item_type", ["api-endpoint", "javascript-route"])
    .order("created_at", { ascending: false })
    .limit(150);

  const hints = (attackSurfaceItems || [])
    .map((item) => item.url)
    .filter(Boolean);
  const targetUrl = website?.url || scan.website_url;
  const report = await runApiSecurityScanner({
    targetUrl,
    intensity,
    verifiedScope,
    attackSurfaceHints: hints,
  });

  const { data: job, error: jobError } = await supabase
    .from("international_scan_jobs")
    .insert({
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      job_type: "international-security-engine",
      status:
        report.scannerStatus === "completed"
          ? "completed"
          : report.scannerStatus,
      intensity,
      verified_scope: verifiedScope,
      app_classification: {
        siteType: "api",
        detectedSignals: [
          report.summary.documentCount
            ? "OpenAPI/Swagger documentation signal"
            : "",
          report.summary.endpointCount ? "API endpoint inventory" : "",
          report.summary.mutationMethodCount
            ? "API mutation method definitions"
            : "",
        ].filter(Boolean),
        confidence:
          report.summary.endpointCount > 5
            ? "High"
            : report.summary.endpointCount
              ? "Medium"
              : "Low",
        coverageNeeds: [
          "API auth boundary review",
          "rate-limit checks",
          "sensitive response guard",
        ],
      },
      selected_modules: [
        {
          moduleId: "api-discovery-openapi-scanner",
          moduleName: "API Discovery + OpenAPI Security Scanner",
          category: "API Security",
          stage: "discovery",
          requiredScope: "verified-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        apiDocuments: report.summary.documentCount,
        endpoints: report.summary.endpointCount,
        getEndpoints: report.summary.getEndpointCount,
        mutationMethods: report.summary.mutationMethodCount,
        authUnknown: report.summary.authUnknownCount,
        apiTop10: ["API1", "API2", "API3", "API5", "API8"],
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "api-security-execution",
      },
      standards_summary: {
        owaspWstg: ["WSTG-INFO-10", "WSTG-ATHN-01", "WSTG-ATHZ-01"],
        owaspAsvs: ["V13.1", "V13.2", "V4.1"],
        owaspApiTop10: ["API1", "API2", "API3", "API5", "API8"],
        nistSsdf: ["PW.8", "RV.1", "RV.2"],
      },
      safety_policy: {
        scannerPolicy: report.scannerPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        nextRequiredLayer:
          "API auth boundary scanner and rate-limit signal checker",
      },
      coverage_score: Math.min(
        100,
        35 +
          report.summary.documentCount * 10 +
          report.summary.endpointCount * 2,
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
      `/report/${scan.id}/api-security?message=${encodeURIComponent(
        `Could not save API security job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "api-discovery-openapi-scanner",
        moduleName: "API Discovery + OpenAPI Security Scanner",
        category: "API Security",
        stage: "discovery",
        requiredScope: "verified-scope",
        supportedSiteTypes: ["api", "spa", "ecommerce", "cms", "unknown"],
        safeMethods: ["GET", "HEAD"],
        rateLimit: { requestsPerMinute: 40, maxRuntimeSeconds: 120 },
        timeoutSeconds: 30,
        dependencies: ["advanced-crawler-foundation"],
        outputSchema: { apiInventory: "ApiSecurityInventory" },
        standards: {
          owaspWstg: ["WSTG-INFO-10", "WSTG-ATHN-01", "WSTG-ATHZ-01"],
          owaspAsvs: ["V13.1", "V13.2", "V4.1"],
          owaspApiTop10: ["API1", "API2", "API3", "API5", "API8"],
          nistSsdf: ["PW.8", "RV.1", "RV.2"],
        },
        canClaim:
          "Can claim OpenAPI/Swagger/API endpoint inventory was created safely.",
        cannotClaim:
          "Cannot claim broken authorization, data exposure, or mutation vulnerability without safe endpoint validation.",
      },
    ],
  });

  const { data: moduleInsert } = await supabase
    .from("international_scan_job_modules")
    .insert(moduleRows)
    .select("id")
    .single();

  const moduleId = moduleInsert?.id || null;

  const { data: inventory, error: inventoryError } = await supabase
    .from("api_security_inventories")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      scanner_status: report.scannerStatus,
      scanner_policy: report.scannerPolicy,
      openapi_documents: report.openApiDocuments,
      summary: report.summary,
      document_count: report.summary.documentCount,
      endpoint_count: report.summary.endpointCount,
      get_endpoint_count: report.summary.getEndpointCount,
      mutation_method_count: report.summary.mutationMethodCount,
      auth_unknown_count: report.summary.authUnknownCount,
      sensitive_path_count: report.summary.sensitivePathCount,
      api_risk_signal_count: report.summary.apiRiskSignalCount,
      blocked_execution_count: report.summary.blockedExecutionCount,
    })
    .select("id")
    .single();

  if (inventoryError || !inventory?.id) {
    redirect(
      `/report/${scan.id}/api-security?message=${encodeURIComponent(
        `Could not save API security inventory: ${inventoryError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.endpoints.length) {
    await supabase.from("api_security_endpoints").insert(
      report.endpoints.slice(0, 600).map((endpoint) => ({
        inventory_id: inventory.id,
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        endpoint_url: endpoint.endpointUrl,
        path: endpoint.path,
        method: endpoint.method,
        source: endpoint.source,
        auth_requirement: endpoint.authRequirement,
        risk_level: endpoint.riskLevel,
        risk_signals: endpoint.riskSignals,
        parameters: endpoint.parameters,
        response_metadata: endpoint.responseMetadata,
        api_top10_mapping: endpoint.apiTop10Mapping,
        safe_testing_notes: endpoint.safeTestingNotes,
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
      title: "API Discovery + OpenAPI scanner completed",
      details: report.summary.customerSummary,
      metadata: report.summary,
    },
  ]);

  revalidatePath(`/report/${scan.id}/api-security`);
  redirect(
    `/report/${scan.id}/api-security?message=${encodeURIComponent(
      "API security scanner completed. API inventory and evidence saved.",
    )}`,
  );
}
