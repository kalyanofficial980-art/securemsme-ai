begin;

-- These SECURITY DEFINER functions are trigger entrypoints only. They do not
-- need to be callable through PostgREST/RPC by anon or authenticated users.
revoke execute on function public.enforce_website_plan_resource_limits_v1() from public, anon, authenticated;
revoke execute on function public.prevent_admin_customer_website_write_v1() from public, anon, authenticated;
revoke execute on function public.prevent_admin_scan_quota_v1() from public, anon, authenticated;

commit;
