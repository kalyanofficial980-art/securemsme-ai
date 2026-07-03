"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import { runAdvancedCrawlerEngine } from "@/lib/advanced-crawler-engine";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runAttackSurfaceDiscovery(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run attack surface discovery");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/attack-surface?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running advanced crawler.",
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
      `/report/${scan.id}/attack-surface?message=${encodeURIComponent(
        "Save this website first before running advanced crawler.",
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
      `/report/${scan.id}/attack-surface?message=${encodeURIComponent(
        "Website verification and permission attestation are required before advanced crawling.",
      )}`,
    );
  }

  const targetUrl = website?.url || scan.website_url;
  const report = await runAdvancedCrawlerEngine({
    targetUrl,
    intensity,
    verifiedScope,
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
        report.crawlerStatus === "completed"
          ? "completed"
          : report.crawlerStatus,
      intensity,
      verified_scope: verifiedScope,
      app_classification: {
        siteType: report.summary.apiEndpointCount ? "api" : "unknown",
        detectedSignals: [
          report.summary.apiEndpointCount ? "API endpoint signal" : "",
          report.summary.formCount ? "Form/input surface signal" : "",
          report.summary.jsRouteCount ? "SPA/JavaScript route signal" : "",
        ].filter(Boolean),
        confidence: report.summary.routeCount > 3 ? "Medium" : "Low",
        coverageNeeds: [
          "API scanner",
          "form/input mapper",
          "browser security analyzer",
        ],
      },
      selected_modules: [
        {
          moduleId: "advanced-crawler-foundation",
          moduleName: "Advanced Crawler + Attack Surface Discovery Engine",
          category: "Attack Surface Discovery",
          stage: "discovery",
          requiredScope: "verified-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        routeCoverage: report.summary.routeCount,
        apiCoverage: report.summary.apiEndpointCount,
        formCoverage: report.summary.formCount,
        jsRouteCoverage: report.summary.jsRouteCount,
        crawlerPolicy: report.crawlerPolicy,
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "advanced-crawler-execution",
      },
      standards_summary: {
        owaspWstg: ["WSTG-INFO-05", "WSTG-CONF-04", "WSTG-INPV-01"],
        owaspAsvs: ["V1.2", "V5.1", "V14.4"],
        owaspApiTop10: report.summary.apiEndpointCount
          ? ["API1", "API2", "API5", "API8"]
          : [],
        nistSsdf: ["PW.8", "RV.1"],
      },
      safety_policy: {
        crawlerPolicy: report.crawlerPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        nextRequiredLayer: "background crawler worker and API scanner",
      },
      coverage_score: Math.min(
        100,
        30 +
          report.summary.routeCount +
          report.summary.apiEndpointCount * 5 +
          report.summary.formCount * 3 +
          report.summary.jsRouteCount * 2,
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
      `/report/${scan.id}/attack-surface?message=${encodeURIComponent(
        `Could not save attack surface job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "advanced-crawler-foundation",
        moduleName: "Advanced Crawler + Attack Surface Discovery Engine",
        category: "Attack Surface Discovery",
        stage: "discovery",
        requiredScope: "verified-scope",
        supportedSiteTypes: [
          "static",
          "cms",
          "spa",
          "api",
          "ecommerce",
          "unknown",
        ],
        safeMethods: ["GET", "HEAD"],
        rateLimit: {
          requestsPerMinute: 60,
          maxRuntimeSeconds: report.crawlerPolicy.maxRuntimeSeconds,
        },
        timeoutSeconds: 30,
        dependencies: [],
        outputSchema: { attackSurfaceInventory: "AttackSurfaceInventory" },
        standards: {
          owaspWstg: ["WSTG-INFO-05", "WSTG-CONF-04", "WSTG-INPV-01"],
          owaspAsvs: ["V1.2", "V5.1", "V14.4"],
          owaspApiTop10: report.summary.apiEndpointCount
            ? ["API1", "API2", "API5"]
            : [],
          nistSsdf: ["PW.8", "RV.1"],
        },
        canClaim:
          "Can claim same-origin attack surface was crawled with GET/HEAD only.",
        cannotClaim:
          "Cannot claim forms were submitted, private data was tested, or every hidden route was discovered.",
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
    .from("attack_surface_inventories")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      crawler_status: report.crawlerStatus,
      crawler_policy: report.crawlerPolicy,
      summary: report.summary,
      route_count: report.summary.routeCount,
      api_endpoint_count: report.summary.apiEndpointCount,
      form_count: report.summary.formCount,
      input_count: report.summary.inputCount,
      script_count: report.summary.scriptCount,
      parameter_count: report.summary.parameterCount,
      js_route_count: report.summary.jsRouteCount,
      blocked_count: report.summary.blockedCount,
      risk_signal_count: report.summary.riskSignalCount,
    })
    .select("id")
    .single();

  if (inventoryError || !inventory?.id) {
    redirect(
      `/report/${scan.id}/attack-surface?message=${encodeURIComponent(
        `Could not save attack surface inventory: ${inventoryError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.items.length) {
    await supabase.from("attack_surface_items").insert(
      report.items.slice(0, 500).map((item) => ({
        inventory_id: inventory.id,
        job_id: job.id,
        user_id: user.id,
        website_id: scan.website_id,
        item_type: item.itemType,
        method: item.method || null,
        url: item.url,
        path: item.path || null,
        source_url: item.sourceUrl || null,
        status_code: item.statusCode || null,
        content_type: item.contentType || null,
        title: item.title || null,
        risk_signal: item.riskSignal || null,
        sensitivity: item.sensitivity,
        evidence_metadata: item.evidenceMetadata,
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
      title: "Advanced crawler completed",
      details: report.summary.customerSummary,
      metadata: report.summary,
    },
  ]);

  revalidatePath(`/report/${scan.id}/attack-surface`);
  redirect(
    `/report/${scan.id}/attack-surface?message=${encodeURIComponent(
      "Advanced crawler completed. Attack surface inventory and normalized evidence saved.",
    )}`,
  );
}
