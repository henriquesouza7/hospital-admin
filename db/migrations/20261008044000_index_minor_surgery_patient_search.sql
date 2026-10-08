create extension if not exists pg_trgm with schema public;

create index if not exists patients_name_id_idx
  on public.patients (name, id);

create index if not exists patients_name_trgm_idx
  on public.patients using gin (name public.gin_trgm_ops);
