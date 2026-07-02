-- Mega Part 54: Advanced Finding Taxonomy + 99% Accuracy Foundation
-- Defensive accuracy system for confirmed findings, false-positive control and expert validation.

create extension if not exists pgcrypto;

create table if not exists public.finding_taxonomy_rules (
  id uuid primary key default gen_random_uuid(),

  taxonomy_key text not null unique,
  category text not null,
  subcategory text not null,
  title text not null,
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_domain text not null default 'website-security'
    check (risk_domain in (
      'website-security',
      'customer-data-protection',
      'browser-security',
      'api-security',
      'cms-ecommerce',
      'authentication-session',
      'privacy-trust',
      'infrastructure-exposure',
      'monitoring'
    )),

  owasp_mapping text,
  cwe_mapping text,
  business_impact_template text not null default '',
  developer_fix_template text not null default '',
  retest_template text not null default '',

  minimum_evidence_count integer not null default 1 check (minimum_evidence_count >= 1 and minimum_evidence_count <= 5),
  required_evidence_types text[] not null default array[]::text[],
  confirmation_rules jsonb not null default '{}'::jsonb,

  client_safe_claim_template text not null default '',
  blocked_claim_template text not null default '',
  default_false_positive_risk text not null default 'Medium'
    check (default_false_positive_risk in ('Low', 'Medium', 'High')),
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finding_accuracy_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,
  workspace_id uuid references public.security_review_workspaces(id) on delete cascade,

  source_type text not null default 'vulnerability_bug_finding'
    check (source_type in ('vulnerability_bug_finding', 'security_review_bug_item', 'manual_finding', 'report_finding')),
  source_id uuid,

  taxonomy_key text,
  category text not null default 'Unclassified',
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),

  accuracy_status text not null default 'potential'
    check (accuracy_status in ('confirmed', 'high-confidence', 'potential', 'needs-manual-review', 'false-positive', 'accepted-risk')),
  confidence_score integer not null default 50 check (confidence_score >= 0 and confidence_score <= 100),
  false_positive_risk text not null default 'Medium'
    check (false_positive_risk in ('Low', 'Medium', 'High')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  required_evidence_met boolean not null default false,
  evidence_quality text not null default 'partial'
    check (evidence_quality in ('strong', 'good', 'partial', 'weak', 'missing')),

  accuracy_reason text not null default '',
  client_safe_claim text not null default '',
  blocked_claim text not null default '',
  validation_notes text not null default '',

  needs_expert_review boolean not null default true,
  expert_review_status text not null default 'queued'
    check (expert_review_status in ('queued', 'approved', 'downgraded', 'rejected-false-positive', 'accepted-risk', 'not-needed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finding_evidence_requirements (
  id uuid primary key default gen_random_uuid(),

  taxonomy_key text not null references public.finding_taxonomy_rules(taxonomy_key) on delete cascade,
  evidence_type text not null,
  label text not null,
  description text not null,
  is_required boolean not null default true,
  weight integer not null default 20 check (weight >= 0 and weight <= 100),

  created_at timestamptz not null default now()
);

create table if not exists public.finding_validation_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.finding_accuracy_assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,

  decision text not null
    check (decision in ('confirmed', 'high-confidence', 'potential', 'needs-manual-review', 'false-positive', 'accepted-risk')),
  previous_status text,
  new_status text not null,
  reviewer_note text not null default '',
  evidence_note text not null default '',
  confidence_score_before integer check (confidence_score_before >= 0 and confidence_score_before <= 100),
  confidence_score_after integer check (confidence_score_after >= 0 and confidence_score_after <= 100),

  created_at timestamptz not null default now()
);

create table if not exists public.finding_accuracy_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  metric_date date not null default current_date,
  total_assessments integer not null default 0,
  confirmed_count integer not null default 0,
  high_confidence_count integer not null default 0,
  potential_count integer not null default 0,
  needs_review_count integer not null default 0,
  false_positive_count integer not null default 0,
  accepted_risk_count integer not null default 0,

  confirmed_accuracy_target integer not null default 99,
  estimated_confirmed_accuracy numeric(5,2) not null default 0,
  false_positive_rate numeric(5,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, organization_id, metric_date)
);

create index if not exists finding_taxonomy_rules_key_idx on public.finding_taxonomy_rules(taxonomy_key);
create index if not exists finding_taxonomy_rules_category_idx on public.finding_taxonomy_rules(category);
create index if not exists finding_taxonomy_rules_risk_domain_idx on public.finding_taxonomy_rules(risk_domain);

create index if not exists finding_accuracy_assessments_user_id_idx on public.finding_accuracy_assessments(user_id);
create index if not exists finding_accuracy_assessments_scan_id_idx on public.finding_accuracy_assessments(scan_id);
create index if not exists finding_accuracy_assessments_workspace_id_idx on public.finding_accuracy_assessments(workspace_id);
create index if not exists finding_accuracy_assessments_source_idx on public.finding_accuracy_assessments(source_type, source_id);
create index if not exists finding_accuracy_assessments_status_idx on public.finding_accuracy_assessments(accuracy_status);
create index if not exists finding_accuracy_assessments_expert_idx on public.finding_accuracy_assessments(needs_expert_review, expert_review_status);

create index if not exists finding_validation_reviews_assessment_id_idx on public.finding_validation_reviews(assessment_id);
create index if not exists finding_accuracy_metrics_user_date_idx on public.finding_accuracy_metrics(user_id, metric_date desc);

alter table public.finding_taxonomy_rules enable row level security;
alter table public.finding_accuracy_assessments enable row level security;
alter table public.finding_evidence_requirements enable row level security;
alter table public.finding_validation_reviews enable row level security;
alter table public.finding_accuracy_metrics enable row level security;

drop policy if exists "Authenticated users can read active taxonomy rules" on public.finding_taxonomy_rules;
create policy "Authenticated users can read active taxonomy rules"
on public.finding_taxonomy_rules
for select
to authenticated
using (is_active = true or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can manage taxonomy rules" on public.finding_taxonomy_rules;
create policy "Admins can manage taxonomy rules"
on public.finding_taxonomy_rules
for all
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Authenticated users can read taxonomy evidence requirements" on public.finding_evidence_requirements;
create policy "Authenticated users can read taxonomy evidence requirements"
on public.finding_evidence_requirements
for select
to authenticated
using (true);

drop policy if exists "Admins can manage evidence requirements" on public.finding_evidence_requirements;
create policy "Admins can manage evidence requirements"
on public.finding_evidence_requirements
for all
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own accuracy assessments" on public.finding_accuracy_assessments;
create policy "Users can read own accuracy assessments"
on public.finding_accuracy_assessments
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own accuracy assessments" on public.finding_accuracy_assessments;
create policy "Users can insert own accuracy assessments"
on public.finding_accuracy_assessments
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can update own accuracy assessments" on public.finding_accuracy_assessments;
create policy "Users can update own accuracy assessments"
on public.finding_accuracy_assessments
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own validation reviews" on public.finding_validation_reviews;
create policy "Users can read own validation reviews"
on public.finding_validation_reviews
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert validation reviews" on public.finding_validation_reviews;
create policy "Users can insert validation reviews"
on public.finding_validation_reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own accuracy metrics" on public.finding_accuracy_metrics;
create policy "Users can read own accuracy metrics"
on public.finding_accuracy_metrics
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can upsert own accuracy metrics" on public.finding_accuracy_metrics;
create policy "Users can upsert own accuracy metrics"
on public.finding_accuracy_metrics
for all
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create or replace function public.touch_accuracy_foundation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_finding_taxonomy_rules_updated_at on public.finding_taxonomy_rules;
create trigger touch_finding_taxonomy_rules_updated_at
before update on public.finding_taxonomy_rules
for each row
execute function public.touch_accuracy_foundation_updated_at();

drop trigger if exists touch_finding_accuracy_assessments_updated_at on public.finding_accuracy_assessments;
create trigger touch_finding_accuracy_assessments_updated_at
before update on public.finding_accuracy_assessments
for each row
execute function public.touch_accuracy_foundation_updated_at();

drop trigger if exists touch_finding_accuracy_metrics_updated_at on public.finding_accuracy_metrics;
create trigger touch_finding_accuracy_metrics_updated_at
before update on public.finding_accuracy_metrics
for each row
execute function public.touch_accuracy_foundation_updated_at();

create or replace function public.recalculate_finding_accuracy_metrics(p_user_id uuid, p_organization_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_confirmed integer;
  v_high integer;
  v_potential integer;
  v_needs_review integer;
  v_false_positive integer;
  v_accepted integer;
  v_false_positive_rate numeric(5,2);
  v_estimated_accuracy numeric(5,2);
begin
  select
    count(*),
    count(*) filter (where accuracy_status = 'confirmed'),
    count(*) filter (where accuracy_status = 'high-confidence'),
    count(*) filter (where accuracy_status = 'potential'),
    count(*) filter (where accuracy_status = 'needs-manual-review'),
    count(*) filter (where accuracy_status = 'false-positive'),
    count(*) filter (where accuracy_status = 'accepted-risk')
  into
    v_total, v_confirmed, v_high, v_potential, v_needs_review, v_false_positive, v_accepted
  from public.finding_accuracy_assessments
  where user_id = p_user_id
  and (p_organization_id is null or organization_id = p_organization_id);

  if coalesce(v_total, 0) = 0 then
    v_false_positive_rate := 0;
    v_estimated_accuracy := 0;
  else
    v_false_positive_rate := round((coalesce(v_false_positive, 0)::numeric / v_total::numeric) * 100, 2);
    if (coalesce(v_confirmed, 0) + coalesce(v_false_positive, 0)) = 0 then
      v_estimated_accuracy := 0;
    else
      v_estimated_accuracy := round((coalesce(v_confirmed, 0)::numeric / (coalesce(v_confirmed, 0) + coalesce(v_false_positive, 0))::numeric) * 100, 2);
    end if;
  end if;

  insert into public.finding_accuracy_metrics (
    user_id,
    organization_id,
    metric_date,
    total_assessments,
    confirmed_count,
    high_confidence_count,
    potential_count,
    needs_review_count,
    false_positive_count,
    accepted_risk_count,
    estimated_confirmed_accuracy,
    false_positive_rate
  )
  values (
    p_user_id,
    p_organization_id,
    current_date,
    coalesce(v_total, 0),
    coalesce(v_confirmed, 0),
    coalesce(v_high, 0),
    coalesce(v_potential, 0),
    coalesce(v_needs_review, 0),
    coalesce(v_false_positive, 0),
    coalesce(v_accepted, 0),
    v_estimated_accuracy,
    v_false_positive_rate
  )
  on conflict (user_id, organization_id, metric_date)
  do update set
    total_assessments = excluded.total_assessments,
    confirmed_count = excluded.confirmed_count,
    high_confidence_count = excluded.high_confidence_count,
    potential_count = excluded.potential_count,
    needs_review_count = excluded.needs_review_count,
    false_positive_count = excluded.false_positive_count,
    accepted_risk_count = excluded.accepted_risk_count,
    estimated_confirmed_accuracy = excluded.estimated_confirmed_accuracy,
    false_positive_rate = excluded.false_positive_rate,
    updated_at = now();
end;
$$;

insert into public.finding_taxonomy_rules (
  taxonomy_key,
  category,
  subcategory,
  title,
  severity,
  risk_domain,
  owasp_mapping,
  cwe_mapping,
  business_impact_template,
  developer_fix_template,
  retest_template,
  minimum_evidence_count,
  required_evidence_types,
  client_safe_claim_template,
  blocked_claim_template,
  default_false_positive_risk
)
values
  (
    'missing-csp',
    'Browser Security',
    'Security Headers',
    'Content Security Policy is missing',
    'High',
    'browser-security',
    'OWASP Security Misconfiguration',
    'CWE-693',
    'Missing CSP can increase impact if browser-side injection exists.',
    'Add a restrictive Content-Security-Policy header and avoid unsafe directives.',
    'Reload the page and confirm CSP is present with safe policy.',
    1,
    array['missing-header'],
    'Content Security Policy was not observed on the reviewed response.',
    'Do not claim XSS or exploitation from missing CSP alone.',
    'Low'
  ),
  (
    'weak-csp',
    'Browser Security',
    'Security Headers',
    'Content Security Policy is weak',
    'Medium',
    'browser-security',
    'OWASP Security Misconfiguration',
    'CWE-693',
    'Weak CSP reduces browser-side protection.',
    'Remove unsafe-inline, unsafe-eval and broad wildcards where possible.',
    'Reload page and confirm CSP no longer contains risky directives.',
    1,
    array['weak-header'],
    'CSP exists but includes directives that need hardening.',
    'Do not claim exploitation from weak CSP alone.',
    'Medium'
  ),
  (
    'missing-hsts',
    'Transport Security',
    'HTTPS Hardening',
    'HSTS is missing',
    'Medium',
    'website-security',
    'OWASP Security Misconfiguration',
    'CWE-319',
    'Users may be less protected against downgrade or insecure first-visit scenarios.',
    'Add Strict-Transport-Security after confirming HTTPS works correctly.',
    'Confirm Strict-Transport-Security is present on HTTPS responses.',
    1,
    array['missing-header'],
    'HSTS was not observed on the HTTPS response.',
    'Do not claim traffic interception occurred.',
    'Low'
  ),
  (
    'cookie-security-flags-missing',
    'Authentication & Session',
    'Cookie Security',
    'Cookie security flags need review',
    'Medium',
    'authentication-session',
    'OWASP Identification and Authentication Failures',
    'CWE-614',
    'Weak cookie flags can increase session risk if the cookie is security-sensitive.',
    'Set Secure, HttpOnly and SameSite on session cookies.',
    'Use an authorized test session and confirm cookie flags are present.',
    1,
    array['cookie-header-observation'],
    'Cookie flags need review because common security flags were missing or unclear.',
    'Do not claim session hijacking occurred from cookie flags alone.',
    'Medium'
  ),
  (
    'cors-wildcard-credentials',
    'API Security',
    'CORS',
    'Potentially unsafe CORS policy signal',
    'High',
    'api-security',
    'OWASP API Security Misconfiguration',
    'CWE-942',
    'Unsafe CORS can expose authenticated data in some contexts.',
    'Restrict Access-Control-Allow-Origin to trusted domains and avoid wildcard credentials.',
    'Confirm CORS only allows trusted origins and credentials are controlled.',
    2,
    array['header-observation', 'credential-signal'],
    'A potentially unsafe CORS header combination was observed.',
    'Do not claim account data leaked without authenticated validation.',
    'Medium'
  ),
  (
    'public-form-data-risk-review',
    'Customer Data Protection',
    'Forms',
    'Public form collects customer data and needs protection review',
    'Medium',
    'customer-data-protection',
    'OWASP Security Misconfiguration',
    null,
    'Weak form handling can create privacy, spam and trust risks.',
    'Use HTTPS, server-side validation, CSRF/spam protection and clear privacy notice.',
    'Review the form page and backend handling after fixes.',
    1,
    array['html-signal'],
    'A public customer-data form signal was observed and should be reviewed.',
    'Do not claim form data is leaking unless leakage is verified with authorization.',
    'Low'
  ),
  (
    'sensitive-public-path',
    'Information Exposure',
    'Public Sensitive Path',
    'Potential sensitive path is publicly accessible',
    'High',
    'infrastructure-exposure',
    'OWASP Security Misconfiguration',
    'CWE-200',
    'Public sensitive/debug/backup paths can be serious if they expose secrets or data.',
    'Remove sensitive files from web root, block access and rotate secrets if exposure is confirmed.',
    'Confirm the path returns 403/404 or requires proper authentication.',
    2,
    array['safe-path-check', 'manual-content-verification'],
    'A potentially sensitive path returned a public response and needs manual verification.',
    'Do not claim secrets were viewed or stolen unless content is manually verified with authorization.',
    'High'
  )
on conflict (taxonomy_key) do update set
  category = excluded.category,
  subcategory = excluded.subcategory,
  title = excluded.title,
  severity = excluded.severity,
  risk_domain = excluded.risk_domain,
  owasp_mapping = excluded.owasp_mapping,
  cwe_mapping = excluded.cwe_mapping,
  business_impact_template = excluded.business_impact_template,
  developer_fix_template = excluded.developer_fix_template,
  retest_template = excluded.retest_template,
  minimum_evidence_count = excluded.minimum_evidence_count,
  required_evidence_types = excluded.required_evidence_types,
  client_safe_claim_template = excluded.client_safe_claim_template,
  blocked_claim_template = excluded.blocked_claim_template,
  default_false_positive_risk = excluded.default_false_positive_risk,
  updated_at = now();

insert into public.finding_evidence_requirements (taxonomy_key, evidence_type, label, description, is_required, weight)
values
  ('missing-csp', 'missing-header', 'Missing CSP header', 'Content-Security-Policy header is not present on the response.', true, 80),
  ('weak-csp', 'weak-header', 'Weak CSP directive', 'CSP contains unsafe-inline, unsafe-eval or wildcard directive.', true, 70),
  ('missing-hsts', 'missing-header', 'Missing HSTS header', 'Strict-Transport-Security header is not present on HTTPS response.', true, 80),
  ('cookie-security-flags-missing', 'cookie-header-observation', 'Cookie flag observation', 'Set-Cookie header is observed without all common security flags.', true, 60),
  ('cors-wildcard-credentials', 'header-observation', 'CORS header observation', 'CORS origin and credentials headers were observed.', true, 50),
  ('cors-wildcard-credentials', 'credential-signal', 'Credential signal', 'Access-Control-Allow-Credentials was observed with risky origin configuration.', true, 50),
  ('public-form-data-risk-review', 'html-signal', 'Public form signal', 'Form or customer-data input signal observed in HTML.', true, 70),
  ('sensitive-public-path', 'safe-path-check', 'Public path status', 'Sensitive-looking path returned public HTTP success status.', true, 50),
  ('sensitive-public-path', 'manual-content-verification', 'Manual content verification', 'Authorized reviewer verified whether response content is actually sensitive.', true, 50)
on conflict do nothing;
