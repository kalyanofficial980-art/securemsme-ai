"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EngineIntensity } from "@/lib/international-security-engine";
import { buildJobModuleRows } from "@/lib/international-security-engine";
import { runAdvancedBrowserSecurityAnalyzer } from "@/lib/browser-security-analyzer";
import { createClient } from "@/lib/supabase/server";

function normalizeIntensity(value: FormDataEntryValue | null): EngineIntensity {
  if (value === "light" || value === "deep") return value;
  return "standard";
}

export async function runBrowserSecurityAnalysis(formData: FormData) {
  const scanId = String(formData.get("scanId") || "");
  const intensity = normalizeIntensity(formData.get("intensity"));
  const permissionAccepted = formData.get("permissionAccepted") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to run browser security analyzer");

  if (!permissionAccepted) {
    redirect(
      `/report/${scanId}/browser-security?message=${encodeURIComponent(
        "Please accept the authorization checkbox before running browser security analyzer.",
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
      `/report/${scan.id}/browser-security?message=${encodeURIComponent(
        "Save this website first before running browser security analyzer.",
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
      `/report/${scan.id}/browser-security?message=${encodeURIComponent(
        "Website verification and permission attestation are required before browser security analyzer.",
      )}`,
    );
  }

  const { data: routeItems } = await supabase
    .from("attack_surface_items")
    .select("url, item_type")
    .eq("user_id", user.id)
    .eq("website_id", scan.website_id)
    .in("item_type", ["route", "javascript-route"])
    .order("created_at", { ascending: false })
    .limit(20);

  const routeHints = (routeItems || []).map((item) => item.url).filter(Boolean);
  const targetUrl = website?.url || scan.website_url;
  const report = await runAdvancedBrowserSecurityAnalyzer({
    targetUrl,
    intensity,
    verifiedScope,
    routeHints,
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
        siteType: "unknown",
        detectedSignals: [
          report.summary.cspFindingCount ? "CSP signal" : "",
          report.summary.corsFindingCount ? "CORS signal" : "",
          report.summary.cookieFindingCount ? "Cookie/session signal" : "",
          report.summary.externalScriptCount ? "External script surface" : "",
        ].filter(Boolean),
        confidence: "Medium",
        coverageNeeds: [
          "browser hardening",
          "client-side security review",
          "session hardening",
        ],
      },
      selected_modules: [
        {
          moduleId: "advanced-browser-security-analyzer-v2",
          moduleName: "Advanced Browser Security Analyzer v2",
          category: "Browser Security",
          stage: "analysis",
          requiredScope: "verified-scope",
        },
      ],
      blocked_modules: [],
      coverage_matrix: {
        browserSecurityScore: report.summary.browserSecurityScore,
        pages: report.summary.pageCount,
        findings: report.summary.findingCount,
        cspFindings: report.summary.cspFindingCount,
        corsFindings: report.summary.corsFindingCount,
        cookieFindings: report.summary.cookieFindingCount,
      },
      risk_summary: {
        customerSummary: report.summary.customerSummary,
        evidenceCount: report.normalizedEvidenceSeeds.length,
        vulnerabilityCount: report.vulnerabilitySeeds.length,
        highPriorityCount: report.vulnerabilitySeeds.filter((item) =>
          ["Critical", "High"].includes(item.severity),
        ).length,
        engineMaturity: "browser-security-execution",
      },
      standards_summary: {
        owaspWstg: [
          "WSTG-CONF-07",
          "WSTG-CLNT-07",
          "WSTG-CLNT-09",
          "WSTG-CLNT-12",
          "WSTG-SESS-02",
        ],
        owaspAsvs: ["V3.4", "V9.1", "V14.4", "V14.5"],
        owaspApiTop10: ["API8"],
        nistSsdf: ["PW.8", "RV.1"],
      },
      safety_policy: {
        analyzerPolicy: report.analyzerPolicy,
        safetyBoundary: report.safetyBoundary,
      },
      execution_context: {
        workerReady: true,
        currentMode: "server-action-execution",
        nextRequiredLayer:
          "GraphQL analyzer and authenticated browser/session review",
      },
      coverage_score: report.summary.browserSecurityScore,
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
      `/report/${scan.id}/browser-security?message=${encodeURIComponent(
        `Could not save browser security job: ${jobError?.message || "Unknown error"}`,
      )}`,
    );
  }

  const moduleRows = buildJobModuleRows({
    jobId: job.id,
    userId: user.id,
    websiteId: scan.website_id,
    modules: [
      {
        moduleId: "advanced-browser-security-analyzer-v2",
        moduleName: "Advanced Browser Security Analyzer v2",
        category: "Browser Security",
        stage: "analysis",
        requiredScope: "verified-scope",
        supportedSiteTypes: [
          "static",
          "cms",
          "spa",
          "api",
          "ecommerce",
          "unknown",
        ],
        safeMethods: ["GET"],
        rateLimit: { requestsPerMinute: 30, maxRuntimeSeconds: 120 },
        timeoutSeconds: 30,
        dependencies: ["advanced-crawler-foundation"],
        outputSchema: { browserSecurityInventory: "BrowserSecurityInventory" },
        standards: {
          owaspWstg: [
            "WSTG-CONF-07",
            "WSTG-CLNT-07",
            "WSTG-CLNT-09",
            "WSTG-CLNT-12",
            "WSTG-SESS-02",
          ],
          owaspAsvs: ["V3.4", "V9.1", "V14.4", "V14.5"],
          owaspApiTop10: ["API8"],
          nistSsdf: ["PW.8", "RV.1"],
        },
        canClaim:
          "Can claim browser-facing headers, cookie flags, mixed content and external script signals were reviewed safely.",
        cannotClaim:
          "Cannot claim XSS, data theft, clickjacking exploitability or session theft without safe validation.",
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
    .from("browser_security_inventories")
    .insert({
      job_id: job.id,
      user_id: user.id,
      website_id: scan.website_id,
      source_scan_id: scan.id,
      target_url: report.targetUrl,
      analyzer_status: report.analyzerStatus,
      analyzer_policy: report.analyzerPolicy,
      summary: report.summary,
      browser_security_score: report.summary.browserSecurityScore,
      page_count: report.summary.pageCount,
      finding_count: report.summary.findingCount,
      csp_finding_count: report.summary.cspFindingCount,
      cors_finding_count: report.summary.corsFindingCount,
      cookie_finding_count: report.summary.cookieFindingCount,
      clickjacking_finding_count: report.summary.clickjackingFindingCount,
      mixed_content_count: report.summary.mixedContentCount,
      external_script_count: report.summary.externalScriptCount,
      high_risk_count: report.summary.highRiskCount,
    })
    .select("id")
    .single();

  if (inventoryError || !inventory?.id) {
    redirect(
      `/report/${scan.id}/browser-security?message=${encodeURIComponent(
        `Could not save browser security inventory: ${inventoryError?.message || "Unknown error"}`,
      )}`,
    );
  }

  if (report.findings.length) {
    await supabase.from("browser_security_findings").insert(
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
      title: "Advanced Browser Security Analyzer v2 completed",
      details: report.summary.customerSummary,
      metadata: report.summary,
    },
  ]);

  revalidatePath(`/report/${scan.id}/browser-security`);
  redirect(
    `/report/${scan.id}/browser-security?message=${encodeURIComponent(
      "Advanced browser security analyzer completed. Browser security inventory and evidence saved.",
    )}`,
  );
}
