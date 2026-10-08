drop function public.list_minor_surgery_audit(bigint);

create function public.list_minor_surgery_audit(p_offset bigint)
returns table (
  id bigint,
  actor_id text,
  actor_name text,
  subject text,
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
  select logs.id, logs.actor_id, actor.name,
    case logs.entity_type
      when 'surgery_day' then coalesce(
        to_char(day.procedure_date, 'DD/MM/YYYY'),
        'Dia ' || coalesce(logs.entity_id, 'indisponível')
      )
      when 'surgery_patient' then coalesce(
        patient.name,
        'Cadastro ' || coalesce(logs.entity_id, 'indisponível')
      )
      when 'surgery_appointment' then
        'Agendamento · ' || coalesce(patient.name, 'pessoa indisponível') ||
        ' · ' || coalesce(to_char(day.procedure_date, 'DD/MM/YYYY'),
          'registro ' || coalesce(logs.entity_id, 'indisponível'))
      when 'surgery_waitlist' then
        'Fila · ' || coalesce(patient.name, 'pessoa indisponível') ||
        case when day.procedure_date is not null
          then ' · ' || to_char(day.procedure_date, 'DD/MM/YYYY')
          else ' · registro ' || coalesce(logs.entity_id, 'indisponível')
        end
      else 'Registro ' || coalesce(logs.entity_id, 'indisponível')
    end,
    logs.entity_type, logs.entity_id, logs.action, logs.payload, logs.created_at
  from public.audit_logs as logs
  left join neon_auth."user" as actor on actor.id::text = logs.actor_id
  left join public.patients as patient
    on patient.id::text = case
      when logs.entity_type = 'surgery_patient' then logs.entity_id
      else logs.payload->>'patient_id'
    end
  left join public.surgery_days as day
    on day.id::text = case
      when logs.entity_type = 'surgery_day' then logs.entity_id
      else logs.payload->>'surgery_day_id'
    end
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

create index audit_logs_minor_surgery_created_at_id_idx
  on public.audit_logs (created_at desc, id desc)
  where entity_type in (
    'surgery_day',
    'surgery_patient',
    'surgery_appointment',
    'surgery_waitlist'
  );
