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
- `doctors`: cadastro administrativo de médicos com nome normalizado, estado
  ativo/inativo e timestamps. O índice pelo nome atende à listagem alfabética.
- admission_entries
- admission_targets

`doctors` possui RLS habilitada e permite leitura somente a administradores
autenticados. A migration `20261007170000_add_admission_doctors.sql` introduz o
helper genérico `is_admin()` porque a fundação anterior só possuía o helper
específico `is_finance_admin()`. Criação, edição do nome e ativação/inativação
ocorrem por RPCs controladas, sem DML direto para `authenticated`. As RPCs
derivam `actor_id` de `auth.user_id()` e registram em `audit_logs` somente
criação e mudanças efetivas, preservando valores anterior e novo. O fluxo não
remove médicos fisicamente.

A migration incremental `20261007183000_validate_doctor_whitespace.sql` alinha a constraint e as RPCs de criação/edição para remover espaços POSIX nas extremidades do nome, mantendo a validação de comprimento entre 1 e 160 caracteres.

## Produção
- procedure_categories
- procedures
- production_entries
- production_imports

`db/migrations/20261007184500_create_production_module.sql` cria as três tabelas
da primeira entrega. `procedure_categories` mantém nome, status e timestamps;
`procedures` referencia a categoria e exige unidade de contagem; `production_entries`
guarda o procedimento, competência mensal (normalizada para o primeiro dia),
quantidade inteira não negativa, fonte e timestamps. Não há dados de pacientes
nem tabela de importação nesta etapa. A migration incremental
`20261007190000_harden_production_data_integrity.sql` preserva a unidade de
contagem de cada lançamento e endurece a normalização das RPCs e constraints;
ela também permite corrigir um procedimento mantendo sua categoria atual
inativa.

Nomes de categorias são únicos após normalização de espaços externos e caixa;
nomes de procedimentos têm a mesma regra dentro da categoria. Lançamentos têm
unicidade por procedimento, competência e fonte normalizada. As três tabelas
usam foreign keys restritivas, índices para catálogo e histórico, RLS com leitura
somente para administradores autenticados e sem escrita direta pelo papel
`authenticated`. RPCs `SECURITY DEFINER` validam a role admin e os dados antes
de cada mutação. O helper `public.is_admin()` consulta o papel da identidade
Neon Auth autenticada. Triggers atualizam timestamps e escrevem criação, edição,
ativação e inativação em `audit_logs`, incluindo os estados anterior e novo;
`actor_id` é obtido por `auth.user_id()`.

As RPCs administrativas são `create_procedure_category`,
`update_procedure_category`, `set_procedure_category_active`,
`create_production_procedure`, `update_production_procedure`,
`set_production_procedure_active`, `create_production_entry` e
`update_production_entry`. Não há exclusão física nesta entrega. Uma categoria
com procedimento ativo não pode ser inativada, e novos lançamentos exigem
procedimento e categoria ativos. Registros históricos podem continuar ligados
a procedimentos inativados.

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

A migration `20261007100000_add_fiscal_nfe_imports.sql` adiciona `public.fiscal_imports`, ligada a `purchase_orders` por `purchase_order_id` (único e com `ON DELETE RESTRICT`). `access_key` também é única e limitada a 44 dígitos. O registro guarda metadados fiscais e o SHA-256 do XML; o conteúdo bruto do arquivo não é armazenado.

A migration incremental `20261007143000_preserve_fiscal_import_items.sql` cria `public.fiscal_import_items`. Cada linha preserva `n_item`, `supplier_product_code` (`cProd`), `product_description` (`xProd`), `commercial_unit` (`uCom`), `original_quantity` (`qCom`), `original_unit_price` (`vUnCom`) e `original_product_total` (`vProd`). Os valores fiscais são texto para manter a representação original e ficam ligados por chaves compostas ao mesmo `fiscal_import` e `purchase_order` e por `purchase_order_item_id` ao item administrativo correspondente. Quantidade, preço e subtotal revisados permanecem em `purchase_order_items`; indicadores continuam lendo essa tabela. XML bruto não é armazenado.

RLS permite `SELECT` somente para administradores financeiros. Usuários autenticados não recebem permissões diretas de `INSERT`, `UPDATE` ou `DELETE`. A RPC `create_fiscal_import_purchase_order` valida o administrador, chama `create_purchase_order`, registra metadados e itens fiscais originais, cria auditoria com `auth.user_id()` e retorna o pedido. A RPC usa `SECURITY DEFINER` e `search_path=pg_catalog`; o `EXECUTE` é revogado de `PUBLIC` e concedido a `authenticated`. Como tudo ocorre na mesma transação, falha em qualquer etapa reverte pedido, itens administrativos, importação, itens fiscais e auditoria.

A prévia do XML é comprovada server-side por um token HMAC assinado com `NEON_AUTH_COOKIE_SECRET`, vinculado ao SHA-256 do XML e ao ID do administrador autenticado, com validade de cinco minutos. A confirmação reinterpreta o arquivo e rejeita ausência, adulteração, troca do XML, usuário diferente ou evidência expirada. O token não contém nem expõe o segredo de assinatura. Importações feitas antes da migration incremental não recebem linhas fiscais retroativas porque o XML original não foi retido.
