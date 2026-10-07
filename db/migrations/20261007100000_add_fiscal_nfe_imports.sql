create table public.fiscal_imports (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null unique references public.purchase_orders(id) on delete restrict,
  source_type text not null default 'nfe_xml' check (source_type = 'nfe_xml'),
  access_key text not null unique check (access_key ~ '^[0-9]{44}$'),
  issuer_tax_id text,
  issuer_name text not null check (length(trim(issuer_name)) > 0),
  invoice_number text not null,
  invoice_series text not null,
  issued_at text not null,
  order_date date not null,
  invoice_total numeric(14, 2) not null check (invoice_total >= 0),
  xml_sha256 text not null check (xml_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.fiscal_imports enable row level security;
grant select on public.fiscal_imports to authenticated;

create policy fiscal_imports_admin_select
  on public.fiscal_imports
  for select to authenticated
  using ((select public.is_finance_admin()));

revoke insert, update, delete on public.fiscal_imports from authenticated;

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
  p_xml_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_order_id uuid;
  new_import_id uuid;
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
      'order_date', p_order_date
    )
  );

  return new_order_id;
end;
$$;

revoke all on function public.create_fiscal_import_purchase_order(
  text, uuid, date, text, jsonb, text, text, text, text, text, text, numeric, text
) from public;
grant execute on function public.create_fiscal_import_purchase_order(
  text, uuid, date, text, jsonb, text, text, text, text, text, text, numeric, text
) to authenticated;
