import {
  createProductionLaunchSnapshotAction,
  runAccuracyBenchmarkAction,
  seedProductionLaunchChecksAction,
  updateProductionLaunchCheckAction,
} from "@/app/production-launch/actions";

type BenchmarkRun = {
  id: string;
  total_case_count: number;
  passed_case_count: number;
  failed_case_count: number;
  warning_case_count: number;
  manual_review_count: number;
  accuracy_score: number;
  evidence_score: number;
  false_positive_control_score: number;
  claim_safety_score: number;
  benchmark_confidence_score: number;
  executive_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  limitations_summary: string;
  created_at: string;
};

type BenchmarkCase = {
  id: string;
  case_title: string;
  case_category: string;
  case_status: string;
  severity: string;
  expected_result: string;
  actual_result: string;
  evidence_summary: string;
  remediation_action: string;
  client_safe_note: string;
  blocked_claim: string;
  case_score: number;
};

type LaunchCheck = {
  id: string;
  check_key: string;
  check_title: string;
  check_group: string;
  check_status: string;
  severity: string;
  owner_note: string;
  evidence_summary: string;
  required_action: string;
  client_safe_note: string;
  blocker_reason: string;
};

type LaunchSnapshot = {
  id: string;
  snapshot_status: string;
  total_check_count: number;
  passed_check_count: number;
  warning_check_count: number;
  failed_check_count: number;
  blocked_check_count: number;
  launch_readiness_score: number;
  security_hardening_score: number;
  operational_readiness_score: number;
  quality_confidence_score: number;
  customer_trust_score: number;
  executive_summary: string;
  launch_blocker_summary: string;
  hardening_summary: string;
  final_recommendation: string;
  created_at: string;
};

type ReleaseNote = {
  id: string;
  note_type: string;
  note_title: string;
  note_body: string;
  severity: string;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function badgeClass(value: string) {
  if (["pass", "ready", "Info", "Low", "not-applicable"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (
    ["warning", "pending", "needs-review", "manual-review", "Medium"].includes(
      value,
    )
  )
    return "bg-amber-100 text-amber-950";
  if (["fail", "blocked", "Critical", "High"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function ScoreCard({
  label,
  score,
  helper,
}: {
  label: string;
  score: number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black text-slate-950">{score}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-950"
          style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
        />
      </div>
      {helper ? (
        <p className="mt-3 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export function ProductionLaunchPanel({
  scans,
  benchmarks,
  selectedBenchmark,
  benchmarkCases,
  checks,
  snapshots,
  selectedSnapshot,
  releaseNotes,
  events,
  message,
}: {
  scans: Array<{ id: string; website_url: string }>;
  benchmarks: BenchmarkRun[];
  selectedBenchmark?: BenchmarkRun | null;
  benchmarkCases: BenchmarkCase[];
  checks: LaunchCheck[];
  snapshots: LaunchSnapshot[];
  selectedSnapshot?: LaunchSnapshot | null;
  releaseNotes: ReleaseNote[];
  events: Event[];
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
        <p className="text-sm font-black text-blue-700">Mega Part 66 · Final</p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Accuracy Benchmark + Production Launch Hardening
        </h1>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Final quality control, production hardening checklist, launch blocker
          visibility and SaaS readiness scoring.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <form
          action={seedProductionLaunchChecksAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <h2 className="text-2xl font-black">1. Seed launch checks</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Creates final production checklist for RLS, auth redirects, env
            vars, legal pages, billing and E2E.
          </p>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Seed Checks
          </button>
        </form>

        <form
          action={runAccuracyBenchmarkAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <h2 className="text-2xl font-black">2. Run benchmark</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Benchmarks evidence, false-positive controls, client-safe claims and
            final quality sources.
          </p>
          <select
            name="scanId"
            className="mt-5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
          >
            <option value="">Account-wide benchmark</option>
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.website_url}
              </option>
            ))}
          </select>
          <button className="mt-5 rounded-full bg-blue-950 px-6 py-3 text-sm font-black text-white hover:bg-blue-900">
            Run Benchmark
          </button>
        </form>

        <form
          action={createProductionLaunchSnapshotAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <h2 className="text-2xl font-black">3. Create launch snapshot</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Generates final launch readiness score and release notes.
          </p>
          <input
            type="hidden"
            name="benchmarkRunId"
            value={selectedBenchmark?.id || ""}
          />
          <button className="mt-6 rounded-full bg-emerald-950 px-6 py-3 text-sm font-black text-white hover:bg-emerald-900">
            Create Snapshot
          </button>
        </form>
      </div>

      {selectedSnapshot ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <ScoreCard
              label="Launch"
              score={selectedSnapshot.launch_readiness_score}
              helper={selectedSnapshot.snapshot_status}
            />
            <ScoreCard
              label="Security"
              score={selectedSnapshot.security_hardening_score}
              helper="Hardening"
            />
            <ScoreCard
              label="Ops"
              score={selectedSnapshot.operational_readiness_score}
              helper="Operations"
            />
            <ScoreCard
              label="Quality"
              score={selectedSnapshot.quality_confidence_score}
              helper="Benchmark"
            />
            <ScoreCard
              label="Trust"
              score={selectedSnapshot.customer_trust_score}
              helper="Customer trust"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Latest launch snapshot
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Production readiness
                </h2>
                <p className="mt-4 max-w-4xl leading-8 text-slate-700">
                  {selectedSnapshot.executive_summary}
                </p>
                <p className="mt-2 max-w-4xl leading-7 text-slate-600">
                  {selectedSnapshot.final_recommendation}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(selectedSnapshot.snapshot_status)}`}
              >
                {selectedSnapshot.snapshot_status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <MiniStat
                label="Checks"
                value={selectedSnapshot.total_check_count}
              />
              <MiniStat
                label="Passed"
                value={selectedSnapshot.passed_check_count}
              />
              <MiniStat
                label="Warnings"
                value={selectedSnapshot.warning_check_count}
              />
              <MiniStat
                label="Failed"
                value={selectedSnapshot.failed_check_count}
              />
              <MiniStat
                label="Blocked"
                value={selectedSnapshot.blocked_check_count}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-bold leading-7 text-red-900">
              Launch blocker summary: {selectedSnapshot.launch_blocker_summary}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Release notes</h2>
            <div className="mt-6 grid gap-4">
              {releaseNotes.length ? (
                releaseNotes.map((note) => (
                  <div key={note.id} className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {note.note_type}
                        </p>
                        <h3 className="mt-2 font-black">{note.note_title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {note.note_body}
                        </p>
                      </div>
                      <span
                        className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(note.severity)}`}
                      >
                        {note.severity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No release notes yet.</p>
              )}
            </div>
          </div>
        </>
      ) : null}

      {selectedBenchmark ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <ScoreCard
              label="Accuracy"
              score={selectedBenchmark.accuracy_score}
            />
            <ScoreCard
              label="Evidence"
              score={selectedBenchmark.evidence_score}
            />
            <ScoreCard
              label="False Positive"
              score={selectedBenchmark.false_positive_control_score}
            />
            <ScoreCard
              label="Claim Safety"
              score={selectedBenchmark.claim_safety_score}
            />
            <ScoreCard
              label="Confidence"
              score={selectedBenchmark.benchmark_confidence_score}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Benchmark cases</h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-600">
              {selectedBenchmark.executive_summary}
            </p>

            <div className="mt-6 grid gap-5">
              {benchmarkCases.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {item.case_category} · score {item.case_score}/100
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        {item.case_title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.case_status)}`}
                      >
                        {item.case_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(item.severity)}`}
                      >
                        {item.severity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      <p className="font-black">Actual result</p>
                      <p className="mt-2">{item.actual_result}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      <p className="font-black">Action</p>
                      <p className="mt-2">{item.remediation_action}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                      <p className="font-black">Client note</p>
                      <p className="mt-2">{item.client_safe_note}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                    Blocked claim: {item.blocked_claim}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Production launch checks</h2>
        <div className="mt-6 grid gap-5">
          {checks.length ? (
            checks.map((check) => (
              <div
                key={check.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {check.check_group}
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      {check.check_title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {check.evidence_summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.check_status)}`}
                    >
                      {check.check_status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.severity)}`}
                    >
                      {check.severity}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
                  Required action: {check.required_action}
                </div>

                {check.blocker_reason ? (
                  <div className="mt-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                    Blocker reason: {check.blocker_reason}
                  </div>
                ) : null}

                <form
                  action={updateProductionLaunchCheckAction}
                  className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]"
                >
                  <input type="hidden" name="checkId" value={check.id} />
                  <select
                    name="checkStatus"
                    defaultValue={check.check_status}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
                  >
                    <option value="pending">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="warning">Warning</option>
                    <option value="fail">Fail</option>
                    <option value="blocked">Blocked</option>
                    <option value="not-applicable">Not applicable</option>
                  </select>
                  <input
                    name="ownerNote"
                    defaultValue={check.owner_note}
                    placeholder="Owner note / proof"
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                  />
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                    Update
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
              No launch checks yet. Click Seed Checks.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent snapshots / benchmarks</h2>
          <div className="mt-6 grid gap-4">
            {snapshots.map((snapshot) => (
              <a
                key={snapshot.id}
                href={`/production-launch?snapshot=${snapshot.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
              >
                <p className="font-black">
                  Launch {snapshot.launch_readiness_score}/100 ·{" "}
                  {snapshot.snapshot_status}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  blocked {snapshot.blocked_check_count} · passed{" "}
                  {snapshot.passed_check_count}
                </p>
              </a>
            ))}
            {benchmarks.map((benchmark) => (
              <a
                key={benchmark.id}
                href={`/production-launch?benchmark=${benchmark.id}`}
                className="rounded-2xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100"
              >
                <p className="font-black text-blue-950">
                  Benchmark {benchmark.accuracy_score}/100
                </p>
                <p className="mt-1 text-sm text-blue-800">
                  passed {benchmark.passed_case_count}/
                  {benchmark.total_case_count}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
