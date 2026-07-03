import {
  createEvidenceSnapshotAction,
  syncEvidenceWarehouseAction,
  validateEvidenceItemAction,
} from "@/app/evidence/actions";
import { evidenceCompletenessLabel } from "@/lib/evidence-warehouse-v2";

type ProofChain = {
  id: string;
  chain_name: string;
  chain_status: string;
  root_hash: string;
  latest_hash: string;
  total_evidence_items: number;
  validated_items: number;
  needs_review_items: number;
  rejected_items: number;
  strong_items: number;
  client_safe_items: number;
  technical_items: number;
  completeness_score: number;
  proof_summary: string;
  client_safe_summary: string;
  technical_summary: string;
  updated_at: string;
};

type EvidenceItem = {
  id: string;
  evidence_key: string;
  source_type: string;
  source_engine?: string | null;
  evidence_type: string;
  evidence_category: string;
  title: string;
  summary: string;
  affected_url?: string | null;
  observed_value?: string | null;
  expected_value?: string | null;
  proof_value?: string | null;
  safe_claim: string;
  blocked_claim: string;
  sensitivity_level: string;
  confidence_level: string;
  evidence_quality: string;
  validation_status: string;
  evidence_hash: string;
  previous_hash?: string | null;
  chain_position: number;
  created_at: string;
};

type Snapshot = {
  id: string;
  snapshot_name: string;
  snapshot_type: string;
  snapshot_hash: string;
  evidence_count: number;
  validated_count: number;
  completeness_score: number;
  snapshot_summary: string;
  created_at: string;
};

type Event = {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  details: string;
  created_at: string;
};

function statusClass(status: string) {
  if (status === "validated" || status === "active")
    return "bg-emerald-100 text-emerald-950";
  if (status === "needs-review" || status === "unvalidated")
    return "bg-amber-100 text-amber-950";
  if (status === "rejected" || status === "revoked")
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function qualityClass(quality: string) {
  if (quality === "strong") return "bg-emerald-100 text-emerald-950";
  if (quality === "good") return "bg-blue-100 text-blue-950";
  if (quality === "partial") return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-2 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function shortHash(hash?: string | null) {
  if (!hash) return "none";
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

export function EvidenceWarehousePanel({
  scanId,
  targetUrl,
  proofChain,
  evidenceItems,
  snapshots,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  proofChain?: ProofChain | null;
  evidenceItems: EvidenceItem[];
  snapshots: Snapshot[];
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
        <p className="text-sm font-black text-blue-700">
          Evidence Warehouse v2
        </p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Proof Chain System
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Store proof behind every engine run, finding, accuracy assessment and
          report claim. Evidence items are hash-linked so client reports have
          traceable support.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Proof completeness"
          value={`${proofChain?.completeness_score || 0}%`}
          helper={evidenceCompletenessLabel(
            proofChain?.completeness_score || 0,
          )}
        />
        <Stat
          label="Evidence items"
          value={proofChain?.total_evidence_items || evidenceItems.length}
          helper="Traceable proof records"
        />
        <Stat
          label="Validated"
          value={proofChain?.validated_items || 0}
          helper="Reviewed evidence"
        />
        <Stat
          label="Needs review"
          value={proofChain?.needs_review_items || 0}
          helper="Before strong client claim"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Strong evidence" value={proofChain?.strong_items || 0} />
        <Stat label="Client-safe" value={proofChain?.client_safe_items || 0} />
        <Stat
          label="Technical/internal"
          value={proofChain?.technical_items || 0}
        />
        <Stat label="Snapshots" value={snapshots.length} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black text-slate-500">Proof chain</p>
            <h2 className="mt-2 text-3xl font-black">
              {proofChain?.chain_name || "No proof chain yet"}
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              {proofChain?.proof_summary ||
                "Sync evidence to create proof chain."}
            </p>
            <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
              <p>Root hash: {shortHash(proofChain?.root_hash)}</p>
              <p>Latest hash: {shortHash(proofChain?.latest_hash)}</p>
            </div>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-black ${statusClass(proofChain?.chain_status || "unvalidated")}`}
          >
            {proofChain?.chain_status || "not-created"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={syncEvidenceWarehouseAction}>
            <input type="hidden" name="scanId" value={scanId} />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Sync evidence warehouse
            </button>
          </form>

          <form action={createEvidenceSnapshotAction}>
            <input type="hidden" name="scanId" value={scanId} />
            <input type="hidden" name="snapshotType" value="pre-report" />
            <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
              Create pre-report snapshot
            </button>
          </form>

          <form action={createEvidenceSnapshotAction}>
            <input type="hidden" name="scanId" value={scanId} />
            <input type="hidden" name="snapshotType" value="client-share" />
            <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
              Create client-share snapshot
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Evidence items</h2>
        <div className="mt-6 grid gap-5">
          {evidenceItems.length ? (
            evidenceItems.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      #{item.chain_position} · {item.source_type} ·{" "}
                      {item.evidence_type} · {item.source_engine || "no-engine"}
                    </p>
                    <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                    <p className="mt-2 break-all text-sm font-bold text-slate-600">
                      {item.affected_url || "No affected URL"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.validation_status)}`}
                    >
                      {item.validation_status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${qualityClass(item.evidence_quality)}`}
                    >
                      {item.evidence_quality}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {item.sensitivity_level}
                    </span>
                  </div>
                </div>

                <p className="mt-5 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                  {item.summary}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="font-black text-blue-950">Safe claim</p>
                    <p className="mt-2 text-sm leading-6 text-blue-900">
                      {item.safe_claim || "No safe claim provided."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="font-black text-red-950">Blocked claim</p>
                    <p className="mt-2 text-sm leading-6 text-red-900">
                      {item.blocked_claim ||
                        "Do not overclaim beyond evidence."}
                    </p>
                  </div>
                </div>

                <details className="mt-4 rounded-2xl bg-white p-4">
                  <summary className="cursor-pointer font-black">
                    Hash chain details
                  </summary>
                  <div className="mt-3 grid gap-2 break-all text-sm text-slate-600">
                    <p>
                      <span className="font-black">Evidence hash:</span>{" "}
                      {item.evidence_hash}
                    </p>
                    <p>
                      <span className="font-black">Previous hash:</span>{" "}
                      {item.previous_hash || "root"}
                    </p>
                    <p>
                      <span className="font-black">Observed:</span>{" "}
                      {item.observed_value || "Not recorded"}
                    </p>
                    <p>
                      <span className="font-black">Expected:</span>{" "}
                      {item.expected_value || "Not recorded"}
                    </p>
                    <p>
                      <span className="font-black">Proof value:</span>{" "}
                      {item.proof_value || "Not recorded"}
                    </p>
                  </div>
                </details>

                <form
                  action={validateEvidenceItemAction}
                  className="mt-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4"
                >
                  <input type="hidden" name="scanId" value={scanId} />
                  <input type="hidden" name="evidenceItemId" value={item.id} />

                  <select
                    name="validationStatus"
                    defaultValue={item.validation_status}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                  >
                    <option value="unvalidated">Unvalidated</option>
                    <option value="validated">Validated</option>
                    <option value="needs-review">Needs review</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>

                  <select
                    name="confidenceLevel"
                    defaultValue={item.confidence_level}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Needs manual review">
                      Needs manual review
                    </option>
                  </select>

                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                    Save validation
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
              No evidence items yet. Run orchestrator/scanner/accuracy first,
              then sync evidence warehouse.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Evidence snapshots</h2>
          <div className="mt-6 grid gap-4">
            {snapshots.length ? (
              snapshots.map((snapshot) => (
                <div key={snapshot.id} className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase text-slate-500">
                    {snapshot.snapshot_type}
                  </p>
                  <h3 className="mt-1 font-black">{snapshot.snapshot_name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {snapshot.snapshot_summary}
                  </p>
                  <p className="mt-2 break-all text-xs font-bold text-slate-500">
                    {shortHash(snapshot.snapshot_hash)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No snapshots yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Evidence events</h2>
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
              <p className="text-slate-600">No evidence events yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
