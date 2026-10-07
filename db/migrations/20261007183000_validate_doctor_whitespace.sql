alter table public.doctors
  drop constraint doctors_name_valid;

alter table public.doctors
  add constraint doctors_name_valid check (
    name = regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    and char_length(name) between 1 and 160
  );

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

  normalized_name := regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
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

  normalized_name := regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
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

revoke all on function public.create_doctor(text) from public;
revoke all on function public.update_doctor(uuid, text) from public;
grant execute on function public.create_doctor(text) to authenticated;
grant execute on function public.update_doctor(uuid, text) to authenticated;
