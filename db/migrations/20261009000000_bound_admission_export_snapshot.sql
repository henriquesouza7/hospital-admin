create or replace function public.list_admission_entries_for_export(
  p_start_date date,
  p_end_date date,
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
  if p_start_date is null or p_end_date is null
    or p_start_date < date '1900-01-01'
    or p_end_date > date '2101-01-01'
    or p_start_date >= p_end_date
    or p_end_date > (p_start_date + interval '24 months')::date then
    raise exception 'Admission export period is invalid' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10001 then
    raise exception 'Admission export limit is invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'entry_date', exported.entry_date,
        'quantity', exported.quantity,
        'doctor_name', exported.doctor_name
      ) order by exported.entry_date desc, exported.id asc
    ),
    '[]'::jsonb
  )
  into result
  from (
    select
      entry.id,
      entry.entry_date,
      entry.quantity,
      doctor.name as doctor_name
    from public.admission_entries as entry
    join public.doctors as doctor on doctor.id = entry.doctor_id
    where entry.entry_date >= p_start_date
      and entry.entry_date < p_end_date
    order by entry.entry_date desc, entry.id asc
    limit p_limit
  ) as exported;

  return result;
end;
$$;

revoke all on function public.list_admission_entries_for_export(date, date, integer)
  from public;
grant execute on function public.list_admission_entries_for_export(date, date, integer)
  to authenticated;
