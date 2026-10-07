-- Administrative scheduling for minor surgeries. Patient data is limited to name.

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

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.surgery_days (
  id uuid primary key default gen_random_uuid(),
  procedure_date date not null unique,
  capacity integer not null default 10 check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.surgery_waitlist (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  status text not null default 'waiting' check (status in ('waiting', 'transferred')),
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surgery_waitlist_transfer_state check (
    (status = 'waiting' and transferred_at is null)
    or (status = 'transferred' and transferred_at is not null)
  )
);

create table public.surgery_appointments (
  id uuid primary key default gen_random_uuid(),
  surgery_day_id uuid not null references public.surgery_days(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  source_waitlist_id uuid unique references public.surgery_waitlist(id) on delete restrict,
  status text not null default 'awaiting_confirmation'
    check (status in ('awaiting_confirmation', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index surgery_days_procedure_date_idx on public.surgery_days (procedure_date);
create index surgery_appointments_day_status_idx
  on public.surgery_appointments (surgery_day_id, status);
create index surgery_appointments_patient_idx
  on public.surgery_appointments (patient_id, created_at desc);
create index surgery_waitlist_order_idx
  on public.surgery_waitlist (created_at, id) where status = 'waiting';
create unique index surgery_appointments_active_patient_day_idx
  on public.surgery_appointments (surgery_day_id, patient_id) where status <> 'cancelled';
create unique index surgery_waitlist_active_patient_idx
  on public.surgery_waitlist (patient_id) where status = 'waiting';

alter table public.patients enable row level security;
alter table public.surgery_days enable row level security;
alter table public.surgery_appointments enable row level security;
alter table public.surgery_waitlist enable row level security;

revoke all on public.patients, public.surgery_days,
  public.surgery_appointments, public.surgery_waitlist from public, authenticated;
grant select on public.patients, public.surgery_days,
  public.surgery_appointments, public.surgery_waitlist to authenticated;

create policy patients_admin_select on public.patients
  for select to authenticated using ((select public.is_admin()));
create policy surgery_days_admin_select on public.surgery_days
  for select to authenticated using ((select public.is_admin()));
create policy surgery_appointments_admin_select on public.surgery_appointments
  for select to authenticated using ((select public.is_admin()));
create policy surgery_waitlist_admin_select on public.surgery_waitlist
  for select to authenticated using ((select public.is_admin()));

create function public.create_surgery_day(p_procedure_date date, p_capacity integer default 10)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_procedure_date is null or p_capacity is null or p_capacity <= 0 then
    raise exception 'Surgery day input is invalid' using errcode = '22023';
  end if;

  insert into public.surgery_days (procedure_date, capacity)
  values (p_procedure_date, p_capacity)
  returning id into new_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_day', new_id::text, 'created',
    jsonb_build_object('procedure_date', p_procedure_date, 'capacity', p_capacity));
  return new_id;
end;
$$;

create function public.update_surgery_day_capacity(p_surgery_day_id uuid, p_capacity integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_capacity integer;
  active_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_surgery_day_id is null or p_capacity is null or p_capacity <= 0 then
    raise exception 'Capacity is invalid' using errcode = '22023';
  end if;

  select day.capacity into current_capacity
  from public.surgery_days as day where day.id = p_surgery_day_id for update;
  if not found then
    raise exception 'Surgery day not found' using errcode = 'P0002';
  end if;

  select count(*)::integer into active_count
  from public.surgery_appointments as appointment
  where appointment.surgery_day_id = p_surgery_day_id
    and appointment.status in ('awaiting_confirmation', 'confirmed');
  if p_capacity < active_count then
    raise exception 'Capacity cannot be lower than active appointments' using errcode = '23514';
  end if;

  update public.surgery_days set capacity = p_capacity, updated_at = now()
  where id = p_surgery_day_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_day', p_surgery_day_id::text, 'capacity_changed',
    jsonb_build_object('previous_capacity', current_capacity, 'capacity', p_capacity));
  return true;
end;
$$;

create function public.create_surgery_patient(p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  normalized_name text := nullif(btrim(p_name), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if normalized_name is null or length(normalized_name) > 160 then
    raise exception 'Patient name is invalid' using errcode = '22023';
  end if;

  insert into public.patients (name) values (normalized_name) returning id into new_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_patient', new_id::text, 'created', jsonb_build_object('fields', jsonb_build_array('name')));
  return new_id;
end;
$$;

create function public.update_surgery_patient(p_patient_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_name text := nullif(btrim(p_name), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_patient_id is null or normalized_name is null or length(normalized_name) > 160 then
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

create function public.create_surgery_appointment(
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
  normalized_name text := nullif(btrim(p_patient_name), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_surgery_day_id is null
    or ((p_patient_id is null) = (normalized_name is null))
    or (normalized_name is not null and length(normalized_name) > 160)
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

create function public.update_surgery_appointment_status(p_appointment_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  appointment_row public.surgery_appointments%rowtype;
  day_capacity integer;
  active_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_appointment_id is null or p_status not in ('awaiting_confirmation', 'confirmed', 'cancelled') then
    raise exception 'Appointment status is invalid' using errcode = '22023';
  end if;

  select appointment.* into appointment_row
  from public.surgery_appointments as appointment where appointment.id = p_appointment_id;
  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;
  perform 1 from public.surgery_days as day where day.id = appointment_row.surgery_day_id for update;
  if p_status in ('awaiting_confirmation', 'confirmed') then
    select day.capacity into day_capacity from public.surgery_days as day
    where day.id = appointment_row.surgery_day_id;
    select count(*)::integer into active_count
    from public.surgery_appointments as appointment
    where appointment.surgery_day_id = appointment_row.surgery_day_id
      and appointment.id <> p_appointment_id
      and appointment.status in ('awaiting_confirmation', 'confirmed');
    if active_count >= day_capacity then
      raise exception 'No available capacity' using errcode = '23514';
    end if;
  end if;

  update public.surgery_appointments set status = p_status, updated_at = now()
  where id = p_appointment_id;
  if appointment_row.status is distinct from p_status then
    insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
    values (auth.user_id(), 'surgery_appointment', p_appointment_id::text,
      case when p_status = 'cancelled' then 'cancelled' else 'status_changed' end,
      jsonb_build_object('patient_id', appointment_row.patient_id, 'surgery_day_id', appointment_row.surgery_day_id,
        'previous_status', appointment_row.status, 'status', p_status));
  end if;
  return true;
end;
$$;

create function public.create_surgery_waitlist_entry(
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
  normalized_name text := nullif(btrim(p_patient_name), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if ((p_patient_id is null) = (normalized_name is null))
    or (normalized_name is not null and length(normalized_name) > 160) then
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

create function public.transfer_surgery_waitlist_entry(p_waitlist_id uuid, p_surgery_day_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  queue_row public.surgery_waitlist%rowtype;
  day_capacity integer;
  active_count integer;
  new_appointment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_waitlist_id is null or p_surgery_day_id is null then
    raise exception 'Transfer input is invalid' using errcode = '22023';
  end if;

  select entry.* into queue_row from public.surgery_waitlist as entry
  where entry.id = p_waitlist_id for update;
  if not found or queue_row.status <> 'waiting' then
    raise exception 'Active waitlist entry not found' using errcode = 'P0002';
  end if;

  select day.capacity into day_capacity from public.surgery_days as day
  where day.id = p_surgery_day_id for update;
  if not found then
    raise exception 'Surgery day not found' using errcode = 'P0002';
  end if;
  select count(*)::integer into active_count from public.surgery_appointments as appointment
  where appointment.surgery_day_id = p_surgery_day_id
    and appointment.status in ('awaiting_confirmation', 'confirmed');
  if active_count >= day_capacity then
    raise exception 'No available capacity' using errcode = '23514';
  end if;

  insert into public.surgery_appointments (surgery_day_id, patient_id, source_waitlist_id)
  values (p_surgery_day_id, queue_row.patient_id, queue_row.id)
  returning id into new_appointment_id;
  update public.surgery_waitlist set status = 'transferred', transferred_at = now(), updated_at = now()
  where id = queue_row.id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_waitlist', queue_row.id::text, 'transferred',
    jsonb_build_object('patient_id', queue_row.patient_id, 'surgery_day_id', p_surgery_day_id,
      'appointment_id', new_appointment_id));
  return new_appointment_id;
end;
$$;

revoke all on function public.create_surgery_day(date, integer) from public;
revoke all on function public.update_surgery_day_capacity(uuid, integer) from public;
revoke all on function public.create_surgery_patient(text) from public;
revoke all on function public.update_surgery_patient(uuid, text) from public;
revoke all on function public.create_surgery_appointment(uuid, uuid, text, text) from public;
revoke all on function public.update_surgery_appointment_status(uuid, text) from public;
revoke all on function public.create_surgery_waitlist_entry(uuid, text) from public;
revoke all on function public.transfer_surgery_waitlist_entry(uuid, uuid) from public;

grant execute on function public.create_surgery_day(date, integer) to authenticated;
grant execute on function public.update_surgery_day_capacity(uuid, integer) to authenticated;
grant execute on function public.create_surgery_patient(text) to authenticated;
grant execute on function public.update_surgery_patient(uuid, text) to authenticated;
grant execute on function public.create_surgery_appointment(uuid, uuid, text, text) to authenticated;
grant execute on function public.update_surgery_appointment_status(uuid, text) to authenticated;
grant execute on function public.create_surgery_waitlist_entry(uuid, text) to authenticated;
grant execute on function public.transfer_surgery_waitlist_entry(uuid, uuid) to authenticated;
