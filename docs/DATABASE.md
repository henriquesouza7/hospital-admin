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

As duas tabelas públicas têm RLS habilitada. Um usuário autenticado pode ler
somente o próprio perfil; não há edição de perfil self-service nesta fase. O campo
`active` será administrado pelo sistema ou pelo responsável do projeto. Logs podem
ser lidos somente pelo usuário autenticado identificado em `actor_id`; clientes
autenticados não podem inseri-los, atualizá-los ou removê-los. A escrita futura
será feita por um caminho server-side controlado ou RPC junto dos módulos.

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
gravação automática nem regras específicas dos módulos. Clientes autenticados não
possuem permissão de insert; a camada de aplicação deverá validar o evento e
gravá-lo por um caminho server-side controlado ou RPC, junto da alteração
transacional, quando cada módulo for criado.
