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
- `admission_entries`: quantidade agregada por `entry_date` e `doctor_id`, com
  unicidade diária por médico. Competências mensal e anual são derivadas da data.
- `admission_targets`: quantidade-alvo por hospital, com granularidade mensal ou
  anual e unicidade por tipo e período; o período é armazenado no primeiro dia.

`doctors` possui RLS habilitada e permite leitura somente a administradores
autenticados. A migration `20261007170000_add_admission_doctors.sql` introduz o
helper genérico `is_admin()` porque a fundação anterior só possuía o helper
específico `is_finance_admin()`. Criação, edição do nome e ativação/inativação
ocorrem por RPCs controladas, sem DML direto para `authenticated`. As RPCs
derivam `actor_id` de `auth.user_id()` e registram em `audit_logs` somente
criação e mudanças efetivas, preservando valores anterior e novo. O fluxo não
remove médicos fisicamente.

A migration incremental `20261007183000_validate_doctor_whitespace.sql`
alinha a constraint e as RPCs de criação/edição para remover espaços POSIX nas
extremidades do nome, mantendo a validação de comprimento entre 1 e 160
caracteres.

A migration `20261007200000_create_admission_entries_and_targets.sql` cria as
tabelas de lançamentos e metas com RLS. Leitura é permitida somente a
administradores autenticados; clientes autenticados não recebem DML direto.
Criação e alteração usam RPCs transacionais que validam médico ativo na criação,
unicidade por médico/data, quantidade inteira não negativa e competências das
metas. Edições alteram somente a quantidade, preservam valores anterior e novo
na auditoria e não registram no-op. As foreign keys impedem apagar médicos com
histórico.

Importação histórica recebe linhas CSV validadas após prévia assinada no servidor.
A RPC resolve o nome do médico por correspondência normalizada exata e única,
exige cadastro ativo, insere todas as linhas e audita cada lançamento e o lote
na mesma transação. Colisões com lançamentos existentes fazem rollback do lote.
Nenhum dado individual de paciente é armazenado.

A migration `20261008150000_read_admission_entries_in_one_snapshot.sql` cria a
RPC `list_admission_entries`, que retorna em uma única instrução o recorte de
lançamentos do período e do médico solicitados. O agregador evita totais
parciais quando uma importação concorrente grava mais de uma página de dados.
A RPC exige administrador, usa `SECURITY DEFINER` com `search_path=pg_catalog`,
revoga execução de `PUBLIC` e concede somente a `authenticated`.

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
`20261007185000_harden_production_data_integrity.sql` preserva a unidade de
contagem de cada lançamento e endurece a normalização das RPCs e constraints;
ela também permite corrigir um procedimento mantendo sua categoria atual
inativa e serializa mudanças concorrentes de estado entre categorias e
procedimentos. A migration incremental
`20261007185500_skip_production_noop_updates.sql` evita executar updates sem
mudança administrativa real, preservando timestamps e evitando eventos de
auditoria duplicados.

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
- Migration incremental: `20261007190000_create_minor_surgeries.sql`.
- Correções incrementais: `20261008034000_secure_minor_surgery_audit_and_lock_status.sql`, `20261008034200_paginate_minor_surgery_audit.sql`, `20261008041000_attribute_minor_surgery_audit_and_index_transfers.sql` e `20261008043000_describe_minor_surgery_audit_events.sql`.
- `patients`: UUID e nome (único dado de identificação administrativa coletado), mais timestamps. Não inclui CPF, contato, diagnóstico ou campos clínicos.
- `surgery_days`: data única por dia e capacidade positiva, com padrão 10.
- `surgery_appointments`: vínculo com dia e pessoa, status `awaiting_confirmation`, `confirmed` ou `cancelled`, e vínculo opcional `source_waitlist_id` único para preservar a origem da transferência.
- `surgery_waitlist`: vínculo com a pessoa, status `waiting` ou `transferred` e timestamp de transferência. A fila não referencia um dia enquanto aguarda.
- Chaves estrangeiras usam `ON DELETE RESTRICT`; índices parciais impedem duplicar agendamento ativo da mesma pessoa/data e entrada ativa repetida na fila. Não há exclusão física no fluxo normal.
- As quatro tabelas têm RLS. `authenticated` recebe somente `SELECT`, condicionado a `public.is_admin()`; escrita ocorre nas RPCs `SECURITY DEFINER`, com `search_path=pg_catalog`, execução revogada de `PUBLIC` e concedida a `authenticated`.
- A policy geral de `audit_logs` continua limitada ao próprio ator. A RPC `list_minor_surgery_audit(p_offset)` verifica admin no banco e expõe somente eventos de pequenas cirurgias, ordenados por `created_at, id` decrescentes, paginados e identificados com ator e assunto. O histórico resolve nomes de atores e registros relacionados sob a verificação de admin, com IDs como fallback; um índice parcial atende filtro e ordenação da auditoria.
- Alterações reais de nome do paciente preservam os valores anterior e novo em `audit_logs`; atualizar para o mesmo nome não gera evento. Agendamentos e fila continuam referenciando `patient_id`, sem snapshot duplicado do nome nesta etapa.
- As RPCs criam/atualizam data, capacidade e nome administrativo, criam agendamento, alteram status, inserem na fila e transferem da fila. Todas verificam admin no banco, validam entradas e escrevem em `audit_logs` com `actor_id = auth.user_id()`.
- Criação de agendamento, mudança de status, ajuste de capacidade e transferência bloqueiam `surgery_days` antes de bloquear agendamentos ou contar ocupações, mantendo ordem de lock consistente e serializando operações concorrentes.
- A fila ativa é listada por `created_at, id` em ordem crescente. O histórico de transferências é ordenado por `transferred_at, id` decrescentes, com índice parcial para a consulta paginada. A origem da transferência fica no agendamento e na auditoria; a entrada da fila muda para `transferred` sem perder seu histórico.

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
