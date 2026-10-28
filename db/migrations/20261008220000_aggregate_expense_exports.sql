-- Keep aggregate CSV exports in PostgreSQL instead of materializing each purchase item.
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
  order by months.month_start;
end;
$$;

revoke all on function public.list_monthly_expense_totals(date, date) from public;
grant execute on function public.list_monthly_expense_totals(date, date) to authenticated;

-- Return only aggregate surgery data and a bounded list for dashboard/export consumers.
create or replace function public.get_surgery_summary(
  p_start date,
  p_through_exclusive date,
  p_max_rows integer
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
  if not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_start is null
    or p_through_exclusive is null
    or p_max_rows is null
    or p_max_rows < 0
    or p_max_rows > 10001
    or p_start >= p_through_exclusive
    or p_through_exclusive > (p_start + interval '24 months')::date then
    raise exception 'Surgery summary period is invalid' using errcode = '22023';
  end if;

  with day_totals as (
    select
      day.id,
      day.procedure_date,
      day.capacity,
      count(appointment.id) filter (
        where appointment.status = 'awaiting_confirmation'
      )::integer as awaiting_confirmation,
      count(appointment.id) filter (
        where appointment.status = 'confirmed'
      )::integer as confirmed
    from public.surgery_days as day
    left join public.surgery_appointments as appointment
      on appointment.surgery_day_id = day.id
      and appointment.status in ('awaiting_confirmation', 'confirmed')
    where day.procedure_date >= p_start
      and day.procedure_date < p_through_exclusive
    group by day.id
  ), limited_days as (
    select *
    from day_totals
    order by procedure_date asc, id asc
    limit p_max_rows
  ), totals as (
    select
      coalesce(sum(capacity), 0)::bigint as capacity,
      coalesce(sum(awaiting_confirmation + confirmed), 0)::bigint as occupied,
      coalesce(sum(awaiting_confirmation), 0)::bigint as awaiting_confirmation,
      coalesce(sum(confirmed), 0)::bigint as confirmed
    from day_totals
  )
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', limited_days.id,
        'procedure_date', limited_days.procedure_date,
        'capacity', limited_days.capacity,
        'occupied', limited_days.awaiting_confirmation + limited_days.confirmed,
        'awaiting_confirmation', limited_days.awaiting_confirmation,
        'confirmed', limited_days.confirmed
      ) order by limited_days.procedure_date asc, limited_days.id asc)
      from limited_days
    ), '[]'::jsonb),
    'has_more', (select count(*) > p_max_rows from day_totals),
    'day_count', (select count(*)::bigint from day_totals),
    'waiting_count', (
      select count(*)::bigint
      from public.surgery_waitlist as waiting
      where waiting.status = 'waiting'
    ),
    'capacity', totals.capacity,
    'occupied', totals.occupied,
    'awaiting_confirmation', totals.awaiting_confirmation,
    'confirmed', totals.confirmed
  )
  into result
  from totals;

  return result;
end;
$$;

revoke all on function public.get_surgery_summary(date, date, integer) from public;
grant execute on function public.get_surgery_summary(date, date, integer) to authenticated;
