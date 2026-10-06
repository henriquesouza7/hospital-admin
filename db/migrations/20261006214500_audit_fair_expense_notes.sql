-- Preserve normalized observation changes in the monthly fair audit event.

create or replace function public.update_monthly_fair_expense(
  p_id uuid,
  p_total_amount numeric,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_expense record;
  normalized_notes text;
begin
  if not public.is_finance_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_id is null or p_total_amount is null or p_total_amount < 0
    or p_total_amount >= 10000000000
    or p_total_amount <> round(p_total_amount, 2) then
    raise exception 'Monthly fair total is invalid' using errcode = '22023';
  end if;

  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Notes exceed the allowed length' using errcode = '22023';
  end if;
  normalized_notes := nullif(btrim(p_notes), '');

  select expense.competence, expense.total_amount, expense.notes
  into current_expense
  from public.monthly_fair_expenses as expense
  where expense.id = p_id
  for update;

  if not found then
    raise exception 'Monthly fair expense not found' using errcode = 'P0002';
  end if;

  update public.monthly_fair_expenses
  set total_amount = p_total_amount,
      notes = normalized_notes,
      updated_at = now()
  where id = p_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'monthly_fair_expense',
    p_id::text,
    'updated',
    jsonb_build_object(
      'competence', current_expense.competence,
      'previous_total_amount', current_expense.total_amount,
      'total_amount', p_total_amount,
      'previous_notes', current_expense.notes,
      'notes', normalized_notes
    )
  );

  return true;
end;
$$;

revoke all on function public.update_monthly_fair_expense(uuid, numeric, text) from public;
grant execute on function public.update_monthly_fair_expense(uuid, numeric, text) to authenticated;
