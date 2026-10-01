-- Transversal foundation for authenticated administrative users and future auditing.
-- No module-specific business tables belong in this migration.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Usuário',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  entity_type text not null check (char_length(trim(entity_type)) > 0),
  entity_id text,
  action text not null check (char_length(trim(action)) > 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuário')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users that existed before this migration ran.
insert into public.profiles (id, name)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', 'Usuário')
from auth.users as users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "audit_logs_select_own"
on public.audit_logs
for select
to authenticated
using (actor_id = (select auth.uid()));

-- Audit writes remain denied to client roles. Future modules will write through
-- a controlled server-side path or RPC executed with the required authorization.
