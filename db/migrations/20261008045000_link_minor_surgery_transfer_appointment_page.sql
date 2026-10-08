create index if not exists surgery_appointments_day_created_at_id_idx
  on public.surgery_appointments (surgery_day_id, created_at, id);

create function public.list_minor_surgery_transfer_destinations(
  p_waitlist_ids uuid[]
)
returns table (
  source_waitlist_id uuid,
  appointment_id uuid,
  surgery_day_id uuid,
  procedure_date date,
  appointment_page integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_waitlist_ids is null or cardinality(p_waitlist_ids) > 50 then
    raise exception 'At most 50 waitlist IDs are allowed' using errcode = '22023';
  end if;

  return query
  with destinations as materialized (
    select
      appointment.source_waitlist_id,
      appointment.id as appointment_id,
      appointment.surgery_day_id,
      day.procedure_date
    from public.surgery_appointments as appointment
    join public.surgery_days as day on day.id = appointment.surgery_day_id
    where appointment.source_waitlist_id = any(p_waitlist_ids)
  ),
  ranked_appointments as (
    select
      appointment.id,
      row_number() over (
        partition by appointment.surgery_day_id
        order by appointment.created_at, appointment.id
      ) as position
    from public.surgery_appointments as appointment
    where appointment.surgery_day_id in (
      select distinct destination.surgery_day_id from destinations as destination
    )
  )
  select
    destination.source_waitlist_id,
    destination.appointment_id,
    destination.surgery_day_id,
    destination.procedure_date,
    ((ranked.position - 1) / 50 + 1)::integer
  from destinations as destination
  join ranked_appointments as ranked on ranked.id = destination.appointment_id
  order by destination.source_waitlist_id;
end;
$$;

revoke all on function public.list_minor_surgery_transfer_destinations(uuid[])
  from public;
grant execute on function public.list_minor_surgery_transfer_destinations(uuid[])
  to authenticated;
