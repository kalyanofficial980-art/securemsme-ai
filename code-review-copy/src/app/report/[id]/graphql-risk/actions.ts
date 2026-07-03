"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import { runGraphqlRiskAnalyzer } from "@/lib/graphql-risk-analyzer";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runGraphqlRiskAnalysis(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run GraphQL risk analyzer");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/graphql-risk?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running GraphQL risk analyzer.",
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
      `/report/${scan.id}/graphql-risk?message=${encodeURIComponent(
        "Save this website first before running GraphQL risk analyzer.",
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
      `/report/${scan.id}/graphql-risk?message=${encodeURIComponent(
        "Website verification and permission attestation are required before GraphQL risk analyzer.",
      )}`,
    );
  }

  const { data: attackSurfaceItems } = await supabase
    .from("attack_surface_items")
    .select("url, item_type")
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .in("item_type", ["api-endpoint", "javascript-route", "route"])
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: apiEndpoints } = await supabase
    .from("api_security_endpoints")
    .select("endpoint_url, path")
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const hints = [
    ...(attackSurfaceItems || []).map((item) => item.url),
    ...(apiEndpoints || []).map((endpoint) => endpoint.endpoint_url),
  ].filter(Boolean);

  const targetUrl = website?.url || scan.website_url;
  const report = await runGraphqlRiskAnalyzer({
    targetUrl,
    intensity,
    verifiedScope,
    endpointHints: hints,
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
        report.analyzerStatus === "completed"
          ? "completed"
          : report.analyzerStatus,
      intensity,
      verified_scope: verifiedScope,
      app_classification: {
        siteType: "api",
        detectedSignals: [
          report.summary.endpointCount ? "GraphQL endpoint signal" : "",
          report.summary.ideSignalCount ? "GraphQL IDE/playground signal" : "",
          report.summary.mutationSignalCount
            ? "GraphQL mutation surface signal"
            : "",
        ].filter(Boolean),
        confidence: report.summary.endpointCount > 1 ? "Medium" : "Low",
        coverageNeeds: [
          "GraphQL auth boundary review",
          "resolver authorization review",
          "schema exposure review",
        ],
      },
      selected_modules: [
        {
          moduleId: "graphql-risk-analyzer",
          moduleName: "GraphQL Risk Analyzer",
          category: "API Security",
          stage: "analysis",
          requiredScope: "verified-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        graphqlRiskScore: report.summary.graphqlRiskScore,
        endpoints: report.summary.endpointCount,
        ideSignals: report.summary.ideSignalCount,
        introspectionSignals: report.summary.introspectionSignalCount,
        sensitiveKeywords: report.summary.sensitiveKeywordCount,
        mutationSignals: report.summary.mutationSignalCount,
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "graphql-risk-execution",
      },
      standards_summary: {
        owaspWstg: [
          "WSTG-INFO-10",
          "WSTG-ATHN-01",
          "WSTG-ATHZ-01",
          "WSTG-CONF-06",
        ],
        owaspAsvs: ["V4.1", "V13.1", "V13.2", "V14.2"],
        owaspApiTop10: ["API1", "API2", "API3", "API5", "API8", "API9"],
        nistSsdf: ["PW.8", "RV.1", "RV.2"],
      },
      safety_policy: {
        analyzerPolicy: report.analyzerPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        nextRequiredLayer:
          "Authenticated crawler and broken access control signal engine",
      },
      coverage_score: Math.max(0, 100 - report.summary.graphqlRiskScore),
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
      `/report/${scan.id}/graphql-risk?message=${encodeURIComponent(
        `Could not save GraphQL risk job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "graphql-risk-analyzer",
        moduleName: "GraphQL Risk Analyzer",
        category: "API Security",
        stage: "analysis",
        requiredScope: "verified-scope",
        supportedSiteTypes: ["api", "spa", "ecommerce", "cms", "unknown"],
        safeMethods: ["GET", "HEAD"],
        rateLimit: { requestsPerMinute: 20, maxRuntimeSeconds: 120 },
        timeoutSeconds: 30,
        dependencies: [
          "api-discovery-openapi-scanner",
          "advanced-crawler-foundation",
        ],
        outputSchema: { graphqlRiskInventory: "GraphqlRiskInventory" },
        standards: {
          owaspWstg: [
            "WSTG-INFO-10",
            "WSTG-ATHN-01",
            "WSTG-ATHZ-01",
            "WSTG-CONF-06",
          ],
          owaspAsvs: ["V4.1", "V13.1", "V13.2", "V14.2"],
          owaspApiTop10: ["API1", "API2", "API3", "API5", "API8", "API9"],
          nistSsdf: ["PW.8", "RV.1", "RV.2"],
        },
        canClaim:
          "Can claim GraphQL endpoint, IDE, introspection, mutation and sensitive keyword signals were reviewed safely.",
        cannotClaim:
          "Cannot claim introspection enabled, schema dump, broken authorization or data exposure without safe validation.",
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
    .from("graphql_security_inventories")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      analyzer_status: report.analyzerStatus,
      analyzer_policy: report.analyzerPolicy,
      endpoint_observations: report.endpointObservations,
      summary: report.summary,
      endpoint_count: report.summary.endpointCount,
      ide_signal_count: report.summary.ideSignalCount,
      introspection_signal_count: report.summary.introspectionSignalCount,
      auth_unknown_count: report.summary.authUnknownCount,
      sensitive_keyword_count: report.summary.sensitiveKeywordCount,
      mutation_signal_count: report.summary.mutationSignalCount,
      graphql_risk_signal_count: report.summary.graphqlRiskSignalCount,
      blocked_execution_count: report.summary.blockedExecutionCount,
      graphql_risk_score: report.summary.graphqlRiskScore,
    })
    .select("id")
    .single();

  if (inventoryError || !inventory?.id) {
    redirect(
      `/report/${scan.id}/graphql-risk?message=${encodeURIComponent(
        `Could not save GraphQL risk inventory: ${inventoryError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.findings.length) {
    await supabase.from("graphql_security_findings").insert(
      report.findings.slice(0, 250).map((finding) => ({
        inventory_id: inventory.id,
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
        api_top10_mapping: finding.apiTop10Mapping,
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
      title: "GraphQL Risk Analyzer completed",
      details: report.summary.customerSummary,
      metadata: report.summary,
    },
  ]);

  revalidatePath(`/report/${scan.id}/graphql-risk`);
  redirect(
    `/report/${scan.id}/graphql-risk?message=${encodeURIComponent(
      "GraphQL risk analyzer completed. GraphQL risk inventory and evidence saved.",
    )}`,
  );
}
