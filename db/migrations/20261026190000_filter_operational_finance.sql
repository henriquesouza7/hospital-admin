-- Keep operational indicators separate from synthetic records without guessing historical provenance.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'purchase_orders'
      and column_name = 'data_classification'
  ) and exists (select 1 from public.purchase_orders) then
    raise exception 'Classify existing purchase orders before this migration' using errcode = '23514';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'monthly_fair_expenses'
      and column_name = 'data_classification'
  ) and exists (select 1 from public.monthly_fair_expenses) then
    raise exception 'Classify existing fair expenses before this migration' using errcode = '23514';
  end if;
end;
$$;

alter table public.purchase_orders
  add column if not exists data_classification text not null default 'operational';
alter table public.monthly_fair_expenses
  add column if not exists data_classification text not null default 'operational';
alter table public.purchase_orders
  alter column data_classification set default 'operational',
  alter column data_classification set not null;
alter table public.monthly_fair_expenses
  alter column data_classification set default 'operational',
  alter column data_classification set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.purchase_orders'::regclass
      and conname = 'purchase_orders_data_classification_check'
  ) then
    alter table public.purchase_orders add constraint purchase_orders_data_classification_check
      check (data_classification in ('operational', 'demonstration', 'test'));
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.monthly_fair_expenses'::regclass
      and conname = 'monthly_fair_expenses_data_classification_check'
  ) then
    alter table public.monthly_fair_expenses add constraint monthly_fair_expenses_data_classification_check
      check (data_classification in ('operational', 'demonstration', 'test'));
  end if;
end;
$$;
create or replace function public.list_monthly_expense_totals_exact(
  p_start date,
  p_through_exclusive date
)
returns table (
  competence date,
  pharmacy_total text,
  laboratory_total text,
  fair_total text,
  pharmacy_item_count integer,
  laboratory_item_count integer,
  has_fair_record boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if not coalesce(public.is_finance_admin(), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_start is null or p_through_exclusive is null
    or p_start >= p_through_exclusive
    or extract(day from p_start) <> 1
    or extract(day from p_through_exclusive) <> 1
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Expense export period is invalid' using errcode = '22023';
  end if;

  return query
  with months as (
    select generate_series(p_start::timestamp,
      (p_through_exclusive - interval '1 month')::timestamp,
      interval '1 month')::date as month_start
  ), purchase_totals as (
    select date_trunc('month', orders.order_date)::date as month_start,
      coalesce(sum(items.line_total) filter (where orders.sector = 'farmacia'), 0)::numeric as pharmacy_total,
      coalesce(sum(items.line_total) filter (where orders.sector = 'laboratorio'), 0)::numeric as laboratory_total,
      (count(items.id) filter (where orders.sector = 'farmacia'))::integer as pharmacy_item_count,
      (count(items.id) filter (where orders.sector = 'laboratorio'))::integer as laboratory_item_count
    from public.purchase_orders as orders
    join public.purchase_order_items as items on items.purchase_order_id = orders.id
    where orders.order_date >= p_start
      and orders.order_date < p_through_exclusive
      and orders.data_classification = 'operational'
    group by date_trunc('month', orders.order_date)::date
  )
  select months.month_start,
    coalesce(purchase_totals.pharmacy_total, 0)::numeric::text,
    coalesce(purchase_totals.laboratory_total, 0)::numeric::text,
    coalesce(fair.total_amount, 0)::numeric::text,
    coalesce(purchase_totals.pharmacy_item_count, 0),
    coalesce(purchase_totals.laboratory_item_count, 0),
    fair.id is not null
  from months
  left join purchase_totals on purchase_totals.month_start = months.month_start
  left join public.monthly_fair_expenses as fair
    on fair.competence = months.month_start
    and fair.data_classification = 'operational'
  order by months.month_start;
end;
$$;
revoke all on function public.list_monthly_expense_totals_exact(date, date) from public;
grant execute on function public.list_monthly_expense_totals_exact(date, date) to authenticated;

create or replace function public.list_monthly_expense_totals(
  p_start date,
  p_through_exclusive date
)
returns table (
  competence date,
  pharmacy_total numeric,
  laboratory_total numeric,
  fair_total numeric,
  pharmacy_item_count integer,
  laboratory_item_count integer,
  has_fair_record boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if not coalesce(public.is_finance_admin(), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_start is null or p_through_exclusive is null
    or p_start >= p_through_exclusive
    or extract(day from p_start) <> 1
    or extract(day from p_through_exclusive) <> 1
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Expense export period is invalid' using errcode = '22023';
  end if;

  return query
  with months as (
    select generate_series(p_start::timestamp,
      (p_through_exclusive - interval '1 month')::timestamp,
      interval '1 month')::date as month_start
  ), purchase_totals as (
    select date_trunc('month', orders.order_date)::date as month_start,
      coalesce(sum(items.line_total) filter (where orders.sector = 'farmacia'), 0)::numeric as pharmacy_total,
      coalesce(sum(items.line_total) filter (where orders.sector = 'laboratorio'), 0)::numeric as laboratory_total,
      (count(items.id) filter (where orders.sector = 'farmacia'))::integer as pharmacy_item_count,
      (count(items.id) filter (where orders.sector = 'laboratorio'))::integer as laboratory_item_count
    from public.purchase_orders as orders
    join public.purchase_order_items as items on items.purchase_order_id = orders.id
    where orders.order_date >= p_start
      and orders.order_date < p_through_exclusive
      and orders.data_classification = 'operational'
    group by date_trunc('month', orders.order_date)::date
  )
  select months.month_start,
    coalesce(purchase_totals.pharmacy_total, 0),
    coalesce(purchase_totals.laboratory_total, 0),
    coalesce(fair.total_amount, 0),
    coalesce(purchase_totals.pharmacy_item_count, 0),
    coalesce(purchase_totals.laboratory_item_count, 0),
    fair.id is not null
  from months
  left join purchase_totals on purchase_totals.month_start = months.month_start
  left join public.monthly_fair_expenses as fair
    on fair.competence = months.month_start
    and fair.data_classification = 'operational'
  order by months.month_start;
end;
$$;
revoke all on function public.list_monthly_expense_totals(date, date) from public;
grant execute on function public.list_monthly_expense_totals(date, date) to authenticated;

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
    or p_start < date '1900-01-01' or p_through_exclusive > date '2101-01-01'
    or p_start >= p_through_exclusive
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Purchase export period is invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10001 then
    raise exception 'Purchase export limit is invalid' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', exported.id,
    'product_id', exported.product_id,
    'quantity', exported.quantity,
    'unit_price', exported.unit_price,
    'line_total', exported.line_total,
    'product_name_snapshot', exported.product_name_snapshot,
    'product_presentation_snapshot', exported.product_presentation_snapshot,
    'product_category_snapshot', exported.product_category_snapshot,
    'purchase_order', exported.purchase_order
  ) order by exported.order_date desc, exported.id asc), '[]'::jsonb)
  into result
  from (
    select item.id, item.product_id, item.quantity, item.unit_price, item.line_total,
      item.product_name_snapshot, item.product_presentation_snapshot,
      item.product_category_snapshot, purchase_order.order_date,
      jsonb_build_object(
        'sector', purchase_order.sector,
        'order_date', purchase_order.order_date,
        'data_classification', purchase_order.data_classification,
        'supplier', jsonb_build_object('id', supplier.id, 'name', supplier.name)
      ) as purchase_order
    from public.purchase_order_items as item
    join public.purchase_orders as purchase_order on purchase_order.id = item.purchase_order_id
    join public.suppliers as supplier on supplier.id = purchase_order.supplier_id
    where purchase_order.order_date >= p_start
      and purchase_order.order_date < p_through_exclusive
      and purchase_order.data_classification = 'operational'
    order by purchase_order.order_date desc, item.id asc
    limit p_limit
  ) as exported;
  return result;
end;
$$;
revoke all on function public.list_purchase_order_items_for_export(date, date, integer) from public;
grant execute on function public.list_purchase_order_items_for_export(date, date, integer) to authenticated;

commit;
