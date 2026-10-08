-- Use the same table-lock order as imports before acquiring doctor row locks.
alter table public.admission_entries
  add constraint admission_entries_supported_date_range
  check (entry_date between date '1900-01-01' and date '2100-12-31');

alter table public.admission_targets
  add constraint admission_targets_supported_year_range
  check (reference_period between date '1900-01-01' and date '2100-12-31');

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

create or replace function public.create_admission_entry(
  p_doctor_id uuid,
  p_entry_date date,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_entry_id uuid;
  doctor_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_doctor_id is null or p_entry_date is null
     or p_entry_date not between date '1900-01-01' and date '2100-12-31'
     or p_quantity is null or p_quantity < 0 then
    raise exception 'Admission entry is invalid' using errcode = '22023';
  end if;
  select active into doctor_active
    from public.doctors where id = p_doctor_id for update;
  if not found or not coalesce(doctor_active, false) then
    raise exception 'Active doctor not found' using errcode = '22023';
  end if;

  insert into public.admission_entries (doctor_id, entry_date, quantity)
  values (p_doctor_id, p_entry_date, p_quantity)
  returning id into new_entry_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(), 'admission_entry', new_entry_id::text, 'created',
    jsonb_build_object('doctor_id', p_doctor_id, 'entry_date', p_entry_date, 'quantity', p_quantity)
  );
  return new_entry_id;
end;
$$;

create or replace function public.create_admission_target(
  p_period_type text,
  p_reference_period date,
  p_target_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_target_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_period_type is null or p_period_type not in ('month', 'year')
     or p_reference_period is null
     or extract(year from p_reference_period) not between 1900 and 2100
     or p_target_quantity is null or p_target_quantity < 0
     or (p_period_type = 'month' and extract(day from p_reference_period) <> 1)
     or (p_period_type = 'year' and (extract(month from p_reference_period) <> 1 or extract(day from p_reference_period) <> 1)) then
    raise exception 'Admission target is invalid' using errcode = '22023';
  end if;

  insert into public.admission_targets (period_type, reference_period, target_quantity)
  values (p_period_type, p_reference_period, p_target_quantity)
  returning id into new_target_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(), 'admission_target', new_target_id::text, 'created',
    jsonb_build_object('period_type', p_period_type, 'reference_period', p_reference_period, 'target_quantity', p_target_quantity)
  );
  return new_target_id;
end;
$$;

create or replace function public.import_admission_entries(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  entry_row jsonb;
  resolved_doctor_id uuid;
  resolved_doctor_active boolean;
  match_count integer;
  entry_id uuid;
  import_id uuid := gen_random_uuid();
  imported_count integer := 0;
  normalized_doctor_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Admission import rows are invalid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 1000 then
    raise exception 'Admission import rows are invalid' using errcode = '22023';
  end if;

  -- Serialize with doctor mutations before any per-doctor row lock is taken.
  lock table public.doctors in share row exclusive mode;

  for entry_row in select value from jsonb_array_elements(p_rows) as import_row(value)
  loop
    if jsonb_typeof(entry_row) <> 'object'
       or coalesce(entry_row->>'entry_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or coalesce(entry_row->>'quantity', '') !~ '^[0-9]{1,10}$' then
      raise exception 'Admission import row is invalid' using errcode = '22023';
    end if;
    if (entry_row->>'entry_date')::date not between date '1900-01-01' and date '2100-12-31' then
      raise exception 'Admission import date is outside the supported range' using errcode = '22023';
    end if;
    if (entry_row->>'quantity')::numeric > 2147483647 then
      raise exception 'Admission import quantity is out of range' using errcode = '22023';
    end if;
    normalized_doctor_name := regexp_replace(entry_row->>'doctor_name', '^[[:space:]]+|[[:space:]]+$', '', 'g');
    if normalized_doctor_name is null or normalized_doctor_name = '' then
      raise exception 'Admission import doctor is invalid' using errcode = '22023';
    end if;

    select count(*), (array_agg(id))[1]
      into match_count, resolved_doctor_id
      from public.doctors
      where lower(regexp_replace(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(normalized_doctor_name, '[[:space:]]+', ' ', 'g'));
    if match_count <> 1 then
      raise exception 'Admission import doctor is missing or ambiguous' using errcode = '22023';
    end if;
    select active, name into resolved_doctor_active, normalized_doctor_name
      from public.doctors where id = resolved_doctor_id for update;
    if not coalesce(resolved_doctor_active, false)
       or lower(regexp_replace(regexp_replace(normalized_doctor_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '[[:space:]]+', ' ', 'g'))
          <> lower(regexp_replace(regexp_replace(entry_row->>'doctor_name', '^[[:space:]]+|[[:space:]]+$', '', 'g'), '[[:space:]]+', ' ', 'g')) then
      raise exception 'Admission import doctor is missing, ambiguous, or inactive' using errcode = '22023';
    end if;

    insert into public.admission_entries (doctor_id, entry_date, quantity)
    values (resolved_doctor_id, (entry_row->>'entry_date')::date, (entry_row->>'quantity')::integer)
    returning id into entry_id;
    insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
    values (
      auth.user_id(), 'admission_entry', entry_id::text, 'created',
      jsonb_build_object('doctor_id', resolved_doctor_id, 'entry_date', (entry_row->>'entry_date')::date,
        'quantity', (entry_row->>'quantity')::integer, 'import_id', import_id)
    );
    imported_count := imported_count + 1;
  end loop;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'admission_import', import_id::text, 'imported', jsonb_build_object('count', imported_count));
  return imported_count;
end;
$$;
