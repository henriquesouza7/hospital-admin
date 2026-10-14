-- Remove the legacy permissive policy that let every authenticated actor read own audit payloads.
drop policy if exists "audit_logs_select_own" on public.audit_logs;
