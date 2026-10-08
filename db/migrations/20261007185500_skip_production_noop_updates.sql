create or replace function public.update_procedure_category(p_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_name text;
  existing_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  normalized_name := public.normalize_production_text(p_name);
  if p_id is null or normalized_name is null
    or char_length(normalized_name) not between 1 and 120 then
    raise exception 'Category input is invalid' using errcode = '22023';
  end if;
  select name into existing_name
  from public.procedure_categories
  where id = p_id
  for update;
  if not found then raise exception 'Category not found' using errcode = 'P0002'; end if;
  if existing_name = normalized_name then return true; end if;
  update public.procedure_categories
  set name = normalized_name
  where id = p_id;
  return true;
end;
$$;

create or replace function public.set_procedure_category_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_active is null then
    raise exception 'Category status is invalid' using errcode = '22023';
  end if;
  select active into existing_active
  from public.procedure_categories
  where id = p_id
  for update;
  if not found then raise exception 'Category not found' using errcode = 'P0002'; end if;
  if existing_active = p_active then return true; end if;
  if not p_active and exists (
    select 1 from public.procedures where category_id = p_id and active
  ) then
    raise exception 'Deactivate active procedures before the category' using errcode = '23514';
  end if;
  update public.procedure_categories set active = p_active where id = p_id;
  return true;
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
  existing_name text;
  existing_counting_unit text;
  target_category_active boolean;
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
  select category_id, name, counting_unit
  into existing_category_id, existing_name, existing_counting_unit
  from public.procedures
  where id = p_id
  for update;
  if not found then raise exception 'Procedure not found' using errcode = 'P0002'; end if;
  select active into target_category_active
  from public.procedure_categories
  where id = p_category_id
  for update;
  if not found then raise exception 'Category is unavailable' using errcode = '23503'; end if;
  if p_category_id is distinct from existing_category_id and not target_category_active then
    raise exception 'Category is unavailable' using errcode = '23503';
  end if;
  if existing_category_id = p_category_id
    and existing_name = normalized_name
    and existing_counting_unit = normalized_counting_unit then
    return true;
  end if;
  update public.procedures
  set category_id = p_category_id,
      name = normalized_name,
      counting_unit = normalized_counting_unit
  where id = p_id;
  return true;
end;
$$;

create or replace function public.set_production_procedure_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  procedure_category_id uuid;
  existing_active boolean;
  category_is_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_active is null then
    raise exception 'Procedure status is invalid' using errcode = '22023';
  end if;
  select category_id, active
  into procedure_category_id, existing_active
  from public.procedures
  where id = p_id
  for update;
  if not found then raise exception 'Procedure not found' using errcode = 'P0002'; end if;
  if existing_active = p_active then return true; end if;
  if p_active then
    select active into category_is_active
    from public.procedure_categories
    where id = procedure_category_id
    for update;
    if not found or not category_is_active then
      raise exception 'Procedure category is unavailable' using errcode = '23503';
    end if;
  end if;
  update public.procedures set active = p_active where id = p_id;
  return true;
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
  existing_reference_period date;
  existing_quantity numeric;
  existing_source text;
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
  select procedure_id, reference_period, quantity, source, counting_unit
  into existing_procedure_id, existing_reference_period, existing_quantity,
       existing_source, existing_counting_unit
  from public.production_entries
  where id = p_id
  for update;
  if not found then raise exception 'Production entry not found' using errcode = 'P0002'; end if;
  if p_procedure_id = existing_procedure_id
    and p_reference_period = existing_reference_period
    and p_quantity = existing_quantity
    and normalized_source = existing_source then
    return true;
  end if;
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

revoke all on function public.update_procedure_category(uuid, text) from public;
revoke all on function public.set_procedure_category_active(uuid, boolean) from public;
revoke all on function public.update_production_procedure(uuid, uuid, text, text) from public;
revoke all on function public.set_production_procedure_active(uuid, boolean) from public;
revoke all on function public.update_production_entry(uuid, uuid, date, numeric, text) from public;

grant execute on function public.update_procedure_category(uuid, text) to authenticated;
grant execute on function public.set_procedure_category_active(uuid, boolean) to authenticated;
grant execute on function public.update_production_procedure(uuid, uuid, text, text) to authenticated;
grant execute on function public.set_production_procedure_active(uuid, boolean) to authenticated;
grant execute on function public.update_production_entry(uuid, uuid, date, numeric, text) to authenticated;
