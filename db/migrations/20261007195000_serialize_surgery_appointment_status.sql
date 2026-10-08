create or replace function public.update_surgery_appointment_status(p_appointment_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  appointment_row public.surgery_appointments%rowtype;
  day_capacity integer;
  active_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_appointment_id is null or p_status not in ('awaiting_confirmation', 'confirmed', 'cancelled') then
    raise exception 'Appointment status is invalid' using errcode = '22023';
  end if;

  select appointment.* into appointment_row
  from public.surgery_appointments as appointment
  where appointment.id = p_appointment_id
  for update;
  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;
  if appointment_row.status = p_status then
    return true;
  end if;

  perform 1 from public.surgery_days as day
  where day.id = appointment_row.surgery_day_id
  for update;
  if p_status in ('awaiting_confirmation', 'confirmed') then
    select day.capacity into day_capacity from public.surgery_days as day
    where day.id = appointment_row.surgery_day_id;
    select count(*)::integer into active_count
    from public.surgery_appointments as appointment
    where appointment.surgery_day_id = appointment_row.surgery_day_id
      and appointment.id <> p_appointment_id
      and appointment.status in ('awaiting_confirmation', 'confirmed');
    if active_count >= day_capacity then
      raise exception 'No available capacity' using errcode = '23514';
    end if;
  end if;

  update public.surgery_appointments set status = p_status, updated_at = now()
  where id = p_appointment_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_appointment', p_appointment_id::text,
    case when p_status = 'cancelled' then 'cancelled' else 'status_changed' end,
    jsonb_build_object('patient_id', appointment_row.patient_id, 'surgery_day_id', appointment_row.surgery_day_id,
      'previous_status', appointment_row.status, 'status', p_status));
  return true;
end;
$$;

revoke all on function public.update_surgery_appointment_status(uuid, text) from public;
grant execute on function public.update_surgery_appointment_status(uuid, text) to authenticated;
