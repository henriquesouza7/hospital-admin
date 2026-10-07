begin;

alter table public.fiscal_imports
  add constraint fiscal_imports_order_id_id_key
  unique (purchase_order_id, id);

alter table public.purchase_order_items
  add constraint purchase_order_items_order_id_id_key
  unique (purchase_order_id, id);

create table public.fiscal_import_items (
  id uuid primary key default gen_random_uuid(),
  fiscal_import_id uuid not null,
  purchase_order_id uuid not null,
  purchase_order_item_id uuid not null unique,
  n_item smallint not null check (n_item > 0),
  supplier_product_code text not null check (length(supplier_product_code) <= 60),
  product_description text not null
    check (length(product_description) between 1 and 255 and length(btrim(product_description)) > 0),
  commercial_unit text not null check (length(commercial_unit) <= 10),
  original_quantity text not null
    check (original_quantity ~ '^[0-9]{1,24}([.][0-9]{1,24})?$'),
  original_unit_price text not null
    check (original_unit_price ~ '^[0-9]{1,24}([.][0-9]{1,24})?$'),
  original_product_total text not null
    check (original_product_total ~ '^[0-9]{1,24}([.][0-9]{1,2})?$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint fiscal_import_items_import_number_key
    unique (fiscal_import_id, n_item),
  constraint fiscal_import_items_import_order_key
    foreign key (purchase_order_id, fiscal_import_id)
    references public.fiscal_imports (purchase_order_id, id)
    on delete restrict,
  constraint fiscal_import_items_purchase_order_item_key
    foreign key (purchase_order_id, purchase_order_item_id)
    references public.purchase_order_items (purchase_order_id, id)
    on delete restrict
);

alter table public.fiscal_import_items enable row level security;
grant select on public.fiscal_import_items to authenticated;
revoke insert, update, delete on public.fiscal_import_items
  from public, authenticated;

create policy fiscal_import_items_admin_select
  on public.fiscal_import_items
  for select to authenticated
  using ((select public.is_finance_admin()));

drop function if exists public.create_fiscal_import_purchase_order(
  text, uuid, date, text, jsonb, text, text, text, text, text, text, numeric, text
);

create function public.create_fiscal_import_purchase_order(
  p_sector text,
  p_supplier_id uuid,
  p_order_date date,
  p_notes text,
  p_items jsonb,
  p_access_key text,
  p_issuer_tax_id text,
  p_issuer_name text,
  p_invoice_number text,
  p_invoice_series text,
  p_issued_at text,
  p_invoice_total numeric,
  p_xml_sha256 text,
  p_fiscal_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_order_id uuid;
  new_import_id uuid;
  fiscal_item_count integer;
  purchase_item_count integer;
begin
  if not public.is_finance_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_access_key !~ '^[0-9]{44}$'
    or p_issuer_name is null or length(trim(p_issuer_name)) = 0
    or p_invoice_number is null or p_invoice_series is null
    or p_issued_at is null
    or p_invoice_total is null or p_invoice_total < 0
    or p_xml_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid fiscal import metadata' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 100
    or jsonb_typeof(p_fiscal_items) is distinct from 'array'
    or jsonb_array_length(p_fiscal_items) not between 1 and 100
    or jsonb_array_length(p_items) <> jsonb_array_length(p_fiscal_items) then
    raise exception 'Fiscal item mapping is incomplete' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_fiscal_items) as source_item(
      n_item text,
      supplier_product_code text,
      product_description text,
      commercial_unit text,
      original_quantity text,
      original_unit_price text,
      original_product_total text,
      product_id uuid
    )
    where source_item.n_item is null
      or source_item.n_item !~ '^[0-9]{1,3}$'
      or source_item.n_item::integer < 1
      or source_item.supplier_product_code is null
      or length(source_item.supplier_product_code) > 60
      or source_item.product_description is null
      or length(source_item.product_description) not between 1 and 255
      or length(btrim(source_item.product_description)) = 0
      or source_item.commercial_unit is null
      or length(source_item.commercial_unit) > 10
      or source_item.original_quantity is null
      or source_item.original_quantity !~ '^[0-9]{1,24}([.][0-9]{1,24})?$'
      or source_item.original_unit_price is null
      or source_item.original_unit_price !~ '^[0-9]{1,24}([.][0-9]{1,24})?$'
      or source_item.original_product_total is null
      or source_item.original_product_total !~ '^[0-9]{1,24}([.][0-9]{1,2})?$'
      or source_item.product_id is null
  ) then
    raise exception 'Original fiscal item data is invalid' using errcode = '22023';
  end if;

  if exists (
    select source_item.n_item
    from jsonb_to_recordset(p_fiscal_items) as source_item(n_item text)
    group by source_item.n_item
    having count(*) > 1
  ) or exists (
    select source_item.product_id
    from jsonb_to_recordset(p_fiscal_items) as source_item(product_id uuid)
    group by source_item.product_id
    having count(*) > 1
  ) then
    raise exception 'Fiscal item mappings must be unique' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as order_item(product_id uuid)
    left join jsonb_to_recordset(p_fiscal_items) as source_item(product_id uuid)
      on source_item.product_id = order_item.product_id
    where order_item.product_id is null or source_item.product_id is null
  ) or exists (
    select 1
    from jsonb_to_recordset(p_fiscal_items) as source_item(product_id uuid)
    left join jsonb_to_recordset(p_items) as order_item(product_id uuid)
      on order_item.product_id = source_item.product_id
    where source_item.product_id is null or order_item.product_id is null
  ) then
    raise exception 'Fiscal and administrative item mappings differ' using errcode = '22023';
  end if;

  new_order_id := public.create_purchase_order(
    p_sector, p_supplier_id, p_order_date,
    p_notes, p_items
  );

  insert into public.fiscal_imports (
    purchase_order_id, access_key, issuer_tax_id, issuer_name,
    invoice_number, invoice_series, issued_at, order_date,
    invoice_total, xml_sha256
  ) values (
    new_order_id, p_access_key, nullif(trim(p_issuer_tax_id), ''),
    p_issuer_name, p_invoice_number, p_invoice_series, p_issued_at,
    p_order_date, p_invoice_total, p_xml_sha256
  ) returning id into new_import_id;

  insert into public.fiscal_import_items (
    fiscal_import_id, purchase_order_id, purchase_order_item_id, n_item,
    supplier_product_code, product_description, commercial_unit,
    original_quantity, original_unit_price, original_product_total
  )
  select
    new_import_id,
    new_order_id,
    order_item.id,
    source_item.n_item::smallint,
    source_item.supplier_product_code,
    source_item.product_description,
    source_item.commercial_unit,
    source_item.original_quantity,
    source_item.original_unit_price,
    source_item.original_product_total
  from jsonb_to_recordset(p_fiscal_items) as source_item(
    n_item text,
    supplier_product_code text,
    product_description text,
    commercial_unit text,
    original_quantity text,
    original_unit_price text,
    original_product_total text,
    product_id uuid
  )
  join public.purchase_order_items as order_item
    on order_item.purchase_order_id = new_order_id
    and order_item.product_id = source_item.product_id;

  get diagnostics fiscal_item_count = row_count;
  select count(*) into purchase_item_count
  from public.purchase_order_items
  where purchase_order_id = new_order_id;
  if fiscal_item_count <> purchase_item_count then
    raise exception 'Fiscal item persistence is incomplete' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    auth.user_id(),
    'fiscal_import',
    new_import_id::text,
    'created',
    jsonb_build_object(
      'purchase_order_id', new_order_id,
      'source_type', 'nfe_xml',
      'invoice_number', p_invoice_number,
      'invoice_series', p_invoice_series,
      'order_date', p_order_date,
      'item_count', fiscal_item_count
    )
  );

  return new_order_id;
end;
$$;

revoke all on function public.create_fiscal_import_purchase_order(
  text, uuid, date, text, jsonb, text, text, text, text, text, text, numeric, text, jsonb
) from public;
grant execute on function public.create_fiscal_import_purchase_order(
  text, uuid, date, text, jsonb, text, text, text, text, text, text, numeric, text, jsonb
) to authenticated;

commit;
