# Modelo Conceitual de Dados

As tabelas de domínio abaixo continuam conceituais. A estrutura transversal de
autenticação e auditoria desta fase foi validada e versionada na migration
descrita mais abaixo.

## Shared
- `profiles`: perfil mínimo ligado a `auth.users.id`, sem cargos ou permissões complexos.
- `audit_logs`: registro transversal genérico para alterações futuras.

O Supabase Auth mantém `auth.users`; a aplicação não replica a tabela de usuários.
Um trigger cria o perfil mínimo quando um usuário é criado no Auth. A migration
`supabase/migrations/20260930000000_create_profiles_and_audit_logs.sql` é a fonte
versionada da estrutura inicial.

As duas tabelas públicas têm RLS habilitada. Um usuário autenticado pode ler e
atualizar apenas o próprio perfil. Logs podem ser inseridos e lidos somente pelo
usuário autenticado identificado em `actor_id`; não há políticas de atualização ou
remoção. A aplicação deverá registrar alterações relevantes no servidor quando os
módulos forem implementados.

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

## Auditoria

A auditoria começa com `audit_logs` genérica, contendo ator, entidade, ação,
identificador opcional, payload JSON e timestamp. Esta etapa não implementa
gravação automática nem regras específicas dos módulos. A camada de aplicação
deverá validar o evento e gravá-lo junto da alteração transacional quando cada
módulo for criado.
