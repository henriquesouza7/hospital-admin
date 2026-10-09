create or replace function public.get_admission_dashboard_totals(
  p_start date,
  p_through_exclusive date
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
    or extract(month from p_start) <> 1
    or extract(day from p_start) <> 1
    or extract(month from p_through_exclusive) <> 1
    or extract(day from p_through_exclusive) <> 1
    or p_through_exclusive <> (p_start + interval '12 months')::date then
    raise exception 'Admission dashboard period is invalid' using errcode = '22023';
  end if;

  with months as (
    select generate_series(
      p_start::timestamp,
      (p_through_exclusive - interval '1 month')::timestamp,
      interval '1 month'
    )::date as month_start
  ), monthly as (
    select
      date_trunc('month', entry.entry_date)::date as month_start,
      sum(entry.quantity)::bigint as quantity
    from public.admission_entries as entry
    where entry.entry_date >= p_start
      and entry.entry_date < p_through_exclusive
    group by date_trunc('month', entry.entry_date)::date
  ), by_doctor as (
    select
      doctor.id,
      doctor.name,
      doctor.active,
      sum(entry.quantity)::bigint as quantity
    from public.admission_entries as entry
    join public.doctors as doctor on doctor.id = entry.doctor_id
    where entry.entry_date >= p_start
      and entry.entry_date < p_through_exclusive
    group by doctor.id
  )
  select jsonb_build_object(
    'monthly_totals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', extract(month from months.month_start)::integer,
        'quantity', coalesce(monthly.quantity, 0)::bigint
      ) order by months.month_start)
      from months
      left join monthly on monthly.month_start = months.month_start
    ), '[]'::jsonb),
    'annual_total', coalesce((select sum(quantity) from monthly), 0)::bigint,
    'by_doctor', coalesce((
      select jsonb_agg(jsonb_build_object(
        'doctor_id', by_doctor.id,
        'doctor_name', by_doctor.name,
        'doctor_active', by_doctor.active,
        'quantity', by_doctor.quantity
      ) order by by_doctor.name, by_doctor.id)
      from by_doctor
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_admission_dashboard_totals(date, date) from public;
grant execute on function public.get_admission_dashboard_totals(date, date) to authenticated;
