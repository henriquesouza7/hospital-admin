# Modelo Conceitual de Dados

Neon Postgres é a fonte de verdade. O acesso HTTP inicial usa a Neon Data API
(PostgREST) com RLS; não há ORM nesta etapa. A identidade é gerenciada pelo Neon
Auth e armazenada no schema `neon_auth`.

## Shared
- `audit_logs` (fundação criada em `db/migrations/20261001000000_create_audit_logs.sql`)

`audit_logs` mantém `actor_id` como o identificador da identidade Neon Auth e não
possui política de inserção para clientes. A escrita será adicionada por caminho
server-side controlado ou RPC junto dos módulos. Nesta fase, a política permite
apenas que uma identidade autenticada leia os próprios eventos.

## Financeiro
- suppliers
- products
- purchase_orders
- purchase_order_items
- invoices
- monthly_fair_expenses

Relacionamentos principais:
- supplier 1:N purchase_orders
- purchase_order 1:N purchase_order_items
- product 1:N purchase_order_items
- invoice 0..N:1 purchase_order conforme regra futura

## Internações
- doctors
- admission_entries
- admission_targets

## Produção
- procedure_categories
- procedures
- production_entries
- production_imports

Campos importantes em production_entries:
- procedure_id
- reference_period
- quantity
- source
- source_status quando aplicável

## Pequenas Cirurgias
- patients
- surgery_days
- surgery_appointments
- surgery_waitlist

## Regras estruturais
- IDs estáveis.
- timestamps de criação/atualização.
- chaves estrangeiras explícitas.
- constraints para impedir estados inválidos.
- índices definidos de acordo com consultas reais.
- dados calculáveis não devem ser duplicados sem motivo.

## Segurança e branches

As tabelas públicas criadas devem permanecer com RLS habilitada. Policies devem
usar `auth.user_id()` quando compararem a identidade da sessão. Branches Neon
devem ser usadas para desenvolvimento e testes isolados; dados reais de pacientes
não devem ser copiados para branches locais ou de CI.
