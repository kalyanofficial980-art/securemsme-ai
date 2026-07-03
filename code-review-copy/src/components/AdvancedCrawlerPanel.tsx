import { runAdvancedCrawlerAction } from "@/app/crawler/actions";

type CrawlerRun = {
  id: string;
  target_url: string;
  run_status: string;
  crawler_mode: string;
  authorization_status: string;
  max_pages: number;
  max_depth: number;
  discovered_url_count: number;
  crawled_page_count: number;
  skipped_url_count: number;
  blocked_url_count: number;
  form_count: number;
  login_surface_count: number;
  admin_surface_count: number;
  api_surface_count: number;
  checkout_surface_count: number;
  customer_data_surface_count: number;
  coverage_score: number;
  asset_risk_score: number;
  safe_summary: string;
  developer_summary: string;
  client_safe_summary: string;
  created_at: string;
};

type Asset = {
  id: string;
  asset_url: string;
  asset_type: string;
  http_status?: number | null;
  title?: string | null;
  discovery_source: string;
  depth: number;
  has_form: boolean;
  has_password_field: boolean;
  has_customer_data_field: boolean;
  has_payment_signal: boolean;
  has_admin_signal: boolean;
  has_api_signal: boolean;
  risk_tags: string[];
  asset_fingerprint: string;
  evidence_summary: string;
  developer_note: string;
  client_safe_note: string;
};

type FormItem = {
  id: string;
  page_url: string;
  method: string;
  action_url?: string | null;
  field_count: number;
  password_field_count: number;
  email_field_count: number;
  phone_field_count: number;
  payment_field_signal: boolean;
  customer_data_signal: boolean;
  csrf_signal: boolean;
  form_risk_level: string;
  evidence_summary: string;
  developer_note: string;
  safe_claim: string;
  blocked_claim: string;
};

type Edge = {
  id: string;
  from_url: string;
  to_url: string;
  relationship: string;
  is_same_origin: boolean;
};

type Event = {
  id: string;
  title: string;
  details: string;
  created_at: string;
};

function typeClass(type: string) {
  if (["admin", "login"].includes(type)) return "bg-red-100 text-red-950";
  if (["checkout", "payment", "api", "documentation"].includes(type))
    return "bg-amber-100 text-amber-950";
  if (["privacy", "contact"].includes(type))
    return "bg-emerald-100 text-emerald-950";
  return "bg-slate-100 text-slate-700";
}

function riskClass(risk: string) {
  if (risk === "High") return "bg-red-100 text-red-950";
  if (risk === "Medium") return "bg-amber-100 text-amber-950";
  return "bg-emerald-100 text-emerald-950";
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

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

export function AdvancedCrawlerPanel({
  scanId,
  targetUrl,
  runs,
  selectedRun,
  assets,
  forms,
  edges,
  events,
  message,
}: {
  scanId: string;
  targetUrl: string;
  runs: CrawlerRun[];
  selectedRun?: CrawlerRun | null;
  assets: Asset[];
  forms: FormItem[];
  edges: Edge[];
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
          Advanced Crawler + Asset Discovery v2
        </p>
        <h1 className="mt-2 text-4xl font-black text-blue-950">
          Safe Attack-Surface Inventory
        </h1>
        <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
          {targetUrl}
        </p>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          Discover same-origin assets, forms, login/admin/API/checkout surfaces
          and customer-data signals using safe GET-only crawling.
        </p>
      </div>

      <form
        action={runAdvancedCrawlerAction}
        className="rounded-3xl border border-slate-200 bg-white p-8"
      >
        <input type="hidden" name="scanId" value={scanId} />
        <h2 className="text-2xl font-black">Run advanced crawler</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          This crawler does not submit forms, does not login, does not brute
          force and does not run payloads.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <label className="font-bold">
            Mode
            <select
              name="crawlerMode"
              defaultValue="safe-standard"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="safe-light">Safe Light</option>
              <option value="safe-standard">Safe Standard</option>
              <option value="safe-deep">Safe Deep</option>
            </select>
          </label>

          <label className="font-bold">
            Max pages
            <input
              name="maxPages"
              defaultValue="25"
              type="number"
              min="1"
              max="75"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            />
          </label>

          <label className="font-bold">
            Max depth
            <input
              name="maxDepth"
              defaultValue="2"
              type="number"
              min="0"
              max="3"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
            />
          </label>

          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="permissionAccepted"
              value="yes"
              required
            />
            I confirm this website is authorized for safe crawling.
          </label>
        </div>

        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
          Run Advanced Crawler
        </button>
      </form>

      {selectedRun ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="Coverage score"
              value={`${selectedRun.coverage_score}/100`}
              helper={selectedRun.crawler_mode}
            />
            <Stat
              label="Asset risk score"
              value={`${selectedRun.asset_risk_score}/100`}
              helper="Surface complexity"
            />
            <Stat
              label="Assets crawled"
              value={selectedRun.crawled_page_count}
              helper={`${selectedRun.discovered_url_count} discovered`}
            />
            <Stat
              label="Forms"
              value={selectedRun.form_count}
              helper={`${selectedRun.customer_data_surface_count} customer-data signals`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Login" value={selectedRun.login_surface_count} />
            <Stat label="Admin" value={selectedRun.admin_surface_count} />
            <Stat label="API/docs" value={selectedRun.api_surface_count} />
            <Stat
              label="Checkout/payment"
              value={selectedRun.checkout_surface_count}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Selected crawler run
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {selectedRun.run_status}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {selectedRun.safe_summary}
                </p>
                <p className="mt-2 leading-7 text-slate-600">
                  {selectedRun.developer_summary}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-950">
                {selectedRun.authorization_status}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Discovered assets</h2>
            <div className="mt-6 grid gap-5">
              {assets.length ? (
                assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          depth {asset.depth} · {asset.discovery_source} ·
                          status {asset.http_status || "unknown"}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {asset.title || asset.asset_type}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {asset.asset_url}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${typeClass(asset.asset_type)}`}
                        >
                          {asset.asset_type}
                        </span>
                        {asset.risk_tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {asset.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <p className="font-black text-blue-950">
                          Developer note
                        </p>
                        <p className="mt-2 text-sm leading-6 text-blue-900">
                          {asset.developer_note}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="font-black text-emerald-950">
                          Client-safe note
                        </p>
                        <p className="mt-2 text-sm leading-6 text-emerald-900">
                          {asset.client_safe_note}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 break-all text-xs font-bold text-slate-500">
                      fingerprint: {shortHash(asset.asset_fingerprint)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No assets yet. Run advanced crawler first.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Form inventory</h2>
            <div className="mt-6 grid gap-5">
              {forms.length ? (
                forms.map((form) => (
                  <div
                    key={form.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {form.method} · {form.field_count} field(s)
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          Form on page
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {form.page_url}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${riskClass(form.form_risk_level)}`}
                      >
                        {form.form_risk_level}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Password: {form.password_field_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Email: {form.email_field_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        Phone: {form.phone_field_count}
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold">
                        CSRF signal: {form.csrf_signal ? "yes" : "no"}
                      </div>
                    </div>

                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
                      {form.evidence_summary}
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">
                        Safe claim: {form.safe_claim}
                      </div>
                      <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-900">
                        Blocked claim: {form.blocked_claim}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No forms discovered yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent crawler runs</h2>
          <div className="mt-6 grid gap-4">
            {runs.length ? (
              runs.map((run) => (
                <a
                  key={run.id}
                  href={`/report/${scanId}/advanced-crawler?run=${run.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {run.crawled_page_count} crawled · {run.form_count}{" "}
                        forms
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        coverage {run.coverage_score}/100 · risk{" "}
                        {run.asset_risk_score}/100
                      </p>
                    </div>
                    <span className="h-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {run.crawler_mode}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <p className="text-slate-600">No crawler runs yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Crawler events</h2>
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

      <details className="rounded-3xl border border-slate-200 bg-white p-8">
        <summary className="cursor-pointer text-2xl font-black">
          Link graph preview
        </summary>
        <div className="mt-6 grid gap-3">
          {edges.slice(0, 30).map((edge) => (
            <div key={edge.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black">{edge.relationship}</p>
              <p className="break-all text-slate-600">
                {edge.from_url} → {edge.to_url}
              </p>
            </div>
          ))}
          {!edges.length ? (
            <p className="text-slate-600">No link edges yet.</p>
          ) : null}
        </div>
      </details>
    </section>
  );
}
