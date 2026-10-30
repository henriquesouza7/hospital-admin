-- QA ONLY: install temporarily on the verified isolated diagnostic branch.
-- Removes identity to exercise denial; never manufactures or grants identity.
create function public.qa_read_without_claims()
returns jsonb language plpgsql security invoker set search_path = pg_catalog
as $test$
begin
  perform set_config('request.jwt.claims', '', true);
  perform public.assert_admin_read_identity();
  raise exception 'Identity guard did not reject missing claims';
end;
$test$;
revoke all on function public.qa_read_without_claims() from public;
grant execute on function public.qa_read_without_claims() to authenticated;
