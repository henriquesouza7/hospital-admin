-- Restrict order changes and preserve product descriptions on purchased items.

alter table public.purchase_order_items
  add column product_name_snapshot text,
  add column product_presentation_snapshot text,
  add column product_category_snapshot text;

update public.purchase_order_items as item
set product_name_snapshot = product.name,
    product_presentation_snapshot = product.presentation,
    product_category_snapshot = product.category
from public.products as product
where product.id = item.product_id;

alter table public.purchase_order_items
  alter column product_name_snapshot set not null,
  alter column product_presentation_snapshot set not null;

drop policy purchase_orders_admin_access on public.purchase_orders;

create policy purchase_orders_admin_select
  on public.purchase_orders
  for select to authenticated
  using ((select public.is_finance_admin()));

revoke insert, update, delete on public.purchase_orders from authenticated;
grant select on public.purchase_orders to authenticated;

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

  insert into public.purchase_order_items (
    purchase_order_id,
    product_id,
    quantity,
    unit_price,
    product_name_snapshot,
    product_presentation_snapshot,
    product_category_snapshot
  )
  select
    new_order_id,
    item.product_id,
    item.quantity,
    item.unit_price,
    product.name,
    product.presentation,
    product.category
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
  join public.products as product on product.id = item.product_id;

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
