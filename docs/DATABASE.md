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
- `suppliers`: fornecedores, com status ativo/inativo e observações opcionais.
- `products`: catálogo por setor e apresentação; não armazena preço.
- `purchase_orders`: data, fornecedor, setor e observação do pedido.
- `purchase_order_items`: quantidade, valor unitário e subtotal monetário
  calculado no PostgreSQL. Cada compra preserva o preço histórico praticado.
- `purchase_order_summaries`: view de leitura que agrega itens por pedido.
- `monthly_fair_expenses`: um total consolidado por competência mensal, sem
  detalhamento por produto ou item.
- invoices

Relacionamentos principais:
- supplier 1:N purchase_orders
- purchase_order 1:N purchase_order_items
- product 1:N purchase_order_items
- invoice 0..N:1 purchase_order conforme regra futura

As quatro tabelas financeiras usam UUID, timestamps com fuso horário, foreign
keys restritivas e RLS. A função `public.is_finance_admin()` consulta a role da
identidade devolvida por `auth.user_id()` na tabela `neon_auth.user`; policies
concedem leitura e alterações apenas a administradores autenticados. A criação
de pedidos ocorre pela função transacional `public.create_purchase_order()`,
que valida setor, fornecedor ativo, produtos ativos, quantidades e preços. Não
há permissão de exclusão física para o papel `authenticated`.

Triggers atualizam `updated_at` e registram criação/alteração de fornecedores e
produtos, além de alterações de pedidos, em `audit_logs`. A criação do pedido
registra fornecedor, data, setor, contagem de itens e total; `actor_id` vem de
`auth.user_id()`, nunca de um parâmetro do cliente.

`monthly_fair_expenses` armazena a competência como o primeiro dia do mês, com
unicidade por competência, valor `numeric(12, 2)` não negativo e observação de
até 1.000 caracteres. Leitura é protegida por RLS para administradores; criação
e edição usam RPCs controladas que registram auditoria com o ator de
`auth.user_id()`. As edições guardam total e observação anteriores e novos, com
a observação normalizada igual ao valor persistido. A competência é imutável e
não há exclusão nesta etapa. Anexos permanecem futuros até existir uma
infraestrutura de storage segura.

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

## Importação fiscal de NF-e

A migration `20261007100000_add_fiscal_nfe_imports.sql` adiciona `public.fiscal_imports`, ligada a `purchase_orders` por `purchase_order_id` (único e com `ON DELETE RESTRICT`). `access_key` também é única e limitada a 44 dígitos. O registro guarda somente metadados fiscais e o SHA-256 do XML; o conteúdo bruto do arquivo não é armazenado.

RLS permite `SELECT` somente para administradores financeiros. Usuários autenticados não recebem permissões diretas de `INSERT`, `UPDATE` ou `DELETE`. A RPC `create_fiscal_import_purchase_order` valida o administrador, chama `create_purchase_order`, registra os metadados, cria auditoria com `auth.user_id()` e retorna o pedido. Como tudo ocorre na mesma transação da RPC, uma chave duplicada ou falha no registro/auditoria reverte o pedido e seus itens.
