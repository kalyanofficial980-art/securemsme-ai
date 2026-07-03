-- Client Portal Pro safe public token access.
-- Fixes broad anon SELECT policies by using one exact-token SECURITY DEFINER RPC.

drop policy if exists "anon read active portal pro link" on public.client_portal_pro_links_v2;
drop policy if exists "anon read active portal pro sections" on public.client_portal_pro_sections_v2;

create or replace function public.get_client_portal_pro_link(public_token text)
returns table (
  id uuid,
  target_url text,
  status text,
  executive_score integer,
  report_readiness_score integer,
  fix_progress_score integer,
  retest_pass_rate integer,
  client_readiness_score integer,
  portal_summary text,
  limitations_summary text,
  expires_at timestamptz,
  sections jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    l.id,
    l.target_url,
    l.status,
    l.executive_score,
    l.report_readiness_score,
    l.fix_progress_score,
    l.retest_pass_rate,
    l.client_readiness_score,
    l.portal_summary,
    l.limitations_summary,
    l.expires_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'section_type', s.section_type,
          'display_order', s.display_order,
          'status_label', s.status_label,
          'body', s.body,
          'evidence_summary', s.evidence_summary,
          'action_summary', s.action_summary,
          'blocked_claim', s.blocked_claim
        ) order by s.display_order
      ) filter (where s.id is not null),
      '[]'::jsonb
    ) as sections
  from public.client_portal_pro_links_v2 l
  left join public.client_portal_pro_sections_v2 s on s.link_id = l.id
  where l.share_token = public_token
    and l.status = 'active'
    and l.expires_at > now()
  group by l.id
  limit 1;
end;
$$;

revoke all on function public.get_client_portal_pro_link(text) from public;
grant execute on function public.get_client_portal_pro_link(text) to anon, authenticated;
