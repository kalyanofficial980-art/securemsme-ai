-- Mega Part 29: CVE Intelligence + Technology Risk Database

create extension if not exists pgcrypto;

create table if not exists public.technology_risk_rules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  technology_name text not null,
  technology_family text not null default 'Web Technology',
  ecosystem text not null default 'web',
  risk_category text not null default 'Technology Risk',
  default_severity text not null default 'Medium',
  customer_summary text not null,
  developer_guidance text not null,
  version_required_for_cve_certainty boolean not null default true,
  safe_claim text not null,
  blocked_claim text not null,
  evidence_hints jsonb not null default '[]'::jsonb,
  recommended_action text not null default 'Keep this technology updated and validate exact versions before making CVE claims.',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cve_insight_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  technology_name text not null,
  technology_family text not null default 'Web Technology',
  detected_version text,
  version_confidence text not null default 'Unknown',
  risk_title text not null,
  risk_category text not null default 'Technology Risk',
  severity text not null default 'Medium',
  confidence text not null default 'Medium',
  status text not null default 'technology-risk-signal',

  evidence jsonb not null default '[]'::jsonb,
  customer_explanation text not null,
  developer_recommendation text not null,
  safe_claim text not null,
  blocked_claim text not null,
  cve_certainty_rule text not null default 'No exact version means no CVE certainty.',
  created_at timestamptz not null default now()
);

create index if not exists technology_risk_rules_slug_idx
  on public.technology_risk_rules(slug);

create index if not exists technology_risk_rules_technology_name_idx
  on public.technology_risk_rules(technology_name);

create index if not exists cve_insight_records_user_id_idx
  on public.cve_insight_records(user_id);

create index if not exists cve_insight_records_website_id_idx
  on public.cve_insight_records(website_id);

create index if not exists cve_insight_records_scan_id_idx
  on public.cve_insight_records(scan_id);

alter table public.technology_risk_rules enable row level security;
alter table public.cve_insight_records enable row level security;

drop policy if exists "Authenticated users can read active technology risk rules" on public.technology_risk_rules;
create policy "Authenticated users can read active technology risk rules"
on public.technology_risk_rules
for select
to authenticated
using (is_active = true);

drop policy if exists "Users can read own CVE insight records" on public.cve_insight_records;
create policy "Users can read own CVE insight records"
on public.cve_insight_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own CVE insight records" on public.cve_insight_records;
create policy "Users can insert own CVE insight records"
on public.cve_insight_records
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_technology_risk_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_technology_risk_rules_updated_at on public.technology_risk_rules;
create trigger set_technology_risk_rules_updated_at
before update on public.technology_risk_rules
for each row
execute function public.set_technology_risk_rules_updated_at();

insert into public.technology_risk_rules (
  slug,
  technology_name,
  technology_family,
  ecosystem,
  risk_category,
  default_severity,
  customer_summary,
  developer_guidance,
  version_required_for_cve_certainty,
  safe_claim,
  blocked_claim,
  evidence_hints,
  recommended_action
)
values
(
  'wordpress-core-risk',
  'WordPress',
  'CMS',
  'php-cms',
  'CMS Security',
  'Medium',
  'WordPress is widely used and must be kept updated with secure plugins and themes.',
  'Confirm WordPress core, theme, and plugin versions. Update outdated components and remove unused plugins.',
  true,
  'Can claim WordPress technology was detected and should be kept updated.',
  'Cannot claim a specific WordPress CVE applies unless exact affected version and component are verified.',
  '["wordpress","wp-content","wp-json","wp-admin"]'::jsonb,
  'Update WordPress core, themes, and plugins. Disable unused plugins and enforce strong admin security.'
),
(
  'woocommerce-risk',
  'WooCommerce',
  'Ecommerce Plugin',
  'wordpress-plugin',
  'Ecommerce Security',
  'Medium',
  'WooCommerce powers online stores and should be updated carefully because it handles customer/order workflows.',
  'Confirm WooCommerce version, payment plugin versions, and checkout-related extensions. Update and test in staging.',
  true,
  'Can claim WooCommerce/store technology was detected and needs careful update management.',
  'Cannot claim payment compromise or order data exposure without authorized evidence.',
  '["woocommerce","wc-","checkout","cart"]'::jsonb,
  'Keep WooCommerce and payment extensions updated. Review checkout security, admin MFA, and backups.'
),
(
  'php-risk',
  'PHP',
  'Runtime',
  'server-runtime',
  'Runtime Security',
  'Medium',
  'PHP runtime exposure can matter when versions are old or server headers reveal unnecessary details.',
  'Confirm PHP version from hosting panel or server configuration. Upgrade unsupported versions and hide version banners.',
  true,
  'Can claim PHP/runtime signals were detected if public evidence supports it.',
  'Cannot claim a specific PHP CVE applies without exact version validation.',
  '["php","x-powered-by","php/","set-cookie"]'::jsonb,
  'Use supported PHP versions, keep frameworks updated, and hide unnecessary X-Powered-By headers.'
),
(
  'apache-risk',
  'Apache',
  'Web Server',
  'server',
  'Server Security',
  'Low',
  'Apache server signals should be managed carefully and kept updated by hosting/server administrators.',
  'Confirm Apache version and server modules. Patch server packages and reduce verbose banners.',
  true,
  'Can claim Apache server signal was observed if evidence supports it.',
  'Cannot claim Apache vulnerability exploitation without version and exploit validation.',
  '["apache","server: apache"]'::jsonb,
  'Patch server packages, reduce version banners, and apply hardened web server configuration.'
),
(
  'nginx-risk',
  'nginx',
  'Web Server',
  'server',
  'Server Security',
  'Low',
  'nginx server signals should be managed carefully and kept updated by hosting/server administrators.',
  'Confirm nginx version and server configuration. Patch server packages and reduce verbose banners.',
  true,
  'Can claim nginx server signal was observed if evidence supports it.',
  'Cannot claim nginx vulnerability exploitation without version and exploit validation.',
  '["nginx","server: nginx"]'::jsonb,
  'Patch server packages, reduce version banners, and apply hardened web server configuration.'
),
(
  'nextjs-risk',
  'Next.js',
  'JavaScript Framework',
  'javascript',
  'Framework Security',
  'Medium',
  'Next.js applications should be kept updated because framework and middleware behavior changes over time.',
  'Confirm exact Next.js version from package lock or deployment metadata. Update framework and review middleware/security headers.',
  true,
  'Can claim Next.js signals were detected if public evidence supports it.',
  'Cannot claim a specific Next.js CVE applies without exact version validation.',
  '["next.js","__next","x-nextjs","next"]'::jsonb,
  'Keep Next.js updated, review middleware, validate security headers, and avoid exposing build/debug details.'
),
(
  'react-risk',
  'React',
  'JavaScript Library',
  'javascript',
  'Frontend Security',
  'Low',
  'React itself is usually one part of the frontend stack; risk depends on exact versions and application code.',
  'Confirm package versions and update dependencies. Review unsafe HTML rendering and third-party script usage.',
  true,
  'Can claim React/frontend technology signal was detected if evidence supports it.',
  'Cannot claim frontend exploitability from React detection alone.',
  '["react","react-dom","data-reactroot"]'::jsonb,
  'Keep frontend dependencies updated and review third-party scripts and unsafe rendering patterns.'
),
(
  'laravel-risk',
  'Laravel',
  'PHP Framework',
  'php-framework',
  'Framework Security',
  'Medium',
  'Laravel applications should be kept updated and configured securely, especially environment/debug settings.',
  'Confirm Laravel version and environment settings. Disable debug mode, protect .env, and update framework/dependencies.',
  true,
  'Can claim Laravel signals were detected if public evidence supports it.',
  'Cannot claim Laravel CVE applicability without exact version and component validation.',
  '["laravel","x-powered-by","csrf-token","/vendor"]'::jsonb,
  'Update Laravel and dependencies, protect environment files, disable debug in production, and rotate exposed secrets if any.'
),
(
  'shopify-risk',
  'Shopify',
  'Hosted Commerce Platform',
  'hosted-commerce',
  'Hosted Platform Security',
  'Low',
  'Shopify is hosted, but store risk can still come from themes, apps, scripts, and domain/email setup.',
  'Review installed apps, custom theme code, storefront scripts, and domain/email security settings.',
  false,
  'Can claim Shopify/storefront signals were detected and app/theme hygiene should be reviewed.',
  'Cannot claim Shopify platform vulnerability from storefront detection alone.',
  '["shopify","myshopify","cdn.shopify","shopify-section"]'::jsonb,
  'Review third-party apps, theme customizations, storefront scripts, and account/admin security.'
)
on conflict (slug) do update
set
  technology_name = excluded.technology_name,
  technology_family = excluded.technology_family,
  ecosystem = excluded.ecosystem,
  risk_category = excluded.risk_category,
  default_severity = excluded.default_severity,
  customer_summary = excluded.customer_summary,
  developer_guidance = excluded.developer_guidance,
  version_required_for_cve_certainty = excluded.version_required_for_cve_certainty,
  safe_claim = excluded.safe_claim,
  blocked_claim = excluded.blocked_claim,
  evidence_hints = excluded.evidence_hints,
  recommended_action = excluded.recommended_action,
  is_active = true;
