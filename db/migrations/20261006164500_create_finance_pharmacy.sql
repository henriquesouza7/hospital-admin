-- Shared financial purchasing schema for the pharmacy sector.

create or replace function public.is_finance_admin()
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

revoke all on function public.is_finance_admin() from public;
grant execute on function public.is_finance_admin() to authenticated;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  is_active boolean not null default true,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sector text not null check (sector in ('farmacia', 'laboratorio')),
  name text not null check (length(btrim(name)) between 1 and 160),
  category text check (category is null or length(btrim(category)) <= 80),
  presentation text not null check (length(btrim(presentation)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sector_name_presentation_key unique (sector, name, presentation)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  sector text not null check (sector in ('farmacia', 'laboratorio')),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_date date not null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now(),
  constraint purchase_order_items_order_product_key unique (purchase_order_id, product_id)
);

create view public.purchase_order_summaries with (security_invoker = true) as
select
  purchase_order.id,
  purchase_order.sector,
  purchase_order.order_date,
  purchase_order.supplier_id,
  supplier.name as supplier_name,
  count(item.id)::integer as item_count,
  coalesce(sum(item.line_total), 0)::numeric(14, 2) as total,
  purchase_order.created_at,
  purchase_order.updated_at
from public.purchase_orders as purchase_order
join public.suppliers as supplier on supplier.id = purchase_order.supplier_id
left join public.purchase_order_items as item on item.purchase_order_id = purchase_order.id
group by purchase_order.id, supplier.name;

create index suppliers_active_name_idx on public.suppliers (is_active, name);
create index products_sector_active_name_idx on public.products (sector, is_active, name);
create index purchase_orders_sector_date_idx on public.purchase_orders (sector, order_date desc);
create index purchase_orders_supplier_date_idx on public.purchase_orders (supplier_id, order_date desc);
create index purchase_order_items_product_idx on public.purchase_order_items (product_id, created_at desc);

create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_finance_updated_at() from public, authenticated;

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_finance_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_finance_updated_at();

create trigger purchase_orders_set_updated_at
before update on public.purchase_orders
for each row execute function public.set_finance_updated_at();

create or replace function public.audit_finance_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  entity_type text;
  changed_row jsonb;
begin
  if tg_table_name = 'suppliers' then
    entity_type := 'supplier';
  elsif tg_table_name = 'products' then
    entity_type := 'product';
  elsif tg_table_name = 'purchase_orders' then
    entity_type := 'purchase_order';
  else
    raise exception 'Unsupported finance audit table: %', tg_table_name;
  end if;

  if tg_op = 'INSERT' then
    changed_row := to_jsonb(new) - 'created_at' - 'updated_at';
  else
    select coalesce(jsonb_object_agg(current_field.key, current_field.value), '{}'::jsonb)
    into changed_row
    from jsonb_each(to_jsonb(new)) as current_field
    where current_field.key not in ('created_at', 'updated_at')
      and current_field.value is distinct from (to_jsonb(old) -> current_field.key);
  end if;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    entity_type,
    new.id::text,
    lower(tg_op),
    jsonb_build_object('changes', changed_row)
  );

  return new;
end;
$$;

revoke all on function public.audit_finance_change() from public, authenticated;

create trigger suppliers_audit_change
after insert or update on public.suppliers
for each row execute function public.audit_finance_change();

create trigger products_audit_change
after insert or update on public.products
for each row execute function public.audit_finance_change();

create trigger purchase_orders_audit_change
after update on public.purchase_orders
for each row execute function public.audit_finance_change();

create or replace function public.create_purchase_order(
  p_sector text,
  p_supplier_id uuid,
  p_order_date date,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_order_id uuid;
  item_count integer;
  order_total numeric(14, 2);
begin
  if not public.is_finance_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_sector not in ('farmacia', 'laboratorio') then
    raise exception 'Invalid purchase order sector' using errcode = '22023';
  end if;

  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'Notes exceed the allowed length' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'A purchase order must contain between 1 and 100 items' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
    where item.product_id is null or item.quantity is null or item.quantity <= 0
      or item.unit_price is null or item.unit_price < 0
      or item.quantity >= 1000000000 or item.quantity <> round(item.quantity, 3)
      or item.unit_price >= 10000000000 or item.unit_price <> round(item.unit_price, 2)
  ) then
    raise exception 'Purchase order item values are invalid' using errcode = '22023';
  end if;

  if exists (
    select item.product_id
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
    group by item.product_id
    having count(*) > 1
  ) then
    raise exception 'A product can appear only once in a purchase order' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.suppliers
    where id = p_supplier_id and is_active
  ) then
    raise exception 'Supplier is unavailable' using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
    left join public.products as product
      on product.id = item.product_id
      and product.sector = p_sector
      and product.is_active
    where product.id is null
  ) then
    raise exception 'One or more products are unavailable for this sector' using errcode = '23503';
  end if;

  insert into public.purchase_orders (sector, supplier_id, order_date, notes)
  values (p_sector, p_supplier_id, p_order_date, nullif(btrim(p_notes), ''))
  returning id into new_order_id;

  insert into public.purchase_order_items (purchase_order_id, product_id, quantity, unit_price)
  select new_order_id, item.product_id, item.quantity, item.unit_price
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric);

  select count(*), coalesce(sum(line_total), 0)
  into item_count, order_total
  from public.purchase_order_items
  where purchase_order_id = new_order_id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'purchase_order',
    new_order_id::text,
    'created',
    jsonb_build_object(
      'sector', p_sector,
      'supplier_id', p_supplier_id,
      'order_date', p_order_date,
      'item_count', item_count,
      'total', order_total
    )
  );

  return new_order_id;
end;
$$;

revoke all on function public.create_purchase_order(text, uuid, date, text, jsonb) from public;
grant execute on function public.create_purchase_order(text, uuid, date, text, jsonb) to authenticated;

alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

revoke all on public.suppliers, public.products, public.purchase_orders, public.purchase_order_items from public;
grant select, insert, update on public.suppliers, public.products to authenticated;
grant select, update on public.purchase_orders to authenticated;
grant select on public.purchase_order_items to authenticated;

create policy suppliers_admin_access on public.suppliers
  for all to authenticated
  using ((select public.is_finance_admin()))
  with check ((select public.is_finance_admin()));

create policy products_admin_access on public.products
  for all to authenticated
  using ((select public.is_finance_admin()))
  with check ((select public.is_finance_admin()));

create policy purchase_orders_admin_access on public.purchase_orders
  for all to authenticated
  using ((select public.is_finance_admin()))
  with check ((select public.is_finance_admin()));

create policy purchase_order_items_admin_access on public.purchase_order_items
  for select to authenticated
  using ((select public.is_finance_admin()));

grant select on public.suppliers, public.products, public.purchase_orders, public.purchase_order_items to authenticated;
grant select on public.purchase_order_summaries to authenticated;
