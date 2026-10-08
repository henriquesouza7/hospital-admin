create or replace function public.update_surgery_day_capacity(p_surgery_day_id uuid, p_capacity integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_capacity integer;
  active_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_surgery_day_id is null or p_capacity is null or p_capacity <= 0 then
    raise exception 'Capacity is invalid' using errcode = '22023';
  end if;

  select day.capacity into current_capacity
  from public.surgery_days as day where day.id = p_surgery_day_id for update;
  if not found then
    raise exception 'Surgery day not found' using errcode = 'P0002';
  end if;
  if current_capacity = p_capacity then
    return true;
  end if;

  select count(*)::integer into active_count
  from public.surgery_appointments as appointment
  where appointment.surgery_day_id = p_surgery_day_id
    and appointment.status in ('awaiting_confirmation', 'confirmed');
  if p_capacity < active_count then
    raise exception 'Capacity cannot be lower than active appointments' using errcode = '23514';
  end if;

  update public.surgery_days set capacity = p_capacity, updated_at = now()
  where id = p_surgery_day_id;
  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), 'surgery_day', p_surgery_day_id::text, 'capacity_changed',
    jsonb_build_object('previous_capacity', current_capacity, 'capacity', p_capacity));
  return true;
end;
$$;

revoke all on function public.update_surgery_day_capacity(uuid, integer) from public;
grant execute on function public.update_surgery_day_capacity(uuid, integer) to authenticated;
