import { runAttackSurfaceDiscovery } from "@/app/report/[id]/attack-surface/actions";

type Inventory = {
  id: string;
  target_url: string;
  crawler_status: string;
  crawler_policy?: Record<string, unknown> | null;
  summary?: { customerSummary?: string } | null;
  route_count: number;
  api_endpoint_count: number;
  form_count: number;
  input_count: number;
  script_count: number;
  parameter_count: number;
  js_route_count: number;
  blocked_count: number;
  risk_signal_count: number;
  created_at: string;
};

type SurfaceItem = {
  id: string;
  item_type: string;
  method?: string | null;
  url: string;
  path?: string | null;
  source_url?: string | null;
  status_code?: number | null;
  content_type?: string | null;
  title?: string | null;
  risk_signal?: string | null;
  sensitivity: string;
  evidence_metadata?: Record<string, unknown> | null;
};

function sensitivityClass(sensitivity: string) {
  if (sensitivity === "high") return "bg-red-50 text-red-900";
  if (sensitivity === "medium") return "bg-amber-50 text-amber-900";
  return "bg-emerald-50 text-emerald-800";
}

function typeClass(type: string) {
  if (type === "api-endpoint")
    return "border-purple-200 bg-purple-50 text-purple-900";
  if (type === "form" || type === "input")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (type === "blocked-route") return "border-red-200 bg-red-50 text-red-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function AttackSurfacePanel({
  scanId,
  targetUrl,
  verifiedScope,
  inventories,
  items,
  message,
}: {
  scanId: string;
  targetUrl: string;
  verifiedScope: boolean;
  inventories: Inventory[];
  items: SurfaceItem[];
  message?: string;
}) {
  const latest = inventories[0];

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Advanced crawler + attack surface discovery
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Same-origin crawler, SPA route discovery, forms and API surface
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Discovers routes, JavaScript routes, API signals, forms, inputs,
              parameters and scripts using safe metadata-only evidence.
            </p>
          </div>

          <div
            className={
              verifiedScope
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-black text-emerald-950"
                : "rounded-2xl border border-red-200 bg-red-50 p-4 font-black text-red-950"
            }
          >
            {verifiedScope ? "Verified scope ready" : "Locked"}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{targetUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            GET/HEAD only. No form submission. No POST/PUT/PATCH/DELETE. No
            private body storage. No credential/session storage.
          </p>
        </div>

        <form
          action={runAttackSurfaceDiscovery}
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6"
        >
          <input type="hidden" name="scanId" value={scanId} />

          <div className="grid gap-4 md:grid-cols-3">
            {["light", "standard", "deep"].map((intensity) => (
              <label
                key={intensity}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <input
                  type="radio"
                  name="intensity"
                  value={intensity}
                  defaultChecked={intensity === "standard"}
                  className="mr-2"
                />
                <span className="font-black capitalize">{intensity}</span>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {intensity === "light"
                    ? "Small route inventory."
                    : intensity === "deep"
                      ? "Larger same-origin discovery limits."
                      : "Balanced attack surface discovery."}
                </p>
              </label>
            ))}
          </div>

          <label className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            <input type="checkbox" name="permissionAccepted" className="mt-1" />
            <span>
              I confirm I own or am authorized to test this website. I allow
              safe same-origin GET/HEAD crawling only. No forms will be
              submitted and no private data will be stored.
            </span>
          </label>

          <button
            disabled={!verifiedScope}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Run attack surface discovery
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Routes" value={latest.route_count} />
            <StatCard label="API endpoints" value={latest.api_endpoint_count} />
            <StatCard label="Forms" value={latest.form_count} />
            <StatCard label="Inputs" value={latest.input_count} />
            <StatCard label="Risk signals" value={latest.risk_signal_count} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Scripts" value={latest.script_count} />
            <StatCard label="Parameters" value={latest.parameter_count} />
            <StatCard label="JS routes" value={latest.js_route_count} />
            <StatCard label="Blocked" value={latest.blocked_count} />
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
            <h3 className="text-2xl font-black text-blue-950">
              Latest discovery summary
            </h3>
            <p className="mt-3 max-w-3xl leading-7 text-blue-900">
              {latest.summary?.customerSummary ||
                "Attack surface inventory saved."}
            </p>
            <p className="mt-3 text-sm font-bold text-blue-800">
              Created {new Date(latest.created_at).toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <h3 className="text-2xl font-black text-red-950">
              Safety boundary
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "Same-origin only",
                "GET/HEAD only",
                "No form submission",
                "No POST/PUT/PATCH/DELETE",
                "No login attempt",
                "No exploit payloads",
                "No private body storage",
                "No credential/session storage",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">
              Discovered attack surface items
            </h3>
            <div className="mt-6 grid gap-4">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">{item.url}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.method || "OBSERVE"} ·{" "}
                          {item.status_code || "N/A"} ·{" "}
                          {item.content_type || "content-type unknown"}
                        </p>
                        {item.source_url ? (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            Source: {item.source_url}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${typeClass(item.item_type)}`}
                        >
                          {item.item_type}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${sensitivityClass(item.sensitivity)}`}
                        >
                          {item.sensitivity}
                        </span>
                      </div>
                    </div>

                    {item.risk_signal ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                        {item.risk_signal}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No attack surface items saved yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved discovery runs</h3>
            <div className="mt-6 grid gap-4">
              {inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">
                        {inventory.target_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(inventory.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {inventory.crawler_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">
            No attack surface discovery yet
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Run the crawler to generate route inventory, API surface,
            forms/inputs, parameters, scripts and JavaScript route evidence.
          </p>
        </div>
      )}
    </section>
  );
}
