drop function public.list_minor_surgery_audit();

create function public.list_minor_surgery_audit(p_offset bigint)
returns table (
  id bigint,
  entity_type text,
  entity_id text,
  action text,
  payload jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception 'Audit offset is invalid' using errcode = '22023';
  end if;

  return query
  select logs.id, logs.entity_type, logs.entity_id, logs.action, logs.payload, logs.created_at
  from public.audit_logs as logs
  where logs.entity_type in (
    'surgery_day',
    'surgery_patient',
    'surgery_appointment',
    'surgery_waitlist'
  )
  order by logs.created_at desc, logs.id desc
  limit 51 offset p_offset;
end;
$$;

revoke all on function public.list_minor_surgery_audit(bigint) from public;
grant execute on function public.list_minor_surgery_audit(bigint) to authenticated;
