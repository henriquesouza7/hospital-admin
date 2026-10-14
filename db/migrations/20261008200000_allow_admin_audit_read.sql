-- Administrative audit can be read by administrators only. Writes remain controlled by module RPCs.
create policy audit_logs_admin_select
  on public.audit_logs
  for select
  to authenticated
  using ((select public.is_finance_admin()));

revoke insert, update, delete, truncate, references, trigger
  on table public.audit_logs from authenticated;
revoke all on table public.audit_logs from public;
grant select on table public.audit_logs to authenticated;
