-- Preserve the unit used by each historical production entry.
alter table public.production_entries
  add column counting_unit text;

-- This is a metadata backfill, not an administrative edit; keep the original
-- timestamps and avoid producing user-audit events for the schema migration.
alter table public.production_entries
  disable trigger production_entries_set_updated_at;
alter table public.production_entries
  disable trigger production_entries_audit_change;

update public.production_entries as entry
set counting_unit = procedure.counting_unit
from public.procedures as procedure
where procedure.id = entry.procedure_id;

alter table public.production_entries
  enable trigger production_entries_set_updated_at;
alter table public.production_entries
  enable trigger production_entries_audit_change;
alter table public.production_entries
  alter column counting_unit set not null;

create or replace function public.normalize_production_text(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select regexp_replace(p_value, '^[[:space:]]+|[[:space:]]+$', '', 'g');
$$;

revoke all on function public.normalize_production_text(text) from public, authenticated;

alter table public.procedure_categories
  add constraint procedure_categories_name_whitespace_check
  check (name = public.normalize_production_text(name)) not valid;
alter table public.procedures
  add constraint procedures_name_whitespace_check
  check (name = public.normalize_production_text(name)) not valid;
alter table public.procedures
  add constraint procedures_counting_unit_whitespace_check
  check (counting_unit = public.normalize_production_text(counting_unit)) not valid;
alter table public.production_entries
  add constraint production_entries_source_whitespace_check
  check (source = public.normalize_production_text(source)) not valid;
alter table public.production_entries
  add constraint production_entries_counting_unit_whitespace_check
  check (counting_unit = public.normalize_production_text(counting_unit)) not valid;

create or replace function public.create_procedure_category(p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  normalized_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_name := public.normalize_production_text(p_name);
  if normalized_name is null or char_length(normalized_name) not between 1 and 120 then
    raise exception 'Category name is invalid' using errcode = '22023';
  end if;
  insert into public.procedure_categories (name)
  values (normalized_name)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_procedure_category(p_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_name := public.normalize_production_text(p_name);
  if p_id is null or normalized_name is null
    or char_length(normalized_name) not between 1 and 120 then
    raise exception 'Category input is invalid' using errcode = '22023';
  end if;
  update public.procedure_categories
  set name = normalized_name
  where id = p_id;
  if not found then raise exception 'Category not found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.create_production_procedure(
  p_category_id uuid,
  p_name text,
  p_counting_unit text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  normalized_name text;
  normalized_counting_unit text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_name := public.normalize_production_text(p_name);
  normalized_counting_unit := public.normalize_production_text(p_counting_unit);
  if p_category_id is null
    or normalized_name is null or char_length(normalized_name) not between 1 and 160
    or normalized_counting_unit is null
    or char_length(normalized_counting_unit) not between 1 and 40 then
    raise exception 'Procedure input is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.procedure_categories where id = p_category_id and active
  ) then
    raise exception 'Category is unavailable' using errcode = '23503';
  end if;
  insert into public.procedures (category_id, name, counting_unit)
  values (p_category_id, normalized_name, normalized_counting_unit)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_production_procedure(
  p_id uuid,
  p_category_id uuid,
  p_name text,
  p_counting_unit text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_category_id uuid;
  normalized_name text;
  normalized_counting_unit text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_name := public.normalize_production_text(p_name);
  normalized_counting_unit := public.normalize_production_text(p_counting_unit);
  if p_id is null or p_category_id is null
    or normalized_name is null or char_length(normalized_name) not between 1 and 160
    or normalized_counting_unit is null
    or char_length(normalized_counting_unit) not between 1 and 40 then
    raise exception 'Procedure input is invalid' using errcode = '22023';
  end if;
  select procedure.category_id into existing_category_id
  from public.procedures as procedure
  where procedure.id = p_id
  for update;
  if not found then raise exception 'Procedure not found' using errcode = 'P0002'; end if;
  if p_category_id is distinct from existing_category_id and not exists (
    select 1 from public.procedure_categories
    where id = p_category_id and active
  ) then
    raise exception 'Category is unavailable' using errcode = '23503';
  end if;
  update public.procedures
  set category_id = p_category_id,
      name = normalized_name,
      counting_unit = normalized_counting_unit
  where id = p_id;
  return true;
end;
$$;

create or replace function public.create_production_entry(
  p_procedure_id uuid,
  p_reference_period date,
  p_quantity numeric,
  p_source text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
  entry_counting_unit text;
  normalized_source text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_source := public.normalize_production_text(p_source);
  if p_procedure_id is null or p_reference_period is null
    or extract(day from p_reference_period) <> 1
    or p_quantity is null or p_quantity < 0 or p_quantity >= 10000000000
    or p_quantity <> trunc(p_quantity)
    or normalized_source is null or char_length(normalized_source) not between 1 and 80 then
    raise exception 'Production entry input is invalid' using errcode = '22023';
  end if;
  select procedure.counting_unit into entry_counting_unit
  from public.procedures as procedure
  join public.procedure_categories as category on category.id = procedure.category_id
  where procedure.id = p_procedure_id and procedure.active and category.active;
  if not found then raise exception 'Procedure is unavailable' using errcode = '23503'; end if;
  insert into public.production_entries (
    procedure_id, reference_period, quantity, source, counting_unit
  )
  values (
    p_procedure_id, p_reference_period, p_quantity, normalized_source, entry_counting_unit
  )
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_production_entry(
  p_id uuid,
  p_procedure_id uuid,
  p_reference_period date,
  p_quantity numeric,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_procedure_id uuid;
  existing_counting_unit text;
  next_counting_unit text;
  normalized_source text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_source := public.normalize_production_text(p_source);
  if p_id is null or p_procedure_id is null or p_reference_period is null
    or extract(day from p_reference_period) <> 1
    or p_quantity is null or p_quantity < 0 or p_quantity >= 10000000000
    or p_quantity <> trunc(p_quantity)
    or normalized_source is null or char_length(normalized_source) not between 1 and 80 then
    raise exception 'Production entry input is invalid' using errcode = '22023';
  end if;
  select procedure_id, counting_unit
  into existing_procedure_id, existing_counting_unit
  from public.production_entries
  where id = p_id
  for update;
  if not found then raise exception 'Production entry not found' using errcode = 'P0002'; end if;
  if p_procedure_id is distinct from existing_procedure_id then
    select procedure.counting_unit into next_counting_unit
    from public.procedures as procedure
    join public.procedure_categories as category on category.id = procedure.category_id
    where procedure.id = p_procedure_id and procedure.active and category.active;
    if not found then raise exception 'Procedure is unavailable' using errcode = '23503'; end if;
  else
    next_counting_unit := existing_counting_unit;
  end if;
  update public.production_entries
  set procedure_id = p_procedure_id,
      reference_period = p_reference_period,
      quantity = p_quantity,
      source = normalized_source,
      counting_unit = next_counting_unit
  where id = p_id;
  return true;
end;
$$;
