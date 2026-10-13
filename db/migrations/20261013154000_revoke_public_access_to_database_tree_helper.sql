-- The database-inspection helper is not part of the application API.
-- Keep it usable by its owner, but do not expose schema metadata to API roles.
do $migration$
begin
  if to_regprocedure('public.show_db_tree()') is not null then
    execute 'revoke all on function public.show_db_tree() from public';
  end if;
end;
$migration$;
