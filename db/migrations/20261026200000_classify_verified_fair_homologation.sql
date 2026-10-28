-- Classify one verified synthetic fair expense without inferring provenance from dates or actors.
-- Outside this exact inherited homologation record, this migration makes no data change.
do $$
declare
  expense record;
begin
  select id, competence, total_amount, notes, created_at, updated_at,
    data_classification
  into expense
  from public.monthly_fair_expenses
  where id = '96eadfa8-cc9f-4558-b343-e10a7cb947fc'::uuid
  for update;

  if not found then
    return;
  end if;

  if expense.competence <> date '2026-10-01'
    or expense.total_amount <> 1250.50
    or expense.notes is distinct from 'Registro sintético de homologação 20261020'
    or expense.created_at <> timestamptz '2026-10-20 14:05:00.553548+00'
    or expense.updated_at <> expense.created_at
    or expense.data_classification not in ('operational', 'test') then
    raise exception 'Verified fair homologation record has changed'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.audit_logs as audit
    where audit.entity_type = 'monthly_fair_expense'
      and audit.entity_id = expense.id::text
      and audit.action = 'created'
      and audit.actor_id is not null
      and audit.payload->>'competence' = '2026-10-01'
      and (audit.payload->>'total_amount')::numeric = 1250.50
  ) then
    raise exception 'Verified fair homologation creation audit is missing'
      using errcode = '23514';
  end if;

  if expense.data_classification = 'operational' then
    update public.monthly_fair_expenses
    set data_classification = 'test'
    where id = expense.id;

    insert into public.audit_logs (
      actor_id, entity_type, entity_id, action, payload
    ) values (
      null,
      'monthly_fair_expense',
      expense.id::text,
      'data_classification_corrected',
      jsonb_build_object(
        'previous_data_classification', 'operational',
        'data_classification', 'test',
        'migration', '20261026200000_classify_verified_fair_homologation'
      )
    );
  end if;
end;
$$;
