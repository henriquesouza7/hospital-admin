alter table public.patients
  drop constraint patients_name_check;

alter table public.patients
  add constraint patients_name_check check (
    name = regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    and char_length(name) between 1 and 160
  );

create or replace function public.create_surgery_patient(p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  normalized_name text := nullif(
    regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if normalized_name is null or char_length(normalized_name) > 160 then
    raise exception 'Patient name is invalid' using errcode = '22023';
  end if;

  insert into public.patients (name) values (normalized_name) returning id into new_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_patient', new_id::text, 'created', jsonb_build_object('fields', jsonb_build_array('name')));
  return new_id;
end;
$$;

create or replace function public.update_surgery_patient(p_patient_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_name text := nullif(
    regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_patient_id is null or normalized_name is null or char_length(normalized_name) > 160 then
    raise exception 'Patient input is invalid' using errcode = '22023';
  end if;
  update public.patients set name = normalized_name, updated_at = now() where id = p_patient_id;
  if not found then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_patient', p_patient_id::text, 'updated', jsonb_build_object('fields', jsonb_build_array('name')));
  return true;
end;
$$;

create or replace function public.create_surgery_appointment(
  p_surgery_day_id uuid,
  p_patient_id uuid default null,
  p_patient_name text default null,
  p_status text default 'awaiting_confirmation'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  day_capacity integer;
  active_count integer;
  new_id uuid;
  selected_patient_id uuid := p_patient_id;
  normalized_name text := nullif(
    regexp_replace(p_patient_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_surgery_day_id is null
    or (p_patient_id is null and normalized_name is null)
    or (p_patient_id is not null and normalized_name is not null)
    or (normalized_name is not null and char_length(normalized_name) > 160)
    or p_status is null
    or p_status not in ('awaiting_confirmation', 'confirmed') then
    raise exception 'Appointment input is invalid' using errcode = '22023';
  end if;

  select day.capacity into day_capacity
  from public.surgery_days as day where day.id = p_surgery_day_id for update;
  if not found then
    raise exception 'Surgery day not found' using errcode = 'P0002';
  end if;
  select count(*)::integer into active_count
  from public.surgery_appointments as appointment
  where appointment.surgery_day_id = p_surgery_day_id
    and appointment.status in ('awaiting_confirmation', 'confirmed');
  if active_count >= day_capacity then
    raise exception 'No available capacity' using errcode = '23514';
  end if;

  if selected_patient_id is null then
    insert into public.patients (name) values (normalized_name)
    returning id into selected_patient_id;
    insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
    values (auth.user_id(), 'surgery_patient', selected_patient_id::text, 'created',
      jsonb_build_object('fields', jsonb_build_array('name')));
  end if;

  insert into public.surgery_appointments (surgery_day_id, patient_id, status)
  values (p_surgery_day_id, selected_patient_id, p_status) returning id into new_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_appointment', new_id::text, 'created',
    jsonb_build_object('surgery_day_id', p_surgery_day_id, 'patient_id', selected_patient_id, 'status', p_status));
  return new_id;
end;
$$;

create or replace function public.create_surgery_waitlist_entry(
  p_patient_id uuid default null,
  p_patient_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  selected_patient_id uuid := p_patient_id;
  normalized_name text := nullif(
    regexp_replace(p_patient_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if (p_patient_id is null and normalized_name is null)
    or (p_patient_id is not null and normalized_name is not null)
    or (normalized_name is not null and char_length(normalized_name) > 160) then
    raise exception 'Patient input is invalid' using errcode = '22023';
  end if;
  if selected_patient_id is null then
    insert into public.patients (name) values (normalized_name)
    returning id into selected_patient_id;
    insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
    values (auth.user_id(), 'surgery_patient', selected_patient_id::text, 'created',
      jsonb_build_object('fields', jsonb_build_array('name')));
  end if;
  insert into public.surgery_waitlist (patient_id) values (selected_patient_id) returning id into new_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_waitlist', new_id::text, 'created', jsonb_build_object('patient_id', selected_patient_id));
  return new_id;
end;
$$;

revoke all on function public.create_surgery_patient(text) from public;
revoke all on function public.update_surgery_patient(uuid, text) from public;
revoke all on function public.create_surgery_appointment(uuid, uuid, text, text) from public;
revoke all on function public.create_surgery_waitlist_entry(uuid, text) from public;

grant execute on function public.create_surgery_patient(text) to authenticated;
grant execute on function public.update_surgery_patient(uuid, text) to authenticated;
grant execute on function public.create_surgery_appointment(uuid, uuid, text, text) to authenticated;
grant execute on function public.create_surgery_waitlist_entry(uuid, text) to authenticated;
