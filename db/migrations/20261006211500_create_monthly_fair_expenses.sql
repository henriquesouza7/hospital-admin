-- Store one consolidated, editable amount for each fair expense month.

create table public.monthly_fair_expenses (
  id uuid primary key default gen_random_uuid(),
  competence date not null,
  total_amount numeric(12, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_fair_expenses_competence_month_start
    check (extract(day from competence) = 1),
  constraint monthly_fair_expenses_competence_key unique (competence),
  constraint monthly_fair_expenses_total_amount_nonnegative
    check (total_amount >= 0),
  constraint monthly_fair_expenses_notes_length
    check (notes is null or length(notes) <= 1000)
);

create index monthly_fair_expenses_competence_desc_idx
  on public.monthly_fair_expenses (competence desc);

alter table public.monthly_fair_expenses enable row level security;
revoke all on public.monthly_fair_expenses from public;
grant select on public.monthly_fair_expenses to authenticated;

create policy monthly_fair_expenses_admin_select
  on public.monthly_fair_expenses
  for select to authenticated
  using ((select public.is_finance_admin()));

create or replace function public.create_monthly_fair_expense(
  p_competence date,
  p_total_amount numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_expense_id uuid;
  normalized_notes text;
begin
  if not public.is_finance_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_competence is null or extract(day from p_competence) <> 1 then
    raise exception 'Competence must be the first day of a month' using errcode = '22023';
  end if;

  if p_total_amount is null or p_total_amount < 0
    or p_total_amount >= 10000000000
    or p_total_amount <> round(p_total_amount, 2) then
    raise exception 'Monthly fair total is invalid' using errcode = '22023';
  end if;

  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Notes exceed the allowed length' using errcode = '22023';
  end if;
  normalized_notes := nullif(btrim(p_notes), '');

  insert into public.monthly_fair_expenses (competence, total_amount, notes)
  values (p_competence, p_total_amount, normalized_notes)
  returning id into new_expense_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'monthly_fair_expense',
    new_expense_id::text,
    'created',
    jsonb_build_object(
      'competence', p_competence,
      'total_amount', p_total_amount
    )
  );

  return new_expense_id;
end;
$$;

revoke all on function public.create_monthly_fair_expense(date, numeric, text) from public;
grant execute on function public.create_monthly_fair_expense(date, numeric, text) to authenticated;

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

  select expense.competence, expense.total_amount
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
      'total_amount', p_total_amount
    )
  );

  return true;
end;
$$;

revoke all on function public.update_monthly_fair_expense(uuid, numeric, text) from public;
grant execute on function public.update_monthly_fair_expense(uuid, numeric, text) to authenticated;
