create or replace function public.transfer_surgery_waitlist_entry(p_waitlist_id uuid, p_surgery_day_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  queue_row public.surgery_waitlist%rowtype;
  day_capacity integer;
  active_count integer;
  new_appointment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_waitlist_id is null or p_surgery_day_id is null then
    raise exception 'Transfer input is invalid' using errcode = '22023';
  end if;

  select entry.* into queue_row from public.surgery_waitlist as entry
  where entry.id = p_waitlist_id for update;
  if not found or queue_row.status <> 'waiting' then
    raise exception 'Active waitlist entry not found' using errcode = 'P0002';
  end if;

  select day.capacity into day_capacity from public.surgery_days as day
  where day.id = p_surgery_day_id for update;
  if not found then
    raise exception 'Surgery day not found' using errcode = 'P0002';
  end if;
  select count(*)::integer into active_count from public.surgery_appointments as appointment
  where appointment.surgery_day_id = p_surgery_day_id
    and appointment.status in ('awaiting_confirmation', 'confirmed');
  if active_count >= day_capacity then
    raise exception 'No available capacity' using errcode = '23514';
  end if;

  insert into public.surgery_appointments (surgery_day_id, patient_id, source_waitlist_id, status)
  values (p_surgery_day_id, queue_row.patient_id, queue_row.id, 'confirmed')
  returning id into new_appointment_id;
  update public.surgery_waitlist set status = 'transferred', transferred_at = now(), updated_at = now()
  where id = queue_row.id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_waitlist', queue_row.id::text, 'transferred',
    jsonb_build_object('patient_id', queue_row.patient_id, 'surgery_day_id', p_surgery_day_id,
      'appointment_id', new_appointment_id, 'status', 'confirmed'));
  return new_appointment_id;
end;
$$;

revoke all on function public.transfer_surgery_waitlist_entry(uuid, uuid) from public;
grant execute on function public.transfer_surgery_waitlist_entry(uuid, uuid) to authenticated;
