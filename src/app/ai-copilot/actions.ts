"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aiCopilotBlockedClaims,
  buildCopilotAnswer,
  type CopilotSourceDraft,
} from "@/lib/ai-copilot-reports-engine";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, fallback = "") {
  return String(value || fallback).trim();
}

async function getAuthedSupabase() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use AI Copilot");
  return { supabase, user };
}

async function collectSources(
  supabase: any,
  userId: string,
  scanId?: string,
): Promise<{ targetUrl: string; sources: CopilotSourceDraft[] }> {
  const sources: CopilotSourceDraft[] = [];
  let targetUrl = "";

  if (scanId) {
    const { data: scan } = await supabase
      .from("scans")
      .select("id, website_url, status, created_at")
      .eq("id", scanId)
      .eq("user_id", userId)
      .maybeSingle();

    if (scan?.id) {
      targetUrl = scan.website_url || "";
      sources.push({
        sourceType: "scan",
        sourceRef: scan.id,
        sourceTitle: `Scan for ${scan.website_url}`,
        sourceSummary: `Scan status: ${scan.status || "unknown"}. Created: ${scan.created_at || "unknown"}.`,
        sourceConfidence: "Medium",
        clientSafe: true,
      });
    }

    const { data: triageRuns } = await supabase
      .from("ai_triage_runs_v2")
      .select(
        "id, executive_summary, developer_summary, client_safe_summary, triage_score, confidence_score",
      )
      .eq("scan_id", scanId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    for (const run of triageRuns || []) {
      sources.push({
        sourceType: "ai-triage",
        sourceRef: run.id,
        sourceTitle: `AI triage score ${run.triage_score || 0}/100`,
        sourceSummary:
          `${run.executive_summary || ""} ${run.developer_summary || ""} ${run.client_safe_summary || ""}`.trim(),
        sourceConfidence:
          Number(run.confidence_score || 0) >= 70 ? "High" : "Medium",
        clientSafe: true,
      });
    }

    const { data: monitoringAlerts } = await supabase
      .from("monitoring_regression_alerts_v2")
      .select(
        "id, alert_title, alert_status, severity, affected_area, evidence_summary, developer_action, client_safe_note",
      )
      .eq("scan_id", scanId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    for (const alert of monitoringAlerts || []) {
      sources.push({
        sourceType: "monitoring-alert",
        sourceRef: alert.id,
        sourceTitle: alert.alert_title || "Monitoring alert",
        sourceSummary: `${alert.severity || "Medium"} alert. Status: ${alert.alert_status || "open"}. Area: ${alert.affected_area || ""}. Evidence: ${alert.evidence_summary || ""}. Developer action: ${alert.developer_action || ""}. Client note: ${alert.client_safe_note || ""}`,
        sourceConfidence:
          alert.severity === "Critical" || alert.severity === "High"
            ? "High"
            : "Medium",
        clientSafe: true,
      });
    }

    const { data: developerTasks } = await supabase
      .from("developer_fix_tasks_v2")
      .select(
        "id, task_title, task_status, priority, confidence_level, affected_area, developer_fix, evidence_summary, client_safe_note",
      )
      .eq("scan_id", scanId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    for (const task of developerTasks || []) {
      sources.push({
        sourceType: "developer-task",
        sourceRef: task.id,
        sourceTitle: task.task_title || "Developer fix task",
        sourceSummary: `Priority: ${task.priority || "Medium"}. Status: ${task.task_status || "open"}. Area: ${task.affected_area || ""}. Evidence: ${task.evidence_summary || ""}. Fix: ${task.developer_fix || ""}. Client note: ${task.client_safe_note || ""}`,
        sourceConfidence: task.confidence_level || "Medium",
        clientSafe: true,
      });
    }
  }

  sources.push({
    sourceType: "legal-safety",
    sourceRef: "blocked-claims",
    sourceTitle: "Copilot safety boundaries",
    sourceSummary: aiCopilotBlockedClaims.join(" "),
    sourceConfidence: "Confirmed",
    clientSafe: true,
  });

  return { targetUrl, sources };
}

export async function createAiCopilotSessionAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const scanId = clean(formData.get("scanId"));
  const mode = clean(formData.get("mode"), "report-safe");

  const { targetUrl, sources } = await collectSources(
    supabase,
    user.id,
    scanId || undefined,
  );

  const { data: session, error } = await supabase
    .from("ai_copilot_sessions_v2")
    .insert({
      user_id: user.id,
      scan_id: scanId || null,
      session_title: scanId
        ? `Report Copilot · ${targetUrl || scanId}`
        : "Account Report Copilot",
      session_status: "active",
      copilot_mode: mode,
      target_url: targetUrl,
      source_count: sources.length,
      message_count: 1,
      safety_summary:
        "Safe report copilot. No exploit payloads, fake certainty or 100% security claims.",
      blocked_claims: aiCopilotBlockedClaims,
      session_payload: { safeCopilot: true, ruleBasedFoundation: true },
    })
    .select("id")
    .single();

  if (error || !session?.id) {
    redirect(
      `/ai-copilot?message=${encodeURIComponent(error?.message || "Could not create copilot session")}`,
    );
  }

  await supabase.from("ai_copilot_sources_v2").insert(
    sources.map((source) => ({
      session_id: session.id,
      user_id: user.id,
      scan_id: scanId || null,
      source_type: source.sourceType,
      source_ref: source.sourceRef,
      source_title: source.sourceTitle,
      source_summary: source.sourceSummary,
      source_confidence: source.sourceConfidence,
      client_safe: source.clientSafe,
      source_payload: { safeSource: true },
    })),
  );

  await supabase.from("ai_copilot_messages_v2").insert({
    session_id: session.id,
    user_id: user.id,
    scan_id: scanId || null,
    role: "assistant",
    message_text:
      "AI Copilot is ready. Ask about the report, client explanation, developer fixes or what to prioritize first.",
    safe_answer_type: "general",
    confidence_level: "Medium",
    source_ids: [],
    message_payload: { welcome: true },
  });

  await supabase.from("ai_copilot_admin_events_v2").insert({
    session_id: session.id,
    user_id: user.id,
    event_type: "session-created",
    severity: "Info",
    title: "AI Copilot session created",
    details: `Created copilot session with ${sources.length} source(s).`,
    metadata: { scanId: scanId || null, sourceCount: sources.length },
  });

  revalidatePath("/ai-copilot");
  if (scanId) {
    redirect(
      `/report/${scanId}/ai-copilot?session=${session.id}&message=AI Copilot session created.`,
    );
  }
  redirect(
    `/ai-copilot?session=${session.id}&message=AI Copilot session created.`,
  );
}

export async function sendAiCopilotMessageAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const sessionId = clean(formData.get("sessionId"));
  const question = clean(formData.get("question"));
  const scanId = clean(formData.get("scanId"));

  const { data: session } = await supabase
    .from("ai_copilot_sessions_v2")
    .select("id, scan_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session?.id) redirect("/ai-copilot?message=Copilot session not found.");

  const { data: sourceRows } = await supabase
    .from("ai_copilot_sources_v2")
    .select(
      "id, source_type, source_ref, source_title, source_summary, source_confidence, client_safe",
    )
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const sources: CopilotSourceDraft[] = (sourceRows || []).map(
    (source: any) => ({
      sourceType: source.source_type,
      sourceRef: source.source_ref,
      sourceTitle: source.source_title,
      sourceSummary: source.source_summary,
      sourceConfidence: source.source_confidence,
      clientSafe: source.client_safe,
    }),
  );

  const answer = buildCopilotAnswer(question, sources);
  const selectedSourceIds = answer.sourceIndexes
    .map((index) => sourceRows?.[index]?.id)
    .filter(Boolean);

  await supabase.from("ai_copilot_messages_v2").insert({
    session_id: session.id,
    user_id: user.id,
    scan_id: scanId || session.scan_id || null,
    role: "user",
    message_text: question,
    safe_answer_type: "general",
    confidence_level: "Medium",
    source_ids: [],
    message_payload: { userQuestion: true },
  });

  const { data: assistantMessage } = await supabase
    .from("ai_copilot_messages_v2")
    .insert({
      session_id: session.id,
      user_id: user.id,
      scan_id: scanId || session.scan_id || null,
      role: "assistant",
      message_text: answer.answer,
      safe_answer_type: answer.answerType,
      confidence_level: answer.confidenceLevel,
      source_ids: selectedSourceIds,
      blocked_reason: answer.blockedReason,
      message_payload: { safetyNotes: answer.safetyNotes },
    })
    .select("id")
    .single();

  await supabase
    .from("ai_copilot_sessions_v2")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .eq("user_id", user.id);

  await supabase.from("ai_copilot_admin_events_v2").insert({
    session_id: session.id,
    message_id: assistantMessage?.id || null,
    user_id: user.id,
    event_type:
      answer.answerType === "blocked" ? "answer-blocked" : "message-created",
    severity: answer.answerType === "blocked" ? "Medium" : "Info",
    title:
      answer.answerType === "blocked"
        ? "Copilot answer blocked"
        : "Copilot answer created",
    details:
      answer.answerType === "blocked"
        ? answer.blockedReason
        : `Answer type: ${answer.answerType}.`,
    metadata: {
      answerType: answer.answerType,
      confidence: answer.confidenceLevel,
    },
  });

  revalidatePath("/ai-copilot");
  if (scanId || session.scan_id) {
    redirect(
      `/report/${scanId || session.scan_id}/ai-copilot?session=${session.id}`,
    );
  }
  redirect(`/ai-copilot?session=${session.id}`);
}

export async function submitAiCopilotFeedbackAction(formData: FormData) {
  const { supabase, user } = await getAuthedSupabase();
  const sessionId = clean(formData.get("sessionId"));
  const messageId = clean(formData.get("messageId"));
  const value = clean(formData.get("feedbackValue"), "helpful");
  const note = clean(formData.get("feedbackNote"));

  await supabase.from("ai_copilot_feedback_v2").insert({
    session_id: sessionId,
    message_id: messageId || null,
    user_id: user.id,
    feedback_value: value,
    feedback_note: note,
  });

  await supabase.from("ai_copilot_admin_events_v2").insert({
    session_id: sessionId,
    message_id: messageId || null,
    user_id: user.id,
    event_type: "feedback-created",
    severity: value === "unsafe" ? "High" : "Info",
    title: "Copilot feedback created",
    details: `Feedback: ${value}`,
    metadata: { value },
  });

  revalidatePath("/ai-copilot");
  redirect(`/ai-copilot?session=${sessionId}&message=Feedback saved.`);
}
