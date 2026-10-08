create table public.production_imports (
  id uuid primary key default gen_random_uuid(),
  file_sha256 text not null unique
    check (file_sha256 ~ '^[0-9a-f]{64}$'),
  reference_period date not null
    check (extract(day from reference_period) = 1),
  row_count integer not null check (row_count between 1 and 500),
  imported_group_count integer not null default 0 check (imported_group_count >= 0),
  pending_group_count integer not null default 0 check (pending_group_count >= 0),
  actor_id text not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'pending_reconciliation', 'reconciled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.production_imports(id) on delete restrict,
  source_row_number integer not null check (source_row_number between 2 and 501),
  external_code text check (external_code is null or length(external_code) <= 100),
  procedure_name_snapshot text not null
    check (length(btrim(procedure_name_snapshot)) between 1 and 240),
  source_type text not null
    check (source_type in ('apresentado', 'aprovado', 'realizado')),
  quantity numeric(13, 3) not null
    check (quantity >= 0 and quantity = trunc(quantity) and quantity < 10000000000),
  procedure_id uuid not null references public.procedures(id) on delete restrict,
  production_entry_id uuid references public.production_entries(id) on delete restrict,
  existing_quantity_snapshot numeric(13, 3)
    check (existing_quantity_snapshot is null or existing_quantity_snapshot >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'imported', 'pending_reconciliation', 'kept_existing', 'replaced_existing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_import_rows_import_row_key unique (import_id, source_row_number)
);

create index production_imports_created_idx
  on public.production_imports (created_at desc, id desc);
create index production_import_rows_status_idx
  on public.production_import_rows (status, import_id, source_row_number);
create index production_import_rows_procedure_idx
  on public.production_import_rows (procedure_id, import_id);

alter table public.production_imports enable row level security;
alter table public.production_import_rows enable row level security;

revoke all on public.production_imports from public, authenticated;
revoke all on public.production_import_rows from public, authenticated;
grant select on public.production_imports to authenticated;
grant select on public.production_import_rows to authenticated;

create policy production_imports_admin_select
  on public.production_imports for select to authenticated
  using ((select public.is_admin()));
create policy production_import_rows_admin_select
  on public.production_import_rows for select to authenticated
  using ((select public.is_admin()));

create or replace function public.set_production_import_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_production_import_updated_at() from public, authenticated;

create trigger production_imports_set_updated_at
before update on public.production_imports
for each row execute function public.set_production_import_updated_at();
create trigger production_import_rows_set_updated_at
before update on public.production_import_rows
for each row execute function public.set_production_import_updated_at();

create or replace function public.confirm_production_sus_import(
  p_file_sha256 text,
  p_reference_period date,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_import_id uuid;
  import_actor text;
  import_row_count integer;
  imported_groups integer := 0;
  pending_groups integer := 0;
  grouped record;
  current_procedure record;
  new_entry_id uuid;
  existing_entry_id uuid;
  existing_quantity numeric(13, 3);
  group_quantity numeric(13, 3);
  new_status text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  import_actor := auth.user_id();
  if import_actor is null then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if p_file_sha256 is null or p_file_sha256 !~ '^[0-9a-f]{64}$'
    or p_reference_period is null or extract(day from p_reference_period) <> 1
    or p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Import input is invalid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'Import input is invalid' using errcode = '22023';
  end if;

  import_row_count := jsonb_array_length(p_rows);
  if exists (
    select 1 from jsonb_array_elements(p_rows) as row_data(value)
    where jsonb_typeof(row_data.value) is distinct from 'object'
  ) then
    raise exception 'Import row is invalid' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_rows) as row_data(value)
    where exists (
        select 1 from jsonb_object_keys(row_data.value) as supplied_key(key)
        where supplied_key.key not in (
          'row_number', 'external_code', 'procedure_name', 'source_type', 'quantity', 'procedure_id'
        )
      )
      or coalesce(row_data.value->>'row_number', '') !~ '^[1-9][0-9]*$'
      or coalesce(row_data.value->>'procedure_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(row_data.value->>'source_type', '') not in ('apresentado', 'aprovado', 'realizado')
      or coalesce(row_data.value->>'procedure_name', '') !~ '[^[:space:]]'
      or length(row_data.value->>'procedure_name') > 240
      or length(coalesce(row_data.value->>'external_code', '')) > 100
      or coalesce(row_data.value->>'quantity', '') !~ '^[0-9]{1,10}$'
      or case when coalesce(row_data.value->>'quantity', '') ~ '^[0-9]{1,10}$'
          then (row_data.value->>'quantity')::numeric >= 10000000000 else false end
      or case when coalesce(row_data.value->>'row_number', '') ~ '^[1-9][0-9]*$'
          then (row_data.value->>'row_number')::integer > 501 else false end
      or not (row_data.value ?& array[
        'row_number', 'procedure_id', 'source_type', 'procedure_name', 'quantity'
      ])
  ) then
    raise exception 'Import row is invalid' using errcode = '22023';
  end if;
  if (select count(distinct (row_data.value->>'row_number')::integer)
      from jsonb_array_elements(p_rows) as row_data(value)) <> import_row_count then
    raise exception 'Import row numbers must be unique' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_rows) as row_data(value)
    left join public.procedures as procedure
      on procedure.id = (row_data.value->>'procedure_id')::uuid
    left join public.procedure_categories as category
      on category.id = procedure.category_id
    where procedure.id is null or not procedure.active or not category.active
  ) then
    raise exception 'Mapped procedure is unavailable' using errcode = '23503';
  end if;
  if exists (
    select 1
    from (
      select (value->>'procedure_id')::uuid as procedure_id,
        value->>'source_type' as source_type,
        sum((value->>'quantity')::numeric) as group_quantity
      from jsonb_array_elements(p_rows) as row_data(value)
      group by (value->>'procedure_id')::uuid, value->>'source_type'
    ) as grouped_rows
    where grouped_rows.group_quantity >= 10000000000
  ) then
    raise exception 'Grouped quantity exceeds the allowed limit' using errcode = '22023';
  end if;

  insert into public.production_imports (
    file_sha256, reference_period, row_count, actor_id, status
  ) values (
    p_file_sha256, p_reference_period, import_row_count, import_actor, 'confirmed'
  ) returning id into new_import_id;

  insert into public.production_import_rows (
    import_id, source_row_number, external_code, procedure_name_snapshot,
    source_type, quantity, procedure_id
  )
  select new_import_id,
    (value->>'row_number')::integer,
    nullif(btrim(value->>'external_code'), ''),
    btrim(value->>'procedure_name'),
    value->>'source_type',
    (value->>'quantity')::numeric,
    (value->>'procedure_id')::uuid
  from jsonb_array_elements(p_rows) as row_data(value)
  order by (value->>'row_number')::integer;

  for grouped in
    select procedure_id, source_type, sum(quantity) as quantity
    from public.production_import_rows
    where import_id = new_import_id
    group by procedure_id, source_type
    order by procedure_id, source_type
  loop
    group_quantity := grouped.quantity;
    new_entry_id := null;
    select procedure.counting_unit into current_procedure
    from public.procedures as procedure
    join public.procedure_categories as category on category.id = procedure.category_id
    where procedure.id = grouped.procedure_id and procedure.active and category.active;

    insert into public.production_entries (
      procedure_id, reference_period, quantity, source, counting_unit
    ) values (
      grouped.procedure_id, p_reference_period, group_quantity,
      'SUS: ' || grouped.source_type, current_procedure.counting_unit
    ) on conflict do nothing
    returning id into new_entry_id;

    if new_entry_id is not null then
      new_status := 'imported';
      imported_groups := imported_groups + 1;
      existing_quantity := null;
      existing_entry_id := new_entry_id;
    else
      new_entry_id := null;
      select entry.id, entry.quantity into existing_entry_id, existing_quantity
      from public.production_entries as entry
      where entry.procedure_id = grouped.procedure_id
        and entry.reference_period = p_reference_period
        and lower(btrim(entry.source)) = lower('SUS: ' || grouped.source_type)
      for update;
      if not found then
        raise exception 'Concurrent import conflict; retry confirmation' using errcode = '40001';
      end if;
      new_status := 'pending_reconciliation';
      pending_groups := pending_groups + 1;
    end if;

    update public.production_import_rows
    set status = new_status,
        production_entry_id = existing_entry_id,
        existing_quantity_snapshot = existing_quantity
    where import_id = new_import_id
      and procedure_id = grouped.procedure_id
      and source_type = grouped.source_type;
  end loop;

  update public.production_imports
  set imported_group_count = imported_groups,
      pending_group_count = pending_groups,
      status = case when pending_groups > 0 then 'pending_reconciliation' else 'reconciled' end
  where id = new_import_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    import_actor,
    'production_import',
    new_import_id::text,
    'confirmed',
    jsonb_build_object(
      'file_sha256', p_file_sha256,
      'reference_period', p_reference_period,
      'row_count', import_row_count,
      'imported_group_count', imported_groups,
      'pending_group_count', pending_groups
    )
  );

  return jsonb_build_object(
    'import_id', new_import_id,
    'row_count', import_row_count,
    'imported_group_count', imported_groups,
    'pending_group_count', pending_groups
  );
end;
$$;

create or replace function public.reconcile_production_sus_import(
  p_import_id uuid,
  p_procedure_id uuid,
  p_source_type text,
  p_resolution text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  import_record public.production_imports%rowtype;
  target_entry_id uuid;
  captured_entry_id uuid;
  captured_quantity numeric(13, 3);
  current_quantity numeric(13, 3);
  imported_quantity numeric(13, 3);
  affected_rows integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_import_id is null or p_procedure_id is null
    or p_source_type is null or p_source_type not in ('apresentado', 'aprovado', 'realizado')
    or p_resolution is null or p_resolution not in ('keep_existing', 'replace_with_import') then
    raise exception 'Reconciliation input is invalid' using errcode = '22023';
  end if;

  select * into import_record
  from public.production_imports
  where id = p_import_id
  for update;
  if not found then raise exception 'Import not found' using errcode = 'P0002'; end if;

  select import_line.production_entry_id, import_line.existing_quantity_snapshot
  into captured_entry_id, captured_quantity
  from public.production_import_rows as import_line
  where import_line.import_id = p_import_id and import_line.procedure_id = p_procedure_id
    and import_line.source_type = p_source_type and import_line.status = 'pending_reconciliation'
  order by import_line.source_row_number
  limit 1
  for update;
  select sum(quantity) into imported_quantity
  from public.production_import_rows
  where import_id = p_import_id and procedure_id = p_procedure_id
    and source_type = p_source_type and status = 'pending_reconciliation';
  if imported_quantity is null then
    raise exception 'No pending rows for reconciliation' using errcode = 'P0002';
  end if;
  if captured_entry_id is null or captured_quantity is null or exists (
    select 1 from public.production_import_rows as import_line
    where import_line.import_id = p_import_id and import_line.procedure_id = p_procedure_id
      and import_line.source_type = p_source_type and import_line.status = 'pending_reconciliation'
      and (import_line.production_entry_id is distinct from captured_entry_id
        or import_line.existing_quantity_snapshot is distinct from captured_quantity)
  ) then
    raise exception 'Captured production entry is unavailable; review the current entry before reconciling'
      using errcode = '40001';
  end if;

  select entry.id, entry.quantity into target_entry_id, current_quantity
  from public.production_entries as entry
  where entry.id = captured_entry_id
    and entry.procedure_id = p_procedure_id
    and entry.reference_period = import_record.reference_period
    and lower(btrim(entry.source)) = lower('SUS: ' || p_source_type)
  for update;
  if not found then
    raise exception 'Captured production entry changed; review the current entry before reconciling'
      using errcode = '40001';
  end if;
  if current_quantity is distinct from captured_quantity then
    raise exception 'Captured production entry quantity changed; review the current entry before reconciling'
      using errcode = '40001';
  end if;

  if p_resolution = 'replace_with_import' then
    update public.production_entries set quantity = imported_quantity where id = target_entry_id;
  end if;

  update public.production_import_rows
  set status = case when p_resolution = 'keep_existing'
      then 'kept_existing' else 'replaced_existing' end,
    production_entry_id = target_entry_id,
    existing_quantity_snapshot = current_quantity
  where import_id = p_import_id and procedure_id = p_procedure_id
    and source_type = p_source_type and status = 'pending_reconciliation';
  get diagnostics affected_rows = row_count;

  update public.production_imports
  set pending_group_count = greatest(pending_group_count - 1, 0),
      status = case when exists (
        select 1 from public.production_import_rows
        where import_id = p_import_id and status = 'pending_reconciliation'
      ) then 'pending_reconciliation' else 'reconciled' end
  where id = p_import_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'production_import',
    p_import_id::text,
    'reconciled',
    jsonb_build_object(
      'procedure_id', p_procedure_id,
      'source_type', p_source_type,
      'resolution', p_resolution,
      'existing_quantity', current_quantity,
      'imported_quantity', imported_quantity,
      'affected_rows', affected_rows
    )
  );
  return true;
end;
$$;

revoke all on function public.confirm_production_sus_import(text, date, jsonb) from public;
revoke all on function public.reconcile_production_sus_import(uuid, uuid, text, text) from public;
grant execute on function public.confirm_production_sus_import(text, date, jsonb) to authenticated;
grant execute on function public.reconcile_production_sus_import(uuid, uuid, text, text) to authenticated;
