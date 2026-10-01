-- Shared audit foundation for the Neon data layer.
-- Client inserts are intentionally unavailable; future modules will write through
-- a controlled server-side path or RPC.
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id text,
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id text,
  action text not null check (length(trim(action)) > 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.audit_logs enable row level security;

grant select on public.audit_logs to authenticated;

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
  on public.audit_logs
  for select
  to authenticated
  using ((select auth.user_id()) = actor_id);

-- There is deliberately no INSERT/UPDATE/DELETE policy for authenticated
-- clients. Server-side controlled writes will be introduced with the modules.
