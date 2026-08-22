revoke execute on function public.record_scan_access_test_v1(uuid, text) from authenticated;
comment on function public.record_scan_access_test_v1(uuid, text) is 'Internal legacy helper. Customer execution revoked; Scan Access test status is persisted only through the Vercel OIDC trusted-write gateway.';
