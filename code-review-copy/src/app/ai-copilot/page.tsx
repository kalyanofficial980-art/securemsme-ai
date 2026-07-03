import { redirect } from "next/navigation";
import { AiCopilotReportsPanel } from "@/components/AiCopilotReportsPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AiCopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; message?: string }>;
}) {
  const { session: selectedSessionId, message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to use AI Copilot");

  const { data: sessions } = await supabase
    .from("ai_copilot_sessions_v2")
    .select(
      "id, session_title, copilot_mode, target_url, source_count, message_count, created_at",
    )
    .eq("user_id", user.id)
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
        <AiCopilotReportsPanel
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
