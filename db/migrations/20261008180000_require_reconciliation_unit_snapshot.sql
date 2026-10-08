-- Require the current row shown in the reconciliation UI to remain unchanged
-- until the administrator's decision is committed.

drop function if exists public.reconcile_production_sus_import(uuid, uuid, text, text);

create or replace function public.reconcile_production_sus_import(
  p_import_id uuid,
  p_procedure_id uuid,
  p_source_type text,
  p_resolution text,
  p_expected_entry_id uuid,
  p_expected_quantity numeric(13, 3),
  p_expected_procedure_id uuid,
  p_expected_reference_period date,
  p_expected_source text,
  p_expected_counting_unit text
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
  current_procedure_id uuid;
  current_reference_period date;
  current_source text;
  target_counting_unit text;
  imported_quantity numeric(13, 3);
  affected_rows integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_import_id is null or p_procedure_id is null
    or p_source_type is null or p_source_type not in ('apresentado', 'aprovado', 'realizado')
    or p_resolution is null or p_resolution not in ('keep_existing', 'replace_with_import')
    or p_expected_entry_id is null or p_expected_quantity is null
    or p_expected_procedure_id is null or p_expected_reference_period is null
    or p_expected_source is null or length(btrim(p_expected_source)) not between 1 and 80
    or p_expected_counting_unit is null or length(btrim(p_expected_counting_unit)) not between 1 and 80 then
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

  select entry.id, entry.quantity, entry.procedure_id, entry.reference_period,
    entry.source, entry.counting_unit
  into target_entry_id, current_quantity, current_procedure_id,
    current_reference_period, current_source, target_counting_unit
  from public.production_entries as entry
  where entry.id = captured_entry_id
    and (
      p_resolution = 'keep_existing'
      or (
        entry.procedure_id = p_procedure_id
        and entry.reference_period = import_record.reference_period
        and lower(btrim(entry.source)) = lower('SUS: ' || p_source_type)
      )
    )
  for update;
  if not found then
    raise exception 'Captured production entry changed; review the current entry before reconciling'
      using errcode = '40001';
  end if;
  if (target_entry_id, current_quantity, current_procedure_id, current_reference_period,
      current_source, target_counting_unit)
    is distinct from (p_expected_entry_id, p_expected_quantity, p_expected_procedure_id,
      p_expected_reference_period, p_expected_source, p_expected_counting_unit) then
    raise exception 'Captured production entry changed after it was displayed; refresh before reconciling'
      using errcode = '40001';
  end if;
  if p_resolution = 'replace_with_import' and current_quantity is distinct from captured_quantity then
    raise exception 'Captured production entry quantity changed; review the current entry before reconciling'
      using errcode = '40001';
  end if;

  if p_resolution = 'replace_with_import' and exists (
    select 1 from public.production_import_rows as import_line
    where import_line.import_id = p_import_id
      and import_line.procedure_id = p_procedure_id
      and import_line.source_type = p_source_type
      and import_line.status = 'pending_reconciliation'
      and (
        import_line.imported_counting_unit_snapshot is distinct from target_counting_unit
        or import_line.existing_counting_unit_snapshot is distinct from target_counting_unit
      )
  ) then
    raise exception 'Counting unit changed since this import; preserve the existing entry or import the report again'
      using errcode = '23514';
  end if;

  if p_resolution = 'replace_with_import' and current_quantity is distinct from imported_quantity then
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
      'captured_reference_period', import_record.reference_period,
      'captured_source', 'SUS: ' || p_source_type,
      'captured_quantity', captured_quantity,
      'current_procedure_id', current_procedure_id,
      'current_reference_period', current_reference_period,
      'current_source', current_source,
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

revoke all on function public.reconcile_production_sus_import(
  uuid, uuid, text, text, uuid, numeric, uuid, date, text, text
)
  from public;
grant execute on function public.reconcile_production_sus_import(
  uuid, uuid, text, text, uuid, numeric, uuid, date, text, text
)
  to authenticated;
