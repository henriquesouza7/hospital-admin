create index if not exists audit_logs_created_at_id_idx
  on public.audit_logs (created_at desc, id desc);
