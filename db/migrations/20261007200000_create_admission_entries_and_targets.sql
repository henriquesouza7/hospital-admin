create table public.admission_entries (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  entry_date date not null,
  quantity integer not null check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admission_entries_doctor_date_unique unique (doctor_id, entry_date)
);

create index admission_entries_entry_date_idx
  on public.admission_entries (entry_date desc);

create table public.admission_targets (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('month', 'year')),
  reference_period date not null,
  target_quantity integer not null check (target_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admission_targets_period_start check (
    (period_type = 'month' and extract(day from reference_period) = 1)
    or (period_type = 'year' and extract(month from reference_period) = 1 and extract(day from reference_period) = 1)
  ),
  constraint admission_targets_period_unique unique (period_type, reference_period)
);

create or replace function public.set_admission_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_admission_updated_at() from public, authenticated;

create trigger admission_entries_set_updated_at
before update on public.admission_entries
for each row execute function public.set_admission_updated_at();

create trigger admission_targets_set_updated_at
before update on public.admission_targets
for each row execute function public.set_admission_updated_at();

alter table public.admission_entries enable row level security;
alter table public.admission_targets enable row level security;
revoke all on public.admission_entries, public.admission_targets from public, anon, authenticated;
grant select on public.admission_entries, public.admission_targets to authenticated;

create policy admission_entries_admin_select
  on public.admission_entries for select to authenticated
  using ((select public.is_admin()));

create policy admission_targets_admin_select
  on public.admission_targets for select to authenticated
  using ((select public.is_admin()));

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
  if p_doctor_id is null or p_entry_date is null or p_quantity is null or p_quantity < 0 then
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

create or replace function public.update_admission_entry(p_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_quantity integer;
  current_doctor_id uuid;
  current_entry_date date;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_quantity is null or p_quantity < 0 then
    raise exception 'Admission entry is invalid' using errcode = '22023';
  end if;

  select quantity, doctor_id, entry_date
    into current_quantity, current_doctor_id, current_entry_date
    from public.admission_entries where id = p_id for update;
  if not found then return false; end if;
  if current_quantity = p_quantity then return true; end if;

  update public.admission_entries set quantity = p_quantity where id = p_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(), 'admission_entry', p_id::text, 'updated',
    jsonb_build_object(
      'quantity', jsonb_build_object('old', current_quantity, 'new', p_quantity),
      'doctor_id', current_doctor_id,
      'entry_date', current_entry_date
    )
  );
  return true;
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
  if p_period_type is null or p_period_type not in ('month', 'year') or p_reference_period is null
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

create or replace function public.update_admission_target(p_id uuid, p_target_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_quantity integer;
  current_period_type text;
  current_reference_period date;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_target_quantity is null or p_target_quantity < 0 then
    raise exception 'Admission target is invalid' using errcode = '22023';
  end if;
  select target_quantity, period_type, reference_period
    into current_quantity, current_period_type, current_reference_period
    from public.admission_targets where id = p_id for update;
  if not found then return false; end if;
  if current_quantity = p_target_quantity then return true; end if;

  update public.admission_targets set target_quantity = p_target_quantity where id = p_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(), 'admission_target', p_id::text, 'updated',
    jsonb_build_object(
      'target_quantity', jsonb_build_object('old', current_quantity, 'new', p_target_quantity),
      'period_type', current_period_type,
      'reference_period', current_reference_period
    )
  );
  return true;
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

  for entry_row in select value from jsonb_array_elements(p_rows) as import_row(value)
  loop
    if jsonb_typeof(entry_row) <> 'object'
       or coalesce(entry_row->>'entry_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or coalesce(entry_row->>'quantity', '') !~ '^[0-9]{1,9}$' then
      raise exception 'Admission import row is invalid' using errcode = '22023';
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

revoke all on function public.create_admission_entry(uuid, date, integer) from public;
revoke all on function public.update_admission_entry(uuid, integer) from public;
revoke all on function public.create_admission_target(text, date, integer) from public;
revoke all on function public.update_admission_target(uuid, integer) from public;
revoke all on function public.import_admission_entries(jsonb) from public;
grant execute on function public.create_admission_entry(uuid, date, integer) to authenticated;
grant execute on function public.update_admission_entry(uuid, integer) to authenticated;
grant execute on function public.create_admission_target(text, date, integer) to authenticated;
grant execute on function public.update_admission_target(uuid, integer) to authenticated;
grant execute on function public.import_admission_entries(jsonb) to authenticated;
