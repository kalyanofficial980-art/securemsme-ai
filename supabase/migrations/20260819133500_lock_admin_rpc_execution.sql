begin;

revoke execute on function public.current_user_is_admin() from anon;
revoke execute on function public.admin_review_manual_payment_v2(uuid,text,text) from anon;
revoke execute on function public.admin_set_user_plan_v2(uuid,text,timestamptz,text) from anon;
revoke execute on function public.admin_update_support_request_v2(uuid,text,text) from anon;

revoke execute on function public.prevent_profile_privilege_self_update() from public, anon, authenticated;

grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.admin_review_manual_payment_v2(uuid,text,text) to authenticated;
grant execute on function public.admin_set_user_plan_v2(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.admin_update_support_request_v2(uuid,text,text) to authenticated;

commit;
