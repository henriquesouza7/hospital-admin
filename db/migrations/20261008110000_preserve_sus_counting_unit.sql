alter table public.production_import_rows
  add column imported_counting_unit_snapshot text,
  add column existing_counting_unit_snapshot text;

create or replace function public.capture_production_import_counting_units()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' or new.procedure_id is distinct from old.procedure_id then
    select procedure.counting_unit
    into new.imported_counting_unit_snapshot
    from public.procedures as procedure
    where procedure.id = new.procedure_id
    for share;

    if not found then
      raise exception 'Mapped procedure is unavailable' using errcode = '23503';
    end if;
  end if;

  if tg_op = 'INSERT'
    or new.production_entry_id is distinct from old.production_entry_id then
    if new.production_entry_id is null then
      new.existing_counting_unit_snapshot := null;
    else
      select entry.counting_unit
      into new.existing_counting_unit_snapshot
      from public.production_entries as entry
      where entry.id = new.production_entry_id
      for share;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.capture_production_import_counting_units()
  from public, authenticated;

create trigger production_import_rows_capture_counting_units_insert
before insert on public.production_import_rows
for each row execute function public.capture_production_import_counting_units();

create trigger production_import_rows_capture_counting_units_update
before update of procedure_id, production_entry_id,
  imported_counting_unit_snapshot, existing_counting_unit_snapshot
on public.production_import_rows
for each row execute function public.capture_production_import_counting_units();

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
  target_counting_unit text;
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

  select entry.id, entry.quantity, entry.counting_unit
  into target_entry_id, current_quantity, target_counting_unit
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

  if p_resolution = 'replace_with_import' and exists (
    select 1 from public.production_import_rows as import_line
    where import_line.import_id = p_import_id
      and import_line.procedure_id = p_procedure_id
      and import_line.source_type = p_source_type
      and import_line.status = 'pending_reconciliation'
      and import_line.imported_counting_unit_snapshot is distinct from target_counting_unit
  ) then
    raise exception 'Counting unit changed since this import; preserve the existing entry or import the report again'
      using errcode = '23514';
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
      'existing_counting_unit', target_counting_unit,
      'imported_quantity', imported_quantity,
      'imported_counting_unit', (
        select min(imported_counting_unit_snapshot)
        from public.production_import_rows
        where import_id = p_import_id and procedure_id = p_procedure_id
          and source_type = p_source_type
      ),
      'affected_rows', affected_rows
    )
  );
  return true;
end;
$$;

revoke all on function public.reconcile_production_sus_import(uuid, uuid, text, text)
  from public;
grant execute on function public.reconcile_production_sus_import(uuid, uuid, text, text)
  to authenticated;
