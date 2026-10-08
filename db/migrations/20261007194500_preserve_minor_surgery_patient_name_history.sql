create or replace function public.update_surgery_patient(p_patient_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_name text;
  normalized_name text := nullif(
    regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_patient_id is null or normalized_name is null or char_length(normalized_name) > 160 then
    raise exception 'Patient input is invalid' using errcode = '22023';
  end if;

  select patient.name into current_name
  from public.patients as patient
  where patient.id = p_patient_id
  for update;
  if not found then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;
  if current_name = normalized_name then
    return true;
  end if;

  update public.patients
  set name = normalized_name, updated_at = now()
  where id = p_patient_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'surgery_patient',
    p_patient_id::text,
    'updated',
    jsonb_build_object(
      'name', jsonb_build_object('old', current_name, 'new', normalized_name)
    )
  );
  return true;
end;
$$;

revoke all on function public.update_surgery_patient(uuid, text) from public;
grant execute on function public.update_surgery_patient(uuid, text) to authenticated;
