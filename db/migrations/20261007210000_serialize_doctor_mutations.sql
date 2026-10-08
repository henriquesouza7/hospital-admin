-- Use the same table-lock order as imports before acquiring doctor row locks.
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

  lock table public.doctors in share row exclusive mode;

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

  lock table public.doctors in share row exclusive mode;

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

  lock table public.doctors in share row exclusive mode;

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
