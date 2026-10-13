# Homologação isolada — 13/10/2026

## Ambiente e limites

- Repositório/PR: `henriquesouza7/hospital-admin`, PR #25, branch
  `feat/consolidacao-final-demo`.
- Ambiente de teste: projeto Neon temporário isolado
  `hospital-homologacao-20261013`, branch `main`, banco `neondb`.
- Todos os dados de negócio usados foram sintéticos; nenhum dado real de
  paciente foi inserido. Nenhum email real de recuperação foi enviado nesta
  rodada.
- Production e o Neon demo compartilhado não foram alterados. Não houve deploy
  ou merge. Uma migration incremental de privilégio foi aplicada somente ao
  branch isolado após confirmar o projeto e o objeto-alvo.
- A preparação do banco com 44 migrations pertence a uma execução anterior. O
  ledger de migrations não foi confirmado; não confundir presença de objetos
  com evidência do histórico de aplicação.
- Uma consulta read-only posterior reconectou o Neon. Ela confirmou o projeto,
  branch, banco, versão PostgreSQL, schema, RLS, funções, grants, contagens e
  plano descritos na seção abaixo. Não foi encontrado ledger de migrations;
  objetos presentes não comprovam por si só quando foram aplicadas.

## Verificação read-only do banco — 13/10/2026 15:39 UTC

- Projeto `still-bird-03340027`, branch `br-long-base-b88yvq9r` (`main`), banco
  `neondb`, PostgreSQL 18; Auth Better Auth ativo e Data API ativa para `public`,
  role anônima `anonymous`, limite de 1.000 linhas e OpenAPI desabilitada.
- Plano observado: `free_v3`; compute mínimo/máximo de 0,25 CU e suspensão
  imediata. Consumo registrado no projeto: 823 s de compute, 3.284 s ativos,
  6.546.212 bytes transferidos, 0 bytes escritos e armazenamento faturável
  reportado como 0. Esses campos não são uma fatura; o custo faturado continua
  sem confirmação independente.
- Catálogo contém 20 tabelas públicas; todas têm RLS habilitada (zero sem RLS).
  As tabelas de `neon_auth` não tiveram políticas RLS próprias nesta inspeção;
  seu acesso é gerido pelo provedor. A role `anonymous` não tem SELECT/INSERT
  direto nas tabelas públicas examinadas. `authenticated` tem SELECT de tabela,
  mas as policies condicionam as linhas a `is_admin()` ou `is_finance_admin()`;
  INSERT/UPDATE diretos só aparecem em `products` e `suppliers`, protegidos por
  policy `ALL` condicionada a `is_finance_admin()`.
- As RPCs verificadas (`is_admin`, `is_finance_admin`, dashboard de Internações,
  totais financeiros exatos, três exports e auditoria específica de Cirurgias)
  são `SECURITY DEFINER`, fixam `search_path=pg_catalog`, permitem EXECUTE a
  `authenticated` e negam execução a `anonymous`.
- A verificação ampliada encontrou 44 funções `SECURITY DEFINER` próprias do
  aplicativo: nenhuma sem `search_path=pg_catalog`, nenhuma executável por
  `anonymous` e duas sem EXECUTE de `authenticated`, ambas funções de trigger
  (`audit_finance_change` e `audit_production_change`). Após a migration do
  helper, nenhuma função pública própria do aplicativo permaneceu executável
  por `anonymous`.
- Foram observadas 5 identidades Auth, 17 sessões e nenhuma verificação pendente;
  nenhum endereço, token, sessão ou conteúdo de paciente foi consultado. As
  contagens exatas de tabelas incluem 3 pacientes sintéticos, 133 auditorias,
  93 pedidos, 2 lançamentos de Internações e 3 agendamentos de Cirurgias,
  conforme os dados fictícios já autorizados para este projeto.
- O índice `purchase_orders_order_date_idx`, os índices de cursor da auditoria e
  97 constraints de integridade estão presentes. `EXPLAIN` da consulta mensal
  de pedidos escolheu sequential scan para apenas 93 pedidos; isso não mede
  comportamento com volume representativo. A migration
  `20261009030000_index_purchase_orders_by_order_date.sql` já tem efeito visível
  pelo índice, mas não existe ledger consultável que comprove o histórico de
  aplicação; não foi reaplicada.
- Uma tentativa HTTP sem token contra o Data API terminou em HTTP 400 sem corpo
  exposto. Isso não foi aceito como prova de negação RLS. O usuário de banco da
  inspeção possui `BYPASSRLS`; seus resultados não são evidência de autorização
  por perfil.
- Foi encontrada a função auxiliar `public.show_db_tree()`, fora das migrations
  do aplicativo e sem uso pela aplicação, com EXECUTE herdado de `PUBLIC`. A
  migration incremental `20261013154000_revoke_public_access_to_database_tree_helper.sql`
  foi aplicada somente ao branch isolado. A verificação posterior confirmou
  EXECUTE negado a `anonymous` e `authenticated`, preservado para o proprietário
  de inspeção. A função expunha nomes de objetos do catálogo, não linhas de
  negócio.
- O `.env.local` ignorado do worktree tinha hosts diferentes dos endpoints
  retornados por `get_auth` e `get_data_api`. Foram alinhadas somente as URLs
  locais de Auth e Data API ao projeto confirmado; o segredo de cookie foi
  preservado. Essa correção local não cria uma sessão autenticada.
- O armazenamento E2E `tests/e2e/.auth/admin.json` não está disponível no
  worktree atual. Portanto, novos smokes autenticados, requisições 50x,
  renovações de sessão e matriz real de RLS/RPC continuam pendentes de sessão
  válida; não foram simulados.

## Correções no código

1. O módulo `src/modules/minor-surgeries/actions.ts` exportava um objeto de
   estado inicial apesar do diretivo `"use server"`. O runtime Next.js 16
   recusava carregar `/pequenas-cirurgias` com erro de export incompatível. O
   tipo e o estado inicial agora vivem em `action-state.ts`, fora do módulo de
   Server Actions; teste AST evita regressão.
2. Valores monetários grandes causavam overflow horizontal em cards nos
   viewports estreitos. O card agora pode encolher e quebrar valores longos. O
   E2E verifica `/`, `/financeiro/indicadores` e `/internacoes` em 390 px e
   1440 px.
3. A suíte E2E autenticada reutiliza um storage state rotativo. O grupo foi
   serializado para evitar que testes independentes usem o mesmo estado
   simultaneamente; o teste específico de duas páginas concorrentes permanece.
   Isso melhora o isolamento dos testes, mas não comprova a causa da falha
   `42501` observada numa execução paralela anterior.

## Evidências funcionais disponíveis

| Área | Evidência observada | Limite da evidência |
|---|---|---|
| Autenticação | Login administrativo real, logout, redirecionamento de rota protegida sem sessão e conta básica sem papel admin. | Expiração/renovação de sessão e fluxo completo de token inválido/expirado/reutilizado não foram exercitados. |
| Financeiro | Fornecedores/produtos/pedidos e feira exercitados; valor persistido e exportado com centavos exatos, incluindo `90071992547409.93`; CSV Gastos e Compras inspecionados. | Não é uma matriz completa de papéis, validações e todos os cenários do Laboratório/fornecedores. |
| Internações | Médico criado/editado/inativado/reativado; lançamentos e metas mensais/anuais; importação histórica válida e casos inválidos; exportação; persistência após reload. | Não houve teste de falha/rollback de transação concorrente no PostgreSQL. |
| Produção | Procedimentos/categorias e lançamento; importação SUS, duplicidade de arquivo recusada, reconciliação persistida, exportação e neutralização de fórmula CSV. | Testes completos de unidade/classificação e controle por todos os papéis ainda pendentes. |
| Pequenas Cirurgias | Dias e capacidades; agendamento/status; recusa por excesso; fila e transferência; persistência; duas sessões autenticadas disputando uma vaga resultaram em apenas um agendamento ativo; auditoria com ator. | Falta testar duplicidade explicitamente e completar RLS/matriz de permissões; não declarar integridade total. |
| Auditoria | 133 eventos observados; nenhum `actor_id` nulo. Paginação keyset testada com evento novo inserido entre páginas e sem repetição na sequência observada. | Sem teste com transações PostgreSQL concorrentes ou evento retrodatado; keyset não promete snapshot imutável. |
| CSV | Gastos, Compras, Internações, Metas, Produção e Cirurgias baixados; BOM/CRLF e conteúdo não vazio verificados; exportação financeira preservou precisão; fórmula de Produção escapada; dados pessoais sintéticos ausentes dos relatórios verificados. | Filtros, limites máximos, nulos e paginação sob alteração concorrente não foram todos validados para os seis formatos. |
| Dashboard | Após o diff final: 30/30 sequenciais, 6/6 em pares e 11/11 E2E autenticados; sem erro nos logs finais. | `42501` ocorrido em ciclo anterior permanece sem causa raiz comprovada. |

As contagens da execução anterior no Neon isolado incluíram 133 eventos de
auditoria, 93 itens de pedidos, 2 médicos, 2 lançamentos e 2 metas de
Internações, 1 importação SUS reconciliada e registros sintéticos de Pequenas
Cirurgias. São valores históricos de execução, não uma consulta atual.

## Gates e estabilidade

Após as correções e antes do commit, todos estes gates passaram:

- `pnpm format:check`
- `pnpm lint` (sem warnings)
- `pnpm typecheck`
- `pnpm test`: 344 testes em 48 arquivos
- `pnpm build`
- `pnpm test:e2e`: 11/11, servidor explicitamente configurado em
  `localhost:3006` e ligado ao Neon temporário
- `git diff --check`

A suíte responsiva verificou três rotas em 390 px e 1440 px. Foi encontrado e
corrigido um segundo overflow no grid de produção do dashboard geral, além do
overflow inicial nos valores dos KPIs. A repetição manual adicional do
dashboard passou 30/30 carregamentos sequenciais e 6/6 requests em pares. A
conferência dos CSVs retornou 200 para os seis tipos, com BOM, CRLF, nome de
arquivo e conteúdo esperados; Gastos preservou o valor exato e o CSV de Produção
escapou a fórmula sintética. Nenhum nome sintético de paciente apareceu nos
arquivos verificados.

A primeira execução E2E apontou para `localhost:3000`, cujo segredo de sessão
não correspondia ao estado autenticado do servidor `localhost:3006`; ela
falhou e foi interrompida. A execução final foi feita contra `localhost:3006`
com o estado renovado, passou integralmente e não gerou logs de erro no servidor.
Uma falha `42501` anterior continua documentada sem causa raiz comprovada;
durante a rodada final, as RPCs `is_admin()` e `is_finance_admin()` retornaram
`true` para o ator sintético e não houve novo `42501`.

O estado acima registra a rodada anterior concluída antes do commit e push.

## Reexecução após inspeção atual — 13/10/2026

- `pnpm install --frozen-lockfile`: passou, dependências já estavam atualizadas.
- `pnpm format:check`, `pnpm lint` (sem warnings), `pnpm typecheck`,
  `pnpm test` (345/345 em 49 arquivos) e `pnpm build`: passaram.
- `pnpm test:e2e`: 5 testes públicos passaram; 6 smokes administrativos foram
  pulados porque não existe storage state autenticado neste worktree.
- `git diff --check`: passou após a atualização documental.
- Não foram executadas novas operações autenticadas. A única escrita no Neon
  foi a migration de privilégio acima, no branch isolado; production e demo
  compartilhado permaneceram intocados.

## Custo e recursos

A consulta atual confirmou plano `free_v3`, autosuspend imediato, 6.546.212
bytes transferidos, 823 segundos de compute, 3.284 segundos ativos, zero bytes
escritos e zero armazenamento faturável reportado. Isso não substitui a fatura;
**o custo efetivamente faturado continua não confirmado**. O projeto temporário
deve ser mantido enquanto as evidências forem necessárias; exclusão depende de
confirmação do usuário.

## Pendências bloqueadoras

1. Confirmar o custo faturado pelo painel; a consulta confirmou plano gratuito e
   métricas de consumo, mas não apresentou fatura.
2. Completar os testes de RLS/RPC com administrador, administrador financeiro,
   usuário autenticado básico e anônimo em leitura e mutação, para todos os
   módulos.
3. Testar expiração/renovação de sessão e os estados de token de recuperação sem
   enviar email real.
4. Reproduzir/investigar o `42501` intermitente com telemetria redigida; manter
   registrada a falha inicial mesmo se uma repetição passar.
5. Validar auditoria e invariantes de concorrência por transações PostgreSQL
   reais nos fluxos ainda não cobertos.
6. Completar CSVs por parser: filtros, limite, ordenação, nulos, caracteres,
   aspas, delimitadores, autorização e consistência sob alterações concorrentes.
7. Preservar os resultados dos gates desta rodada sem cookies, tokens,
   credenciais ou dados pessoais. Os gates passaram; seis casos autenticados do
   E2E foram pulados por falta de storage state.
8. Conferir o ledger de migrations por mecanismo oficial, caso disponível; não
   reaplicar migration com base apenas em presença de objetos.
9. Revisão Codex do novo HEAD e resolução dos threads aplicáveis. O PR #25 deve
   permanecer em draft e sem merge, conforme autorização vigente.

**Pontuação estrita atual: 10/100. Meta 90/100: não atingida.** Somente o marco
de Internações foi considerado integralmente comprovado com a evidência
disponível; os demais contêm ao menos uma lacuna de aceite. Não declarar o
sistema homologado para liberação enquanto os bloqueadores acima permanecerem.
