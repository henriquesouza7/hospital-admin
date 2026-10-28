create or replace function public.list_purchase_order_items_for_export(
  p_start date,
  p_through_exclusive date,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  result jsonb;
begin
  if not public.is_finance_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_start is null or p_through_exclusive is null
    or p_start < date '1900-01-01'
    or p_through_exclusive > date '2101-01-01'
    or p_start >= p_through_exclusive
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Purchase export period is invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10001 then
    raise exception 'Purchase export limit is invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', exported.id,
        'product_id', exported.product_id,
        'quantity', exported.quantity,
        'unit_price', exported.unit_price,
        'line_total', exported.line_total,
        'product_name_snapshot', exported.product_name_snapshot,
        'product_presentation_snapshot', exported.product_presentation_snapshot,
        'product_category_snapshot', exported.product_category_snapshot,
        'purchase_order', exported.purchase_order
      ) order by exported.order_date desc, exported.id asc
    ),
    '[]'::jsonb
  )
  into result
  from (
    select
      item.id,
      item.product_id,
      item.quantity,
      item.unit_price,
      item.line_total,
      item.product_name_snapshot,
      item.product_presentation_snapshot,
      item.product_category_snapshot,
      purchase_order.order_date,
      jsonb_build_object(
        'sector', purchase_order.sector,
        'order_date', purchase_order.order_date,
        'supplier', jsonb_build_object(
          'id', supplier.id,
          'name', supplier.name
        )
      ) as purchase_order
    from public.purchase_order_items as item
    join public.purchase_orders as purchase_order
      on purchase_order.id = item.purchase_order_id
    join public.suppliers as supplier
      on supplier.id = purchase_order.supplier_id
    where purchase_order.order_date >= p_start
      and purchase_order.order_date < p_through_exclusive
    order by purchase_order.order_date desc, item.id asc
    limit p_limit
  ) as exported;

  return result;
end;
$$;

revoke all on function public.list_purchase_order_items_for_export(date, date, integer)
  from public;
grant execute on function public.list_purchase_order_items_for_export(date, date, integer)
  to authenticated;

create or replace function public.list_production_entries_for_export(
  p_start date,
  p_through_exclusive date,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_start is null or p_through_exclusive is null
    or p_start < date '1900-01-01'
    or p_through_exclusive > date '2101-01-01'
    or extract(day from p_start) <> 1
    or extract(day from p_through_exclusive) <> 1
    or p_start >= p_through_exclusive
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Production export period is invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10001 then
    raise exception 'Production export limit is invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'reference_period', exported.reference_period,
        'category_name', exported.category_name,
        'procedure_name', exported.procedure_name,
        'quantity', exported.quantity,
        'counting_unit', exported.counting_unit,
        'source', exported.source
      ) order by exported.reference_period desc, exported.id asc
    ),
    '[]'::jsonb
  )
  into result
  from (
    select
      entry.id,
      entry.reference_period,
      category.name as category_name,
      procedure.name as procedure_name,
      entry.quantity,
      entry.counting_unit,
      entry.source
    from public.production_entries as entry
    join public.procedures as procedure
      on procedure.id = entry.procedure_id
    join public.procedure_categories as category
      on category.id = procedure.category_id
    where entry.reference_period >= p_start
      and entry.reference_period < p_through_exclusive
    order by entry.reference_period desc, entry.id asc
    limit p_limit
  ) as exported;

  return result;
end;
$$;

revoke all on function public.list_production_entries_for_export(date, date, integer)
  from public;
grant execute on function public.list_production_entries_for_export(date, date, integer)
  to authenticated;
