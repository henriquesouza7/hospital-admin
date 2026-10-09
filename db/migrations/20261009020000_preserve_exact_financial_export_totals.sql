create function public.list_monthly_expense_totals_exact(
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

  if p_start is null
    or p_through_exclusive is null
    or p_start >= p_through_exclusive
    or extract(day from p_start) <> 1
    or extract(day from p_through_exclusive) <> 1
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Expense export period is invalid' using errcode = '22023';
  end if;

  return query
  with months as (
    select generate_series(
      p_start::timestamp,
      (p_through_exclusive - interval '1 month')::timestamp,
      interval '1 month'
    )::date as month_start
  ), purchase_totals as (
    select
      date_trunc('month', orders.order_date)::date as month_start,
      coalesce(sum(items.line_total) filter (where orders.sector = 'farmacia'), 0)::numeric as pharmacy_total,
      coalesce(sum(items.line_total) filter (where orders.sector = 'laboratorio'), 0)::numeric as laboratory_total,
      (count(items.id) filter (where orders.sector = 'farmacia'))::integer as pharmacy_item_count,
      (count(items.id) filter (where orders.sector = 'laboratorio'))::integer as laboratory_item_count
    from public.purchase_orders as orders
    join public.purchase_order_items as items
      on items.purchase_order_id = orders.id
    where orders.order_date >= p_start
      and orders.order_date < p_through_exclusive
    group by date_trunc('month', orders.order_date)::date
  )
  select
    months.month_start,
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
  order by months.month_start;
end;
$$;

revoke all on function public.list_monthly_expense_totals_exact(date, date)
  from public;
grant execute on function public.list_monthly_expense_totals_exact(date, date)
  to authenticated;
