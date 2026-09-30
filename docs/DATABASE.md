# Modelo Conceitual de Dados

Este documento é conceitual. O SQL final será criado somente após validação.

## Shared
- users
- audit_logs

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
