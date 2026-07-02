import Link from "next/link";
import { redirect } from "next/navigation";
import { AiCopilotReportsPanel } from "@/components/AiCopilotReportsPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function ReportAiCopilotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string; message?: string }>;
}) {
  const { id } = await params;
  const { session: selectedSessionId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use AI Copilot");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: sessions } = await supabase
    .from("ai_copilot_sessions_v2")
    .select(
      "id, session_title, copilot_mode, target_url, source_count, message_count, created_at",
    )
    .eq("user_id", user.id)
    .eq("scan_id", scan.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  const selectedSession = selectedSessionId
    ? sessions?.find((item: any) => item.id === selectedSessionId) ||
      sessions?.[0]
    : sessions?.[0];

  const { data: messages } = selectedSession?.id
    ? await supabase
        .from("ai_copilot_messages_v2")
        .select(
          "id, role, message_text, safe_answer_type, confidence_level, blocked_reason, created_at",
        )
        .eq("session_id", selectedSession.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const { data: sources } = selectedSession?.id
    ? await supabase
        .from("ai_copilot_sources_v2")
        .select(
          "id, source_type, source_title, source_summary, source_confidence, client_safe",
        )
        .eq("session_id", selectedSession.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to report
            </Link>
            <p className="mt-4 break-all text-sm font-bold text-slate-500">
              {scan.website_url}
            </p>
          </div>
          <Link
            href="/ai-copilot"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Account Copilot
          </Link>
        </div>

        <AiCopilotReportsPanel
          scanId={scan.id}
          targetUrl={scan.website_url}
          sessions={sessions || []}
          selectedSession={selectedSession}
          messages={messages || []}
          sources={sources || []}
          message={message}
        />
      </section>
    </main>
  );
}
