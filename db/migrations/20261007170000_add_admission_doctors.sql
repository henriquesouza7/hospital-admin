create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from neon_auth."user" as auth_user
    cross join lateral unnest(string_to_array(coalesce(auth_user.role, ''), ',')) as assigned_role(value)
    where auth_user.id::text = auth.user_id()
      and btrim(assigned_role.value) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctors_name_valid check (
    name = btrim(name) and char_length(name) between 1 and 160
  )
);

create index doctors_name_idx on public.doctors (name);

create or replace function public.set_doctor_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_doctor_updated_at() from public, authenticated;

create trigger doctors_set_updated_at
before update on public.doctors
for each row execute function public.set_doctor_updated_at();

alter table public.doctors enable row level security;
revoke all on public.doctors from public;
grant select on public.doctors to authenticated;

create policy doctors_admin_select
  on public.doctors
  for select
  to authenticated
  using ((select public.is_admin()));

create or replace function public.create_doctor(p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_doctor_id uuid;
  normalized_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  normalized_name := btrim(p_name);
  if normalized_name is null or char_length(normalized_name) not between 1 and 160 then
    raise exception 'Doctor name is invalid' using errcode = '22023';
  end if;

  insert into public.doctors (name)
  values (normalized_name)
  returning id into new_doctor_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'doctor',
    new_doctor_id::text,
    'created',
    jsonb_build_object('name', normalized_name, 'active', true)
  );

  return new_doctor_id;
end;
$$;

create or replace function public.update_doctor(p_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_name text;
  normalized_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  normalized_name := btrim(p_name);
  if normalized_name is null or char_length(normalized_name) not between 1 and 160 then
    raise exception 'Doctor name is invalid' using errcode = '22023';
  end if;

  select doctor.name into current_name
  from public.doctors as doctor
  where doctor.id = p_id
  for update;

  if not found then
    return false;
  end if;

  if current_name = normalized_name then
    return true;
  end if;

  update public.doctors set name = normalized_name where id = p_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'doctor',
    p_id::text,
    'updated',
    jsonb_build_object(
      'name', jsonb_build_object('old', current_name, 'new', normalized_name)
    )
  );

  return true;
end;
$$;

create or replace function public.set_doctor_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_active boolean;
  audit_action text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_active is null then
    raise exception 'Doctor active state is invalid' using errcode = '22023';
  end if;

  select doctor.active into current_active
  from public.doctors as doctor
  where doctor.id = p_id
  for update;

  if not found then
    return false;
  end if;

  if current_active = p_active then
    return true;
  end if;

  update public.doctors set active = p_active where id = p_id;
  audit_action := case when p_active then 'activated' else 'deactivated' end;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'doctor',
    p_id::text,
    audit_action,
    jsonb_build_object(
      'active', jsonb_build_object('old', current_active, 'new', p_active)
    )
  );

  return true;
end;
$$;

revoke all on function public.create_doctor(text) from public;
revoke all on function public.update_doctor(uuid, text) from public;
revoke all on function public.set_doctor_active(uuid, boolean) from public;
grant execute on function public.create_doctor(text) to authenticated;
grant execute on function public.update_doctor(uuid, text) to authenticated;
grant execute on function public.set_doctor_active(uuid, boolean) to authenticated;
