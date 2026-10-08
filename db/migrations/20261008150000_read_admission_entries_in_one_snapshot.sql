create or replace function public.list_admission_entries(
  p_start_date date,
  p_end_date date,
  p_doctor_id uuid default null
)
returns jsonb
language plpgsql
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
    or p_start_date >= p_end_date then
    raise exception 'Admission entry period is invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', entry.id,
        'doctor_id', entry.doctor_id,
        'entry_date', entry.entry_date,
        'quantity', entry.quantity,
        'created_at', entry.created_at,
        'updated_at', entry.updated_at
      ) order by entry.entry_date desc, entry.id asc
    ),
    '[]'::jsonb
  )
  into result
  from public.admission_entries as entry
  where entry.entry_date >= p_start_date
    and entry.entry_date < p_end_date
    and (p_doctor_id is null or entry.doctor_id = p_doctor_id);

  return result;
end;
$$;

revoke all on function public.list_admission_entries(date, date, uuid)
  from public;
grant execute on function public.list_admission_entries(date, date, uuid)
  to authenticated;
