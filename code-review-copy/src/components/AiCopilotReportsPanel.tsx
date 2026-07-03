import {
  createAiCopilotSessionAction,
  sendAiCopilotMessageAction,
  submitAiCopilotFeedbackAction,
} from "@/app/ai-copilot/actions";
import { defaultCopilotQuestions } from "@/lib/ai-copilot-reports-engine";

type Session = {
  id: string;
  session_title: string;
  copilot_mode: string;
  target_url: string;
  source_count: number;
  message_count: number;
  created_at: string;
};

type Message = {
  id: string;
  role: string;
  message_text: string;
  safe_answer_type: string;
  confidence_level: string;
  blocked_reason: string;
  created_at: string;
};

type Source = {
  id: string;
  source_type: string;
  source_title: string;
  source_summary: string;
  source_confidence: string;
  client_safe: boolean;
};

function badgeClass(value: string) {
  if (["assistant", "High", "Confirmed", "client-explanation"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["Medium", "general", "priority", "developer-fix", "executive"].includes(
      value,
    )
  )
    return "bg-blue-100 text-blue-950";
  if (["Low", "Needs manual review", "blocked"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export function AiCopilotReportsPanel({
  scanId,
  targetUrl,
  sessions,
  selectedSession,
  messages,
  sources,
  message,
}: {
  scanId?: string;
  targetUrl?: string;
  sessions: Session[];
  selectedSession?: Session | null;
  messages: Message[];
  sources: Source[];
  message?: string;
}) {
  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Mega Part 68</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          AI Copilot over Reports
        </h1>
        <p className="mt-4 max-w-4xl break-all leading-8 text-blue-900">
          {targetUrl ||
            "Ask safe questions about reports, findings, developer fixes, client wording and remediation priority."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {!selectedSession ? (
            <form
              action={createAiCopilotSessionAction}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <input type="hidden" name="scanId" value={scanId || ""} />
              <input type="hidden" name="mode" value="report-safe" />
              <h2 className="text-2xl font-black">Start report copilot</h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Creates a safe source-grounded copilot session using available
                report, monitoring, developer and AI triage sources.
              </p>
              <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
                Start AI Copilot
              </button>
            </form>
          ) : null}

          {selectedSession ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-black text-slate-500">
                      Active session
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {selectedSession.session_title}
                    </h2>
                    <p className="mt-2 break-all text-sm text-slate-600">
                      {selectedSession.target_url}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                    {selectedSession.source_count} sources
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8">
                <h2 className="text-2xl font-black">Ask Copilot</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {defaultCopilotQuestions().map((question) => (
                    <form key={question} action={sendAiCopilotMessageAction}>
                      <input
                        type="hidden"
                        name="sessionId"
                        value={selectedSession.id}
                      />
                      <input type="hidden" name="scanId" value={scanId || ""} />
                      <input type="hidden" name="question" value={question} />
                      <button className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-black hover:bg-slate-100">
                        {question}
                      </button>
                    </form>
                  ))}
                </div>

                <form
                  action={sendAiCopilotMessageAction}
                  className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="sessionId"
                    value={selectedSession.id}
                  />
                  <input type="hidden" name="scanId" value={scanId || ""} />
                  <textarea
                    name="question"
                    rows={3}
                    placeholder="Ask: What should my developer fix first?"
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  />
                  <button className="h-fit rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
                    Send
                  </button>
                </form>

                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
                  Copilot will not provide exploit payloads, bypass
                  instructions, brute force guidance, credential theft help or
                  fake security guarantees.
                </div>
              </div>

              <div className="grid gap-4">
                {messages.length ? (
                  messages.map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.role === "assistant"
                          ? "rounded-3xl border border-blue-200 bg-blue-50 p-6"
                          : "rounded-3xl border border-slate-200 bg-white p-6"
                      }
                    >
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.role)}`}
                        >
                          {item.role}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.safe_answer_type)}`}
                        >
                          {item.safe_answer_type}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.confidence_level)}`}
                        >
                          {item.confidence_level}
                        </span>
                      </div>
                      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
                        {item.message_text}
                      </pre>
                      {item.blocked_reason ? (
                        <div className="mt-4 rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-900">
                          Blocked: {item.blocked_reason}
                        </div>
                      ) : null}

                      {item.role === "assistant" ? (
                        <form
                          action={submitAiCopilotFeedbackAction}
                          className="mt-4 flex flex-wrap gap-2"
                        >
                          <input
                            type="hidden"
                            name="sessionId"
                            value={selectedSession.id}
                          />
                          <input
                            type="hidden"
                            name="messageId"
                            value={item.id}
                          />
                          <button
                            name="feedbackValue"
                            value="helpful"
                            className="rounded-full bg-white px-3 py-2 text-xs font-black"
                          >
                            Helpful
                          </button>
                          <button
                            name="feedbackValue"
                            value="needs-review"
                            className="rounded-full bg-white px-3 py-2 text-xs font-black"
                          >
                            Needs review
                          </button>
                          <button
                            name="feedbackValue"
                            value="unsafe"
                            className="rounded-full bg-white px-3 py-2 text-xs font-black"
                          >
                            Unsafe
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-white p-6 text-slate-600">
                    No messages yet.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Sessions</h2>
            <div className="mt-5 grid gap-3">
              {sessions.length ? (
                sessions.map((session) => (
                  <a
                    key={session.id}
                    href={
                      scanId
                        ? `/report/${scanId}/ai-copilot?session=${session.id}`
                        : `/ai-copilot?session=${session.id}`
                    }
                    className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                  >
                    <p className="font-black">{session.session_title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {session.source_count} sources
                    </p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-600">No sessions yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Sources</h2>
            <div className="mt-5 grid gap-3">
              {sources.length ? (
                sources.map((source) => (
                  <div key={source.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                        {source.source_type}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(source.source_confidence)}`}
                      >
                        {source.source_confidence}
                      </span>
                    </div>
                    <p className="mt-3 font-black">{source.source_title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {source.source_summary}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No sources yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
