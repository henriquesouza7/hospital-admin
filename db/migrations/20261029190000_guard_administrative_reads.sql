-- Read-only entry points: verify the request identity before querying even empty tables.
-- No RLS, existing guards, original RPCs or mutation permissions are changed.
begin;

create function public.assert_admin_read_identity()
returns void language plpgsql stable security invoker
set search_path = pg_catalog
as $guard$
declare
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  request_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  subject text := nullif(claims->>'sub', '');
begin
  if subject is null then
    raise exception 'HOSPITAL_JWT_CONTEXT_MISSING' using errcode = '42501';
  end if;
  if subject is distinct from nullif(request_headers->>'x-hospital-subject', '') then
    raise exception 'HOSPITAL_SUBJECT_MISMATCH' using errcode = '42501';
  end if;
  if not public.is_admin() then
    raise exception 'HOSPITAL_ADMIN_ACCESS_DENIED' using errcode = '42501';
  end if;
end;
$guard$;
revoke all on function public.assert_admin_read_identity() from public;
grant execute on function public.assert_admin_read_identity() to authenticated;

create function public.verified_admission_targets()
returns setof public.admission_targets
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.admission_targets;
end;
$read$;
revoke all on function public.verified_admission_targets() from public;
grant execute on function public.verified_admission_targets() to authenticated;

create function public.verified_audit_logs()
returns setof public.audit_logs
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.audit_logs;
end;
$read$;
revoke all on function public.verified_audit_logs() from public;
grant execute on function public.verified_audit_logs() to authenticated;

create function public.verified_doctors()
returns setof public.doctors
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.doctors;
end;
$read$;
revoke all on function public.verified_doctors() from public;
grant execute on function public.verified_doctors() to authenticated;

create function public.verified_fiscal_imports()
returns setof public.fiscal_imports
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.fiscal_imports;
end;
$read$;
revoke all on function public.verified_fiscal_imports() from public;
grant execute on function public.verified_fiscal_imports() to authenticated;

create function public.verified_monthly_fair_expenses()
returns setof public.monthly_fair_expenses
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.monthly_fair_expenses;
end;
$read$;
revoke all on function public.verified_monthly_fair_expenses() from public;
grant execute on function public.verified_monthly_fair_expenses() to authenticated;

create function public.verified_patients()
returns setof public.patients
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.patients;
end;
$read$;
revoke all on function public.verified_patients() from public;
grant execute on function public.verified_patients() to authenticated;

create function public.verified_procedure_categories()
returns setof public.procedure_categories
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.procedure_categories;
end;
$read$;
revoke all on function public.verified_procedure_categories() from public;
grant execute on function public.verified_procedure_categories() to authenticated;

create function public.verified_procedures()
returns setof public.procedures
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.procedures;
end;
$read$;
revoke all on function public.verified_procedures() from public;
grant execute on function public.verified_procedures() to authenticated;

create function public.verified_production_entries()
returns setof public.production_entries
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.production_entries;
end;
$read$;
revoke all on function public.verified_production_entries() from public;
grant execute on function public.verified_production_entries() to authenticated;

create function public.verified_production_import_rows()
returns setof public.production_import_rows
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.production_import_rows;
end;
$read$;
revoke all on function public.verified_production_import_rows() from public;
grant execute on function public.verified_production_import_rows() to authenticated;

create function public.verified_production_imports()
returns setof public.production_imports
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.production_imports;
end;
$read$;
revoke all on function public.verified_production_imports() from public;
grant execute on function public.verified_production_imports() to authenticated;

create function public.verified_products()
returns setof public.products
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.products;
end;
$read$;
revoke all on function public.verified_products() from public;
grant execute on function public.verified_products() to authenticated;

create function public.verified_purchase_order_items()
returns setof public.purchase_order_items
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.purchase_order_items;
end;
$read$;
revoke all on function public.verified_purchase_order_items() from public;
grant execute on function public.verified_purchase_order_items() to authenticated;

create function public.verified_purchase_order_summaries()
returns setof public.purchase_order_summaries
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.purchase_order_summaries;
end;
$read$;
revoke all on function public.verified_purchase_order_summaries() from public;
grant execute on function public.verified_purchase_order_summaries() to authenticated;

create function public.verified_purchase_orders()
returns setof public.purchase_orders
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.purchase_orders;
end;
$read$;
revoke all on function public.verified_purchase_orders() from public;
grant execute on function public.verified_purchase_orders() to authenticated;

create function public.verified_suppliers()
returns setof public.suppliers
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.suppliers;
end;
$read$;
revoke all on function public.verified_suppliers() from public;
grant execute on function public.verified_suppliers() to authenticated;

create function public.verified_surgery_appointments()
returns setof public.surgery_appointments
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.surgery_appointments;
end;
$read$;
revoke all on function public.verified_surgery_appointments() from public;
grant execute on function public.verified_surgery_appointments() to authenticated;

create function public.verified_surgery_days()
returns setof public.surgery_days
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.surgery_days;
end;
$read$;
revoke all on function public.verified_surgery_days() from public;
grant execute on function public.verified_surgery_days() to authenticated;

create function public.verified_surgery_waitlist()
returns setof public.surgery_waitlist
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.surgery_waitlist;
end;
$read$;
revoke all on function public.verified_surgery_waitlist() from public;
grant execute on function public.verified_surgery_waitlist() to authenticated;

create function public.verified_get_admission_dashboard_totals(p_start date, p_through_exclusive date)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.get_admission_dashboard_totals(p_start, p_through_exclusive);
end;
$read$;
revoke all on function public.verified_get_admission_dashboard_totals(date, date) from public;
grant execute on function public.verified_get_admission_dashboard_totals(date, date) to authenticated;

create function public.verified_get_surgery_summary(p_start date, p_through_exclusive date, p_max_rows integer)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.get_surgery_summary(p_start, p_through_exclusive, p_max_rows);
end;
$read$;
revoke all on function public.verified_get_surgery_summary(date, date, integer) from public;
grant execute on function public.verified_get_surgery_summary(date, date, integer) to authenticated;

create function public.verified_list_admission_entries(p_start_date date, p_end_date date, p_doctor_id uuid DEFAULT NULL::uuid)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.list_admission_entries(p_start_date, p_end_date, p_doctor_id);
end;
$read$;
revoke all on function public.verified_list_admission_entries(date, date, uuid) from public;
grant execute on function public.verified_list_admission_entries(date, date, uuid) to authenticated;

create function public.verified_list_admission_entries_for_export(p_start_date date, p_end_date date, p_limit integer)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.list_admission_entries_for_export(p_start_date, p_end_date, p_limit);
end;
$read$;
revoke all on function public.verified_list_admission_entries_for_export(date, date, integer) from public;
grant execute on function public.verified_list_admission_entries_for_export(date, date, integer) to authenticated;

create function public.verified_list_minor_surgery_audit(p_offset bigint)
returns TABLE(id bigint, actor_id text, actor_name text, subject text, entity_type text, entity_id text, action text, payload jsonb, created_at timestamp with time zone)
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.list_minor_surgery_audit(p_offset);
end;
$read$;
revoke all on function public.verified_list_minor_surgery_audit(bigint) from public;
grant execute on function public.verified_list_minor_surgery_audit(bigint) to authenticated;

create function public.verified_list_minor_surgery_transfer_destinations(p_waitlist_ids uuid[])
returns TABLE(source_waitlist_id uuid, appointment_id uuid, surgery_day_id uuid, procedure_date date, appointment_page integer)
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.list_minor_surgery_transfer_destinations(p_waitlist_ids);
end;
$read$;
revoke all on function public.verified_list_minor_surgery_transfer_destinations(uuid[]) from public;
grant execute on function public.verified_list_minor_surgery_transfer_destinations(uuid[]) to authenticated;

create function public.verified_list_monthly_expense_totals_exact(p_start date, p_through_exclusive date)
returns TABLE(competence date, pharmacy_total text, laboratory_total text, fair_total text, pharmacy_item_count integer, laboratory_item_count integer, has_fair_record boolean)
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return query select * from public.list_monthly_expense_totals_exact(p_start, p_through_exclusive);
end;
$read$;
revoke all on function public.verified_list_monthly_expense_totals_exact(date, date) from public;
grant execute on function public.verified_list_monthly_expense_totals_exact(date, date) to authenticated;

create function public.verified_list_production_entries_for_export(p_start date, p_through_exclusive date, p_limit integer)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.list_production_entries_for_export(p_start, p_through_exclusive, p_limit);
end;
$read$;
revoke all on function public.verified_list_production_entries_for_export(date, date, integer) from public;
grant execute on function public.verified_list_production_entries_for_export(date, date, integer) to authenticated;

create function public.verified_list_purchase_order_items_for_export(p_start date, p_through_exclusive date, p_limit integer)
returns jsonb
language plpgsql stable security invoker set search_path = pg_catalog
as $read$
begin
  perform public.assert_admin_read_identity();
  return public.list_purchase_order_items_for_export(p_start, p_through_exclusive, p_limit);
end;
$read$;
revoke all on function public.verified_list_purchase_order_items_for_export(date, date, integer) from public;
grant execute on function public.verified_list_purchase_order_items_for_export(date, date, integer) to authenticated;

commit;
