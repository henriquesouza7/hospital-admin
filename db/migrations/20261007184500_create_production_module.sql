create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from neon_auth."user" as auth_user
    cross join lateral unnest(string_to_array(coalesce(auth_user.role, ''), ',')) as assigned_role(value)
    where auth_user.id::text = auth.user_id()
      and btrim(assigned_role.value) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.procedure_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedure_categories_name_key unique (name)
);

create unique index procedure_categories_name_normalized_key
  on public.procedure_categories (lower(btrim(name)));

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.procedure_categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  counting_unit text not null check (length(btrim(counting_unit)) between 1 and 40),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedures_category_name_key unique (category_id, name)
);

create unique index procedures_category_name_normalized_key
  on public.procedures (category_id, lower(btrim(name)));

create table public.production_entries (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures(id) on delete restrict,
  reference_period date not null,
  quantity numeric(13, 3) not null,
  source text not null check (length(btrim(source)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_entries_reference_period_month_start
    check (extract(day from reference_period) = 1),
  constraint production_entries_quantity_integer_nonnegative
    check (quantity >= 0 and quantity = trunc(quantity)),
  constraint production_entries_quantity_limit
    check (quantity < 10000000000)
);

create unique index production_entries_source_key
  on public.production_entries (
    procedure_id,
    reference_period,
    lower(btrim(source))
  );

create index procedure_categories_active_name_idx
  on public.procedure_categories (active, name);
create index procedures_category_active_name_idx
  on public.procedures (category_id, active, name);
create index production_entries_period_procedure_idx
  on public.production_entries (reference_period desc, procedure_id);
create index production_entries_procedure_period_idx
  on public.production_entries (procedure_id, reference_period desc);

alter table public.procedure_categories enable row level security;
alter table public.procedures enable row level security;
alter table public.production_entries enable row level security;

revoke all on public.procedure_categories from public;
revoke all on public.procedures from public;
revoke all on public.production_entries from public;
grant select on public.procedure_categories to authenticated;
grant select on public.procedures to authenticated;
grant select on public.production_entries to authenticated;

create policy procedure_categories_admin_select
  on public.procedure_categories for select to authenticated
  using ((select public.is_admin()));
create policy procedures_admin_select
  on public.procedures for select to authenticated
  using ((select public.is_admin()));
create policy production_entries_admin_select
  on public.production_entries for select to authenticated
  using ((select public.is_admin()));

create or replace function public.set_production_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_production_updated_at() from public, authenticated;

create trigger procedure_categories_set_updated_at
before update on public.procedure_categories
for each row execute function public.set_production_updated_at();
create trigger procedures_set_updated_at
before update on public.procedures
for each row execute function public.set_production_updated_at();
create trigger production_entries_set_updated_at
before update on public.production_entries
for each row execute function public.set_production_updated_at();

create or replace function public.audit_production_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  audited_entity text;
  audit_action text;
  audit_payload jsonb;
  row_id uuid;
begin
  if tg_table_name = 'procedure_categories' then
    audited_entity := 'procedure_category';
  elsif tg_table_name = 'procedures' then
    audited_entity := 'procedure';
  elsif tg_table_name = 'production_entries' then
    audited_entity := 'production_entry';
  else
    raise exception 'Unsupported production audit table: %', tg_table_name;
  end if;

  row_id := new.id;
  if tg_op = 'INSERT' then
    audit_action := 'created';
    audit_payload := jsonb_build_object(
      'after', to_jsonb(new) - 'created_at' - 'updated_at'
    );
  else
    if tg_table_name in ('procedure_categories', 'procedures') then
      if old.active is distinct from new.active then
        audit_action := case when new.active then 'activated' else 'deactivated' end;
      else
        audit_action := 'updated';
      end if;
    else
      audit_action := 'updated';
    end if;
    audit_payload := jsonb_build_object(
      'before', to_jsonb(old) - 'created_at' - 'updated_at',
      'after', to_jsonb(new) - 'created_at' - 'updated_at'
    );
  end if;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (auth.user_id(), audited_entity, row_id::text, audit_action, audit_payload);

  return new;
end;
$$;

revoke all on function public.audit_production_change() from public, authenticated;

create trigger procedure_categories_audit_change
after insert or update on public.procedure_categories
for each row execute function public.audit_production_change();
create trigger procedures_audit_change
after insert or update on public.procedures
for each row execute function public.audit_production_change();
create trigger production_entries_audit_change
after insert or update on public.production_entries
for each row execute function public.audit_production_change();

create or replace function public.create_procedure_category(p_name text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception 'Category name is invalid' using errcode = '22023';
  end if;
  insert into public.procedure_categories (name)
  values (btrim(p_name))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_procedure_category(p_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_name is null or length(btrim(p_name)) not between 1 and 120 then
    raise exception 'Category input is invalid' using errcode = '22023';
  end if;
  update public.procedure_categories set name = btrim(p_name) where id = p_id;
  if not found then raise exception 'Category not found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.set_procedure_category_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_active is null then
    raise exception 'Category status is invalid' using errcode = '22023';
  end if;
  if not p_active and exists (
    select 1 from public.procedures where category_id = p_id and active
  ) then
    raise exception 'Deactivate active procedures before the category' using errcode = '23514';
  end if;
  update public.procedure_categories set active = p_active where id = p_id;
  if not found then raise exception 'Category not found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.create_production_procedure(
  p_category_id uuid,
  p_name text,
  p_counting_unit text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_category_id is null
    or p_name is null or length(btrim(p_name)) not between 1 and 160
    or p_counting_unit is null or length(btrim(p_counting_unit)) not between 1 and 40 then
    raise exception 'Procedure input is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.procedure_categories where id = p_category_id and active
  ) then
    raise exception 'Category is unavailable' using errcode = '23503';
  end if;
  insert into public.procedures (category_id, name, counting_unit)
  values (p_category_id, btrim(p_name), btrim(p_counting_unit))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_production_procedure(
  p_id uuid,
  p_category_id uuid,
  p_name text,
  p_counting_unit text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_category_id is null
    or p_name is null or length(btrim(p_name)) not between 1 and 160
    or p_counting_unit is null or length(btrim(p_counting_unit)) not between 1 and 40 then
    raise exception 'Procedure input is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.procedure_categories where id = p_category_id and active
  ) then
    raise exception 'Category is unavailable' using errcode = '23503';
  end if;
  update public.procedures
  set category_id = p_category_id, name = btrim(p_name), counting_unit = btrim(p_counting_unit)
  where id = p_id;
  if not found then raise exception 'Procedure not found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.set_production_procedure_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_active is null then
    raise exception 'Procedure status is invalid' using errcode = '22023';
  end if;
  if p_active and not exists (
    select 1 from public.procedures as procedure
    join public.procedure_categories as category on category.id = procedure.category_id
    where procedure.id = p_id and category.active
  ) then
    raise exception 'Procedure category is unavailable' using errcode = '23503';
  end if;
  update public.procedures set active = p_active where id = p_id;
  if not found then raise exception 'Procedure not found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.create_production_entry(
  p_procedure_id uuid,
  p_reference_period date,
  p_quantity numeric,
  p_source text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_procedure_id is null or p_reference_period is null
    or extract(day from p_reference_period) <> 1
    or p_quantity is null or p_quantity < 0 or p_quantity >= 10000000000
    or p_quantity <> trunc(p_quantity)
    or p_source is null or length(btrim(p_source)) not between 1 and 80 then
    raise exception 'Production entry input is invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.procedures as procedure
    join public.procedure_categories as category on category.id = procedure.category_id
    where procedure.id = p_procedure_id and procedure.active and category.active
  ) then
    raise exception 'Procedure is unavailable' using errcode = '23503';
  end if;
  insert into public.production_entries (procedure_id, reference_period, quantity, source)
  values (p_procedure_id, p_reference_period, p_quantity, btrim(p_source))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_production_entry(
  p_id uuid,
  p_procedure_id uuid,
  p_reference_period date,
  p_quantity numeric,
  p_source text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_procedure_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_id is null or p_procedure_id is null or p_reference_period is null
    or extract(day from p_reference_period) <> 1
    or p_quantity is null or p_quantity < 0 or p_quantity >= 10000000000
    or p_quantity <> trunc(p_quantity)
    or p_source is null or length(btrim(p_source)) not between 1 and 80 then
    raise exception 'Production entry input is invalid' using errcode = '22023';
  end if;
  select procedure_id into existing_procedure_id
  from public.production_entries where id = p_id for update;
  if not found then raise exception 'Production entry not found' using errcode = 'P0002'; end if;
  if p_procedure_id <> existing_procedure_id and not exists (
    select 1 from public.procedures as procedure
    join public.procedure_categories as category on category.id = procedure.category_id
    where procedure.id = p_procedure_id and procedure.active and category.active
  ) then
    raise exception 'Procedure is unavailable' using errcode = '23503';
  end if;
  update public.production_entries
  set procedure_id = p_procedure_id,
      reference_period = p_reference_period,
      quantity = p_quantity,
      source = btrim(p_source)
  where id = p_id;
  return true;
end;
$$;

revoke all on function public.create_procedure_category(text) from public;
revoke all on function public.update_procedure_category(uuid, text) from public;
revoke all on function public.set_procedure_category_active(uuid, boolean) from public;
revoke all on function public.create_production_procedure(uuid, text, text) from public;
revoke all on function public.update_production_procedure(uuid, uuid, text, text) from public;
revoke all on function public.set_production_procedure_active(uuid, boolean) from public;
revoke all on function public.create_production_entry(uuid, date, numeric, text) from public;
revoke all on function public.update_production_entry(uuid, uuid, date, numeric, text) from public;

grant execute on function public.create_procedure_category(text) to authenticated;
grant execute on function public.update_procedure_category(uuid, text) to authenticated;
grant execute on function public.set_procedure_category_active(uuid, boolean) to authenticated;
grant execute on function public.create_production_procedure(uuid, text, text) to authenticated;
grant execute on function public.update_production_procedure(uuid, uuid, text, text) to authenticated;
grant execute on function public.set_production_procedure_active(uuid, boolean) to authenticated;
grant execute on function public.create_production_entry(uuid, date, numeric, text) to authenticated;
grant execute on function public.update_production_entry(uuid, uuid, date, numeric, text) to authenticated;
